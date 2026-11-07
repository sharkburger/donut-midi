"""Build a standalone beta launcher with bundled Neon bridge and offline assets."""
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys
from importlib.metadata import distributions

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / 'build' / 'stage'
WEB_FILES = ['index.html', 'play.html', 'get-started.html', 'build.html', 'open-source.html', 'site.css', 'site.js', 'play-entry.js', 'style.css', 'app.js', 'core.js', 'mat.svg', 'vendor/p5.min.js', 'vendor/p5-LICENSE.txt', 'THIRD_PARTY.md']
STAGE.mkdir(parents=True, exist_ok=True)
shutil.rmtree(STAGE / 'web', ignore_errors=True)
for name in WEB_FILES:
    dest = STAGE / 'web' / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / name, dest)
shutil.copy2(ROOT / 'desktop/desktop.html', STAGE / 'web/desktop.html')
# Preserve package notices for binary distribution.
licenses = STAGE / 'licenses'
licenses.mkdir(exist_ok=True)
for distribution in distributions():
    dest = licenses / distribution.metadata['Name']
    dest.mkdir(exist_ok=True)
    (dest / 'METADATA.txt').write_text(distribution.read_text('METADATA') or '', encoding='utf-8')
    for file in distribution.files or []:
        if '.dist-info/' in str(file) and any(key in str(file).lower() for key in ('license', 'copying', 'notice')):
            source = Path(distribution.locate_file(file))
            if source.is_file():
                target = dest / str(file).split('.dist-info/', 1)[1]
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)
# CPython also publishes its complete license via the standard library.
import builtins
builtins.license._Printer__setup()
(licenses / 'CPython-LICENSE.txt').write_text('\n'.join(builtins.license._Printer__lines), encoding='utf-8')
cmd = [sys.executable, '-m', 'PyInstaller', '--noconfirm', '--clean', '--name', 'Donut Song', '--windowed', '--onedir', '--paths', str(ROOT / 'bridge'), '--hidden-import', 'neon_bridge', '--collect-all', 'pupil_labs', '--collect-all', 'av', '--add-data', f'{STAGE / "web"}{os.pathsep}web', '--add-data', f'{licenses}{os.pathsep}licenses', '--add-data', f'{ROOT / "bridge"}{os.pathsep}bridge', '--distpath', str(ROOT / 'dist'), '--workpath', str(ROOT / 'build/pyinstaller'), '--specpath', str(ROOT / 'build'), str(ROOT / 'desktop/launcher.py')]
if sys.platform == 'darwin':
    cmd += ['--osx-bundle-identifier', 'io.github.sharkburger.donutsong']
subprocess.run(cmd, check=True, cwd=ROOT)
print('Desktop bundle created in', ROOT / 'dist')
