#!/usr/bin/env python2

import sys

from datetime import datetime, timedelta
from cms.db import Session, Contest, User, Announcement, Question, Message, \
	Submission, File, Task, Dataset, Attachment, Manager, Testcase, \
	SubmissionFormatElement, Statement, SubmissionResult

if __name__ == "__main__":
	tasks_from = int(sys.argv[1])
	users_from = datetime.fromtimestamp(int(sys.argv[2]))
	contest_start = datetime.fromtimestamp(int(sys.argv[3]))
	contest_end = datetime.fromtimestamp(int(sys.argv[4]))

	s = Session()
	s.expire_all()

	# Trova tutti gli utenti interessati
	users = s.query(User)\
	.filter(User.registration_time >= users_from)\
	.all()

	# Trova tutti i task interessati
	tasks = s.query(Task)\
	.filter(Task.id >= tasks_from)\
	.all()

	ranking = []
	for u in users:
		punteggi = []
		penalita = []
		for t in tasks:
			# Trova tutte le submission (u, t)
			subs = s.query(SubmissionResult)\
				.join(Submission.results)\
				.filter(Submission.user == u)\
				.filter(Submission.task == t)\
				.filter(Submission.timestamp >= contest_start)\
				.filter(Submission.timestamp <= contest_end)\
				.filter(SubmissionResult.dataset == t.active_dataset)\
				.order_by(SubmissionResult.score.desc())\
				.all()
			# Se l'utente ha fatto almeno una submission
			if len(subs) > 0:
				# Trova la piu' vecchia tra quelle con lo stesso punteggio della migliore
				best = 0
				for i in xrange(1, len(subs)):
					if subs[i].score == subs[best].score:
						if subs[i].submission.timestamp < subs[best].submission.timestamp:
							best = i
				punteggi.append(subs[best].score)
				penalita.append((subs[best].submission.timestamp - contest_start).total_seconds())
			else:
				punteggi.append(0)
				penalita.append(0)
		ranking.append((u.first_name, u.last_name, punteggi, penalita))

	print "user,",
	for t in tasks:
		print t.name + "(s),",
		print t.name + "(p),",
	print

	for entry in ranking:
		nominativo = entry[0] + " " + entry[1] + ","
		nominativo = unicode(nominativo).encode('utf8')
		print nominativo,
		for s in entry[2]:
			print str(s) + ",",
		for p in entry[3]:
			print str(p) + ",",
		print

