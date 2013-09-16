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

import logging

from cms import config
from cms.io import WebService

from werkzeug.wsgi import SharedDataMiddleware
from werkzeug.exceptions import NotFound

logger = logging.getLogger(__name__)


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
        self.wsgi_app = SharedDataMiddleware(NotFound(), {
            '/': ("cms.web", "practice")
        })
