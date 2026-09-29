#!/bin/zsh
cd -- "${0:A:h}" || exit 1
for candidate in python3.14 python3.13 python3.12 python3.11 python3; do
  if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import sys; raise SystemExit(not (3,11)<=sys.version_info[:2]<=(3,14))' 2>/dev/null; then
    "$candidate" connector/launch.py "$@"
    result=$?
    if [[ $result -ne 0 ]]; then read '?Connector stopped. Press Return to close.'; fi
    exit $result
  fi
done
print 'Install Python 3.11–3.14 from https://www.python.org/downloads/ then open this file again.'
read '?Press Return to close.'
