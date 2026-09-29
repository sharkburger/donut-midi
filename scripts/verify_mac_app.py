#!/usr/bin/env python3
"""Check the downloadable app and its read-only-to-writable installation path."""
import os
import plistlib
import subprocess
import tempfile
from pathlib import Path
from build_connector import ROOT, FILES


def verify():
    archive = ROOT / 'dist/mac/Donut-MIDI-Neon-Mac.zip'
    with tempfile.TemporaryDirectory(prefix='donut-launcher-test-') as temp:
        directory = Path(temp)
        subprocess.run(['/usr/bin/ditto', '-x', '-k', str(archive), str(directory)], check=True)
        app = directory / 'Donut MIDI Neon.app'
        subprocess.run(['/usr/bin/codesign', '--verify', '--deep', '--strict', str(app)], check=True)
        resources = app / 'Contents/Resources'
        with (app / 'Contents/Info.plist').open('rb') as f:
            assert plistlib.load(f)['NSAppleEventsUsageDescription']
        for name in FILES:
            assert (resources / 'payload' / name).read_bytes() == (ROOT / name).read_bytes(), name
        support = directory / "Support path with spaces and 'quotes'"
        environment = {**os.environ, 'DONUT_MIDI_SUPPORT_DIR': str(support)}
        for _ in range(2):
            # No SDK, network, Terminal launch or writing to the real user profile during verification.
            subprocess.run(['/bin/zsh', str(resources / 'start.zsh'), '--prepare-only'], env=environment, check=True)
        installed = support / 'releases' / (resources / 'release-id.txt').read_text()
        for name in FILES:
            assert (installed / name).read_bytes() == (ROOT / name).read_bytes(), name
        assert not (support / 'runtime').exists()
        print('Verified app seal, embedded files, repeatable installation, and quoted paths.')
    image = ROOT / 'dist/mac/Donut-MIDI-Neon.dmg'
    if image.exists():
        subprocess.run(['/usr/bin/hdiutil', 'verify', str(image)], check=True)


if __name__ == '__main__':
    verify()
