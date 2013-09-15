#!/usr/bin/env python2
# -*- coding: utf-8 -*-

# Contest Management System
# Copyright © 2013 Luca Wehrstedt <luca.wehrstedt@gmail.com>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

from __future__ import unicode_literals
from __future__ import absolute_import

import json
import logging

import six

from sqlalchemy.orm import joinedload, subqueryload

from werkzeug.wrappers import Request, Response
from werkzeug.routing import Map, Rule
from werkzeug.local import Local, LocalManager
from werkzeug.exceptions import HTTPException, NotAcceptable, NotFound, \
    BadRequest
from werkzeug.wsgi import responder

from cms.db import SessionGen, Task, Dataset, Testcase, Submission, File, \
    Token, SubmissionResult
from cms.grading import format_status_text
from cms.grading.scoretypes import get_score_type
from cmscommon.DateTime import make_timestamp


logger = logging.getLogger(__name__)


# We keep a greenlet-local storage to get easy access to some handy
# objects (unique for each request, like the Request object itself,
# the partial Response object, a Session, a MapAdapter, etc.) without
# passing them around as parameters to all the code that needs them.
local = Local()
local_manager = LocalManager([local])


class SubmissionAPIMiddleware(object):
    """Provide an efficient HTTP interface to submissions.

    The goal of this class is to give details about submissions, both
    individually and as a list. It provides some information that
    cannot be gotten using the ordinary data API, for example because
    they're the result of a computation of TaskTypes or ScoreTypes. It
    also aggregates all relevant data in a single response, fetching it
    from many different objects (files, tokens, results, evaluations,
    etc.) thus optimizing database access and performance in respect to
    the data API, that would require one request and one query for each
    object.

    The URL "/" provides a list of submissions, and a summary of each
    of them. Not so coincidentally, this is the information that is
    displayed in submission lists on AWS. The list can be filtered with
    these query parameters: contest_id, user_id and task_id. Multiple
    values for the same key (e.g. "?task_id=1&task_id=2") are OR-ed.
    Values for different keys are AND-ed. Conflicting parameters will
    return an empty list. By default the result of the submission on
    the active dataset of its task is returned. This can be changed by
    using tha dataset_id parameter. Many dataset_ids can be given,
    provided they're each for a different task.

    The URL "/<submission_id>" provides information about a specific
    submission, with greater detail than what's included in the list.
    One could say it seems adequate for a submission detail page. The
    dataset can be specified with the dataset_id parameters. If not
    given the active one will be used.

    """
    def __init__(self):
        """Initialize an instance of this class.

        """
        self._url_map = Map([Rule("/", methods=["GET"], endpoint="list"),
                             Rule("/<int:submission_id>",
                                  methods=["GET"], endpoint="get")],
                            encoding_errors="strict")

        # Wrap with a middleware that initializes the local storage at
        # the beginning of each request and clears it at the end.
        self.wsgi_app = local_manager.make_middleware(self.wsgi_app)

    def __call__(self, environ, start_response):
        """Execute this instance as a WSGI application.

        See the PEP for the meaning of parameters. The separation of
        __call__ and wsgi_app eases the insertion of middlewares.

        """
        return self.wsgi_app(environ, start_response)

    @responder
    def wsgi_app(self, environ, start_response):
        """Execute this instance as a WSGI application.

        See the PEP for the meaning of parameters. The separation of
        __call__ and wsgi_app eases the insertion of middlewares.

        """
        local.urls = self._url_map.bind_to_environ(environ)
        try:
            endpoint, args = local.urls.match()
        except HTTPException as exc:
            return exc

        local.request = Request(environ)
        local.request.encoding_errors = "strict"

        local.response = Response()

        if local.request.accept_mimetypes.quality("application/json") <= 0:
            return NotAcceptable()

        try:
            if endpoint == "list":
                self.list()
            elif endpoint == "get":
                self.get(args["submission_id"])
            else:
                raise RuntimeError("Unknown endpoint.")

        except HTTPException as exc:
            return exc

        return local.response

    def list(self):
        """Produce a list of submissions.

        Filter them using the given query parameters.

        """
        # XXX When writing this method we aimed for efficiency: we
        # wanted it to execute as less queries as possible and not to
        # transmit more data on the wire than strictly necessary.
        # Unfortunately, this made the method rather complex and for
        # medium-sized contests there seems not to be a perceivable
        # difference from a simple enormous joined-load query.

        # Load query parameters. We simply drop the ones we don't
        # understand (i.e. those that aren't integers).
        contest_ids = local.request.args.getlist("contest_id", type=int)
        user_ids = local.request.args.getlist("user_id", type=int)
        task_ids = local.request.args.getlist("task_id", type=int)
        dataset_ids = local.request.args.getlist("dataset_id", type=int)

        with SessionGen() as local.session:
            # Fetch the datasets that have been requested. This has to
            # be done first as it's needed for the only check that can
            # make the request fail (i.e. it could allow us to avoid
            # useless queries).
            if len(dataset_ids) > 0:
                q = local.session.query(Dataset)
                q = q.filter(Dataset.id.in_(dataset_ids))
                datasets = q.all()
            else:
                datasets = list()

            # Check if all parent tasks are distinct. This check also
            # catches the case of a non-existing dataset.
            if len(set(d.task_id for d in datasets)) < len(dataset_ids):
                raise BadRequest()

            # Identify the submissions we're interested in. We have the
            # files and tokens eagerly loaded too. With joinedload they
            # are loaded in the same query. This is perfectly fine for
            # tokens but not as much for files because if there's more
            # than one the entire result row will be duplicated. Using
            # subqueryload could improve that, by firing another query.
            # If we tried to also load results then, depending on how
            # we did that, we would either get them all (even the ones
            # we don't care about) or we wouldn't get the submissions
            # that have no associated result. And, also, we have yet
            # to determine all the datasets we want!
            q = local.session.query(Submission)
            if len(contest_ids) > 0:
                q = q.join(Submission.task)
                q = q.filter(Task.contest_id.in_(contest_ids))
            if len(user_ids) > 0:
                q = q.filter(Submission.user_id.in_(user_ids))
            if len(task_ids) > 0:
                q = q.filter(Submission.task_id.in_(task_ids))
            q = q.options(joinedload(Submission.files))
            q = q.options(joinedload(Submission.token))
            submissions = q.all()

            # Determine the IDs of tasks for which we need a dataset.
            tasks_need_dataset = set(s.task_id for s in submissions)
            # Remove the IDs of tasks for which we have a dataset.
            tasks_need_dataset -= set(d.task_id for d in datasets)

            # Fetch the datasets we're missing, picking the active one
            # of the tasks.
            q = local.session.query(Dataset)
            q = q.join(Task, Dataset.id == Task.active_dataset_id)
            q = q.filter(Task.id.in_(tasks_need_dataset))
            datasets.extend(q.all())

            # Determine the final list of submission and dataset IDs.
            dataset_ids = list(d.id for d in datasets)
            submission_ids = list(s.id for s in submissions)

            # We can now get the submission results.
            # We don't load executables and evaluations because we do
            # not need them. If we did, it'd be probably more efficient
            # to use a subqueryload then a joinedload.
            # not interested in executables.
            q = local.session.query(SubmissionResult)
            q = q.filter(SubmissionResult.submission_id.in_(submission_ids))
            q = q.filter(SubmissionResult.dataset_id.in_(dataset_ids))
            submission_results = q.all()

            # Index submission results and datasets for easy access.
            # We're sure we won't have duplicated entries.
            dataset_map = dict((d.task_id, d) for d in datasets)
            submission_results_map = dict(
                (sr.submission_id, sr) for sr in submission_results)

            # As we need testcases to initialize ScoreTypes, load them
            # in a single batch. This query is independent from the
            # previous ones but cannot be run in parallel as they need
            # to belong to the same Session, and therefore to the same
            # connection, that cannot be shared among greenlets.
            q = local.session.query(Testcase)
            q = q.filter(Testcase.dataset_id.in_(dataset_ids))
            testcases = q.all()

            # Initialize ScoreTypes. We have to pick testcases manually
            # because otherwise SQLAlchemy will fire another query.
            score_types = dict()
            for d in datasets:
                public_testcases = dict((tc.codename, tc.public)
                                        for tc in testcases
                                        if tc.dataset_id == d.id)
                score_types[d.id] = get_score_type(d.score_type,
                                                   d.score_type_parameters,
                                                   public_testcases)

            # Produce the data structure.
            result = list()

            for s in submissions:
                dataset = dataset_map[s.task_id]
                item = {
                    '_ref': "%s" % s.id,
                    'dataset': "%s" % dataset.id,
                    'user': "%s" % s.user_id,
                    'task': "%s" % s.task_id,
                    'timestamp': make_timestamp(s.timestamp),
                    'language': s.language,
                    'files': dict((k, v.digest)
                                  for k, v in s.files.iteritems()),
                    'token': make_timestamp(s.token.timestamp)
                             if s.token is not None else None,
                }

                score_type = score_types[dataset.id]
                sr = submission_results_map.get(s.id)

                if sr is not None:
                    item.update({
                        'compilation_outcome':
                            {"ok": True,
                             "fail": False}.get(sr.compilation_outcome),
                        'compilation_tries': sr.compilation_tries,
                        'evaluation_outcome':
                            {"ok": True}.get(sr.evaluation_outcome),
                        'evaluation_tries': sr.evaluation_tries,
                        'score': sr.score,
                        'max_score': score_type.max_score,
                    })
                else:
                    item.update({
                        'compilation_outcome': None,
                        'compilation_tries': 0,
                        'evaluation_outcome': None,
                        'evaluation_tries': 0,
                        'score': None,
                        'max_score': score_type.max_score,
                    })

                result.append(item)

        # Encode and send.
        local.response.mimetype = "application/json"
        local.response.data = json.dumps(result)

    def get(self, submission_id):
        """Retrieve a single submission.

        Query the database for the submission with the given ID, and
        the dataset given as query parameter (or the active one).

        submission_id (int): the ID of a submission.

        """
        # If it's not an integer we will ignore it. But if it's an
        # integer of a dataset that doesn't exist we'll raise a 404.
        dataset_id = local.request.args.get("dataset_id", type=int)

        with SessionGen() as local.session:
            # Load the submission, and check for existence.
            submission = Submission.get_from_id(submission_id, local.session)

            if submission is None:
                raise NotFound()

            # Load the dataset.
            if dataset_id is not None:
                dataset = Dataset.get_from_id(dataset_id, local.session)
                if dataset is None:
                    raise NotFound()
            else:
                q = local.session.query(Dataset)
                q = q.join(Task, Dataset.id == Task.active_dataset_id)
                q = q.filter(Task.id == submission.task_id)
                dataset = q.one()

            # Get the result (will fire a query).
            submission_result = submission.get_result(dataset)

            # Get the ScoreType (will fire a query for testcases).
            score_type = get_score_type(dataset=dataset)

            # Produce the data structure.
            s = submission
            sr = submission_result

            result = {
                '_ref': "%s" % s.id,
                'dataset': '%s' % dataset.id,
                'user': "%s" % s.user_id,
                'task': "%s" % s.task_id,
                'timestamp': make_timestamp(s.timestamp),
                'language': s.language,
                # No files, no token: AWS doesn't need them.
            }

            if sr is not None:
                result.update({
                    'compilation_outcome':
                        {"ok": True,
                         "fail": False}.get(sr.compilation_outcome),
                    'compilation_text':
                        format_status_text(sr.compilation_text),
                    'compilation_tries': sr.compilation_tries,
                    'compilation_stdout': sr.compilation_stdout,
                    'compilation_stderr': sr.compilation_stderr,
                    'compilation_time': sr.compilation_time,
                    'compilation_wall_clock_time':
                        sr.compilation_wall_clock_time,
                    'compilation_memory': sr.compilation_memory,
                    'compilation_shard': sr.compilation_shard,
                    'compilation_sandbox': sr.compilation_sandbox,
                    'evaluation_outcome':
                        {"ok": True}.get(sr.evaluation_outcome),
                    'evaluation_tries': sr.evaluation_tries,
                    'evaluations': dict((ev.codename, {
                        'codename': ev.codename,
                        'outcome': ev.outcome,
                        'text': format_status_text(ev.text),
                        'execution_time': ev.execution_time,
                        'execution_wall_clock_time':
                            ev.execution_wall_clock_time,
                        'execution_memory': ev.execution_memory,
                        'evaluation_shard': ev.evaluation_shard,
                        'evaluation_sandbox': ev.evaluation_sandbox,
                    }) for ev in sr.evaluations),
                    'score': sr.score,
                    'max_score': score_type.max_score,
                    'score_details':
                        score_type.get_html_details(sr.score_details)
                        if sr.score is not None else None,
                })
            else:
                # Just copy all fields with None.
                result.update({
                    'compilation_outcome': None,
                    'compilation_text': None,
                    'compilation_tries': 0,
                    'compilation_stdout': None,
                    'compilation_stderr': None,
                    'compilation_time': None,
                    'compilation_wall_clock_time': None,
                    'compilation_memory': None,
                    'compilation_shard': None,
                    'compilation_sandbox': None,
                    'evaluation_outcome': None,
                    'evaluation_tries': 0,
                    'evaluations': {},
                    'score': None,
                    'max_score': score_type.max_score,
                    'score_details': None,
                })

        # Encode and send.
        local.response.mimetype = "application/json"
        local.response.data = json.dumps(result)
