#!/usr/bin/env python3
"""Buildless, allowlisted GitHub Pages and reproducible source packages."""
from pathlib import Path
from shutil import copy2
from zipfile import ZipFile, ZIP_DEFLATED
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs'
PAGES=['index.html','play.html','get-started.html','build.html','open-source.html','site.css','site.js','play-entry.js','style.css','app.js','core.js','mat.svg','vendor/p5.min.js','vendor/p5-LICENSE.txt','README.md','VERIFICATION.md','THIRD_PARTY.md','CONTRIBUTING.md','bridge/requirements.txt','.nojekyll']
SOURCE=list(dict.fromkeys(PAGES+['serve.py','启动甜甜圈之歌.command','.gitignore','scripts/package_site.py']+[str(p.relative_to(ROOT)) for folder,pattern in [('bridge','*.py'),('bridge','*.txt'),('tests','*.cjs'),('tests','*.py')] for p in (ROOT/folder).glob(pattern)]))
OUT.mkdir(exist_ok=True)
for name in PAGES:
 dest=OUT/'github-pages'/name;dest.parent.mkdir(parents=True,exist_ok=True);copy2(ROOT/name,dest)
for filename,files in [('donut-song-pages.zip',PAGES),('donut-song-source.zip',SOURCE)]:
 with ZipFile(OUT/filename,'w',ZIP_DEFLATED) as z:
  for name in files:z.write(ROOT/name,name)
 print(OUT/filename)
