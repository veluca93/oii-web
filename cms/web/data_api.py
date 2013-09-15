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

"""A RESTful HTTP API to access and alter data in the database.

The WSGI application defined in this module is the most important one
in AWS, as a lot of data is loaded from it. As performance is crucial,
we try to do as much preprocessing as possible. Since configuration
possibilities are limited this largely happens in the global scope,
rather than in the class constructor.

Each object in the database is represented by an entity with the URL
"/<collection>/<ref>", where "<collection>" is the tablename (because,
at the moment, it's always the lowercased plural name of the class,
which is what we want) and "<ref>" is an unique reference to the object
obtained by joining with an underscore the decimal representations of
the integers that make up the primary key. Therefore for single-item
primary keys (a case that covers almost all classes) the ref will just
be the decimal representation of the `id' column. At the moment, the
only exceptions are SubmissionResults and UserTestResults (whose ref
will be `<submission_id>_<dataset_id>').

Those URLs support the following HTTP methods:
- GET, to obtain a representation of the entity;
- PUT, to substitute the entity with another one;
- PATCH, to update a subset of fields of the entity;
- DELETE, to remove the entity from the database.

For each database class there's also the "/<tablename>/" URL (as above,
with a blank ref) that supports:
- GET, to obtain a representation of *all* entities of that type;
- POST, to create a new entity of that type.

All representations, both those received and those sent, are in JSON.
They are dynamically determined by introspecting the SQLAlchemy model.
Column properties will be mapped as it "comes natural", with:
- String (i.e. binary strings, bytes) encoded to unicode using a latin1
  encoding;
- DateTime (i.e. datetime) encoded as a floating-point UNIX timestamp;
- Interval (i.e. timedelta) encoded as a floating-point number of
  seconds.
Columns that are part of the primary key are not included. Instead, an
additional "_ref" field will be added, which will contain the primary
key encoded as defined above. Columns that are part of foreign key
constraints won't be included either.
Relationship properties are handled very oddly. The representation will
not include anything that requires an additional database query to be
executed. And it will only include the primary key of the referenced
entities (encoded as above), not their full representation. In practice
this means that only "plain" many-to-one relations will be described,
and their value will just be the ref of the entity.

To access the missing relationships another URL type is provided:
"/<tablename>/<ref>/<rel_prop>", where "<rel_prop>" is the attribute
name for a relationship property. This will return a list of full
representations of the entities that belong to that relationship.
The collection class used in the DB won't be transferred in the JSON:
they'll all be lists.

"""

from __future__ import unicode_literals
from __future__ import absolute_import

import json
import logging
import re
from datetime import timedelta

import six

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import class_mapper
from sqlalchemy.types import \
    Boolean, Integer, Float, String, Unicode, DateTime, Interval

from werkzeug.wrappers import Request, Response
from werkzeug.routing import Map, Rule, EndpointPrefix, Submount, RuleTemplate
from werkzeug.local import Local, LocalManager
from werkzeug.exceptions import HTTPException, BadRequest, NotFound, InternalServerError
from werkzeug.wsgi import responder

from cms.db import SessionGen, Base, sa_entities
from cmscommon.DateTime import make_datetime, make_timestamp


logger = logging.getLogger(__name__)


# We keep a greenlet-local storage to get easy access to some handy
# objects (unique for each request, like the Request object itself,
# the partial Response object, a Session, a MapAdapter, etc.) without
# passing them around as parameters to all the code that needs them.
local = Local()
local_manager = LocalManager([local])


# The rules describing how to encode/decode column properties to/from
# JSON. They're indexed by the SQLAlchemy column type and their values
# are in the form (python type(s), decoder, encoder).
_TYPE_MAP = {
    Boolean: (bool,
              lambda x: x, lambda x: x),
    Integer: (six.integer_types,
              lambda x: x, lambda x: x),
    Float: (six.integer_types + (float,),
            lambda x: x, lambda x: x),
    String: (six.text_type,
             lambda x: x.encode('latin1'), lambda x: x.decode('latin1')),
    Unicode: (six.text_type,
              lambda x: x, lambda x: x),
    DateTime: (six.integer_types + (float,),
               lambda x: make_datetime(x), lambda x: make_timestamp(x)),
    Interval: (six.integer_types + (float,),
               lambda x: timedelta(seconds=x), lambda x: x.total_seconds()),
}


# All the URLs we need for each database class, as a template. URLs are
# the one described in the module-level docstring, whereas endpoints
# are in the form "<class name>/<action>".
_ENTITY_TEMPLATE = RuleTemplate([
    EndpointPrefix('$name/', [
        Submount('/$path', [
            Rule("/", methods=["GET"], endpoint="list"),
            Rule("/", methods=["POST"], endpoint="create"),
            Rule("/$pkey", methods=["GET"], endpoint="retrieve"),
            Rule("/$pkey/<prp_key>", methods=["GET"], endpoint="sublist"),
            # FIXME Add PATCH.
            Rule("/$pkey", methods=["PUT"], endpoint="update"),
            Rule("/$pkey", methods=["DELETE"], endpoint="delete"),
        ])
    ])
])


# We build the complete list of URLs, instantiating the template above
# for each class, and store it in _URLS. _ENTITIES will contain a map
# from class names to classes. _PRIMARYK will contain the tuple of URL
# parameters identifiers, as returned by Werkzeug when we will match
# the incoming URLs, in the right order to build a primary key.
_ENTITIES = dict()
_PRIMARYK = dict()
_URLS = list()

# We use the classes included in sa_entities. At the moment, this only
# leaves FSObject out.
for entity in sa_entities:
    name = entity.__name__
    path = entity.__tablename__

    pkey = list()
    for col in class_mapper(entity).primary_key:
        if col.name == "id":
            pkey.append("%s_id" % name.lower())
        else:
            pkey.append(col.name)

    _ENTITIES[name] = entity
    _PRIMARYK[name] = tuple(pkey)

    _URLS.append(_ENTITY_TEMPLATE(
        name=name, path=path, pkey="_".join("<int:%s>" % id_ for id_ in pkey)))


def _parse_ref(cls, ref):
    if not issubclass(cls, Base):
        raise RuntimeError("Not a SQLAlchemy entity.")

    if not isinstance(ref, unicode):
        raise TypeError("Wrong type: expected unicode, got %s." %
                        type(ref).__name__)

    try:
        id_ = tuple(int(i) for i in ref.split("_"))
    except ValueError:
        raise ValueError("Invalid format: %r." % ref)

    obj = cls.get_from_id(id_, local.session)
    if obj is None:
        raise ValueError("Nonexistent object: %s, %r." % (cls.__name__, id_))

    return obj


def _parse(cls, content):
    if not isinstance(content, dict):
        raise TypeError("[content] Expected dict, got %s." %
                        type(content).__name__)

    col_args = dict()

    for prp in cls._col_props:
        if prp.key not in content:
            continue

        key = prp.key
        val = content[key]

        if val is None:
            col_args[key] = None
        else:
            col = prp.columns[0]
            col_type = type(col.type)

            if col_type not in _TYPE_MAP:
                raise RuntimeError("Unknown SQLAlchemy column type: %r." %
                                   col_type)

            type_, dec, _ = _TYPE_MAP[col_type]

            if not isinstance(val, type_):
                raise TypeError("[content[\"%s\"]] Expected %s, got %s." %
                                (key, type_.__name__, type(val).__name__))

            col_args[key] = dec(val)

        del content[key]

    rel_args = dict()

    for prp in cls._rel_props:
        if prp.key not in content:
            continue

        key = prp.key
        val = content[key]

        if val is None:
            rel_args[key] = None
        else:
            col_type = prp.collection_class
            if col_type is not None:
                col_type = type(col_type())

            other_cls = prp.mapper.class_
            try:
                if col_type is None:
                    rel_args[key] = _parse_ref(other_cls, val)
                elif issubclass(col_type, list):
                    if not isinstance(val, list):
                        raise TypeError("Expected list, got %s." %
                                        type(val).__name__)
                    rel_args[key] = list(_parse_ref(other_cls, i) for i in val)
                elif issubclass(col_type, dict):
                    if not isinstance(val, dict):
                        raise TypeError("Expected dict, got %s." %
                                        type(val).__name__)
                    rel_args[key] = \
                        dict((k, _parse_ref(other_cls, v)) for k, v in val.iteritems())
                else:
                    raise RuntimeError("Unknown SQLAlchemy relationship type: "
                                       "%s." % col_type)
            except (TypeError, ValueError) as err:
                err.message = "[content[\"%s\"]] %s" % (key, err)
                err.args = err.message,
                raise err

        del content[key]

    if len(content) > 0:
        raise ValueError("Unrecognized key: %r." % content.popitem()[0])

    return col_args, rel_args


def _format_ref(obj):
    return "_".join(str(i) for i in obj.sa_primary_key)


def _format(obj):
    content = dict()

    # Add primary key.
    content["_ref"] = _format_ref(obj)

    for prp in obj._col_props:
        key = prp.key
        val = getattr(obj, key)

        if val is None:
            content[key] = None
        else:
            col = prp.columns[0]
            col_type = type(col.type)

            if col_type not in _TYPE_MAP:
                raise RuntimeError("Unknown SQLAlchemy column type: %r." %
                                   col_type)

            type_, _, enc = _TYPE_MAP[col_type]

            content[key] = enc(val)

    for prp in obj._rel_props:
        key = prp.key

        if prp.direction.name != "MANYTOONE":
            continue

        # FIXME
        if hasattr(prp, 'local_columns'):
            content[key] = "_".join(str(getattr(obj, col.name)) for col in prp.local_columns)
        else:
            content[key] = "_".join(str(getattr(obj, col.name)) for col in prp.local_side)

    return content


def _get_location(obj):
    cls = type(obj)
    endpoint = "%s/retrieve" % cls.__name__
    args = dict(zip(_PRIMARYK[cls.__name__], obj.sa_primary_key))
    return local.urls.build(endpoint, args)


class DataAPIMiddleware(object):
    def __init__(self):

        self._url_map = Map(_URLS, encoding_errors="strict")

        self.wsgi_app = local_manager.make_middleware(self.wsgi_app)

    def __call__(self, environ, start_response):
        return self.wsgi_app(environ, start_response)

    @responder
    def wsgi_app(self, environ, start_response):

        local.urls = self._url_map.bind_to_environ(environ)
        try:
            endpoint, args = local.urls.match()
        except HTTPException as exc:
            return exc

        try:
            local.request = Request(environ)
            local.request.encoding_errors = "strict"

            local.response = Response()

            entity, _, action = endpoint.partition('/')
            cls = _ENTITIES[entity]

            if action == "list":
                self.query(cls)
            elif action == "create":
                self.create(cls)
            else:
                id_ = tuple(args[id_] for id_ in _PRIMARYK[entity])

                if action == "retrieve":
                    self.retrieve(cls, id_)
                if action == "sublist":
                    self.subquery(cls, id_, args["prp_key"])
                elif action == "update":
                    self.update(cls, id_)
                elif action == "delete":
                    self.delete(cls, id_)

        except HTTPException as exc:
            return exc

        return local.response

    def query(self, cls):
        with SessionGen() as local.session:
            if local.request.accept_mimetypes.quality("application/json") <= 0:
                 raise NotAcceptable()

            content = list()
            for obj in local.session.query(cls):
                content.append(_format(obj))

            local.response.status_code = 200
            local.response.mimetype = "application/json"
            local.response.data = json.dumps(content)

    def create(self, cls):
        with SessionGen() as local.session:
            if local.request.mimetype != "application/json":
                raise UnsupportedMediaType()

            # if request.content_length > 1024 * 1024:  # 1 MiB
            #     raise RequestEntityTooLarge()
            # request.max_content_length = 1024 * 1024  # 1 MiB

            try:
                content = json.load(local.request.stream)
            except ValueError:
                logger.warning("Invalid JSON.")
                raise BadRequest()

            try:
                col_args, rel_args = _parse(cls, content)
            except (TypeError, ValueError):
                logger.warning("Parsing error.", exc_info=True)
                raise BadRequest()

            try:
                obj = cls(**col_args)
            except (TypeError, ValueError):
                logger.warning("Creation error.", exc_info=True)
                raise BadRequest()

            for k, v in rel_args.iteritems():
                setattr(obj, k, v)

            local.session.add(obj)

            try:
                local.session.commit()
            except IntegrityError:
                logger.warning("Integrity error.", exc_info=True)
                raise BadRequest()

            local.response.status_code = 201
            local.response.location = _get_location(obj)

    def retrieve(self, cls, id_):
        with SessionGen() as local.session:
            obj = cls.get_from_id(id_, local.session)

            if obj is None:
                raise NotFound()

            if local.request.accept_mimetypes.quality("application/json") <= 0:
                raise NotAcceptable()

            content = _format(obj)

            local.response.status_code = 200
            local.response.mimetype = "application/json"
            local.response.data = json.dumps(content)

    def subquery(self, cls, id_, prp_key):
        with SessionGen() as local.session:
            obj = cls.get_from_id(id_, local.session)

            if obj is None:
                raise NotFound()

            mapper = class_mapper(cls)

            # XXX Could be replaced with `isinstance(mapper._props[prp_key], RelationshipProperty)`.
            if not (prp_key in mapper._props and mapper._props[prp_key] in cls._rel_props):
                raise NotFound()

            if local.request.accept_mimetypes.quality("application/json") <= 0:
                raise NotAcceptable()

            prp = mapper._props[prp_key]
            val = getattr(obj, prp_key)

            content = list()

            if val is not None:
                other_cls = prp.mapper.class_

                if isinstance(val, other_cls):
                    content.append(_format(val))
                elif isinstance(val, list):
                    for i in val:
                        content.append(_format(i))
                elif isinstance(val, dict):
                    for v in val.itervalues():
                        content.append(_format(v))
                else:
                    raise RuntimeError("Unknown SQLAlchemy relationship type: "
                                       "%s." % type(val))

            local.response.status_code = 200
            local.response.mimetype = "application/json"
            local.response.data = json.dumps(content)

    def update(self, cls, id_):
        with SessionGen() as local.session:
            obj = cls.get_from_id(id_, local.session)

            if obj is None:
                raise NotFound()

            if local.request.mimetype != "application/json":
                raise UnsupportedMediaType()

            # if request.content_length > 1024 * 1024:  # 1 MiB
            #     raise RequestEntityTooLarge()
            # request.max_content_length = 1024 * 1024  # 1 MiB

            try:
                content = json.load(local.request.stream)
            except:
                logger.warning("Invalid JSON.")
                raise BadRequest()

            if "_ref" in content:
                if content["_ref"] != "_".join(str(i) for i in id_):
                    local.warning("Bad reference.")
                    raise BadRequest()
                del content["_ref"]

            try:
                col_args, rel_args = _parse(cls, content)
            except (TypeError, ValueError):
                logger.warning("Parsing error.", exc_info=True)
                raise BadRequest()

            for k, v in col_args.iteritems():
                setattr(obj, k, v)

            for k, v in rel_args.iteritems():
                setattr(obj, k, v)

            try:
                local.session.commit()
            except IntegrityError:
                logger.warning("Integrity error.", exc_info=True)
                raise BadRequest()

            local.response.status_code = 204

    def delete(self, cls, id_):
        with SessionGen() as local.session:
            obj = cls.get_from_id(id_, local.session)

            if obj is None:
                raise NotFound()

            local.session.delete(obj)

            try:
                local.session.commit()
            except IntegrityError:
                logger.warning("Integrity error.", exc_info=True)
                raise BadRequest()

            local.response.status_code = 204
