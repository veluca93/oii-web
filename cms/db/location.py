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

from sqlalchemy.schema import Column, ForeignKey
from sqlalchemy.types import Integer, Unicode
from sqlalchemy.orm import relationship, backref

from . import Base


class Region(Base):
    __tablename__ = 'regions'

    id = Column(Integer, primary_key=True)
    name = Column(Unicode)


class Province(Base):
    __tablename__ = 'provinces'

    id = Column(Integer, primary_key=True)
    name = Column(Unicode)

    region_id = Column(
        Integer,
        ForeignKey(Region.id,
                   onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
        index=True)
    region = relationship(
        Region,
        backref=backref("provinces",
                        cascade="all, delete-orphan",
                        passive_deletes=True))


class City(Base):
    __tablename__ = 'cities'

    id = Column(Integer, primary_key=True)
    name = Column(Unicode)

    province_id = Column(
        Integer,
        ForeignKey(Province.id,
                   onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
        index=True)
    province = relationship(
        Province,
        backref=backref("cities",
                        cascade="all, delete-orphan",
                        passive_deletes=True))


class Institute(Base):
    __tablename__ = 'institutes'

    id = Column(Integer, primary_key=True)
    name = Column(Unicode)

    city_id = Column(
        Integer,
        ForeignKey(City.id,
                   onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
        index=True)
    city = relationship(
        City,
        backref=backref("institutes",
                        cascade="all, delete-orphan",
                        passive_deletes=True))
