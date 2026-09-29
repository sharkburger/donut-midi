#!/usr/bin/env python3
"""Neon -> matched scene/gaze -> AprilTag plane -> local WebSocket.
Does not start a device recording or save/transmit camera images.
The stream is matched to scene frames (~30 Hz), not full-rate eye data.
"""
import argparse
import asyncio
import json
import math
import re
import threading
import time
from websockets.asyncio.server import serve
from surface import SurfaceMapper
from pupil_labs.realtime_api.simple import Device, discover_one_device


def nullable(value):
    try:
        f=float(value)
        return f if math.isfinite(f) else None
    except (TypeError, ValueError):
        return None


def worker(publish, stop, ip):
    while not stop.is_set():
        device=None
        try:
            publish({'type':'status','message':'正在寻找 Neon；请打开 Companion，并使用同一局域网。'})
            device=Device(address=ip,port=8080) if ip else discover_one_device(max_search_duration_seconds=10)
            if device is None:
                stop.wait(3)
                continue
            mapper=SurfaceMapper()
            publish({'type':'status','message':'已发现 Neon。请佩戴眼镜，让桌垫四个标记全部可见。'})
            while not stop.is_set():
                pair=device.receive_matched_scene_video_frame_and_gaze(timeout_seconds=2)
                if pair is None:
                    publish({'type':'status','message':'等待视频与注视数据；网页将暂停选音。'})
                    continue
                frame,gaze=pair
                point,count=mapper.map(frame.bgr_pixels,gaze.x,gaze.y)
                publish({'type':'sample','source':'neon','deviceTimestamp':nullable(gaze.timestamp_unix_seconds),
                    'bridgeTimestamp':time.time(),'sceneGaze':[nullable(gaze.x),nullable(gaze.y)],
                    'x':point[0] if point else None,'y':point[1] if point else None,
                    'surfaceValid':point is not None,'markerCount':count,'worn':bool(gaze.worn),
                    'pupilLeft':nullable(getattr(gaze,'pupil_diameter_left',None)),
                    'pupilRight':nullable(getattr(gaze,'pupil_diameter_right',None)),
                    'eyes':eye_poses(gaze)})
        except Exception as exc:
            publish({'type':'status','message':f'Neon 连接中断：{type(exc).__name__}: {exc}。3 秒后重试。'})
            stop.wait(3)
        finally:
            if device is not None:
                device.close()


def eye_poses(gaze):
    """Only forward complete native Neon poses; never infer a pose from 2D gaze."""
    result = {}
    for side in ('left', 'right'):
        center = [nullable(getattr(gaze, f'eyeball_center_{side}_{axis}', None)) for axis in 'xyz']
        direction = [nullable(getattr(gaze, f'optical_axis_{side}_{axis}', None)) for axis in 'xyz']
        if None in center or None in direction or sum(v*v for v in direction) < 1e-8:
            result[side] = None
            continue
        result[side] = {'center': center, 'direction': direction,
            'pupilDiameter': nullable(getattr(gaze, f'pupil_diameter_{side}', None)),
            'aperture': nullable(getattr(gaze, f'eyelid_aperture_{side}', None)),
            'provider': 'neon-native'}
    return result


async def main(args):
    loop=asyncio.get_running_loop()
    queue=asyncio.Queue(maxsize=2)
    clients=set()
    latest_status={'type':'status','message':'桥接已启动，等待 Neon。'}
    stop=threading.Event()
    def enqueue(packet):
        if queue.full():
            queue.get_nowait()
        queue.put_nowait(packet)
    def publish(packet):
        try:
            loop.call_soon_threadsafe(enqueue,packet)
        except RuntimeError:
            pass
    async def handler(connection):
        clients.add(connection)
        try:
            await connection.send(json.dumps(latest_status,ensure_ascii=False))
            await connection.wait_closed()
        finally:
            clients.discard(connection)
    async def broadcast():
        nonlocal latest_status
        while True:
            packet=await queue.get()
            if packet['type']=='status':
                latest_status=packet
                print(packet['message'],flush=True)
            if clients:
                data=json.dumps(packet,ensure_ascii=False,allow_nan=False)
                async def send_one(client):
                    try:
                        await asyncio.wait_for(client.send(data),timeout=.25)
                    except Exception:
                        await client.close()
                await asyncio.gather(*(send_one(c) for c in tuple(clients)))
    # Only loopback web pages may read the stream. No arbitrary website access.
    origins=[re.compile(r'http://(?:127\.0\.0\.1|localhost)(?::\d+)?')]
    async with serve(handler,'127.0.0.1',args.port,origins=origins,max_size=4096):
        thread=threading.Thread(target=worker,args=(publish,stop,args.ip),daemon=True)
        thread.start()
        print(f'本机桥接：ws://127.0.0.1:{args.port}；Ctrl+C 退出。',flush=True)
        try:
            await broadcast()
        finally:
            stop.set()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ip',help='Companion phone IP; omit for local discovery')
    parser.add_argument('--port',type=int,default=8765)
    args=parser.parse_args()
    try:
        asyncio.run(main(args))
    except KeyboardInterrupt:
        print('桥接已停止。')
