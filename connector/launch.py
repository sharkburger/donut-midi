#!/usr/bin/env python3
"""Install into a private environment, then start the Neon connector."""
from pathlib import Path
import hashlib
import os
import subprocess
import sys
import venv


def main():
    if not (3, 11) <= sys.version_info[:2] <= (3, 14):
        raise SystemExit('Install Python 3.11–3.14 from https://www.python.org/downloads/ and try again.')
    root = Path(__file__).resolve().parents[1]
    env = root / '.connector-venv'
    python = env / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
    requirements = root / 'connector/requirements.txt'
    expected = hashlib.sha256(requirements.read_bytes()).hexdigest()
    stamp = env / 'requirements.sha256'
    if not python.exists():
        print('First launch: preparing an isolated Python environment…', flush=True)
        venv.EnvBuilder(with_pip=True).create(env)
    if not stamp.exists() or stamp.read_text() != expected:
        print('Installing Neon dependencies. First launch requires internet and may take several minutes.', flush=True)
        subprocess.run([str(python), '-m', 'pip', 'install', '--disable-pip-version-check', '--cache-dir', str(env / '.pip-cache'), '-r', str(requirements)], check=True)
        stamp.write_text(expected)
    command = [str(python), str(root / 'connector/server.py'), *sys.argv[1:]]
    if os.name == 'nt':
        raise SystemExit(subprocess.call(command))
    os.execv(str(python), command)


if __name__ == '__main__':
    try:
        main()
    except (OSError, subprocess.CalledProcessError) as exc:
        raise SystemExit(f'Setup failed: {exc}\nCheck your internet connection and retry. No system Python packages were modified.')
