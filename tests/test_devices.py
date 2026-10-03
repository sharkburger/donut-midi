import json
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'connector'))
from device_manager import DeviceManager,clean_record
from server import Feed

def row(phone='A',module='M1',ip='10.0.0.1'):
    return clean_record({'phoneId':phone,'moduleSerial':module,'ip':ip,'name':'Workshop '+phone})

class DeviceTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.path=Path(self.temp.name)/'selected.json';self.feed=Feed()
    def tearDown(self):self.temp.cleanup()
    def manager(self,**kw):return DeviceManager(self.feed,self.path,**kw)
    def test_no_selection_never_starts_stream_even_with_one_phone(self):
        calls=[];m=self.manager(discoverer=lambda:[row()],stream=lambda *a,**k:calls.append(1));m.start()
        time.sleep(.05);m.close();self.assertEqual(calls,[]);self.assertIsNone(m.snapshot()['selected'])
    def test_selection_persists_identity_not_just_ip_and_forget_clears_samples(self):
        m=self.manager();m.devices=[row()];m.select(row()['id']);self.assertEqual(json.loads(self.path.read_text())['moduleSerial'],'M1')
        restored=self.manager();self.assertEqual(restored.selected,row())
        self.feed.publish({'type':'sample','source':'neon'});m.forget();self.assertIsNone(self.feed.snapshot()['sample']);self.assertFalse(self.path.exists())
    def test_resolve_rejects_reused_ip_and_replacement_module_but_finds_same_device_on_new_ip(self):
        m=self.manager(prober=lambda *a:row('B','M2'),discoverer=lambda:[row('A','M3'),row('A','M1','10.0.0.9')])
        self.assertEqual(m.resolve(row())['ip'],'10.0.0.9')
        m.discoverer=lambda:[row('B','M2'),row('A','M3')];self.assertIsNone(m.resolve(row()))
    def test_old_stream_cannot_publish_after_switch_or_forget(self):
        m=self.manager();a,b=row(),row('B','M2');m.devices=[a,b];m.select(a['id']);old=m.generation
        m.session_stop=threading.Event();m._publish(old,a,{'type':'sample','source':'neon'})
        self.assertEqual(self.feed.snapshot()['sample']['deviceId'],'A')
        m.select(b['id']);m._publish(old,a,{'type':'sample','source':'neon'});self.assertIsNone(self.feed.snapshot()['sample'])
        m.session_stop=threading.Event();m._publish(old,a,{'type':'status','message':'old'});self.assertNotEqual(self.feed.snapshot()['status'],'old')
    def test_switch_stops_previous_worker_before_starting_another(self):
        a,b=row(),row('B','M2','10.0.0.2');calls=[];started=threading.Event()
        def stream(publish,stop,ip,**kw):
            calls.append(('start',kw['expected']['id']));started.set();stop.wait(2)
            publish({'type':'sample','source':'neon'});calls.append(('end',kw['expected']['id']))
        m=self.manager(discoverer=lambda:[a,b],prober=lambda ip,port:a if ip==a['ip'] else b,stream=stream);m.devices=[a,b];m.select(a['id']);m.start()
        self.assertTrue(started.wait(1));started.clear();m.select(b['id']);self.assertTrue(started.wait(1));m.close()
        self.assertEqual(calls[:3],[('start',a['id']),('end',a['id']),('start',b['id'])]);self.assertIsNone(self.feed.snapshot()['sample'])
    def test_unknown_modules_and_invalid_selection_fail_closed(self):
        with self.assertRaises(ValueError):row(module='unknown')
        m=self.manager()
        with self.assertRaises(ValueError):m.select('arbitrary-IP')
        self.assertIsNone(m.selected)
    def test_scan_is_explicit_and_does_not_select_or_stream(self):
        m=self.manager(discoverer=lambda:[row(),row('B','M2')]);m.scan()
        for _ in range(100):
            if not m.snapshot()['scanning']:break
            time.sleep(.005)
        self.assertEqual(len(m.snapshot()['devices']),2);self.assertIsNone(m.selected)

class DeviceAPITests(unittest.TestCase):
    def test_devices_require_pairing_and_accept_only_scanned_identity(self):
        import http.client
        from server import ConnectorServer
        with tempfile.TemporaryDirectory() as tmp:
            feed=Feed();m=DeviceManager(feed,Path(tmp)/'choice.json');m.devices=[row(),row('B','M2')]
            server=ConnectorServer(0,'a'*43,feed,data_path=Path(tmp)/'study.sqlite3',devices=m)
            t=threading.Thread(target=server.serve_forever,daemon=True);t.start()
            def request(path,method='GET',body=None,auth=True,origin=None):
                c=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3)
                headers={'Content-Type':'application/json'}
                if auth:headers['Authorization']='Bearer '+'a'*43
                if origin:headers['Origin']=origin
                c.request(method,path,json.dumps(body) if body is not None else None,headers)
                r=c.getresponse();data=r.read();c.close();return r.status,json.loads(data)
            try:
                self.assertEqual(request('/devices',auth=False)[0],401)
                self.assertEqual(request('/devices/select','POST',{'id':row()['id']},origin='https://evil.test')[0],403)
                self.assertEqual(request('/devices/select','POST',{'id':'anything'})[0],400)
                status,data=request('/devices/select','POST',{'id':row()['id']});self.assertEqual(status,200);self.assertEqual(data['selected']['phoneId'],'A')
                health=request('/health')[1];self.assertIn('device-selection-v1',health['capabilities']);self.assertNotIn('sample',health)
                self.assertEqual(health['deviceSelection']['selected']['moduleSerial'],'M1')
                self.assertEqual(request('/devices/forget','POST',{})[0],200);self.assertIsNone(m.selected)
                self.assertEqual(request('/selected-neon.json')[0],404)
            finally:server.shutdown();server.server_close();t.join()
