#!/usr/bin/env python3
"""Bounded Neon connectivity check. Reports counts, never stores images or samples."""
import argparse
from collections import Counter
import json
import math
from pathlib import Path
import threading
import time
from urllib.request import build_opener, ProxyHandler

from pupil_labs.realtime_api.simple import Device, discover_one_device
from surface import SurfaceMapper


def valid_pupil(value):
    return isinstance(value, (int, float)) and math.isfinite(value) and 1 <= value <= 9


def inspect_device(device, seconds):
    stop = threading.Event()
    lock = threading.Lock()
    counts = Counter()
    errors = {}
    mapper = SurfaceMapper()

    def gaze_loop():
        while not stop.is_set():
            gaze = device.receive_gaze_datum(timeout_seconds=.3)
            if gaze is None:
                continue
            with lock:
                counts['gaze_samples_received'] += 1
                counts['worn_samples'] += int(bool(gaze.worn))
                counts['pupil_samples_valid'] += int(bool(gaze.worn) and any(
                    valid_pupil(getattr(gaze, key, None))
                    for key in ['pupil_diameter_left', 'pupil_diameter_right']))

    def scene_loop():
        while not stop.is_set():
            pair = device.receive_matched_scene_video_frame_and_gaze(timeout_seconds=.3)
            if pair is None:
                continue
            frame, gaze = pair
            point, marker_count = mapper.map(frame.bgr_pixels, gaze.x, gaze.y)
            with lock:
                counts['matched_frames_received'] += 1
                counts['max_markers_visible'] = max(counts['max_markers_visible'], marker_count)
                counts['surface_mapped_frames'] += int(point is not None)

    def events_loop():
        names = {0:'saccades_completed', 1:'fixations_completed',
                 2:'saccades_started', 3:'fixations_started', 4:'blinks_completed'}
        while not stop.is_set():
            event = device.receive_eye_events(timeout_seconds=.3)
            if event is not None:
                with lock:
                    counts[names.get(event.event_type, 'other_events')] += 1

    def guarded(name, fn):
        try:
            fn()
        except Exception as exc:
            with lock:
                errors[name] = f'{type(exc).__name__}: {exc}'

    threads = [threading.Thread(target=guarded, args=(name, fn), daemon=True)
               for name, fn in [('gaze', gaze_loop), ('scene', scene_loop), ('events', events_loop)]]
    for thread in threads:
        thread.start()
    stop.wait(seconds)
    stop.set()
    for thread in threads:
        thread.join(timeout=1)
    with lock:
        result = dict(counts)
        result['stream_errors'] = dict(errors)
    result['observation_seconds'] = seconds
    result['notes'] = 'Received counts are diagnostic observations, not certified sensor rates. Zero events do not prove unsupported detection.'
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ip', help='Phone LAN IP; omit for 10-second discovery')
    parser.add_argument('--seconds', type=float, default=12)
    parser.add_argument('--report', type=Path, help='Optional aggregate JSON report path')
    args = parser.parse_args()
    if not 1 <= args.seconds <= 60:
        parser.error('--seconds must be 1–60')
    report = {'checked_at': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
              'device_found': False, 'real_hardware_samples': False,
              'connection_method': 'explicit_ip' if args.ip else 'discovery'}
    device = None
    try:
        if args.ip:
            # Explicitly supplied phone only; no subnet scans or proxy routing.
            import ipaddress
            ipaddress.ip_address(args.ip)
            with build_opener(ProxyHandler({})).open(f'http://{args.ip}:8080/api/status', timeout=5) as response:
                report['phone_http_status'] = response.status
            device = Device(address=args.ip, port=8080)
        else:
            print('Searching for Neon Companion for up to 10 seconds…', flush=True)
            device = discover_one_device(max_search_duration_seconds=10)
        report['device_found'] = device is not None
        if device is None:
            report['next_step'] = 'Open Companion with Neon connected; use the same LAN, then retry with --ip PHONE_IP. Same SSID can still have client isolation.'
        else:
            print(f'Device found. Inspecting streams for {args.seconds:g} seconds; no recording is started.', flush=True)
            report.update(inspect_device(device, args.seconds))
            report['real_hardware_samples'] = any(report.get(key, 0) > 0 for key in (
                'gaze_samples_received', 'matched_frames_received', 'fixations_completed',
                'saccades_completed', 'fixations_started', 'saccades_started', 'blinks_completed'))
            report['gaze_ready'] = report.get('worn_samples', 0) > 0
            report['pupil_ready'] = report.get('pupil_samples_valid', 0) > 0
            report['surface_ready'] = report.get('surface_mapped_frames', 0) > 0
    except Exception as exc:
        report['error'] = f'{type(exc).__name__}: {exc}'
    finally:
        if device is not None:
            device.close()
    result = json.dumps(report, indent=2, ensure_ascii=False)
    print(result)
    if args.report:
        args.report.write_text(result+'\n', encoding='utf-8')
    return 0 if report.get('gaze_ready') else 2


if __name__ == '__main__':
    raise SystemExit(main())
