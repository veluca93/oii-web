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
from sqlalchemy.types import Integer, Unicode, String, DateTime, Boolean
from sqlalchemy.orm import relationship, backref

from . import Base
from . import User


class PrivateMessage(Base):
    __tablename__ = "privatemessages"

    id = Column(Integer, primary_key=True)

    timestamp = Column(DateTime, nullable=False)

    text = Column(Unicode, nullable=False)

    title = Column(Unicode, nullable=False)

    read = Column(Boolean, nullable=False)

    sender_id = Column(
        Integer,
        ForeignKey(User.id,
                   onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
        index=True)
    sender = relationship(
        User,
        foreign_keys=[sender_id],
        backref=backref(
            'pm_sent',
            order_by="PrivateMessage.timestamp",
            cascade="all, delete-orphan",
            passive_deletes=True))

    receiver_id = Column(
        Integer,
        ForeignKey(User.id,
                   onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
        index=True)
    receiver = relationship(
        User,
        foreign_keys=[receiver_id],
        backref=backref(
            'pm_received',
            order_by="PrivateMessage.timestamp",
            cascade="all, delete-orphan",
            passive_deletes=True))


class Forum(Base):
    __tablename__ = "forums"

    id = Column(Integer, primary_key=True)

    access_level = Column(Integer, nullable=False, default=7)

    title = Column(Unicode, nullable=False)

    ntopic = Column(Integer, nullable=False, default=0)

    npost = Column(Integer, nullable=False, default=0)

    description = Column(Unicode, nullable=False)


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True)

    title = Column(Unicode, nullable=False)

    status = Column(String, nullable=False)

    answered = Column(Boolean, default=False)

    timestamp = Column(DateTime, nullable=False)

    creation_timestamp = Column(DateTime, nullable=False)

    npost = Column(Integer, nullable=False, default=0)

    nview = Column(Integer, nullable=False, default=0)

    last_writer_id = Column(
        Integer,
        ForeignKey(User.id,
                   onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
        index=True)

    last_writer = relationship(User, foreign_keys=[last_writer_id])

    author_id = Column(
        Integer,
        ForeignKey(User.id,
                   onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
        index=True)
    author = relationship(User, foreign_keys=[author_id])

    forum_id = Column(
        Integer,
        ForeignKey(Forum.id,
                   onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
        index=True)
    forum = relationship(
        Forum,
        backref=backref(
            'topics',
            order_by="desc(Topic.timestamp)",
            cascade="all, delete-orphan",
            passive_deletes=True))


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True)

    text = Column(Unicode, nullable=False)

    timestamp = Column(DateTime, nullable=False)

    topic_id = Column(
        Integer,
        ForeignKey(Topic.id,
                   onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
        index=True)
    topic = relationship(
        Topic,
        backref=backref(
            'posts',
            order_by="Post.timestamp",
            cascade="all, delete-orphan",
            passive_deletes=True))

    forum_id = Column(
        Integer,
        ForeignKey(Forum.id,
                   onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
        index=True)
    forum = relationship(
        Forum,
        backref=backref(
            'posts',
            order_by="desc(Topic.timestamp)",
            cascade="all, delete-orphan",
            passive_deletes=True))

    author_id = Column(
        Integer,
        ForeignKey(User.id,
                   onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
        index=True)
    author = relationship(
        User,
        backref=backref(
            'posts',
            order_by="Post.timestamp",
            cascade="all, delete-orphan",
            passive_deletes=True))
