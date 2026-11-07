"""Stage offline assets and generate a simple code-drawn app icon (no external media)."""
from pathlib import Path
import shutil
import struct
import zlib
import json
ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'ios/web'
FILES = ['play.html','play-entry.js','app.js','core.js','style.css','site.css','mat.svg','vendor/p5.min.js','vendor/p5-LICENSE.txt']
WEB.mkdir(parents=True, exist_ok=True)
for name in FILES:
    dest = WEB/name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT/name, dest)
# The app has no project-site navigation; it opens straight into the instrument.
p = WEB/'play.html'
s = p.read_text().replace('href="index.html"', 'href="play.html"')
s = s.replace('鼠标模拟', '触摸演奏 · 模拟输入').replace('鼠标代表目光；滑块代表身体输入。', '按住甜甜圈约半秒发声；滑块是模拟瞳孔值。')
p.write_text(s)
# RGB PNG: cream square, toasted ring, a small chocolate-colored center.
size = 1024
rows = bytearray()
for y in range(size):
    rows.append(0)
    for x in range(size):
        r = ((x-512)**2+(y-512)**2)**.5
        color = (247,242,232)
        if 175 < r < 350: color = (211,153,111)
        if 200 < r < 310: color = (232,178,148)
        rows.extend(color)
def chunk(kind,data): return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
png = b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(bytes(rows)))+chunk(b'IEND',b'')
icons=ROOT/'ios/DonutSong/Assets.xcassets/AppIcon.appiconset';icons.mkdir(parents=True,exist_ok=True)
(icons/'AppIcon.png').write_bytes(png)
(icons/'Contents.json').write_text(json.dumps({'images':[{'filename':'AppIcon.png','idiom':'universal','platform':'ios','size':'1024x1024'}],'info':{'author':'xcode','version':1}},indent=2))
(icons.parent/'Contents.json').write_text('{"info":{"author":"xcode","version":1}}')
print('Prepared iOS offline resources and app icon.')
