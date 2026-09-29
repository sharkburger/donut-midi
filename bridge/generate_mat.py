"""Regenerate the vector mat and raster test fixture with OpenCV AprilTags."""
from pathlib import Path
import json, re
import cv2
import numpy as np
from surface import WIDTH, HEIGHT, TAG_SIZE, TAG_POSITIONS


def generate():
    dictionary=cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_APRILTAG_36h11)
    svg=['<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="280mm" viewBox="0 0 1200 800">',
         '<rect width="1200" height="800" fill="white"/>',
         '<g font-family="Arial,sans-serif" text-anchor="middle" fill="#352d28">',
         '<text x="600" y="100" font-size="26" letter-spacing="5">DONUT MIDI</text>',
         '<text x="600" y="135" font-size="13">LOOK / TASTE / LISTEN</text>']
    raster=np.full((HEIGHT,WIDTH),255,dtype=np.uint8)
    for i,(x,y) in TAG_POSITIONS.items():
        # 8 x 8 includes one-module black border; surrounding paper is white.
        bits=cv2.aruco.generateImageMarker(dictionary,i,8)
        for row in range(8):
            for col in range(8):
                if bits[row,col]==0:
                    svg.append(f'<rect x="{x+col*15}" y="{y+row*15}" width="15" height="15" fill="black"/>')
        raster[y:y+TAG_SIZE,x:x+TAG_SIZE]=cv2.aruco.generateImageMarker(dictionary,i,TAG_SIZE)
    root=Path(__file__).resolve().parent.parent
    zones=json.loads(re.search(r'const ZONES = (\[.*?\]);', (root/'core.js').read_text(),re.S).group(1))
    markers=svg.copy()
    for z in zones:
        x,y,r=z['x']*WIDTH,z['y']*HEIGHT,z['r']*WIDTH
        svg.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="#bbb3a7" stroke-width="2"/>')
        svg.append(f'<text x="{x}" y="{y+115}" font-size="16">{z["id"]+1} / {z["name"]}</text>')
    screen=markers.copy()
    for z in zones:
        x,y,r=z['x']*WIDTH,z['y']*HEIGHT,z['r']*WIDTH
        screen.extend([f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="#bbb3a7" stroke-width="2"/>',
          f'<circle cx="{x}" cy="{y}" r="{r*.78}" fill="{z["color"]}" stroke="#bd8b50" stroke-width="8"/>',
          f'<circle cx="{x}" cy="{y}" r="{r*.24}" fill="white"/>',
          f'<text x="{x}" y="{y+115}" font-size="16">{z["id"]+1} / {z["name"]}</text>'])
    screen.extend(['<text x="600" y="732" font-size="18">REST</text>','</g></svg>'])
    (root/'monitor-mat.svg').write_text('\n'.join(screen),encoding='utf-8')
    svg += ['<rect x="240" y="688" width="720" height="72" rx="25" fill="none" stroke="#bbb3a7"/>',
            '<text x="600" y="732" font-size="18">REST</text>','</g></svg>']
    root=Path(__file__).resolve().parent.parent
    (root/'mat.svg').write_text('\n'.join(svg),encoding='utf-8')
    return raster


if __name__=='__main__':
    generate()
    print('Generated mat.svg (AprilTag 36h11, IDs 0–3).')
