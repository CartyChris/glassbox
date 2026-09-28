"""GlassBox's local server: the standard library's file server plus ONE header.

`python3 -m http.server` sends Last-Modified and no Cache-Control, so a browser applies heuristic
freshness and can keep showing yesterday's GlassBox.html for hours after an update (measured on
27 Sep 2026: a tab ran a build two versions old while the server had the new file). `no-cache`
makes every load revalidate — a 304 when nothing changed, so it costs nothing.

Usage: python3 glassbox-serve.py [port] [directory]   (binds 127.0.0.1 only)"""
import http.server, sys, functools

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()
    def log_message(self, *args):
        pass

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    directory = sys.argv[2] if len(sys.argv) > 2 else '.'
    handler = functools.partial(Handler, directory=directory)
    http.server.ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()
