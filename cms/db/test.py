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

from sqlalchemy.schema import Column, ForeignKey, PrimaryKeyConstraint
from sqlalchemy.types import Integer, Unicode, String
from sqlalchemy.orm import relationship, backref

from . import Base, User


class Test(Base):
    """Class to store a test, like the first phase of the OII.
    """
    __tablename__ = 'tests'

    # Auto increment primary key.
    id = Column(Integer, primary_key=True)

    # Short name of the test, and longer description. Both human readable.
    name = Column(Unicode, nullable=False, unique=True, index=True)
    description = Column(Unicode, nullable=False)

    # Access level required
    access_level = Column(Integer, nullable=False)

    # Maximum possible score
    max_score = Column(Integer, default=0)

    def __init__(self):
        pass


class TestQuestion(Base):
    """Class to store a single question of a test.
    """
    __tablename__ = 'testquestions'

    # Auto increment primary key.
    id = Column(Integer, primary_key=True)

    # Reference to the Test
    test_id = Column(
        Integer,
        ForeignKey(Test.id,
                   onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
        index=True)
    test = relationship(
        Test,
        backref=backref(
            'questions',
            order_by=[id],
            cascade="all, delete-orphan",
            passive_deletes=True))

    # Question's text and answers
    text = Column(Unicode, nullable=False)
    answers = Column(Unicode, nullable=False)

    # Question type: choice, number or string
    type = Column(Unicode, nullable=False)

    # Question score (for correct and wrong answers)
    score = Column(Integer, nullable=False)
    wrong_score = Column(Integer, nullable=False)

    def __init__(self):
        pass


class QuestionFile(Base):
    """Class to store a question's files
    """
    __tablename__ = 'questionfiles'

    # Auto increment primary key.
    id = Column(Integer, primary_key=True)

    # Question (id and object) owning the file.
    question_id = Column(
        Integer,
        ForeignKey(TestQuestion.id,
                   onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
        index=True)
    question = relationship(
        TestQuestion,
        backref=backref('files',
                        cascade="all, delete-orphan",
                        passive_deletes=True))

    # Filename and digest of the file.
    filename = Column(Unicode, nullable=False)
    digest = Column(String, nullable=False)


class TestScore(Base):
    __tablename__ = "testscores"
    __table_args__ = (PrimaryKeyConstraint('test_id', 'user_id'),)

    test_id = Column(
        Integer,
        ForeignKey(Test.id,
                   onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
        index=True)
    test = relationship(
        Test,
        backref=backref(
            'test_scores',
            order_by=[test_id],
            cascade="all, delete-orphan",
            passive_deletes=True))

    user_id = Column(
        Integer,
        ForeignKey(User.id,
                   onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
        index=True)
    user = relationship(
        User,
        backref=backref(
            'test_scores',
            order_by=[test_id],
            cascade="all, delete-orphan",
            passive_deletes=True))

    score = Column(Integer, default=0)
