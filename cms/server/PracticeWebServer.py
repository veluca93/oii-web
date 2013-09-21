#!/usr/bin/env python2
# -*- coding: utf-8 -*-

# Programming contest management system
# Copyright © 2013 Luca Versari <veluca93@gmail.com>
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

import os
import io
import re
import json
import logging
import hashlib
import mimetypes
import pkg_resources
from datetime import datetime

from sqlalchemy.exc import IntegrityError

from cms import config
from cms.io import WebService
from cms.db.filecacher import FileCacher
from cms.db import SessionGen, User, Contest, Submission
from cmscommon.DateTime import make_timestamp

from werkzeug.wrappers import Response, Request
from werkzeug.wsgi import SharedDataMiddleware, wrap_file, responder
from werkzeug.routing import Map, Rule
from werkzeug.exceptions import HTTPException, NotFound, BadRequest, \
    Unauthorized


logger = logging.getLogger(__name__)


class APIHandler(object):
    def __init__(self, file_cacher, contest):
        self.router = Map([
            Rule("/", methods=["GET"], endpoint="root"),
            Rule("/files/<digest>", methods=["GET"], endpoint="dbfile"),
            Rule("/files/<digest>/<name>", methods=["GET"], endpoint="dbfile"),
            Rule("/check", methods=["POST"], endpoint="check"),
            Rule("/register", methods=["POST"], endpoint="register"),
            Rule("/login", methods=["POST"], endpoint="login"),
            Rule("/tasks", methods=["GET", "POST"], endpoint="tasks"),
            Rule("/submissions", methods=["POST"], endpoint="submissions")
        ], encoding_errors="strict")
        self.file_cacher = file_cacher
        self.contest = contest
        self.EMAIL_REG = re.compile(r"[^@]+@[^@]+\.[^@]+")
        self.USERNAME_REG = re.compile(r"^[A-Za-z0-9_\.]+$")

    def __call__(self, environ, start_response):
        return self.wsgi_app(environ, start_response)

    @responder
    def wsgi_app(self, environ, start_response):
        route = self.router.bind_to_environ(environ)
        try:
            endpoint, args = route.match()
        except HTTPException:
            return NotFound()

        request = Request(environ)

        try:
            if endpoint == "root":
                return self.file_handler(environ, "index.html")
            elif endpoint == "dbfile":
                return self.dbfile_handler(environ, args)
            elif endpoint == "check":
                return self.check_handler(request)
            elif endpoint == "register":
                return self.register_handler(request)
            elif endpoint == "login":
                return self.login_handler(request)
            elif endpoint == "tasks":
                return self.tasks_handler()
            elif endpoint == "submissions":
                return self.submissions_handler(request)
        except HTTPException as e:
            return e

        return NotFound()

    def get_user(self, session, contest, username, token):
        return session.query(User)\
            .filter(User.contest == contest)\
            .filter(User.username == username)\
            .filter(User.password == token).first()

    def get_req_user(self, session, contest, request):
        if request.authorization is not None and \
           request.authorization.type == "basic":
            username = request.authorization.username
            token = request.authorization.password
            user = self.get_user(session, contest, username, token)
            if user is None:
                raise Unauthorized()
            return user
        else:
            raise Unauthorized()

    def load_json(self, request):
        if request.mimetype != "application/json":
            raise BadRequest()
        try:
            req = json.load(request.stream)
        except ValueError:
            raise BadRequest()
        return req

    def dump_json(self, data):
        response = Response()
        response.mimetype = "application/json"
        response.status_code = 200
        response.data = json.dumps(data)
        return response

    def check_user(self, username):
        resp = dict()
        if len(username) < 4:
            resp["success"] = 0
            resp["error"] = "Username troppo corto"
        elif not self.USERNAME_REG.match(username):
            resp["success"] = 0
            resp["error"] = "Caratteri non validi nell'username"
        else:
            with SessionGen() as session:
                contest = Contest.get_from_id(self.contest, session)
                user = session.query(User)\
                    .filter(User.contest == contest)\
                    .filter(User.username == username).first()
                if user is None:
                    resp["success"] = 1
                else:
                    resp["success"] = 0
                    resp["error"] = "Username gia' esistente"
        return resp

    def check_email(self, email):
        resp = dict()
        if not self.EMAIL_REG.match(email):
            resp["success"] = 0
            resp["error"] = "Indirizzo email non valido"
        else:
            with SessionGen() as session:
                contest = Contest.get_from_id(self.contest, session)
                user = session.query(User)\
                    .filter(User.contest == contest)\
                    .filter(User.email == email).first()
                if user is None:
                    resp["success"] = 1
                else:
                    resp["success"] = 0
                    resp["error"] = "Email gia' esistente"
        return resp

    def file_handler(self, environ, filename):
        path = os.path.join(
            pkg_resources.resource_filename("cms.web", "practice"),
            filename)

        response = Response()
        response.status_code = 200
        response.mimetype = "application/octect-stream"
        mimetype = mimetypes.guess_type(filename)[0]
        if mimetype is not None:
            response.mimetype = mimetype
        response.last_modified = \
            datetime.utcfromtimestamp(os.path.getmtime(path))\
                    .replace(microsecond=0)
        response.response = wrap_file(environ, io.open(path, 'rb'))
        response.direct_passthrough = True
        return response

    def dbfile_handler(self, environ, args):
        try:
            fobj = self.file_cacher.get_file(args["digest"])
        except KeyError:
            raise NotFound()

        response = Response()
        response.status_code = 200

        response.mimetype = "application/octect-stream"
        if "filename" in args:
            response.headers.add_header(
                b'Content-Disposition', b'attachment',
                filename=args["filename"])
            mimetype = mimetypes.guess_type(args['filename'])[0]
            if mimetype is not None:
                response.mimetype = mimetype

        response.response = wrap_file(environ, fobj)
        response.direct_passthrough = True
        return response

    def check_handler(self, request):
        req = self.load_json(request)
        try:
            rtype = req["type"]
            rvalue = req["value"]
        except KeyError:
            raise BadRequest()

        if rtype == "username":
            return self.dump_json(self.check_user(rvalue))
        elif rtype == "email":
            return self.dump_json(self.check_email(rvalue))

        raise BadRequest()

    def register_handler(self, request):
        req = self.load_json(request)
        try:
            username = req["username"]
            password = req["password"]
            email = req["email"]
            firstname = req["firstname"]
            lastname = req["lastname"]
        except KeyError:
            raise BadRequest()

        sha = hashlib.sha256()
        sha.update(password)
        sha.update(config.secret_key)
        token = sha.hexdigest()

        resp = self.check_user(username)
        if not resp["success"]:
            return self.dump_json(resp)
        resp = self.check_email(email)
        if not resp["success"]:
            return self.dump_json(resp)

        resp["success"] = 1
        with SessionGen() as session:
            user = User(
                first_name=firstname,
                last_name=lastname,
                username=username,
                password=token,
                email=email
            )
            user.contest = Contest.get_from_id(self.contest, session)
            try:
                session.add(user)
                session.commit()
            except IntegrityError:
                resp["success"] = 0
                resp["error"] = "USER_EXISTS"
        return self.dump_json(resp)

    def login_handler(self, request):
        req = self.load_json(request)
        try:
            username = req["username"]
            password = req["password"]
        except KeyError:
            raise BadRequest()

        sha = hashlib.sha256()
        sha.update(password)
        sha.update(config.secret_key)
        token = sha.hexdigest()

        resp = dict()
        with SessionGen() as session:
            contest = Contest.get_from_id(self.contest, session)
            user = self.get_user(session, contest, username, token)
            if user is None:
                resp["success"] = 0
            else:
                resp["success"] = 1
                resp["token"] = token
        return self.dump_json(resp)

    def tasks_handler(self):
        resp = dict()
        with SessionGen() as session:
            contest = Contest.get_from_id(self.contest, session)
            tasks = []
            for t in contest.tasks:
                task = {}
                task["id"] = t.id
                task["name"] = t.name
                task["title"] = t.title
                task["statements"] =\
                    dict([(l, s.digest) for l, s in t.statements.iteritems()])
                task["submission_format"] =\
                    [sfe.filename for sfe in t.submission_format]
                for i in ["time_limit", "memory_limit", "task_type",
                          "score_type_parameters", "score_type"]:
                    task[i] = getattr(t.active_dataset, i)
                att = dict()
                for (name, obj) in t.attachments.iteritems():
                    att[name] = obj.digest
                task["attachments"] = att
                tasks.append(task)
        resp["tasks"] = tasks
        return self.dump_json(resp)

    def submissions_handler(self, request):
        req = self.load_json(request)
        try:
            last = datetime.utcfromtimestamp(req["last"])
        except (ValueError, KeyError):
            raise BadRequest()

        resp = dict()
        with SessionGen() as session:
            contest = Contest.get_from_id(self.contest, session)
            user = self.get_req_user(session, contest, request)
            subs = session.query(Submission)\
                .filter(Submission.user_id == user.id)\
                .filter(Submission.timestamp > last).all()
            submissions = []
            for s in subs:
                submission = dict()
                submission["id"] = s.id
                submission["task_id"] = s.task_id
                submission["timestamp"] = make_timestamp(s.timestamp)
                result = s.get_result()
                for i in ["compilation_outcome", "evaluation_outcome",
                          "score"]:
                    submission[i] = getattr(result, i)
                submissions.append(submission)
        resp["submissions"] = submissions
        return self.dump_json(resp)


class PracticeWebServer(WebService):
    """Service that runs the web server for practice.

    """
    def __init__(self, shard, contest):
        self.contest = contest

        WebService.__init__(
            self,
            config.contest_listen_port[shard],
            [],
            {},
            shard=shard,
            listen_address=config.contest_listen_address[shard])

        self.file_cacher = FileCacher(self)
        self.contest = contest

        handler = APIHandler(self.file_cacher, self.contest)

        self.wsgi_app = SharedDataMiddleware(handler, {
            '/':        ("cms.web", "practice"),
            '/assets':  ("cms.web", "assets")
        })
