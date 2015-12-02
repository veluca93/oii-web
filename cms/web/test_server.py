#!/usr/bin/python

"""
Save this file as server.py
>>> python server.py 0.0.0.0 8001
serving on 0.0.0.0:8001

or simply

>>> python server.py
Serving on localhost:8000

You can use this to test GET and POST methods.

"""

import SimpleHTTPServer
import SocketServer
import logging
import cgi
import sys

class ServerHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
	def do_FIXTURE(self, message):
		self.send_response(200)
		self.end_headers()
		self.wfile.write(message)

	def do_GET(self):
		logging.info("GET %s" % self.path)
		logging.debug(self.headers)
		SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)

	def do_POST(self):
		logging.info("POST %s" % self.path)
		logging.debug(self.headers)

		if self.path.endswith('/user'):
			logging.warning("Returning /user fixture")
			message = open("fixtures/user").read()
			return self.do_FIXTURE(message)

		SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)

if __name__ == '__main__':
	if len(sys.argv) > 2:
		PORT = int(sys.argv[2])
		I = sys.argv[1]
	elif len(sys.argv) > 1:
		PORT = int(sys.argv[1])
		I = ""
	else:
		PORT = 8000
		I = ""

	Handler = ServerHandler
	httpd = SocketServer.TCPServer(("", PORT), Handler)

	print "OII-WEB Interface http server (for testing purposes only)"
	print "Serving at: http://%(interface)s:%(port)s" % dict(interface = I or "localhost", port = PORT)
	httpd.serve_forever()