#!/usr/bin/env python2
# -*- coding: utf-8 -*-

# Programming contest management system
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

import gevent
from gevent import select

import psycopg2
from sqlalchemy.orm import class_mapper

from cms import logger
from cms.db import Base, custom_psycopg2_connection


class Watcher(object):

    """Provide notifications of changes in the database.

    Using PostgreSQL's asynchronous notification capabilities (i.e. the
    NOTIFY, LISTEN and UNLISTEN queries), instantiated with appropriate
    triggers and callback functions (installed by init_db), be notified
    when a row gets inserted, updated or deleted. In case of an update
    receive also the exact list of column whose values changed.

    There's a channel for each entity type and for each event type. Its
    name is in the form "{event_type}_{table_name}" (event_type can be
    "create", "update" or "delete"). The payload is composed by a first
    line containing the ID as space-separated integers. In case of an
    "update" event, successive lines (each separated by just a newline,
    '\\n') contain the names of the modified columns.

    Events can be received only when there's an active connection. Even
    if we reconnect immediately after a connection loss there's no way
    we can discover if we missed some notifications, or even get them!
    Therefore each time we establish a new connection (after attaching
    to all channels again) we tell everybody interested that they have
    to reinitialize their internal status.

    The intended workflow for a Watcher is to instantiate one, give it
    all the init callbacks, call the listen method as needed and then
    execute the run method inside a greenlet. All the callbacks will
    be spawned inside dedicated greenlets too.

    """

    EVENT_CREATE = b"create"
    EVENT_UPDATE = b"update"
    EVENT_DELETE = b"delete"

    def __init__(self):
        """Create a new Watcher object.

        Instantiate a new blank Watcher.

        """
        self._init_callbacks = list()
        self._callbacks = list()
        self._channels = set()

    def add_init_callback(self, callback):
        """Make the Watcher call the callback when it reinitializes.

        Ask for the callback to be called to notify that the Watcher
        has established a connection and that it's time to rebuild the
        internal status.

        callback (callable): the (re)initialization callback of the
            service using the Watcher (it shouldn't expect any
            arguments).

        """
        self._init_callbacks.append(callback)

    def listen(self, callback, event, class_, *props):
        """Register a callback for a certain event.

        Tell the Watcher that it has to call the given callable as soon
        as an event of the given type happens on rows of the given
        class.

        callback (callable): a callback expecting as arguments the
            components of the primary key of the affected entity.
        event (bytes): one of the EVENT_* class-level constants.
        class_ (class): an SQLAlchemy entity, that is a subclass of
            cms.db.Base.
        props ([bytes]): in case of an update event, if this list is
            not empty the callback will be called only if the the name
            of one of the modified columns appears in this list.

        """
        # Validate arguments
        if event not in [b"create", b"update", b"delete"]:
            raise ValueError("Unknown event type.")

        if event != b"update" and len(props) != 0:
            raise ValueError("Properties are only allowed for update events.")

        if not issubclass(class_, Base):
            raise ValueError("The class has to be an SQLAlchemy entity.")

        # Convert from SQLAlchemy ORM names to database layer.
        table_name = class_.__tablename__

        mapper = class_mapper(class_)
        cols = set()
        for prp in props:
            cols.update(col.name for col in mapper._props[prp].columns)

        # Store information.
        self._callbacks.append((callback, event, table_name, cols))
        self._channels.add((event, table_name))

    def run(self):
        """Watch for notifications.

        Obtain a new connection to the PostgreSQL database, attach to
        all the channels needed to fulfill the requirements posed by
        the callbacks we have to execute, notify the service by calling
        the initialization callback and then start waiting for events.

        When an event arrives parse it (both the channel name and the
        payload), check which callbacks it triggers and fire them.

        """
        while True:
            try:
                # Obtain a connection.
                conn = custom_psycopg2_connection()
                conn.autocommit = True

                # Execute all needed LISTEN queries.
                curs = conn.cursor()
                for event, table_name in self._channels:
                    curs.execute(b"LISTEN {0}_{1};".format(event, table_name))

                # Notify the service that we're ready to go: we're attached
                # to all notification channels. It can start fetching its
                # objects without fearing that we'll miss any update to them.
                for callback in self._init_callbacks:
                    gevent.spawn(callback)

                # Listen.
                while True:
                    # FIXME Use a timeout?
                    select.select([conn], [], [])
                    conn.poll()

                    for notify in conn.notifies:
                        # Parse the notification.
                        event, _, table_name = notify.channel.partition(b'_')
                        rows = notify.payload.split(b'\n')
                        pkey = tuple(int(i) for i in rows[0].split(b' '))
                        cols = set(rows[1:])

                        for item in self._callbacks:
                            if item[1] == event and item[2] == table_name and \
                                    (len(item[3]) == 0 or
                                     not item[3].isdisjoint(cols) > 0):
                                gevent.spawn(item[0], *pkey)

                    del conn.notifies[:]
            except psycopg2.OperationalError:
                logger.warning("Lost connection with database.")
                gevent.sleep(1)
