#!/usr/bin/env python3
"""pfterm — a portable, dependency-free terminal + file bridge (Python 3.8+ stdlib only).
Endpoints: /health; /pty (WebSocket, Vercel PTY protocol); /s, /s/<id>/out|in|resize, DELETE /s/<id> (SSE fallback);
/fs/list, /fs/read, /fs/write (confined to --root). Every endpoint but /health needs the token (constant-time compare).
"""
import argparse, base64, fcntl, hashlib, hmac, json, os, pty, select, signal, socket, struct, sys, termios, threading, time, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
SKIP_DIRS = {'node_modules', '.git', '.next', 'dist', 'build', '.cache', '__pycache__', '.venv', 'venv', 'target', '.turbo', '.vercel'}

class Pty:
    def __init__(self, start, root):
        cmd = start.get('command') or os.environ.get('SHELL') or '/bin/bash'
        args = [str(a) for a in (start.get('args') or [])]
        env = dict(os.environ)
        env.update({'TERM': 'xterm-256color', 'COLORTERM': 'truecolor', 'LANG': env.get('LANG', 'C.UTF-8')})
        for kv in start.get('env') or []:
            if isinstance(kv, str) and '=' in kv:
                k, v = kv.split('=', 1); env[k] = v
        cwd = start.get('cwd') or root
        self.pid, self.fd = pty.fork()
        if self.pid == 0:
            try:
                os.chdir(cwd if os.path.isdir(cwd) else root)
                os.execvpe(cmd, [cmd] + args, env)
            finally:
                os._exit(127)
        self.resize(int(start.get('cols') or 80), int(start.get('rows') or 24))
        self.code = None
    def resize(self, cols, rows):
        cols, rows = max(2, min(cols, 1000)), max(2, min(rows, 500))
        try: fcntl.ioctl(self.fd, termios.TIOCSWINSZ, struct.pack('HHHH', rows, cols, 0, 0))
        except OSError: pass
    def write(self, data):
        while data:
            try: n = os.write(self.fd, data); data = data[n:]
            except BlockingIOError: time.sleep(0.005)
            except OSError: return
    def read(self, timeout):
        r, _, _ = select.select([self.fd], [], [], timeout)
        if not r: return b''
        try: return os.read(self.fd, 65536)
        except OSError: return None
    def poll_exit(self):
        if self.code is None:
            try:
                pid, status = os.waitpid(self.pid, os.WNOHANG)
                if pid: self.code = os.waitstatus_to_exitcode(status) if hasattr(os, 'waitstatus_to_exitcode') else (status >> 8)
            except ChildProcessError: self.code = 0
        return self.code
    def kill(self):
        try: os.killpg(os.getpgid(self.pid), signal.SIGHUP)
        except Exception:
            try: os.kill(self.pid, signal.SIGKILL)
            except Exception: pass
        try: os.close(self.fd)
        except OSError: pass

def ws_send(sock, payload, opcode):
    n = len(payload)
    head = bytes([0x80 | opcode])
    if n < 126: head += bytes([n])
    elif n < 65536: head += bytes([126]) + struct.pack('>H', n)
    else: head += bytes([127]) + struct.pack('>Q', n)
    sock.sendall(head + payload)

def ws_recv(buf):
    if len(buf) < 2: return None
    b0, b1 = buf[0], buf[1]
    n, i = b1 & 0x7F, 2
    if n == 126:
        if len(buf) < 4: return None
        n = struct.unpack('>H', buf[2:4])[0]; i = 4
    elif n == 127:
        if len(buf) < 10: return None
        n = struct.unpack('>Q', buf[2:10])[0]; i = 10
    if n > 32 * 1024 * 1024: raise ValueError('frame too large')
    masked = b1 & 0x80
    if masked:
        if len(buf) < i + 4: return None
        mask = buf[i:i + 4]; i += 4
    if len(buf) < i + n: return None
    data = bytearray(buf[i:i + n])
    if masked:
        for k in range(n): data[k] ^= mask[k & 3]
    return b0 & 0x0F, bytes(data), buf[i + n:]

SESSIONS = {}
class Session:
    def __init__(self, start, root):
        self.pty = Pty(start, root); self.out = []; self.cv = threading.Condition(); self.closed = False; self.touched = time.time()
        threading.Thread(target=self.pump, daemon=True).start()
    def pump(self):
        while not self.closed:
            data = self.pty.read(0.5)
            if data is None or (data == b'' and self.pty.poll_exit() is not None):
                with self.cv: self.closed = True; self.cv.notify_all()
                return
            if data:
                with self.cv: self.out.append(data); self.cv.notify_all()

class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    server_version = 'pfterm/1'
    def log_message(self, fmt, *a):
        if self.server.verbose: sys.stderr.write('[pfterm] ' + (fmt % a) + '\n')
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'content-type, x-pfterm-token')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    def reply(self, code, body=b'', ctype='application/json'):
        if isinstance(body, (dict, list)): body = json.dumps(body).encode()
        elif isinstance(body, str): body = body.encode()
        self.send_response(code); self.cors()
        self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(body))); self.send_header('Cache-Control', 'no-store')
        self.end_headers(); self.wfile.write(body)
    def authed(self):
        q = parse_qs(urlparse(self.path).query)
        tok = (q.get('token') or [''])[0] or self.headers.get('x-pfterm-token', '')
        if hmac.compare_digest(tok.encode(), self.server.token.encode()): return True
        self.reply(401, {'error': 'bad token'}); return False
    def body(self, limit=64 * 1024 * 1024):
        n = int(self.headers.get('Content-Length') or 0)
        if n > limit: raise ValueError('body too large')
        return self.rfile.read(n) if n else b''
    def safe_path(self, rel):
        full = os.path.realpath(os.path.join(self.server.root, str(rel).lstrip('/')))
        if full != self.server.root and not full.startswith(self.server.root + os.sep): raise ValueError('path outside root: ' + str(rel))
        return full
    def do_OPTIONS(self): self.reply(204)
    def do_GET(self):
        u = urlparse(self.path)
        if u.path == '/health': return self.reply(200, 'ok', 'text/plain')
        if not self.authed(): return
        if u.path == '/pty' and self.headers.get('Upgrade', '').lower() == 'websocket': return self.websocket()
        if u.path == '/fs/list': return self.fs_list(parse_qs(u.query))
        parts = u.path.strip('/').split('/')
        if len(parts) == 3 and parts[0] == 's' and parts[2] == 'out': return self.sse(parts[1])
        self.reply(404, {'error': 'not found'})
    def do_POST(self):
        u = urlparse(self.path)
        if not self.authed(): return
        try:
            if u.path == '/s':
                s = Session(json.loads(self.body() or b'{}'), self.server.root)
                sid = uuid.uuid4().hex; SESSIONS[sid] = s
                return self.reply(200, {'id': sid})
            parts = u.path.strip('/').split('/')
            if len(parts) == 3 and parts[0] == 's' and parts[1] in SESSIONS:
                s = SESSIONS[parts[1]]; s.touched = time.time()
                if parts[2] == 'in': s.pty.write(self.body(1024 * 1024)); return self.reply(200, {'ok': True})
                if parts[2] == 'resize': j = json.loads(self.body() or b'{}'); s.pty.resize(int(j.get('cols', 80)), int(j.get('rows', 24))); return self.reply(200, {'ok': True})
            if u.path == '/fs/read': return self.fs_read(json.loads(self.body() or b'{}'))
            if u.path == '/fs/write': return self.fs_write(json.loads(self.body() or b'{}'))
        except (ValueError, KeyError, json.JSONDecodeError) as e:
            return self.reply(400, {'error': str(e)})
        self.reply(404, {'error': 'not found'})
    def do_DELETE(self):
        u = urlparse(self.path)
        if not self.authed(): return
        parts = u.path.strip('/').split('/')
        if len(parts) == 2 and parts[0] == 's' and parts[1] in SESSIONS:
            s = SESSIONS.pop(parts[1]); s.closed = True; s.pty.kill(); return self.reply(200, {'ok': True})
        self.reply(404, {'error': 'not found'})
    def fs_list(self, q):
        cap = min(int((q.get('max') or ['20000'])[0]), 50000)
        out, root = [], self.server.root
        for d, dirs, files in os.walk(root):
            dirs[:] = [x for x in dirs if x not in SKIP_DIRS and not x.startswith('.git')]
            for f in files:
                p = os.path.join(d, f)
                try: st = os.stat(p)
                except OSError: continue
                out.append({'path': os.path.relpath(p, root).replace(os.sep, '/'), 'size': st.st_size, 'mtime': int(st.st_mtime * 1000)})
                if len(out) >= cap: return self.reply(200, {'files': out, 'truncated': True})
        self.reply(200, {'files': out, 'truncated': False})
    def fs_read(self, j):
        out, total = [], 0
        for rel in (j.get('paths') or [])[:2000]:
            p = self.safe_path(rel)
            if not os.path.isfile(p): continue
            with open(p, 'rb') as fh: data = fh.read()
            total += len(data)
            if total > 48 * 1024 * 1024: break
            out.append({'path': rel, 'b64': base64.b64encode(data).decode()})
        self.reply(200, {'files': out})
    def fs_write(self, j):
        n = 0
        for f in (j.get('files') or []):
            p = self.safe_path(f['path'])
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, 'wb') as fh: fh.write(base64.b64decode(f.get('b64') or ''))
            n += 1
        for rel in (j.get('delete') or []):
            p = self.safe_path(rel)
            if os.path.isfile(p): os.remove(p)
        self.reply(200, {'written': n})
    def sse(self, sid):
        s = SESSIONS.get(sid)
        if not s: return self.reply(404, {'error': 'no session'})
        self.send_response(200); self.cors()
        self.send_header('Content-Type', 'text/event-stream'); self.send_header('Cache-Control', 'no-store'); self.send_header('X-Accel-Buffering', 'no')
        self.end_headers()
        try:
            self.wfile.write(b': open\n\n'); self.wfile.flush()
            while True:
                with s.cv:
                    if not s.out and not s.closed: s.cv.wait(15)
                    chunks, s.out = s.out, []
                    closed = s.closed and not chunks
                if chunks:
                    self.wfile.write(b'data: ' + base64.b64encode(b''.join(chunks)) + b'\n\n')
                elif not closed:
                    self.wfile.write(b': ping\n\n')
                if closed:
                    code = s.pty.poll_exit()
                    self.wfile.write(('event: exit\ndata: %s\n\n' % json.dumps({'type': 'exit', 'code': code})).encode())
                    self.wfile.flush(); SESSIONS.pop(sid, None); return
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            return
    def websocket(self):
        key = self.headers.get('Sec-WebSocket-Key', '')
        accept = base64.b64encode(hashlib.sha1((key + WS_GUID).encode()).digest()).decode()
        self.send_response(101)
        self.send_header('Upgrade', 'websocket'); self.send_header('Connection', 'Upgrade'); self.send_header('Sec-WebSocket-Accept', accept)
        self.end_headers(); self.wfile.flush()
        sock = self.connection; sock.setblocking(True)
        buf, term = b'', None
        try:
            while True:
                fds = [sock] + ([term.fd] if term else [])
                r, _, _ = select.select(fds, [], [], 1.0)
                if term and term.fd in r:
                    data = term.read(0)
                    if data is None or (data == b'' and term.poll_exit() is not None):
                        ws_send(sock, json.dumps({'type': 'exit', 'code': term.poll_exit() or 0}).encode(), 0x1)
                        ws_send(sock, b'', 0x8); return
                    if data: ws_send(sock, data, 0x2)
                if term and term.poll_exit() is not None and not r:
                    ws_send(sock, json.dumps({'type': 'exit', 'code': term.code}).encode(), 0x1); ws_send(sock, b'', 0x8); return
                if sock in r:
                    chunk = sock.recv(65536)
                    if not chunk: return
                    buf += chunk
                    while True:
                        fr = ws_recv(buf)
                        if fr is None: break
                        op, payload, buf = fr
                        if op == 0x8: return
                        if op == 0x9: ws_send(sock, payload, 0xA); continue
                        if op == 0x1:
                            try: msg = json.loads(payload.decode())
                            except (ValueError, UnicodeDecodeError): msg = None
                            if isinstance(msg, dict) and msg.get('type') == 'start' and term is None:
                                term = Pty(msg, self.server.root); continue
                            if isinstance(msg, dict) and msg.get('type') == 'resize' and term:
                                term.resize(int(msg.get('cols', 80)), int(msg.get('rows', 24))); continue
                            if term: term.write(payload)
                        elif op in (0x0, 0x2) and term:
                            term.write(payload)
        except (ConnectionResetError, BrokenPipeError, ValueError, OSError):
            return
        finally:
            if term: term.kill()

def reaper():
    while True:
        time.sleep(60)
        for sid, s in list(SESSIONS.items()):
            if s.closed or time.time() - s.touched > 3600: SESSIONS.pop(sid, None); s.pty.kill()

def main():
    ap = argparse.ArgumentParser(description='Portable PTY + file bridge')
    ap.add_argument('--port', type=int, default=int(os.environ.get('PFTERM_PORT', '8080')))
    ap.add_argument('--host', default=os.environ.get('PFTERM_HOST', '0.0.0.0'))
    ap.add_argument('--root', default=os.environ.get('PFTERM_ROOT', os.getcwd()))
    ap.add_argument('--token', default=os.environ.get('PFTERM_TOKEN', ''))
    ap.add_argument('--verbose', action='store_true')
    a = ap.parse_args()
    if len(a.token) < 16: sys.exit('pfterm: a token of at least 16 characters is required (--token or PFTERM_TOKEN)')
    os.makedirs(a.root, exist_ok=True)
    srv = ThreadingHTTPServer((a.host, a.port), Handler)
    srv.daemon_threads = True
    srv.token, srv.root, srv.verbose = a.token, os.path.realpath(a.root), a.verbose
    threading.Thread(target=reaper, daemon=True).start()
    print('pfterm listening on %s:%d root=%s' % (a.host, a.port, srv.root), flush=True)
    srv.serve_forever()

if __name__ == '__main__':
    main()
