#!/usr/bin/env python3
"""Authenticated, loopback-only Neon transport for the public Donut MIDI site."""
import argparse
import hmac
import json
import mimetypes
from pathlib import Path
import secrets
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, parse_qs, urlencode
import webbrowser
sys.path.insert(0, str(Path(__file__).resolve().parent))
from study_store import StudyStore

PUBLIC_ORIGIN = 'https://sharkburger.github.io'
PUBLIC_URL = PUBLIC_ORIGIN + '/donut-midi/'
ROOT = Path(__file__).resolve().parents[1]
# Explicit public assets; never serve source, session files or environment contents.
ASSETS = {'study-core.js', 'study.js', 'game-mix.js', 'game-core.js', 'game-mode.js', 'gaze-art.js', 'gaze-art-view.js', 'soundscapes.js', 'cognitive-evidence.js', 'cognitive-panel.js', 'eye-canvas.js', 'library/preview-runtime.js', 'library/console.js', 'library/editor.html', 'library/editor.css', 'library/editor.js', 'library/template.js', 'library/index.html', 'library/p5.neon.js', 'library/example.js', 'library/style.css', 'library/README.md', 'library/LICENSE', 'dashboard.js', 'dashboard.css', 'index.html', 'style.css', 'core.js', 'app.js', 'patterns.js',
          'curve.js', 'states.js', 'studio.js', 'pattern-view.js', 'sample-controls.js',
          'midi-core.js', 'music.js', 'research-session.js', 'public.js', 'connector.js',
          'connector-client.js', 'mat.svg', 'monitor-mat.svg', 'monitor.html',
          'vendor/p5.min.js', 'vendor/p5-LICENSE.txt', 'connector-guide.html'}


class Feed:
    """Only the latest sample is retained in memory, never a session history."""
    def __init__(self):
        self.lock = threading.Lock()
        self.sequence = 0
        self.sample = None
        self.at = 0
        self.status = 'Connector ready. Searching for Neon.'

    def publish(self, packet):
        with self.lock:
            if packet.get('type') == 'sample':
                self.sequence += 1
                self.sample = packet
                self.at = time.monotonic()
                self.status = 'Receiving live Neon data.'
            elif packet.get('type') == 'status':
                self.status = packet['message']
                self.sample = None

    def snapshot(self, since=-1):
        with self.lock:
            age = (time.monotonic() - self.at) * 1000
            fresh = self.sample is not None and age < 500
            return {'connector': 'donut-midi', 'version': '1.3.0', 'capabilities': ['study-v1'],
                    'sequence': self.sequence, 'status': self.status,
                    'sampleAgeMs': round(age, 2) if fresh else None,
                    'sample': self.sample if fresh and self.sequence != since else None}


class ConnectorServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = False

    def __init__(self, port, token, feed, root=ROOT, data_path=None):
        self.token, self.feed, self.root = token, feed, root
        self.study = StudyStore(data_path)
        super().__init__(('127.0.0.1', port), Handler)

    def allowed_origins(self):
        port = self.server_port
        return {PUBLIC_ORIGIN, f'http://127.0.0.1:{port}', f'http://localhost:{port}'}


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def setup(self):
        super().setup()
        self.connection.settimeout(5)

    def log_message(self, *args):
        pass  # Never log pairing credentials, URLs, or gaze samples.

    def host_allowed(self):
        return self.headers.get('Host') in {
            f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}

    def origin_allowed(self):
        return self.headers.get('Origin') in self.server.allowed_origins()

    def reply(self, code, data, content_type='application/json'):
        if not isinstance(data, bytes):
            data = json.dumps(data, allow_nan=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        if self.origin_allowed():
            self.send_header('Access-Control-Allow-Origin', self.headers['Origin'])
            self.send_header('Vary', 'Origin')
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_OPTIONS(self):
        requested = {h.strip().lower() for h in self.headers.get('Access-Control-Request-Headers', '').split(',') if h.strip()}
        if (not self.host_allowed() or not self.origin_allowed()
                or self.headers.get('Access-Control-Request-Method') not in ({'POST'} if urlsplit(self.path).path in ('/study/start','/study/batch','/study/export-files') else {'GET'} if urlsplit(self.path).path in ('/health','/sample','/study/info','/study/list','/study/export') else set())
                or requested - {'authorization','content-type'}):
            self.reply(403, {'error': 'Origin or request not allowed'})
            return
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', self.headers['Origin'])
        self.send_header('Vary', 'Origin')
        self.send_header('Access-Control-Allow-Methods', self.headers['Access-Control-Request-Method'])
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Access-Control-Max-Age', '600')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def study_authorized(self):
        if not self.host_allowed() or (self.headers.get('Origin') is not None and not self.origin_allowed()):
            self.reply(403, {'error':'Origin or host not allowed'}); return False
        if not hmac.compare_digest(self.headers.get('Authorization',''), 'Bearer '+self.server.token):
            self.reply(401, {'error':'Pairing code required'}); return False
        return True

    def do_POST(self):
        if not self.study_authorized():
            self.close_connection=True; return
        path=urlsplit(self.path).path
        if path not in ('/study/start','/study/batch','/study/export-files'):
            self.close_connection=True; self.reply(404, {'error':'Not found'}); return
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=2_000_000 or self.headers.get('Content-Type','').split(';')[0]!='application/json':
                self.close_connection=True; self.reply(413, {'error':'JSON batch required; maximum 2 MB'}); return
            data=json.loads(self.rfile.read(size),parse_constant=lambda _: (_ for _ in ()).throw(ValueError('Nonfinite JSON')))
            if not isinstance(data,dict): raise ValueError('JSON object required')
            result=self.server.study.start(data) if path=='/study/start' else self.server.study.export_files(data.get('id')) if path=='/study/export-files' else self.server.study.batch(data)
            self.reply(200,result)
        except (ValueError, KeyError, TypeError) as e:
            self.reply(400, {'error':str(e)})
        except Exception:
            self.reply(500, {'error':'Local database write failed; retry without closing the page'})

    def do_GET(self):
        if not self.host_allowed():
            self.reply(403, {'error': 'Loopback host required'})
            return
        path = urlsplit(self.path).path
        if path in ('/study/info','/study/list','/study/export'):
            if not self.study_authorized(): return
            try:
                if path=='/study/info': self.reply(200, {'schema':'study-v1','database_path':str(self.server.study.path)})
                elif path=='/study/list': self.reply(200, {'sessions':self.server.study.listing()})
                else: self.reply(200,self.server.study.export(parse_qs(urlsplit(self.path).query).get('id',[None])[0]),'application/zip')
            except (ValueError,TypeError) as e: self.reply(400,{'error':str(e)})
            except Exception: self.reply(500,{'error':'Local database read failed'})
            return
        if path in ('/health', '/sample'):

            # Same-origin fetches may omit Origin; only the exact local host is exempt.
            origin = self.headers.get('Origin')
            if origin is not None and not self.origin_allowed():
                self.reply(403, {'error': 'Origin not allowed'})
                return
            auth = self.headers.get('Authorization', '')
            if not hmac.compare_digest(auth, 'Bearer ' + self.server.token):
                self.reply(401, {'error': 'Pairing code required'})
                return
            try:
                since = int(parse_qs(urlsplit(self.path).query).get('since', ['-1'])[0])
            except ValueError:
                self.reply(400, {'error': 'Invalid sequence'})
                return
            packet = self.server.feed.snapshot(since)
            if path == '/health':
                packet.pop('sample', None)
            self.reply(200, packet)
            return
        asset = path.lstrip('/') or 'index.html'
        if asset not in ASSETS:
            self.reply(404, {'error': 'Not found'})
            return
        file = self.server.root / asset
        if not file.is_file():
            self.reply(404, {'error': 'Asset missing; download the full package'})
            return
        self.reply(200, file.read_bytes(), mimetypes.guess_type(asset)[0] or 'application/octet-stream')


def run_worker(feed, stop, ip):
    sys.path.insert(0, str(ROOT / 'bridge'))
    try:
        from neon_bridge import worker
        worker(feed.publish, stop, ip)
    except Exception as exc:
        feed.publish({'type': 'status', 'message': f'Neon worker stopped: {type(exc).__name__}: {exc}'})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ip', help='Companion phone IPv4 address; omit for discovery')
    parser.add_argument('--port', type=int, default=8766)
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--data-dir', type=Path, help='Optional local study database directory')
    args = parser.parse_args()
    token, feed, stop = secrets.token_urlsafe(32), Feed(), threading.Event()
    try:
        server = ConnectorServer(args.port, token, feed, data_path=args.data_dir/'study.sqlite3' if args.data_dir else None)
    except OSError:
        parser.exit(1, f'Port {args.port} is unavailable. Close your previous connector or use --port 8767.\n')
    fragment = urlencode({'pair': token, 'port': server.server_port})
    public_url = PUBLIC_URL + '#' + fragment
    fallback_url = f'http://127.0.0.1:{server.server_port}/#' + fragment
    print(f'Donut MIDI Neon Connector 1.3\n\nPairing code: {token}\n\nPublic website:\n{public_url}\n\nLocal fallback (if the browser blocks public-to-local access):\n{fallback_url}\n\nKeep this window open. Ctrl+C stops the connector. Study data is saved only after consent and Start in the webpage. No video is saved.\n', flush=True)
    thread = threading.Thread(target=run_worker, args=(feed, stop, args.ip), daemon=True)
    thread.start()
    if not args.no_browser:
        webbrowser.open(public_url)
    try:
        server.serve_forever(poll_interval=.25)
    except KeyboardInterrupt:
        pass
    finally:
        stop.set()
        server.server_close()
        thread.join(timeout=4)
        print('Connector stopped.', flush=True)


if __name__ == '__main__':
    main()
