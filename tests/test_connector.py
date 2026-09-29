import http.client
import importlib.util
import json
from pathlib import Path
import threading
import time
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('donut_connector',ROOT/'connector/server.py')
connector=importlib.util.module_from_spec(spec);spec.loader.exec_module(connector)

class ConnectorTests(unittest.TestCase):
    def setUp(self):
        self.feed=connector.Feed();self.token='a'*43
        self.server=connector.ConnectorServer(0,self.token,self.feed)
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
    def tearDown(self):
        self.server.shutdown();self.server.server_close();self.thread.join()
    def request(self,path='/sample',method='GET',headers=None):
        conn=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=3)
        conn.request(method,path,headers=headers or {})
        res=conn.getresponse();data=res.read();result=(res.status,dict(res.getheaders()),data);conn.close();return result
    def auth(self,origin=connector.PUBLIC_ORIGIN):
        return {'Authorization':'Bearer '+self.token,'Origin':origin}
    def test_only_exact_origins_and_tokens_can_read_gaze(self):
        self.assertEqual(self.request(headers={'Origin':connector.PUBLIC_ORIGIN})[0],401)
        self.assertEqual(self.request(headers=self.auth('https://evil.example'))[0],403)
        self.assertEqual(self.request(headers=self.auth(connector.PUBLIC_ORIGIN+'.evil.example'))[0],403)
        self.assertEqual(self.request(headers={**self.auth(),'Authorization':'Bearer wrong'})[0],401)
        status,headers,data=self.request(headers=self.auth());self.assertEqual(status,200)
        self.assertEqual(headers['Access-Control-Allow-Origin'],connector.PUBLIC_ORIGIN)
        self.assertNotIn(self.token,data.decode())
        self.assertEqual(self.request(headers={**self.auth(),'Host':'rebound.example'})[0],403)
    def test_preflight_is_narrow_and_sample_not_in_health(self):
        headers={'Origin':connector.PUBLIC_ORIGIN,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization','Access-Control-Request-Private-Network':'true'}
        status,response,_=self.request('/sample','OPTIONS',headers)
        self.assertEqual(status,204);self.assertEqual(response['Access-Control-Allow-Private-Network'],'true')
        self.assertEqual(self.request('/sample','OPTIONS',{**headers,'Origin':'https://evil.example'})[0],403)
        self.assertEqual(self.request('/sample','OPTIONS',{**headers,'Access-Control-Request-Method':'POST'})[0],403)
        self.feed.publish({'type':'sample','source':'neon','x':.5})
        self.assertNotIn('sample',json.loads(self.request('/health',headers=self.auth())[2]))
    def test_missing_stale_and_duplicate_samples_are_not_replayed(self):
        self.feed.publish({'type':'sample','source':'neon','x':.5})
        result=json.loads(self.request(headers=self.auth())[2]);self.assertEqual(result['sample']['x'],.5)
        duplicate=json.loads(self.request('/sample?since='+str(result['sequence']),headers=self.auth())[2]);self.assertIsNone(duplicate['sample'])
        with self.feed.lock:self.feed.at=time.monotonic()-1
        self.assertIsNone(json.loads(self.request(headers=self.auth())[2])['sample'])
        self.feed.publish({'type':'sample','source':'neon','x':.7})
        self.feed.publish({'type':'status','message':'Device disconnected'})
        self.assertIsNone(json.loads(self.request(headers=self.auth())[2])['sample'])
    def test_static_fallback_does_not_serve_source_or_credentials(self):
        status,_,body=self.request('/');self.assertEqual(status,200);self.assertIn(b'lang="en"',body)
        for path in ['/connector/server.py','/.connector-venv/pyvenv.cfg','/../README.md','/.git/config']:
            self.assertEqual(self.request(path)[0],404)
        for asset in connector.ASSETS:self.assertEqual(self.request('/'+asset)[0],200,asset)
    def test_bad_sequence(self):
        self.assertEqual(self.request('/sample?since=nan',headers=self.auth())[0],400)

if __name__=='__main__':unittest.main()
