"""Bundled local workshop server. No system Python or pip is needed by users."""
import argparse
import functools
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import threading
import time
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parents[1]))
WEB = ROOT / 'web' if getattr(sys, 'frozen', False) else ROOT / 'build/stage/web'
TOKEN = secrets.token_urlsafe(32)
bridge_process = None
bridge_log = None
process_lock = threading.Lock()


def stop_bridge():
    global bridge_process, bridge_log
    with process_lock:
        if bridge_process is not None:
            if bridge_process.poll() is None:
                bridge_process.terminate()
                try:
                    bridge_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    bridge_process.kill()
                    bridge_process.wait()
            bridge_process = None
        if bridge_log is not None:
            bridge_log.close()
            bridge_log = None


def bridge_command():
    if getattr(sys, 'frozen', False):
        return [sys.executable, '--bridge']
    return [sys.executable, str(Path(__file__).resolve()), '--bridge']


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB), **kwargs)

    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def do_GET(self):
        if self.path == '/':
            html = (WEB / 'desktop.html').read_text(encoding='utf-8').replace('__TOKEN__', TOKEN)
            data = html.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        elif self.path.startswith('/api/'):
            self.send_error(405)
        else:
            super().do_GET()

    def do_POST(self):
        global bridge_process, bridge_log
        expected_origin = f'http://127.0.0.1:{self.server.server_port}'
        if self.headers.get('Origin') != expected_origin or self.headers.get('X-Donut-Token') != TOKEN:
            self.send_error(403)
            return
        if self.path not in ('/api/start', '/api/stop', '/api/status', '/api/quit'):
            self.send_error(404)
            return
        status = '未启动'
        if self.path == '/api/start':
            with process_lock:
                if bridge_process is None or bridge_process.poll() is not None:
                    if bridge_log is not None:
                        bridge_log.close()
                    log_dir = Path.home() / ('Library/Logs/DonutSong' if sys.platform == 'darwin' else 'DonutSong/logs')
                    log_dir.mkdir(parents=True, exist_ok=True)
                    bridge_log = (log_dir / 'bridge.log').open('w', encoding='utf-8')
                    kwargs = {'creationflags': subprocess.CREATE_NO_WINDOW} if sys.platform == 'win32' else {}
                    bridge_process = subprocess.Popen(bridge_command(), stdout=bridge_log, stderr=subprocess.STDOUT, **kwargs)
        elif self.path == '/api/stop':
            stop_bridge()
        if bridge_process is not None:
            code = bridge_process.poll()
            status = '已启动，请在演奏台连接；正在寻找设备' if code is None else f'已退出（代码 {code}），请检查日志'
        data = json.dumps({'status': status}, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)
        if self.path == '/api/quit':
            threading.Thread(target=self.server.shutdown, daemon=True).start()


def bridge_mode(check=False):
    sys.path.insert(0, str(ROOT / 'bridge'))
    import neon_bridge
    if check:
        import cv2
        from pupil_labs.realtime_api.simple import Device
        assert hasattr(cv2, 'aruco') and Device is not None
        return
    import asyncio
    from types import SimpleNamespace
    asyncio.run(neon_bridge.main(SimpleNamespace(port=8765, ip=None)))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--bridge', action='store_true')
    parser.add_argument('--bridge-check', action='store_true')
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--port', type=int, default=0)
    args = parser.parse_args()
    if args.bridge or args.bridge_check:
        bridge_mode(args.bridge_check)
        return
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    url = f'http://127.0.0.1:{server.server_port}/'
    if not args.no_browser:
        webbrowser.open(url)
    elif sys.stdout:
        print(url, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        stop_bridge()
        server.server_close()


if __name__ == '__main__':
    main()
