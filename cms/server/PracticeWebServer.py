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

from datetime import datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy import desc

from cms import config, SOURCE_EXT_TO_LANGUAGE_MAP
from cms.log import initialize_logging
from cms.io.GeventLibrary import Service
from cms.io import ServiceCoord
from cms.db.filecacher import FileCacher
from cms.db import SessionGen, User, Contest, Submission, File, Task, Test, \
    Tag, Forum, Topic, Post
from cmscommon.DateTime import make_timestamp, make_datetime

from werkzeug.wrappers import Response, Request
from werkzeug.wsgi import SharedDataMiddleware, wrap_file, responder
from werkzeug.routing import Map, Rule
from werkzeug.exceptions import HTTPException, NotFound, BadRequest, \
    Unauthorized

import gevent
import gevent.wsgi

logger = logging.getLogger(__name__)


class WSGIHandler(gevent.wsgi.WSGIHandler):
    def format_request(self):
        if self.time_finish:
            delta = '%.6f' % (self.time_finish - self.time_start)
        else:
            delta = '-'
        client_address = self.environ['REMOTE_ADDR']
        return '%s %s %s %s' % (
            client_address or '-',
            (getattr(self, 'status', None) or '000').split()[0],
            delta,
            getattr(self, 'requestline', ''))

    def log_request(self):
        logger.info(self.format_request())

    def get_environ(self):
        env = gevent.wsgi.WSGIHandler.get_environ(self)
        # Proxy support
        if config.is_proxy_used:
            if 'HTTP_X_FORWARDED_FOR' in env:
                env['REMOTE_ADDR'] = \
                    env['HTTP_X_FORWARDED_FOR'].split(',')[0].strip()
            elif 'HTTP_X_REAL_IP' in env:
                env['REMOTE_ADDR'] = env['HTTP_X_REAL_IP']
        return env


class Server(gevent.wsgi.WSGIServer):
    handler_class = WSGIHandler


class APIHandler(object):
    def __init__(self, parent):
        self.router = Map([
            Rule('/', methods=['GET', 'POST'], endpoint='root'),
            Rule('/files/<digest>', methods=['GET', 'POST'],
                 endpoint='dbfile'),
            Rule('/files/<digest>/<name>', methods=['GET', 'POST'],
                 endpoint='dbfile'),
            Rule('/check', methods=['POST'], endpoint='check'),
            Rule('/user', methods=['POST'], endpoint='user'),
            Rule('/task', methods=['POST'], endpoint='task'),
            Rule('/test', methods=['POST'], endpoint='test'),
            Rule('/tag', methods=['POST'], endpoint='tag'),
            Rule('/submission', methods=['POST'], endpoint='submission'),
            Rule('/forum', methods=['POST'], endpoint='forum'),
            Rule('/topic', methods=['POST'], endpoint='topic'),
            Rule('/post', methods=['POST'], endpoint='post')
        ], encoding_errors='strict')
        self.file_cacher = parent.file_cacher
        self.contest = parent.contest
        self.evaluation_service = parent.evaluation_service
        self.EMAIL_REG = re.compile(r'[^@]+@[^@]+\.[^@]+')
        self.USERNAME_REG = re.compile(r'^[A-Za-z0-9_\.]+$')

    def __call__(self, environ, start_response):
        return self.wsgi_app(environ, start_response)

    @responder
    def wsgi_app(self, environ, start_response):
        route = self.router.bind_to_environ(environ)
        try:
            endpoint, args = route.match()
        except HTTPException:
            return NotFound()

        try:
            if endpoint == 'root':
                return self.file_handler(environ, 'index.html')
            elif endpoint == 'dbfile':
                return self.dbfile_handler(environ, args)
        except HTTPException as e:
            return e

        request = Request(environ)
        if request.mimetype != 'application/json':
            logger.warning('Request not in JSON')
            data = dict()
        else:
            try:
                data = json.load(request.stream)
            except (ValueError, TypeError):
                logger.warning('JSON parse error')
                data = dict()

        try:
            ans = getattr(self, endpoint + '_handler')(data)
        except AttributeError:
            logger.error('Endpoint %s not implemented yet!' % endpoint)
            return NotFound()
        except KeyError:
            return BadRequest()
        except HTTPException as e:
            return e

        response = Response()
        response.mimetype = 'application/json'
        response.status_code = 200
        response.data = json.dumps(ans)
        return response

    # Useful methods
    def get_user(self, session, contest, username, token):
        return session.query(User)\
            .filter(User.contest == contest)\
            .filter(User.username == username)\
            .filter(User.password == token).first()

    def get_req_user(self, session, contest, data):
        try:
            username = data['username']
            token = data['token']
            user = self.get_user(session, contest, username, token)
            if user is None:
                raise Unauthorized()
            return user
        except (BadRequest, KeyError):
            raise Unauthorized()

    def get_access_level(self,
                         session=None,
                         contest=None,
                         data=None,
                         user=None):
        try:
            if user is None:
                user = self.get_req_user(session, contest, data)
            return user.access_level
        except Unauthorized:
            return 7            # Access level of non-logged user

    def check_user(self, username):
        resp = dict()
        if len(username) < 4:
            resp['success'] = 0
            resp['error'] = 'USERNAME_SHORT'
        elif not self.USERNAME_REG.match(username):
            resp['success'] = 0
            resp['error'] = 'USERNAME_INVALID'
        else:
            with SessionGen() as session:
                contest = Contest.get_from_id(self.contest, session)
                user = session.query(User)\
                    .filter(User.contest == contest)\
                    .filter(User.username == username).first()
                if user is None:
                    resp['success'] = 1
                else:
                    resp['success'] = 0
                    resp['error'] = 'USERNAME_EXISTS'
        return resp

    def check_email(self, email):
        resp = dict()
        if not self.EMAIL_REG.match(email):
            resp['success'] = 0
            resp['error'] = 'EMAIL_INVALID'
        else:
            with SessionGen() as session:
                contest = Contest.get_from_id(self.contest, session)
                user = session.query(User)\
                    .filter(User.contest == contest)\
                    .filter(User.email == email).first()
                if user is None:
                    resp['success'] = 1
                else:
                    resp['success'] = 0
                    resp['error'] = 'EMAIL_EXISTS'
        return resp

    def hash(self, string, algo='sha256'):
        sha = getattr(hashlib, algo)()
        sha.update(string)
        return sha.hexdigest()

    # Handlers that do not require JSON data
    def file_handler(self, environ, filename):
        path = os.path.join(
            pkg_resources.resource_filename('cms.web', 'practice'),
            filename)

        response = Response()
        response.status_code = 200
        response.mimetype = 'application/octect-stream'
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
            fobj = self.file_cacher.get_file(args['digest'])
        except KeyError:
            raise NotFound()

        response = Response()
        response.status_code = 200

        response.mimetype = 'application/octect-stream'
        if 'filename' in args:
            response.headers.add_header(
                b'Content-Disposition', b'attachment',
                filename=args['filename'])
            mimetype = mimetypes.guess_type(args['filename'])[0]
            if mimetype is not None:
                response.mimetype = mimetype

        response.response = wrap_file(environ, fobj)
        response.direct_passthrough = True
        return response

    # Handlers that require JSON data
    def check_handler(self, data):
        try:
            rtype = data['type']
            rvalue = data['value']
        except KeyError:
            logger.warning('Missing parameters')
            raise BadRequest()

        if rtype == 'username':
            return self.check_user(rvalue)
        elif rtype == 'email':
            return self.check_email(rvalue)

        logger.warning('Request type not understood')
        raise BadRequest()

    def user_handler(self, data):
        if data['action'] == 'new':
            try:
                username = data['username']
                password = data['password']
                email = data['email']
                firstname = data['firstname']
                lastname = data['lastname']
            except KeyError:
                logger.warning('Missing parameters')
                raise BadRequest()

            token = self.hash(password + config.secret_key)

            resp = self.check_user(username)
            if not resp['success']:
                return resp
            resp = self.check_email(email)
            if not resp['success']:
                return resp

            resp['success'] = 1
            with SessionGen() as session:
                user = User(
                    first_name=firstname,
                    last_name=lastname,
                    username=username,
                    password=token,
                    email=email,
                    access_level=6
                )
                user.contest = Contest.get_from_id(self.contest, session)
                try:
                    session.add(user)
                    session.commit()
                except IntegrityError:
                    resp['success'] = 0
                    resp['error'] = 'USER_EXISTS'
        elif data['action'] == 'login':
            try:
                username = data['username']
                password = data['password']
            except KeyError:
                logger.warning('Missing parameter')
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
                    resp['success'] = 0
                else:
                    resp['success'] = 1
                    resp['token'] = token
                    resp['access_level'] = user.access_level
            return resp
        elif data['action'] == 'get_access_level':
            with SessionGen() as session:
                contest = Contest.get_from_id(self.contest, session)
                resp['access_level'] = self.get_access_level(session,
                                                             contest,
                                                             data)
        else:
            raise BadRequest()
        return resp

    def task_handler(self, data):
        resp = dict()
        with SessionGen() as session:
            contest = Contest.get_from_id(self.contest, session)
            access_level = self.get_access_level(session, contest, data)
            if data['action'] == 'list':
                if 'tag' in data:
                    tasks = session.query(Task)\
                        .filter(Task.contest_id == contest.id)\
                        .filter(Task.tags.any(name=data['tag']))\
                        .filter(Task.access_level >= access_level)\
                        .order_by(desc(Task.id))\
                        .slice(data['first'], data['last']).all()
                    resp['num'] = session.query(Task)\
                        .filter(Task.tags.any(name=data['tag']))\
                        .filter(Task.access_level >= access_level)\
                        .filter(Task.contest_id == contest.id).count()
                else:
                    tasks = session.query(Task)\
                        .filter(Task.contest_id == contest.id)\
                        .filter(Task.access_level >= access_level)\
                        .order_by(desc(Task.id))\
                        .slice(data['first'], data['last']).all()
                    resp['num'] = session.query(Task)\
                        .filter(Task.access_level >= access_level)\
                        .filter(Task.contest_id == contest.id).count()
                resp['tasks'] = []
                for t in tasks:
                    task = dict()
                    task['id'] = t.id
                    task['name'] = t.name
                    task['title'] = t.title
                    resp['tasks'].append(task)
            elif data['action'] == 'get':
                t = session.query(Task)\
                    .filter(Task.name == data['name'])\
                    .filter(Task.contest_id == contest.id)\
                    .filter(Task.access_level >= access_level)\
                    .first()
                if t is None:
                    raise NotFound()
                resp['id'] = t.id
                resp['name'] = t.name
                resp['title'] = t.title
                resp['statements'] =\
                    dict([(l, s.digest) for l, s in t.statements.iteritems()])
                resp['submission_format'] =\
                    [sfe.filename for sfe in t.submission_format]
                for i in ['time_limit', 'memory_limit', 'task_type']:
                    resp[i] = getattr(t.active_dataset, i)
                att = []
                for (name, obj) in t.attachments.iteritems():
                    att.append((name, obj.digest))
                resp['attachments'] = att
                resp['tags'] = [tag.name for tag in t.tags]
            else:
                raise BadRequest()
        return resp

    def tag_handler(self, data):
        resp = dict()
        with SessionGen() as session:
            if data['action'] == 'list':
                tags = session.query(Tag).order_by(Tag.id).all()
                resp['tags'] = [t.name for t in tags]
                return resp

            contest = Contest.get_from_id(self.contest, session)
            access_level = self.get_access_level(session, contest, data)
            resp['success'] = 0
            if data['action'] == 'create':
                if access_level >= 4:
                    raise Unauthorized()
                try:
                    if len(data['description']) < 5:
                        resp['error'] = 'DESCRIPTION_SHORT'
                    else:
                        tag = Tag(
                            name=data['tag'],
                            description=data['description']
                        )
                        session.add(tag)
                        session.commit()
                        resp['success'] = 1
                except KeyError:
                    resp['error'] = 'DATA_MISSING'
                except IntegrityError:
                    resp['error'] = 'TAG_EXISTS'
            elif data['action'] == 'delete':
                if access_level >= 4:
                    raise Unauthorized()
                try:
                    tag = session.query(Tag)\
                        .filter(Tag.name == data['tag']).first()
                    if tag is None:
                        resp['error'] = 'TAG_DOESNT_EXIST'
                    else:
                        session.delete(tag)
                        session.commit()
                        resp['success'] = 1
                except KeyError:
                    resp['error'] = 'DATA_MISSING'
            elif data['action'] == 'add':
                if access_level >= 5:
                    raise Unauthorized()
                try:
                    tag = session.query(Tag)\
                        .filter(Tag.name == data['tag']).first()
                    task = session.query(Task)\
                        .filter(Task.name == data['task'])\
                        .filter(Task.contest_id == contest.id).first()
                    if tag is None:
                        resp['error'] = 'TAG_DOESNT_EXIST'
                    elif task is None:
                        resp['error'] = 'TASK_DOESNT_EXIST'
                    elif tag in task.tags:
                        resp['error'] = 'TASK_TAG_ASSOC'
                    else:
                        task.tags.append(tag)
                        session.commit()
                        resp['success'] = 1
                except KeyError:
                    resp['error'] = 'DATA_MISSING'
            elif data['action'] == 'remove':
                if access_level >= 5:
                    raise Unauthorized()
                try:
                    tag = session.query(Tag)\
                        .filter(Tag.name == data['tag']).first()
                    task = session.query(Task)\
                        .filter(Task.name == data['task'])\
                        .filter(Task.contest_id == contest.id).first()
                    if tag is None:
                        resp['error'] = 'TAG_DOESNT_EXIST'
                    elif task is None:
                        resp['error'] = 'TASK_DOESNT_EXIST'
                    elif tag not in task.tags:
                        resp['error'] = 'TASK_TAG_NOT_ASSOC'
                    else:
                        task.tags.remove(tag)
                        session.commit()
                        resp['success'] = 1
                except KeyError:
                    resp['error'] = 'DATA_MISSING'
            else:
                raise BadRequest()
            return resp

    def test_handler(self, data):
        resp = dict()
        with SessionGen() as session:
            contest = Contest.get_from_id(self.contest, session)
            access_level = self.get_access_level(session, contest, data)
            if data['action'] == 'list':
                tests = session.query(Test)\
                    .filter(Test.access_level >= access_level)\
                    .order_by(Test.id).all()
                resp['tests'] = []
                for t in tests:
                    resp['tests'].append({
                        'name': t.name,
                        'description': t.description
                    })
            elif data['action'] == 'get':
                test = session.query(Test)\
                    .filter(Test.name == data['test_name'])\
                    .filter(Test.access_level >= access_level).first()
                if test is None:
                    raise NotFound()
                resp['name'] = test.name
                resp['description'] = test.description
                resp['questions'] = []
                for i in test.questions:
                    q = dict()
                    q['type'] = i.type
                    q['text'] = i.text
                    q['max_score'] = i.score
                    ansdata = json.loads(i.answers)
                    if i.type == 'choice':
                        q['choices'] = [t[0] for t in ansdata]
                    else:
                        q['answers'] = [[t[0], len(t[1])] for t in ansdata]
                    resp['questions'].append(q)
            elif data['action'] == 'answer':
                test = session.query(Test)\
                    .filter(Test.name == data['test_name'])\
                    .filter(Test.access_level >= access_level).first()
                if test is None:
                    raise NotFound()
                data = data['answers']
                for i in xrange(len(test.questions)):
                    q = test.questions[i]
                    ansdata = json.loads(q.answers)
                    if q.type == 'choice':
                        resp[i] = [q.wrong_score, 'wrong']
                        try:
                            if data[i] is None:
                                resp[i] = [0, 'empty']
                            elif ansdata[int(data[i])][1]:
                                resp[i] = [q.score, 'correct']
                        except IndexError:
                            pass
                        continue
                    else:
                        for key, correct in ansdata:
                            ans = data[i].get(key, None)
                            if len(ans) != len(correct):
                                resp[i] = [q.wrong_score, 'wrong']
                            for a in xrange(len(ans)):
                                if ans[a] is None:
                                    resp[i] = [0, 'empty']
                                    break
                                if q.type == 'number':
                                    an = float(ans[a])
                                    cor = float(correct[a])
                                else:
                                    an = ans[a].lower()
                                    cor = correct[a].lower()
                                if an != cor:
                                    resp[i] = [q.wrong_score, 'wrong']
                        if resp.get(i, None) is None:
                            resp[i] = [q.score, 'correct']
            else:
                raise BadRequest()
            return resp

    def submission_handler(self, data):
        resp = dict()
        with SessionGen() as session:
            contest = Contest.get_from_id(self.contest, session)
            user = self.get_req_user(session, contest, data)
            if data['action'] == 'list':
                task = session.query(Task)\
                    .filter(Task.contest_id == contest.id)\
                    .filter(Task.name == data['task_name']).first()
                if task is None:
                    raise NotFound()
                subs = session.query(Submission)\
                    .filter(Submission.user_id == user.id)\
                    .filter(Submission.task_id == task.id)\
                    .order_by(desc(Submission.timestamp)).all()
                submissions = []
                for s in subs:
                    submission = dict()
                    submission['id'] = s.id
                    submission['task_id'] = s.task_id
                    submission['timestamp'] = make_timestamp(s.timestamp)
                    submission['files'] = []
                    for name, f in s.files.iteritems():
                        fi = dict()
                        if s.language is None:
                            fi['name'] = name
                        else:
                            fi['name'] = name.replace('%l', s.language)
                        fi['digest'] = f.digest
                        submission['files'].append(fi)
                    result = s.get_result()
                    for i in ['compilation_outcome', 'evaluation_outcome']:
                        submission[i] = getattr(result, i, None)
                    if result is not None and result.score is not None:
                        submission['score'] = round(result.score, 2)
                    submissions.append(submission)
                resp['submissions'] = submissions
            elif data['action'] == 'details':
                s = session.query(Submission)\
                    .filter(Submission.id == data['id']).first()
                if s is None:
                    raise NotFound()
                if s.user_id != user.id:
                    raise Unauthorized()
                submission = dict()
                submission['id'] = s.id
                submission['task_id'] = s.task_id
                submission['timestamp'] = make_timestamp(s.timestamp)
                submission['language'] = s.language
                submission['files'] = []
                for name, f in s.files.iteritems():
                    fi = dict()
                    if s.language is None:
                        fi['name'] = name
                    else:
                        fi['name'] = name.replace('%l', s.language)
                    fi['digest'] = f.digest
                    submission['files'].append(fi)
                result = s.get_result()
                for i in ['compilation_outcome', 'evaluation_outcome',
                          'compilation_stdout', 'compilation_stderr',
                          'compilation_time', 'compilation_memory']:
                    submission[i] = getattr(result, i, None)
                if result is not None and result.score is not None:
                    submission['score'] = round(result.score, 2)
                if result is not None and result.score_details is not None:
                    tmp = json.loads(result.score_details)
                    if len(tmp) > 0 and 'text' in tmp[0]:
                        subt = dict()
                        subt['testcases'] = tmp
                        subt['score'] = submission['score']
                        subt['max_score'] = 100
                        submission['score_details'] = [subt]
                    else:
                        submission['score_details'] = tmp
                    for subtask in submission['score_details']:
                        for testcase in subtask['testcases']:
                            data = json.loads(testcase['text'])
                            testcase['text'] = data[0] % tuple(data[1:])
                else:
                    submission['score_details'] = None
                resp = submission
            elif data['action'] == 'new':
                lastsub = session.query(Submission)\
                    .filter(Submission.user_id == user.id)\
                    .order_by(desc(Submission.timestamp)).first()
                if lastsub is not None and \
                   make_datetime() - lastsub.timestamp < timedelta(seconds=20):
                    return {'success': 0, 'error': 'SHORT_INTERVAL'}

                # TODO: implement checks (size), archives and
                # (?) partial submissions
                try:
                    task = contest.get_task(data['task_name'])
                except KeyError:
                    raise NotFound()
                resp = dict()
                resp['success'] = 1

                # Detect language
                files = []
                sub_lang = None
                for sfe in task.submission_format:
                    f = data['files'].get(sfe.filename)
                    if f is None:
                        return {'success': 0, 'error': 'FILES_MISSING'}
                    f['name'] = sfe.filename
                    files.append(f)
                    if sfe.filename.endswith('.%l'):
                        language = None
                        for ext, l in SOURCE_EXT_TO_LANGUAGE_MAP.iteritems():
                            if f['filename'].endswith(ext):
                                language = l
                        if language is None:
                            return {'success': 0, 'error': 'LANGUAGE_UNKNOWN'}
                        elif sub_lang is not None and sub_lang != language:
                            return {'success': 0,
                                    'error': 'LANGUAGE_DIFFERENT'}
                        else:
                            sub_lang = language

                # Add the submission
                timestamp = make_datetime()
                submission = Submission(timestamp,
                                        sub_lang,
                                        user=user,
                                        task=task)
                for f in files:
                    digest = self.file_cacher.put_file_content(
                        f['data'].encode('utf-8'),
                        'Submission file %s sent by %s at %d.' % (
                            f['name'], user.username,
                            make_timestamp(timestamp)))
                    session.add(File(f['name'], digest, submission=submission))
                session.add(submission)
                session.commit()

                # Notify ES
                self.evaluation_service.new_submission(
                    submission_id=submission.id
                )

                # Answer with submission data
                resp['id'] = submission.id
                resp['task_id'] = submission.task_id
                resp['timestamp'] = make_timestamp(submission.timestamp)
                resp['compilation_outcome'] = None
                resp['evaluation_outcome'] = None
                resp['score'] = None
                resp['files'] = []
                for name, f in submission.files.iteritems():
                    fi = dict()
                    if submission.language is None:
                        fi['name'] = name
                    else:
                        fi['name'] = name.replace('%l', submission.language)
                    fi['digest'] = f.digest
                    resp['files'].append(fi)
            else:
                raise BadRequest()
        return resp

    def forum_handler(self, data):
        resp = dict()
        with SessionGen() as session:
            contest = Contest.get_from_id(self.contest, session)
            access_level = self.get_access_level(session, contest, data)
            if data['action'] == 'list':
                forums = session.query(Forum)\
                    .filter(Forum.access_level >= access_level)\
                    .order_by(desc(Forum.id)).all()
                resp['forums'] = []
                for f in forums:
                    forum = dict()
                    forum['id'] = f.id
                    forum['description'] = f.description
                    forum['title'] = f.title
                    resp['forums'].append(forum)
            elif data['action'] == 'new':
                if access_level > 1:
                    raise Unauthorized()
                forum = Forum(title=data['title'],
                              description=data['description'],
                              access_level=7)
                session.add(forum)
                session.commit()
                resp['success'] = 1
            else:
                raise BadRequest()
        return resp

    def topic_handler(self, data):
        resp = dict()
        with SessionGen() as session:
            contest = Contest.get_from_id(self.contest, session)
            user = self.get_req_user(session, contest, data)
            access_level = self.get_access_level(user=user)
            if data['action'] == 'list':
                forum = session.query(Forum)\
                    .filter(Forum.access_level >= access_level)\
                    .filter(Forum.id == data['forum']).first()
                if forum is None:
                    raise NotFound()
                resp['title'] = forum.title
                resp['description'] = forum.description
                topics = session.query(Topic)\
                    .filter(Topic.forum_id == forum.id)\
                    .order_by(desc(Topic.timestamp))\
                    .slice(data['first'], data['last']).all()
                num = session.query(Topic)\
                    .filter(Topic.forum_id == forum.id).count()
                resp['num'] = num
                resp['topics'] = []
                for t in topics:
                    topic = dict()
                    topic['id'] = t.id
                    topic['status'] = t.status
                    topic['title'] = t.title
                    topic['timestamp'] = make_timestamp(t.timestamp)
                    resp['topics'].append(topic)
            elif data['action'] == 'new':
                forum = session.query(Forum)\
                    .filter(Forum.access_level >= access_level)\
                    .filter(Forum.id == data['forum']).first()
                if forum is None:
                    raise NotFound()
                topic = Topic(status='open',
                              title=data['title'],
                              timestamp=make_datetime())
                topic.forum = forum
                post = Post(text=data['text'],
                            timestamp=make_datetime())
                post.author = self.user
                post.topic = topic
                session.add(topic)
                session.add(post)
                session.commit()
                resp['success'] = 1
            else:
                raise BadRequest()
        return resp

    def post_handler(self, data):
        resp = dict()
        with SessionGen() as session:
            contest = Contest.get_from_id(self.contest, session)
            access_level = self.get_access_level(session, contest, data)
            if data['action'] == 'list':
                topic = session.query(Topic)\
                    .filter(Topic.id == data['topic']).first()
                if topic is None:
                    raise NotFound()
                posts = session.query(Post)\
                    .filter(Post.topic_id == topic.id)\
                    .order_by(Post.timestamp)\
                    .slice(data['first'], data['last']).all()
                num = session.query(Post)\
                    .filter(Post.topic_id == topic.id).count()
                resp['num'] = num
                resp['posts'] = []
                for p in posts:
                    post = dict()
                    post['id'] = p.id
                    post['text'] = p.text
                    post['timestamp'] = make_timestamp(p.timestamp)
                    post['author_username'] = p.author.username
                    post['author_mailhash'] = self.hash(p.author.email, 'md5')
                    resp['post'].append(post)
            elif data['action'] == 'new':
                topic = session.query(Topic)\
                    .filter(Topic.access_level >= access_level)\
                    .filter(Topic.id == data['topic']).first()
                if topic is None:
                    raise NotFound()
                post = Post(text=data['text'],
                            timestamp=make_datetime())
                post.author = self.user
                post.topic = topic
                topic.timestamp = post.timestamp
                session.add(post)
                session.commit()
                resp['success'] = 1
            else:
                raise BadRequest()
        return resp


class PracticeWebServer(Service):
    '''Service that runs the web server for practice.

    '''
    def __init__(self, shard, contest):
        initialize_logging('PracticeWebServer', shard)

        Service.__init__(self, shard=shard)

        self.address = config.contest_listen_address[shard]
        self.port = config.contest_listen_port[shard]
        self.file_cacher = FileCacher(self)
        self.contest = contest
        self.evaluation_service = self.connect_to(
            ServiceCoord('EvaluationService', 0))

        handler = APIHandler(self)

        self.wsgi_app = SharedDataMiddleware(handler, {
            '/':        ('cms.web', 'practice'),
            '/assets':  ('cms.web', 'assets')
        })

    def run(self):
        server = Server((self.address, self.port), self.wsgi_app)
        gevent.spawn(server.serve_forever)
        Service.run(self)
