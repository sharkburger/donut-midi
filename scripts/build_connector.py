#!/usr/bin/env python3
"""Build a clean source/launcher ZIP with an offline frontend fallback."""
import argparse
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'connector'))
from server import ASSETS

FILES = sorted(ASSETS | {'Start Neon Connector.command', 'Start Neon Connector.bat',
    'connector/server.py', 'connector/launch.py', 'connector/requirements.txt',
    'connector/README.md', 'bridge/neon_bridge.py', 'bridge/surface.py'})


def build(destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for name in FILES:
            content = (ROOT / name).read_bytes()
            info = zipfile.ZipInfo('Donut-MIDI-Connector/' + name)
            info.create_system = 3
            info.external_attr = (0o100755 if name.endswith('.command') else 0o100644) << 16
            archive.writestr(info, content, compress_type=zipfile.ZIP_DEFLATED)
    print(f'Built {destination} ({destination.stat().st_size:,} bytes, {len(FILES)} files)')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/donut-midi-connector.zip')
    build(parser.parse_args().output)
