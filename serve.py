#!/usr/bin/env python3
"""Start the offline workshop app on this computer only."""
import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--port',type=int,default=8088)
    p.add_argument('--no-browser',action='store_true')
    a=p.parse_args()
    handler=functools.partial(SimpleHTTPRequestHandler,directory=str(Path(__file__).resolve().parent))
    try:
        server=ThreadingHTTPServer(('127.0.0.1',a.port),handler)
    except OSError:
        print(f'端口 {a.port} 已被占用。若页面已运行，请打开 http://127.0.0.1:{a.port}；否则使用 --port 8089。')
        raise SystemExit(1)
    url=f'http://127.0.0.1:{a.port}'
    print(f'Donut Song 已启动：{url}\n关闭此窗口或按 Ctrl+C 停止。',flush=True)
    if not a.no_browser:webbrowser.open(url)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
