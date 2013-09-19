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
import logging
import pkg_resources
from datetime import datetime

from cms import config
from cms.io import WebService
from cms.db.filecacher import FileCacher

from werkzeug.wrappers import Response
from werkzeug.wsgi import SharedDataMiddleware, DispatcherMiddleware, \
    wrap_file, responder
from werkzeug.routing import Map, Rule
from werkzeug.exceptions import HTTPException, NotFound


logger = logging.getLogger(__name__)


class FileHandler(object):
    def __init__(self, filename, mimetype):
        self.filename = filename
        self.mimetype = mimetype

    def __call__(self, environ, start_response):
        return self.wsgi_app(environ, start_response)

    @responder
    def wsgi_app(self, environ, start_response):
        path = os.path.join(
            pkg_resources.resource_filename("cms.web", "practice"),
            self.filename)

        response = Response()
        response.status_code = 200
        response.mimetype = self.mimetype
        response.last_modified = \
            datetime.utcfromtimestamp(os.path.getmtime(path))\
                    .replace(microsecond=0)
        response.response = wrap_file(environ, io.open(path, 'rb'))
        response.direct_passthrough = True
        return response


class DBFileHandler(object):
    def __init__(self, file_cacher, mimetype):
        self.file_cacher = file_cacher
        self.mimetype = mimetype
        self.router = Map([
            Rule("/<digest>", methods=["GET"], endpoint="get"),
            Rule("/<digest>/<filename>", methods=["GET"], endpoint="get")
        ], encoding_errors="strict")

    def __call__(self, environ, start_response):
        return self.wsgi_app(environ, start_response)

    @responder
    def wsgi_app(self, environ, start_response):
        route = self.router.bind_to_environ(environ)

        try:
            endpoint, args = route.match()
        except HTTPException as exc:
            return exc(environ, start_response)

        try:
            if endpoint == "get":
                return self.get(args, environ)
        except HTTPException as exc:
            return exc

        return NotFound()

    def get(self, args, environ):
        try:
            fobj = self.file_cacher.get_file(args["digest"])
        except KeyError:
            raise NotFound()

        response = Response()
        response.status_code = 200
        response.mimetype = self.mimetype
        if "filename" in args:
            response.headers.add_header(
                b'Content-Disposition', b'attachment',
                filename=args["filename"])
        response.response = wrap_file(environ, fobj)
        response.direct_passthrough = True
        return response


class RoutingHandler(object):
    def __init__(self):
        self.router = Map([
            Rule("/", methods=["GET"], endpoint="root"),
        ], encoding_errors="strict")

        self.root_handler = FileHandler("index.html", "text/html")

    def __call__(self, environ, start_response):
        return self.wsgi_app(environ, start_response)

    def wsgi_app(self, environ, start_response):
        route = self.router.bind_to_environ(environ)
        try:
            endpoint, args = route.match()
        except HTTPException as exc:
            return exc(environ, start_response)

        if endpoint == "root":
            return self.root_handler(environ, start_response)

        return NotFound()


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

        self.wsgi_app = SharedDataMiddleware(RoutingHandler(), {
            '/':        ("cms.web", "practice"),
            '/assets':  ("cms.web", "assets")
        })

        self.wsgi_app = DispatcherMiddleware(self.wsgi_app, {
            '/statement':   DBFileHandler(self.file_cacher, "application/pdf"),
            '/source':      DBFileHandler(self.file_cacher, "text/plain"),
            '/attachment':  DBFileHandler(self.file_cacher,
                                          "application/octect-stream")
        })
