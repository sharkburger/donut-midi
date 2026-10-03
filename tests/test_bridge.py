import asyncio
import inspect
import sys
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'bridge'))
import neon_bridge as bridge
from generate_mat import generate
from pupil_labs.realtime_api.simple import Device
from websockets.asyncio.client import connect
from websockets.exceptions import InvalidStatus

class BridgeTests(unittest.TestCase):
    def test_selected_identity_is_checked_before_any_stream_and_after_each_receive(self):
        stop=threading.Event();packets=[];calls=[]
        expected={'phoneId':'A','moduleSerial':'M1'}
        device=SimpleNamespace(phone_id='B',module_serial='M2',close=lambda:None,receive_matched_scene_video_frame_and_gaze=lambda **kw:calls.append(1))
        with patch.object(bridge,'Device',return_value=device):bridge.worker(packets.append,stop,'10.0.0.1',expected=expected,once=True)
        self.assertEqual(calls,[]);self.assertFalse(any(p['type']=='sample' for p in packets))
        device.phone_id='A';device.module_serial='M1';packets.clear()
        def receive(**kw):
            device.module_serial='M2'
            return SimpleNamespace(bgr_pixels=generate()),SimpleNamespace(x=600,y=344,worn=True,timestamp_unix_seconds=1)
        device.receive_matched_scene_video_frame_and_gaze=receive
        with patch.object(bridge,'Device',return_value=device):bridge.worker(packets.append,stop,'10.0.0.1',expected=expected,once=True)
        self.assertFalse(any(p['type']=='sample' for p in packets))

    def test_eye_pose_requires_complete_finite_geometry(self):
        self.assertEqual(bridge.eye_poses(SimpleNamespace()), {'left':None,'right':None})
        values={f'eyeball_center_left_{a}':v for a,v in zip('xyz',[-31,2,4])}
        values.update({f'optical_axis_left_{a}':v for a,v in zip('xyz',[0,0,1])})
        values['pupil_diameter_left']=4.2
        result=bridge.eye_poses(SimpleNamespace(**values))
        self.assertEqual(result['left']['center'],[-31,2,4])
        self.assertEqual(result['left']['provider'],'neon-native')
        self.assertIsNone(result['right'])
        values['optical_axis_left_x']=float('nan')
        self.assertIsNone(bridge.eye_poses(SimpleNamespace(**values))['left'])
    def test_sdk_contract_and_missing_pupil(self):
        self.assertIn('timeout_seconds',inspect.signature(Device.receive_matched_scene_video_frame_and_gaze).parameters)
        self.assertIsNone(bridge.nullable(float('nan')))
        self.assertIsNone(bridge.nullable(None))
        self.assertEqual(bridge.nullable(4),4.0)
    def test_matched_sample_adapter(self):
        stop=threading.Event(); packets=[]
        gaze=SimpleNamespace(x=600,y=344,worn=True,timestamp_unix_seconds=123.0,pupil_diameter_left=4.2)
        device=SimpleNamespace(receive_matched_scene_video_frame_and_gaze=lambda **kw:(SimpleNamespace(bgr_pixels=generate()),gaze),close=lambda:None)
        def publish(packet):
            packets.append(packet)
            if packet['type']=='sample':stop.set()
        with patch.object(bridge,'discover_one_device',return_value=device):bridge.worker(publish,stop,None)
        sample=packets[-1]
        self.assertEqual(sample['source'],'neon')
        self.assertTrue(sample['surfaceValid'])
        self.assertAlmostEqual(sample['x'],.5,places=2)
        self.assertEqual(sample['pupilLeft'],4.2)
        self.assertIsNone(sample['pupilRight'])

class TransportTests(unittest.IsolatedAsyncioTestCase):
    async def test_websocket_local_origin_only(self):
        def fake_worker(publish,stop,ip):
            publish({'type':'status','message':'test fixture: no device connection'})
            stop.wait()
        with patch.object(bridge,'worker',side_effect=fake_worker):
            task=asyncio.create_task(bridge.main(SimpleNamespace(port=18765,ip=None)))
            try:
                await asyncio.sleep(.15)
                async with connect('ws://127.0.0.1:18765',origin='http://127.0.0.1:8088') as ws:
                    message=await asyncio.wait_for(ws.recv(),2)
                    self.assertIn('status',message)
                with self.assertRaises(InvalidStatus):
                    async with connect('ws://127.0.0.1:18765',origin='https://untrusted.example'):pass
            finally:
                task.cancel()
                try:await task
                except asyncio.CancelledError:pass

if __name__=='__main__':unittest.main()
