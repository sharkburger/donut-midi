# Donut MIDI Neon Connector

For the Mac app, download https://sharkburger.github.io/donut-midi/downloads/Donut-MIDI-Neon.dmg . Open the image, drag Donut MIDI Neon.app to Applications, and open it to start Terminal automatically. First launch may require Privacy & Security → Open Anyway and permission to control Terminal. Python is still required. Later launches reuse the environment in `~/Library/Application Support/Donut MIDI/runtime`.

The instructions below describe the alternative source ZIP.

A local Python launcher for https://sharkburger.github.io/donut-midi/ .

## Start

1. Extract the whole ZIP. Keep its folders together.
2. Install Python 3.11–3.14 if necessary (https://www.python.org/downloads/).
3. Connect Neon to Companion and use the same Wi-Fi as your computer.
4. macOS: open `Start Neon Connector.command`. Windows: open `Start Neon Connector.bat` (Windows hardware testing pending).
5. First launch installs pinned direct dependencies into `.connector-venv`; internet is required. Later launches reuse it.
6. The public website opens with a pairing code. Click **Connect local Neon**, then enable sound. Allow local-network access if prompted.
7. Keep the launcher window open; Ctrl+C stops it. The code changes each restart.

If the public browser blocks the connection, use the **Local fallback** link printed in the terminal. It serves the same app at loopback, with the same pairing code. No certificate installation or security bypass is required. Audio still needs a click.

Manual phone IP: `python3 connector/launch.py --ip 10.0.0.155` (replace with your phone address).
Alternative port: `python3 connector/launch.py --port 8767`.
CLI without a new browser tab: add `--no-browser`.

## Data path

Companion → local Python SDK + AprilTag mapping → authenticated local HTTP → browser audio/visuals.

The HTTP service binds to 127.0.0.1 only. The public origin is explicitly allowed; requests need a random per-launch bearer code. The code travels in a URL fragment (not sent to GitHub), is removed from the address bar on page load, and stays in memory. No sample history or video is saved by the connector. Recording in the website remains opt-in. Do not share a pairing code while it is active.

Only fresh samples (<500 ms) are delivered. The browser ignores repeat sequence IDs and stops audio when data is stale. This is a scene-matched ~30 Hz stream, not full-rate research data and not a validated cognitive classifier.

## Distribution

This is a source/launcher package, not a signed native app and not a bundled Python interpreter. Python and first-run downloads are prerequisites. The macOS path is the initial target. See `connector-guide.html` for troubleshooting.
