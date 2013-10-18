#!/usr/bin/python2
# -*- coding: utf8 -*-

import json
import sys
import os
from cms.db import Test, TestQuestion, QuestionFile, SessionGen
from cms.db.filecacher import FileCacher

charmap = {
    "è": "&egrave;",
    "é": "&eacute;",
    "È": "&Egrave;",
    "ò": "&ograve;",
    "à": "&agrave;",
    "ù": "&ugrave;",
    "ì": "&igrave;",
    "<": "&lt;",
    ">": "&gt;",
    "’": "'",
    "”": "\"",
    "“": "\"",
    "←": "&larr;"
}

def escape(s):
    for a, b in charmap.iteritems():
        s = s.replace(a, b)
    return s

def main():
    if len(sys.argv) != 2:
        print "%s [file delle domande]" % sys.argv[0]
        sys.exit(0)

    lines = file(sys.argv[1]).readlines()
    test = Test()
    test.name = os.path.basename(sys.argv[1]).replace(".txt", "")
    test.description = lines[0].strip()
    dirname = os.path.dirname(sys.argv[1])
    question = TestQuestion()
    question.text = "<p>\n"
    file_cacher = FileCacher()

    status = "score"
    for l in lines[1:]:
        l = escape(l)
        if l[:3] == '===':
            question.text += "</p>"
            question.answers = json.dumps(answers)
            test.questions.append(question)
            status = "score"
            question = TestQuestion()
            question.text = "<p>\n"
            continue

        if l[:3] == '---':
            status = "choice"
            question.type = "choice"
            answers = []
            continue

        if l[:3] == '+++':
            status = "answer"
            answers = []
            continue

        if status == "score":
            try:
                score, wrong_score = map(int, l.split(","))
            except ValueError:
                continue
            question.score = score
            question.wrong_score = wrong_score
            status = "text"
            continue

        if status == "text":
            if l == "\n":
                question.text += "</p><p>\n"
            elif l[:2] == "[[" and l[-3:] == "]]\n":
                name = l[2:-3]
                digest = file_cacher.put_file_from_path(
                    os.path.join(dirname, "data", name),
                    "Image %s for test %s" % (name, test.name))
                question.text += "<center>"
                question.text += "<img src='/files/%s/%s'/>" % (digest, name)
                question.text += "</center>\n"
                f = QuestionFile(filename=name, digest=digest)
                question.files.append(f)
            elif l[:-1] == "```":
                question.text += "<pre>"
            elif l[:-1] == "'''":
                question.text += "</pre>"
            else:
                question.text += l

        if status == "choice":
            answers.append([l[1:].strip(), l[0]=='*'])

        if status == "answer":
            pos = l.index(":")
            name = l[:pos]
            value = json.loads("[" + l[pos+1:] + "]")
            if isinstance(value[0], basestring):
                question.type = "string"
            elif not question.type:
                question.type = "number"
            answers.append([name, value])

    if status == "answer":
        question.text += "</p>"
        question.answers = json.dumps(answers)
        test.questions.append(question)

    with SessionGen() as session:
        session.add(test)
        session.commit()

if __name__ == "__main__":
    main()
