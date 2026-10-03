"""Package a runnable p5.neon starter without credentials or recordings."""
from pathlib import Path
import argparse
import zipfile
ROOT = Path(__file__).resolve().parents[1]
FILES = ['library/assets/donut-eye.png', 'library/templates/mirror.js', 'library/p5.neon-effects.js', 'library/template-catalog.js', 'library/project-zip.js', 'library/catalog-editor.js', 'library/templates/aoi.js', 'library/templates/asset.js', 'library/templates/blink.js', 'library/templates/dot.js', 'library/templates/dwell.js', 'library/templates/eyes.js', 'library/templates/particles.js', 'library/templates/pupil.js', 'library/templates/signals.js', 'library/templates/trail.js', 'markers.svg', 'library/layout-core.js', 'library/layout-editor.js', 'library/physical-template.js', 'library/preview-runtime.js', 'library/console.js', 'library/editor.html', 'library/editor.css', 'library/editor.js', 'library/editor-split.js', 'library/template.js', 'library/index.html', 'library/p5.neon.js', 'library/example.js',
         'library/style.css', 'library/README.md', 'library/LICENSE',
         'connector-client.js', 'monitor-mat.svg', 'vendor/p5.min.js', 'vendor/p5-LICENSE.txt']
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/p5-neon-0.2.0.zip')
    dest = parser.parse_args().output
    dest.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name in FILES:
            archive.write(ROOT / name, 'p5-neon-starter/' + name)
        archive.writestr('p5-neon-starter/START-HERE.txt',
            'For mouse simulation: run python3 -m http.server 8080 in this folder, then open http://localhost:8080/library/index.html\n'
            'For live Neon, use https://sharkburger.github.io/donut-midi/library/ with your existing connector.\n'
            'Arbitrary localhost origins and the p5 Web Editor are not enabled by the existing connector. See library/README.md.\n')
    print(f'Built {dest}')
