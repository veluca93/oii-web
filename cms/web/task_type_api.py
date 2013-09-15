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

from werkzeug.wrappers import Request, Response
from werkzeug.routing import Map, Rule
from werkzeug.exceptions import HTTPException
from werkzeug.wsgi import responder

from cms import plugin_list


class TaskTypeAPIMiddleware(object):
    """Describe TaskType parameters.

    The only duty (at the moment) for this class is to describe the
    format of parameters for TaskTypes. The only URL it handles (i.e.
    "/") returns a JSON-encoded dict whose keys are TaskType names and
    whose values are lists. Each of their item is a description of
    a ParameterType, as returned by its .describe() method (this means
    it could be a complex nested object).

    """
    def __init__(self):
        """Create an instance of this class.

        """
        self._url_map = Map([Rule("/", methods=["GET"], endpoint="get")],
                            encoding_errors="strict")

        self._task_types = plugin_list("cms.grading.tasktypes", "tasktypes")

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
        urls = self._url_map.bind_to_environ(environ)
        try:
            endpoint, args = urls.match()
        except HTTPException as exc:
            return exc

        assert endpoint == "get"

        request = Request(environ)
        request.encoding_errors = "strict"

        response = Response()

        result = dict()
        for task_type in self._task_types:
            result[task_type.__name__] = \
                list(p.describe() for p in task_type.ACCEPTED_PARAMETERS)

        response.status_code = 200
        response.mimetype = "application/json"
        response.data = json.dumps(result)

        return response
