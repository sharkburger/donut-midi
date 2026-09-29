#!/bin/zsh
set -eu
resource_dir="${0:A:h}"
support_dir="${DONUT_MIDI_SUPPORT_DIR:-$HOME/Library/Application Support/Donut MIDI}"
release_id=$(<"$resource_dir/release-id.txt")
release_dir="$support_dir/releases/$release_id"
print 'Donut MIDI · Neon Connector'
print 'Preparing your local connector…'
mkdir -p "$release_dir"
/usr/bin/ditto "$resource_dir/payload" "$release_dir"
export DONUT_MIDI_RUNTIME="$support_dir/runtime"
cd "$release_dir"
if [[ "${1:-}" == "--prepare-only" ]]; then
  print -r -- "$release_dir"
  exit 0
fi
for candidate in /opt/homebrew/bin/python3 /usr/local/bin/python3 python3.14 python3.13 python3.12 python3.11 python3; do
  if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import sys; raise SystemExit(not (3,11)<=sys.version_info[:2]<=(3,14))' 2>/dev/null; then
    # Let the OS assign a free port so an older workshop bridge is not interrupted.
    "$candidate" connector/launch.py --port 0
    exit $?
  fi
done
print 'Python 3.11–3.14 is required for this first launcher version.'
print 'Install it from https://www.python.org/downloads/macos/ then reopen Donut MIDI Neon.app.'
exit 1
