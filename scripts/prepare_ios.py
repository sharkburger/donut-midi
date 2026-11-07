"""Prepare a mobile adaptation of the deployed eight-key instrument, offline."""
from pathlib import Path
import sys
import shutil
import struct
import zlib
import json
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'connector'))
from server import ASSETS
WEB=ROOT/'ios/web'
WEB.mkdir(parents=True,exist_ok=True)
for name in sorted(ASSETS):
    dest=WEB/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/name,dest)
p=WEB/'dashboard.js';s=p.read_text().replace('Mouse · dwell to play','Touch · hold to play');p.write_text(s)
p=WEB/'app.js';s=p.read_text()
s=s.replace("function exportRecording(){if(!lastRecording)return;", "function exportRecording(){if(!lastRecording)return;if(window.webkit?.messageHandlers?.exportRecording){window.webkit.messageHandlers.exportRecording.postMessage(JSON.stringify(lastRecording));return;}")
old="c.elt.addEventListener('pointermove',e=>{const r=c.elt.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};});c.elt.addEventListener('pointerleave',()=>pointer={x:null,y:null});"
new="""const pointAt=e=>{const r=c.elt.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};};
    c.elt.style.touchAction='none';
    c.elt.addEventListener('pointerdown',e=>{if(e.isPrimary){c.elt.setPointerCapture(e.pointerId);pointAt(e);}});
    c.elt.addEventListener('pointermove',e=>{if(e.isPrimary&&(e.pointerType==='mouse'||e.buttons))pointAt(e);});
    const clearPointer=()=>{pointer={x:null,y:null};};
    c.elt.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')clearPointer();});
    for(const name of ['pointercancel','lostpointercapture'])c.elt.addEventListener(name,clearPointer);
    for(const name of ['touchstart','touchmove'])c.elt.addEventListener(name,e=>{if(e.touches.length===1){e.preventDefault();pointAt(e.touches[0]);}},{passive:false});
    for(const name of ['touchend','touchcancel'])c.elt.addEventListener(name,clearPointer);
    c.elt.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')clearPointer();});"""
assert old in s,'Deployed input handler changed; review mobile patch.'
s=s.replace(old,new)
start=s.index("$('replayFile').onchange=");end=s.index('\ndocument.addEventListener',start)
s=s[:start]+"""window.donutImportRecording=(text,name='recording.json')=>{try{if(text.length>100*1024*1024)throw Error('File exceeds 100 MB.');const data=parseRecording(JSON.parse(text));if(recording){toast('Stop and export your recording before importing replay data.');return false;}switchSource('replay');replay=data;restartReplay();$('replayInfo').textContent=`Loaded ${name} (source: ${data.source||'Unknown'}). Rescoring with the current mapping.`;toast('Recording loaded.');return true;}catch(err){toast(err.message);return false;}};
$('replayFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100*1024*1024)throw Error('File exceeds 100 MB.');window.donutImportRecording(await file.text(),file.name);}catch(err){toast(err.message);}e.target.value='';};"""+s[end:]
p.write_text(s)
# Avoid navigating away and losing an unexported recording.
p=WEB/'index.html';s=p.read_text().replace('href="index.html?v=mac-launcher-1"','href="#"');s=s.replace('</head>','<link rel="stylesheet" href="ios-mobile.css"></head>').replace('</body>', '<script src="ios-mobile.js" defer></script></body>')
p.write_text(s)
shutil.copy2(ROOT/'ios/mobile.js',WEB/'ios-mobile.js')
shutil.copy2(ROOT/'ios/mobile.css',WEB/'ios-mobile.css')
# All app artwork is generated from vector-like primitives; no external services.
size=1024;rows=bytearray()
for y in range(size):
    rows.append(0)
    for x in range(size):
        r=((x-512)**2+(y-512)**2)**.5
        color=(247,242,232)
        if 175<r<350:color=(211,153,111)
        if 200<r<310:color=(232,178,148)
        rows.extend(color)
def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(bytes(rows)))+chunk(b'IEND',b'')
icons=ROOT/'ios/DonutMIDI/Assets.xcassets/AppIcon.appiconset';icons.mkdir(parents=True,exist_ok=True)
(icons/'AppIcon.png').write_bytes(png)
(icons/'Contents.json').write_text(json.dumps({'images':[{'filename':'AppIcon.png','idiom':'universal','platform':'ios','size':'1024x1024'}],'info':{'author':'xcode','version':1}},indent=2))
(icons.parent/'Contents.json').write_text('{"info":{"author":"xcode","version":1}}')
print('Prepared iOS assets from deployed Donut MIDI Eight Keys source.')
