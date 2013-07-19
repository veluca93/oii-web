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

from __future__ import absolute_import

from sqlalchemy.orm import class_mapper, ColumnProperty

from . import metadata, custom_psycopg2_connection, sa_entities


def init_db():
    metadata.create_all()

    connection = custom_psycopg2_connection()
    connection.autocommit = True
    cursor = connection.cursor()

    for class_ in sa_entities:
        table_name = class_.__tablename__

        pkey = list()
        cols = list()

        # XXX Inspired by code in base.py.
        for prp in class_mapper(class_).iterate_properties:
            if isinstance(prp, ColumnProperty):
                col = prp.columns[0]
                if col.primary_key:
                    pkey.append(col.name)
                else:
                    cols.append(col.name)

        new_id = " || ' ' || ".join("CAST(NEW.{0} AS text)".format(i) for i in pkey)
        old_id = " || ' ' || ".join("CAST(OLD.{0} AS text)".format(i) for i in pkey)

        compare_id = " OR ".join("NEW.{0} != OLD.{0}".format(i) for i in pkey)
        check_cols = "".join("""
            IF NEW.{0} != OLD.{0} THEN
                payload := payload || '\n{0}';
            END IF;""".format(i) for i in cols).strip()

        query = """
CREATE FUNCTION notifier_{table_name}() RETURNS trigger AS $$
DECLARE
    payload varchar;
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM pg_notify ('create_{table_name}', {new_id});
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM pg_notify ('delete_{table_name}', {old_id});
    ELSE
        IF {compare_id} THEN
            PERFORM pg_notify ('delete_{table_name}', {new_id});
            PERFORM pg_notify ('create_{table_name}', {old_id});
        ELSE
            payload := {new_id};
            {check_cols}
            PERFORM pg_notify ('update_{table_name}', payload);
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;""".format(table_name=table_name, new_id=new_id,
                                      old_id=old_id, compare_id=compare_id,
                                      check_cols=check_cols)

        cursor.execute(query)

        query = """
CREATE TRIGGER watcher_{table_name}
AFTER INSERT OR UPDATE OR DELETE ON {table_name}
FOR EACH ROW
EXECUTE PROCEDURE notifier_{table_name}();""".format(table_name=table_name)

        cursor.execute(query)

    cursor.close()

    return True
