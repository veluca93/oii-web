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

from werkzeug.wrappers import Request, Response
from werkzeug.routing import Map, Rule
from werkzeug.local import Local, LocalManager
from werkzeug.exceptions import HTTPException, NotFound
from werkzeug.wsgi import responder, wrap_file


# We keep a greenlet-local storage to get easy access to some handy
# objects (unique for each request, like the Request object itself,
# the partial Response object, a Session, a MapAdapter, etc.) without
# passing them around as parameters to all the code that needs them.
local = Local()
local_manager = LocalManager([local])


class FileAPIMiddleware(object):
    """A RESTful HTTP API to access and alter files in the storage.

    This WSGI application tries to port the FileCacher interface to
    HTTP. It focuses more on the backend storage features (i.e. the
    get_file*, put_file*, describe and delete methods) rather than on
    the caching abilities (i.e. load, save, drop, purge_cache and
    destroy_cache methods), in that it provides only the former ones.

    Being RESTful, each file is an entity with an URL in the form
    "/<digest>", which supports GET and DELETE methods (with obvious
    meaning). The description is available at "/<digest>/description".
    PUT and PATCH aren't supported because by changing the content of
    the file its digest changes too, effectively creating a new file.
    New files can be created with a POST request to "/". The URL of the
    newly created file (from which the digest can be extracted) is put
    in the Location header of the response.

    The body of GET responses will always contain the file's content
    verbatim. The same is expected for PUT requests. Descriptions will
    be UTF8-encoded text/plain resources.

    The MIME type of files isn't stored. This means that we'll ignore
    the Content-Type of incoming files and that we will use
    "application/octet-stream" for served files.

    The filename isn't stored either but, since browser clients benefit
    from Content-Disposition: attachment headers that declare the
    filename, the client can request such a header with a "filename"
    query parameter (e.g. "/abcdef?filename=foo.cpp").

    """
    def __init__(self, file_cacher):
        """Initialize an HTTP API for the given FileCacher.

        Make all the request served by the new instance of this class
        use the given FileCacher to get, put and delete files.

        file_cacher (FileCacher): our "access" to the file storage.

        """
        self._file_cacher = file_cacher
        # XXX Does DELETE really make sense? When is the client
        # supposed to call it?
        self._url_map = Map([Rule("/", methods=["POST"], endpoint="put"),
                             Rule("/<digest>",
                                  methods=["GET"], endpoint="get"),
                             Rule("/<digest>",
                                  methods=["DELETE"], endpoint="delete"),
                             Rule("/<digest>/description",
                                  methods=["GET"], endpoint="describe")],
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

        try:
            if endpoint == "put":
                self.put()
            elif endpoint == "get":
                self.get(args["digest"])
            elif endpoint == "delete":
                self.delete(args["digest"])
            elif endpoint == "describe":
                self.describe(args["digest"])
            else:
                raise RuntimeError("Unknown endpoint.")

        except HTTPException as exc:
            return exc

        return local.response

    def put(self):
        """Read the local Request and store its contained file.

        Use the contents of the Request object saved in the greenlet-
        local storage to create a new file and make the Response object
        tell its location.

        """
        digest = self._file_cacher.put_file_from_fobj(local.request.stream)

        local.response.status_code = 201
        local.response.location = local.urls.build("get", {"digest": digest})

    def get(self, digest):
        """Fill the local Response to serve the requested file.

        Set the fields of the Response object saved in the greenlet-
        local storage to make it then serve the file identified by the
        given digest when called as a WSGI application.

        digest (bytes): the digest of the file we want to retrieve.

        raise: NotFound if the cacher cannot provide the file.

        """
        try:
            fobj = self._file_cacher.get_file(digest)
        except KeyError:
            raise NotFound()

        local.response.status_code = 200
        # XXX We could use get_size to determine Content-Length.
        if "filename" in local.request.args:
            local.response.headers.add_header(
                b'Content-Disposition', b'attachment',
                filename=local.request.args["filename"])
        # FIXME Determine from filename (if given) or file contents.
        local.response.mimetype = 'application/octet-stream'
        local.response.response = wrap_file(local.request.environ, fobj)
        local.response.direct_passthrough = True

    def delete(self, digest):
        """Try to delete the file.

        digest (bytes): the digest of the file we want to delete.

        raise: NotFound if the file isn't in the cacher.

        """
        try:
            self._file_cacher.delete(digest)
        except KeyError:
            raise NotFound()

        local.response.status_code = 204

    def describe(self, digest):
        """Fill the local Response to describe the requested file.

        Set the fields of the Response object saved in the greenlet-
        local storage to make it then serve the description of the
        file identified by the given digest.

        digest (bytes): the digest of the file whose description we
            want to retrieve.

        raise: NotFound if the cacher cannot provide the file.

        """
        try:
            desc = self._file_cacher.describe(digest)
        except KeyError:
            raise NotFound()

        local.response.status_code = 200
        local.response.mimetype = 'text/plain'
        local.response.charset = 'utf-8'
        local.response.data = desc
