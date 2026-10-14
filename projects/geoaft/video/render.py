"""Render animatic.html to an MP4 (and optional stills) with Playwright + ffmpeg.

Usage (from the repository root):
  python projects/geoaft/video/render.py --stills 3,20,40,60,75,95,110
  python projects/geoaft/video/render.py --height 480                                           # website copy (480p)
  python projects/geoaft/video/render.py --scale 2 --crf 18 --out .tmp/geoaft-explainer-1440p.mp4   # upload master, kept out of the site
The script serves the repository root itself on a free local port, so no separate server is needed. A full
render takes a while; pass --frames-dir DIR to keep frames so an interrupted run can be resumed. Outputs go
to projects/geoaft/public/video/ (MP4 + poster). The website carries the 480p copy only. No subtitles are added and no caption file is
written: the narration script is NARRATION.md.

Needs `pip install playwright` (uses an installed Chromium, else Edge or Chrome) and ffmpeg on PATH
or `pip install imageio-ffmpeg`. Google Fonts are optional: pass --font-dir to serve local Playfair
Display files when the network blocks fonts.googleapis.com.
"""
import argparse
import asyncio
import functools
import http.server
import json
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path

from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
WEBROOT = HERE.parents[2]   # repository root
OUT = HERE.parent / 'public' / 'video'


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve():
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(WEBROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def ffmpeg():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


async def launch(p):
    for options in ({}, {'channel': 'msedge'}, {'channel': 'chrome'}):
        try:
            return await p.chromium.launch(**options)
        except Exception:
            continue
    raise SystemExit('No Chromium, Edge or Chrome available to Playwright.')


async def run(args):
    timing = json.loads((HERE / 'timing.json').read_text(encoding='utf-8'))
    server = serve()
    url = f'http://127.0.0.1:{server.server_address[1]}/projects/geoaft/video/animatic.html'
    async with async_playwright() as p:
        browser = await launch(p)
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
        await page.goto(url, wait_until='networkidle')
        await page.evaluate('window.__ready')
        stage = page.locator('#stage')
        if args.stills:
            out = Path(args.stills_dir) if args.stills_dir else HERE
            out.mkdir(parents=True, exist_ok=True)
            for s in args.stills.split(','):
                await page.evaluate(f'window.renderAt({float(s)})')
                await stage.screenshot(path=str(out / f'still-{float(s):05.1f}.png'))
            await browser.close()
            return
        # With --frames-dir the frames persist, and a re-run resumes after the last finished frame.
        frames = Path(args.frames_dir) if args.frames_dir else Path(tempfile.mkdtemp(prefix='geoaft-frames-'))
        frames.mkdir(parents=True, exist_ok=True)
        n = int(timing['total'] * args.fps)
        done = sorted(frames.glob('*.jpg'))
        for stale in done[-2:]:
            stale.unlink()   # the last files may be half-written if a run was interrupted
        for i in range(max(0, len(done) - 2), n):
            await page.evaluate(f'window.renderAt({i / args.fps})')
            await stage.screenshot(path=str(frames / f'{i:05d}.jpg'), type='jpeg', quality=92)
            if i % (args.fps * 10) == 0:
                print(f'frame {i}/{n}', flush=True)
        if not args.out:   # the poster belongs to the website copy only
            await page.evaluate(f'window.renderAt({args.poster})')
            OUT.mkdir(parents=True, exist_ok=True)
            await stage.screenshot(path=str(OUT / 'geoaft-explainer-draft-poster.jpg'), type='jpeg', quality=88)
        await browser.close()
    mp4 = Path(args.out) if args.out else OUT / 'geoaft-explainer-draft.mp4'
    mp4.parent.mkdir(parents=True, exist_ok=True)
    resize = ['-vf', f'scale=-2:{args.height}:flags=lanczos'] if args.height else []
    subprocess.run([ffmpeg(), '-y', '-loglevel', 'error', '-framerate', str(args.fps), '-i', str(frames / '%05d.jpg'), *resize,
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', str(args.crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(mp4)], check=True)
    if not args.frames_dir:
        shutil.rmtree(frames)
    print('wrote', mp4)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--fps', type=int, default=24)
    ap.add_argument('--scale', type=float, default=1)
    ap.add_argument('--stills')
    ap.add_argument('--stills-dir')
    ap.add_argument('--frames-dir')
    ap.add_argument('--out', help='write the MP4 here instead of the website assets folder (no poster)')
    ap.add_argument('--height', type=int, help='scale the encoded video to this height, e.g. 480 for the website copy')
    ap.add_argument('--crf', type=int, default=24, help='x264 quality; lower is better (18 for an upload master)')
    ap.add_argument('--poster', type=float, default=22.0)
    ap.add_argument('--font-dir')
    asyncio.run(run(ap.parse_args()))
