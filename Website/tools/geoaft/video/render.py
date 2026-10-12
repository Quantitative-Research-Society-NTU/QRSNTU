"""Render animatic.html to an MP4 (and optional stills) with Playwright + ffmpeg.

Usage (from the repository root, with `python -m http.server -d Website 8766` running):
  python Website/tools/geoaft/video/render.py --stills 3,12,25,45,62,72,82,90,100,115
  python Website/tools/geoaft/video/render.py --fps 24
Outputs go to Website/v1/assets/geoaft/video/ (MP4 + poster) and a review copy with burned-in
captions next to this script. Google Fonts are optional: pass --font-dir to serve local
Playfair Display files when the network blocks fonts.googleapis.com.
"""
import argparse
import asyncio
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[2] / 'v1' / 'assets' / 'geoaft' / 'video'
URL = 'http://localhost:8766/tools/geoaft/video/animatic.html'


async def run(args):
    timing = json.loads((HERE / 'timing.json').read_text(encoding='utf-8'))
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=args.scale)
        if args.font_dir:
            font_dir = Path(args.font_dir)
            css = ''.join(f"@font-face{{font-family:'Playfair Display';font-weight:{w};src:url('/__f/playfair-display-latin-{w}-normal.woff2') format('woff2')}}" for w in (400, 700))

            async def fonts(route):
                u = route.request.url
                if 'fonts.googleapis.com' in u:
                    await route.fulfill(status=200, content_type='text/css', body=css)
                elif '/__f/' in u:
                    await route.fulfill(status=200, content_type='font/woff2', body=(font_dir / u.split('/__f/')[1]).read_bytes())
                else:
                    await route.continue_()
            await page.route('**/*', fonts)
        await page.goto(URL, wait_until='networkidle')
        await page.evaluate('window.__ready')
        stage = page.locator('#stage')
        if args.stills:
            for s in args.stills.split(','):
                await page.evaluate(f'window.renderAt({float(s)})')
                await stage.screenshot(path=str(HERE / f'still-{float(s):05.1f}.png'))
            await browser.close()
            return
        frames = Path(tempfile.mkdtemp(prefix='geoaft-frames-'))
        n = int(timing['total'] * args.fps)
        for i in range(n):
            await page.evaluate(f'window.renderAt({i / args.fps})')
            await stage.screenshot(path=str(frames / f'{i:05d}.jpg'), type='jpeg', quality=92)
            if i % (args.fps * 10) == 0:
                print(f'frame {i}/{n}', flush=True)
        poster_t = args.poster
        await page.evaluate(f'window.renderAt({poster_t})')
        OUT.mkdir(parents=True, exist_ok=True)
        await stage.screenshot(path=str(OUT / 'geoaft-explainer-draft-poster.jpg'), type='jpeg', quality=88)
        await browser.close()
    mp4 = OUT / 'geoaft-explainer-draft.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(args.fps), '-i', str(frames / '%05d.jpg'),
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(mp4)], check=True)
    srt = HERE / 'geoaft-explainer-draft.en.srt'
    style = "FontName=Inter,FontSize=12,PrimaryColour=&H00FFFFFF,BackColour=&H33111811,BorderStyle=4,Outline=0,Shadow=0,MarginV=26"
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(mp4), '-vf', f"subtitles={srt}:force_style='{style}'",
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                    str(HERE / 'geoaft-explainer-draft-captioned.mp4')], check=True)
    shutil.rmtree(frames)
    print('wrote', mp4, 'and the captioned review copy')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--fps', type=int, default=24)
    ap.add_argument('--scale', type=float, default=1)
    ap.add_argument('--stills')
    ap.add_argument('--poster', type=float, default=3.0)
    ap.add_argument('--font-dir')
    asyncio.run(run(ap.parse_args()))
