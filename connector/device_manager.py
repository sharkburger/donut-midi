"""Explicit, persistent Companion + Neon selection. Never streams an unselected device."""
import asyncio
import ipaddress
import json
import os
from pathlib import Path
import threading


def clean_record(value):
    if not isinstance(value, dict): raise ValueError('Invalid device')
    phone=str(value.get('phoneId','')).strip(); serial=str(value.get('moduleSerial','')).strip()
    if not phone or len(phone)>200 or not serial or serial.lower() in ('unknown','default','none') or len(serial)>200:
        raise ValueError('Phone ID and Neon module serial are required. Attach Neon and rescan.')
    ip=str(ipaddress.IPv4Address(value['ip']));port=int(value.get('port',8080))
    if not 1<=port<=65535: raise ValueError('Invalid device port')
    return {'id':phone+'|'+serial,'phoneId':phone,'moduleSerial':serial,'name':str(value.get('name') or 'Neon Companion')[:120],'ip':ip,'port':port}


async def probe_async(ip,port=8080):
    from pupil_labs.realtime_api.device import Device
    async with Device(address=str(ipaddress.IPv4Address(ip)),port=port) as device:
        status=await asyncio.wait_for(device.get_status(),4)
        return clean_record({'phoneId':status.phone.device_id,'name':status.phone.device_name,
                             'moduleSerial':status.hardware.module_serial,'ip':ip,'port':port})


def probe(ip,port=8080):
    return asyncio.run(probe_async(ip,port))


def discover():
    # Only request status metadata. Do not start gaze/video streams on discovered devices.
    from pupil_labs.realtime_api.discovery import Network
    async def run():
        async with Network() as network:
            await asyncio.sleep(3)
            targets={(ip,d.port) for d in network.devices for ip in d.addresses if ':' not in ip}
        semaphore=asyncio.Semaphore(8)
        async def one(ip,port):
            async with semaphore:
                try:return await probe_async(ip,port)
                except Exception:return None
        rows=await asyncio.gather(*(one(ip,port) for ip,port in sorted(targets)[:64]))
        return list({r['id']:r for r in rows if r}.values())
    return asyncio.run(run())


class DeviceManager:
    def __init__(self,feed,path,discoverer=discover,prober=probe,stream=None):
        self.feed=feed;self.path=Path(path);self.discoverer=discoverer;self.prober=prober;self.stream=stream
        self.lock=threading.RLock();self.stop=threading.Event();self.wake=threading.Event();self.session_stop=threading.Event()
        self.selected=None;self.connected=None;self.devices=[];self.scanning=False;self.error='';self.generation=0
        self.state='Choose your Neon to start streaming.';self.thread=None
        try:
            if self.path.exists():self.selected=clean_record(json.loads(self.path.read_text()));self.state='Remembered Neon selected. Reconnecting only to this device.'
        except Exception:self.state='Saved selection could not be read. Choose your Neon again.'
        self.feed.publish({'type':'status','message':self.state})

    def snapshot(self,include_devices=True):
        with self.lock:
            result={'selected':dict(self.selected) if self.selected else None,'connected':dict(self.connected) if self.connected else None,'state':self.state,'generation':self.generation}
            if include_devices:result.update(devices=[dict(d) for d in self.devices],scanning=self.scanning,error=self.error)
            return result

    def scan(self):
        with self.lock:
            if self.scanning:return self.snapshot()
            self.scanning=True;self.error=''
        def run():
            try:
                rows=[clean_record(r) for r in self.discoverer()]
                with self.lock:self.devices=rows
            except Exception:
                with self.lock:self.devices=[];self.error='Discovery failed. Check Companion and local-network access.'
            finally:
                with self.lock:self.scanning=False
        threading.Thread(target=run,daemon=True).start()
        return self.snapshot()

    def _persist(self,record):
        self.path.parent.mkdir(parents=True,exist_ok=True)
        tmp=self.path.with_suffix('.tmp');tmp.write_text(json.dumps(record));os.replace(tmp,self.path)

    def select(self,device_id):
        with self.lock:
            record=next((r for r in self.devices if r['id']==device_id),None)
            if record is None:raise ValueError('Device is not in the scan results. Scan again.')
            self._persist(record)  # A failed write must not silently change the current selection.
            self._change(record,'Selected '+record['name']+'. Checking identity before streaming.')
            return self.snapshot()

    def forget(self):
        with self.lock:
            self.path.unlink(missing_ok=True)
            self._change(None,'Selection cleared. Choose your Neon to start streaming.')
            return self.snapshot()

    def _change(self,record,state):
        self.generation+=1;self.selected=dict(record) if record else None;self.connected=None;self.state=state
        self.session_stop.set();self.feed.publish({'type':'status','message':state});self.wake.set()

    def start(self):
        self.thread=threading.Thread(target=self._run,daemon=True);self.thread.start()

    def close(self):
        self.stop.set();self.session_stop.set();self.wake.set()
        if self.thread:self.thread.join(timeout=4)

    def resolve(self,selected):
        try:
            record=clean_record(self.prober(selected['ip'],selected['port']))
            if record['id']==selected['id']:return record
        except Exception:pass
        # An IP change is acceptable; a phone/module identity change is not.
        for record in self.discoverer():
            record=clean_record(record)
            if record['id']==selected['id']:return record
        return None

    def _publish(self,generation,record,packet):
        with self.lock:
            if generation!=self.generation or self.stop.is_set() or self.session_stop.is_set():return
            if packet.get('type')=='sample':
                self.connected=record;self.state='Live · '+record['name']
                packet={**packet,'deviceId':record['phoneId'],'moduleSerial':record['moduleSerial']}
            else:self.connected=None;self.state=packet.get('message',self.state)
            self.feed.publish(packet)

    def _run(self):
        while not self.stop.is_set():
            with self.lock:
                selected=dict(self.selected) if self.selected else None;generation=self.generation
                self.session_stop=threading.Event();session_stop=self.session_stop;self.wake.clear()
            if not selected:self.wake.wait(1);continue
            try:
                record=self.resolve(selected)
                with self.lock:
                    if generation!=self.generation or session_stop.is_set():continue
                    if record:
                        self.selected=record
                        # Persist the last known address without changing the chosen identity.
                        try:self._persist(record)
                        except OSError:pass
                if record:
                    stream=self.stream
                    if stream is None:
                        from neon_bridge import worker
                        stream=worker
                    stream(lambda packet:self._publish(generation,record,packet),session_stop,record['ip'],expected=record,port=record['port'],once=True)
                else:self._publish(generation,selected,{'type':'status','message':'Selected Neon is offline or its module changed. Waiting for the same device; no automatic switch.'})
            except Exception as exc:
                self._publish(generation,selected,{'type':'status','message':'Selected Neon unavailable ('+type(exc).__name__+'). Retrying only this device.'})
            self.wake.wait(3)
