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

from functools import partial

from cms.db import sa_entities
from cmscommon.EventSource import EventSource


class DataWatcherMiddleware(EventSource):
    """Forward notifications of DB Watcher to HTTP event source.

    """
    def __init__(self, watcher):
        """Initialize, linking to the given watcher.

        Set up callbacks on the watcher and forward the data they
        receive, almost unchanged, to the EventSource we're
        subclassing.

        """
        EventSource.__init__(self, "/events")

        # Attach to the watcher.
        watcher.add_init_callback(self._reinit)

        for class_ in sa_entities:
            # Since the client doesn't cache these objects don't even
            # start a LISTEN on them, as they only generate a lot of
            # noise and performance degradation during dataset cloning
            # and similar expensive operations.
            if class_.__module__ in ("cms.db.submission", "cms.db.usertest"):
                continue

            watcher.listen(partial(self._dispatch, class_, "create"),
                           watcher.EVENT_CREATE, class_)
            watcher.listen(partial(self._dispatch, class_, "update"),
                           watcher.EVENT_UPDATE, class_)
            watcher.listen(partial(self._dispatch, class_, "delete"),
                           watcher.EVENT_DELETE, class_)

    def _reinit(self):
        """Called when watcher reinitializes.

        We can do nothing but tell the clients to reinitialize all
        their data too.

        """
        self.send("reinit", None)

    def _dispatch(self, class_, action, *pkey):
        """Called when watcher receives notifications.

        We just forward them, putting them on a single channel (i.e.
        producing events of a single type, the default "message") with
        the format "{action}_{class name}_{primary key}", where primary
        key is the list of fields joined by underscores.

        """
        pkey = "_".join("%s" % i for i in pkey)
        self.send(None, "%s %s %s" % (action, class_.__name__, pkey))

