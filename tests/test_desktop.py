"""Exercise the actual local HTTP control surface, with no eye tracker needed."""
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from http.server import ThreadingHTTPServer

spec = importlib.util.spec_from_file_location('desktop_launcher', Path(__file__).resolve().parents[1]/'desktop/launcher.py')
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)

class LauncherTests(unittest.TestCase):
    def test_loopback_control_and_static_assets(self):
        with tempfile.TemporaryDirectory() as directory:
            launcher.WEB = Path(directory)
            (launcher.WEB/'desktop.html').write_text('token=__TOKEN__')
            (launcher.WEB/'play.html').write_text('instrument')
            server = ThreadingHTTPServer(('127.0.0.1', 0), launcher.Handler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            url = f'http://127.0.0.1:{server.server_port}'
            try:
                with urlopen(url) as r:
                    self.assertIn(launcher.TOKEN, r.read().decode())
                with urlopen(url+'/play.html') as r:
                    self.assertEqual(r.read(), b'instrument')
                for headers in [{}, {'Origin':'https://example.com','X-Donut-Token':launcher.TOKEN}, {'Origin':url,'X-Donut-Token':'wrong'}]:
                    with self.assertRaises(HTTPError) as e:
                        urlopen(Request(url+'/api/stop', data=b'', headers=headers))
                    self.assertEqual(e.exception.code, 403)
                request = Request(url+'/api/status', data=b'', headers={'Origin':url,'X-Donut-Token':launcher.TOKEN})
                with urlopen(request) as r:
                    self.assertEqual(json.load(r)['status'], '未启动')
            finally:
                server.shutdown()
                server.server_close()
                thread.join()

if __name__ == '__main__': unittest.main()
