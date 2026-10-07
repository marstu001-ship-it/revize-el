# Falešná CDN pro test: obyčejný http.server neposílá CORS hlavičku, takže
# by fetch() na knihovnu selhal. Skutečné CDN (cdnjs, fonts.gstatic) ji posílají.
import sys, http.server, functools


class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, *a):
        pass


port = int(sys.argv[1])
root = sys.argv[2]
http.server.HTTPServer(('127.0.0.1', port), functools.partial(H, directory=root)).serve_forever()
