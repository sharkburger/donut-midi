# Donut Song desktop beta

Version: 0.2.0-beta.1. The first downloadable build targets **Apple Silicon Macs running macOS 14 or later**. Intel and Windows binaries are not included in this release.

1. Download `Donut-Song-0.2.0-beta.1-macOS-arm64.zip` from GitHub Releases and unzip it.
2. Move `Donut Song.app` to Applications, then open it. The software starts a local service and opens its instrument in your default browser. Python and device libraries are included; no terminal setup is needed.
3. Select simulation or data replay to use it offline. Audio starts only after pressing the audio button.
4. For Neon, put Companion and this Mac on the same local network, enable eye state in Companion, then press **启动 Neon 连接** in the desktop bar. Select Neon input in the instrument and press **连接 Neon 桥接**.
5. Stop and export any recording before pressing **退出软件**. Closing the browser alone does not quit the local service.

This is an **ad-hoc signed developer beta, without Apple notarization**. If macOS blocks it, use System Settings → Privacy & Security → Open Anyway after verifying that you downloaded it from this repository. Do not disable Gatekeeper globally. Some managed Macs may not permit running this beta.

Real Neon hardware has not yet been tested with this distribution. Treat live connection as experimental. The software uses a local WebSocket on port 8765. If that port is already in use, quit the other Neon bridge first. The web service uses an automatically assigned loopback port and is not exposed to the LAN.

Bridge diagnostics: `~/Library/Logs/DonutSong/bridge.log`. The file contains connection status and errors, not scene video. Recording remains opt-in, in browser memory until explicitly exported.

## Build from source

Use a clean Python 3.14 virtual environment on the target platform:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r desktop/requirements.txt
python scripts/build_desktop.py
```

For the exact dependency versions used by the first Mac ARM build, use `desktop/requirements-macos-arm64.lock.txt` instead. The application bundle is generated at `dist/Donut Song.app`. Rebuild separately on each operating system; this build script does not cross-compile.

## Checks

```sh
node --test tests/*.test.cjs
python tests/test_surface.py
python tests/test_bridge.py
python tests/test_desktop.py
"dist/Donut Song.app/Contents/MacOS/Donut Song" --bridge-check
```
