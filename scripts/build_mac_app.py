#!/usr/bin/env python3
"""Build an unsigned AppleScript launcher and optional read-only DMG on macOS."""
import argparse
import hashlib
import plistlib
import shutil
import subprocess
import tempfile
from pathlib import Path
from build_connector import ROOT, FILES


def build(output, make_dmg=True):
    output.mkdir(parents=True, exist_ok=True)
    app_name = 'Donut MIDI Neon.app'
    with tempfile.TemporaryDirectory(prefix='donut-mac-build-') as temp:
        stage = Path(temp) / 'Donut MIDI Neon'
        stage.mkdir()
        app = stage / app_name
        subprocess.run(['/usr/bin/osacompile', '-o', str(app),
                        str(ROOT / 'connector/macos/launcher.applescript')], check=True)
        resources = app / 'Contents/Resources'
        iconset = Path(temp) / 'DonutMIDI.iconset'
        iconset.mkdir()
        for size in (16, 32, 128, 256, 512):
            for scale in (1, 2):
                pixels = size * scale
                suffix = '@2x' if scale == 2 else ''
                target = iconset / f'icon_{size}x{size}{suffix}.png'
                subprocess.run(['/usr/bin/sips', '-z', str(pixels), str(pixels),
                                str(ROOT / 'connector/macos/assets/donut-eye.png'),
                                '--out', str(target)], check=True, stdout=subprocess.DEVNULL)
        subprocess.run(['/usr/bin/iconutil', '-c', 'icns', str(iconset),
                        '-o', str(resources / 'DonutMIDI.icns')], check=True)
        # AppleScript applets also name an icon via CFBundleIconName.
        # Replace their legacy resource as well so every lookup resolves to the artwork.
        shutil.copyfile(resources / 'DonutMIDI.icns', resources / 'applet.icns')
        payload = resources / 'payload'
        digest = hashlib.sha256()
        for name in FILES:
            data = (ROOT / name).read_bytes()
            digest.update(name.encode() + b'\0' + data)
            target = payload / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        (resources / 'release-id.txt').write_text(digest.hexdigest()[:16])
        shutil.copyfile(ROOT / 'connector/macos/start.zsh', resources / 'start.zsh')
        plist_path = app / 'Contents/Info.plist'
        with plist_path.open('rb') as f:
            info = plistlib.load(f)
        info.update(CFBundleIdentifier='io.github.sharkburger.donut-midi-neon',
                    CFBundleDisplayName='Donut MIDI Neon', CFBundleName='Donut MIDI Neon',
                    CFBundleShortVersionString='1.4.0', CFBundleVersion='11',
                    CFBundleIconFile='DonutMIDI.icns', CFBundleIconName='DonutMIDI',
                    NSAppleEventsUsageDescription='Open Terminal to run the local Neon connector and show its status.')
        with plist_path.open('wb') as f:
            plistlib.dump(info, f)
        # Ad-hoc sealing checks bundle integrity; this is NOT Developer ID signing/notarization.
        subprocess.run(['/usr/bin/codesign', '--force', '--sign', '-', str(app)], check=True)
        subprocess.run(['/usr/bin/codesign', '--verify', '--deep', '--strict', str(app)], check=True)
        archive = output / 'Donut-MIDI-Neon-Mac.zip'
        subprocess.run(['/usr/bin/ditto', '-c', '-k', '--keepParent', str(app), str(archive)], check=True)
        if make_dmg:
            (stage / 'Applications').symlink_to('/Applications')
            subprocess.run(['/usr/bin/hdiutil', 'create', '-volname', 'Donut MIDI Neon',
                            '-srcfolder', str(stage), '-format', 'UDZO', '-ov',
                            str(output / 'Donut-MIDI-Neon.dmg')], check=True)
        print('Built Mac launcher: ' + str(output))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/mac')
    parser.add_argument('--no-dmg', action='store_true')
    args = parser.parse_args()
    build(args.output, not args.no_dmg)
