#!/usr/bin/env python3
import json
import os
import re
from pathlib import Path

def slugify(text):
    text = text.lower().strip()
    text = text.encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'\s+', '-', text)
    text = re.sub(r'-+', '-', text)
    text = text.strip('-')
    return text

def escape_html(text):
    return (text
        .replace('&', '&')
        .replace('<', '<')
        .replace('>', '>')
        .replace('"', '"')
        .replace("'", '&apos;'))

def escape_html_dq(text):
    return (text
        .replace('&', '&')
        .replace('<', '<')
        .replace('>', '>')
        .replace('"', '"')
        .replace("'", '&apos;'))

def infer_category(name, description=''):
    text = f"{name} {description}".lower()
    if any(kw in text for kw in ['news', '24', 'breaking']): return 'news'
    if any(kw in text for kw in ['sport', 'football', 'cricket', 'tennis', 'fifa', 'uefa']): return 'sports'
    if any(kw in text for kw in ['movie', 'cinema', 'film']): return 'movies'
    if any(kw in text for kw in ['kid', 'cartoon', 'disney', 'nick', 'boomerang']): return 'kids'
    if any(kw in text for kw in ['music', 'mtv', 'viva', 'hits', 'radio']): return 'music'
    if any(kw in text for kw in ['documentary', 'discovery', 'natgeo', 'history', 'science']): return 'documentary'
    if any(kw in text for kw in ['religious', 'church', 'faith', 'islam', 'christian', 'quran', 'bible', 'prayer']): return 'religious'
    return 'general'

def generate_channel_page(channel):
    escaped_name = escape_html_dq(channel['name'])
    escaped_country = escape_html(channel['country'])
    escaped_category = escape_html(infer_category(channel['name'], channel.get('description', '')))
    escaped_url = escape_html(channel['url'])
    is_youtube = channel.get('type') == 'youtube'
    channel_id = channel['id']
    channel_slug = channel['slug']
    country_code = channel.get('country_code', 'XX')
    is_geo_blocked = str(channel.get('isGeoBlocked', False)).lower()
    
    is_youtube = channel.get('type') == 'youtube'
    refresh_style = ' style="display:none"' if is_youtube else ''
    pip_style = ' style="display:none"' if is_youtube else ''
    
    # Build the HTML using string concatenation to avoid format issues
    parts = []
    parts.append('<!DOCTYPE html>')
    parts.append('<html lang="en">')
    parts.append('<head>')
    parts.append('  <meta charset="UTF-8">')
    parts.append('  <meta name="viewport" content="width=device-width, initial-scale=1.0">')
    parts.append('  <meta name="theme-color" content="#050816">')
    parts.append('  <meta name="description" content="' + escaped_name + ' \u2014 Live Stream">')
    parts.append('  <title>' + escaped_name + ' \u00b7 Live Stream</title>')
    parts.append('  <link rel="manifest" href="/manifest.webmanifest">')
    parts.append('  <meta name="mobile-web-app-capable" content="yes">')
    parts.append('  <meta name="apple-mobile-web-app-capable" content="yes">')
    parts.append('  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">')
    parts.append('  <meta name="apple-mobile-web-app-title" content="Tfarraj">')
    parts.append('  <link rel="apple-touch-icon" href="/icons/icon-192.png">')
    parts.append('  <link rel="icon" type="image/png" href="/icons/icon-192.png">')
    parts.append('  <link rel="stylesheet" href="/assets/app.css">')
    parts.append('  <script src="/assets/channels.js"></script>')
    parts.append('  <script>')
    parts.append('    window.ACTIVE_CHANNEL = {')
    parts.append('      id: "' + channel['id'] + '",')
    parts.append('      name: "' + escaped_name + '",')
    parts.append('      slug: "' + escape_html(channel['slug']) + '",')
    parts.append('      country: "' + escaped_country + '",')
    parts.append('      countryCode: "' + channel.get('country_code', 'XX') + '",')
    parts.append('      category: "' + escape_html(infer_category(channel['name'], channel.get('description', ''))) + '",')
    parts.append('      type: "' + channel.get('type', 'hls') + '",')
    parts.append('      url: "' + escape_html(channel['url']) + '",')
    parts.append('      languages: ' + json.dumps(channel.get('languages', [])) + ',')
    parts.append('      isGeoBlocked: ' + str(channel.get('isGeoBlocked', False)).lower())
    parts.append('    };')
    parts.append('  </script>')
    parts.append('</head>')
    parts.append('<body class="player-page">')
    parts.append('  <div class="wrap">')
    parts.append('    <header class="app-header">')
    parts.append('      <a class="back" href="/">← Back to channels</a>')
    parts.append('      <h1><span id="channel-name">' + escaped_name + '</span> <span style="color:#ff3b5c">🔴</span></h1>')
    parts.append('    </header>')
    parts.append('    <div class="player">')
    parts.append('      <video id="vid" controls playsinline></video>')
    parts.append('      <div class="ovl" id="ovl-loading" hidden><div class="spin"></div><div class="big">Connecting to live stream\u2026</div></div>')
    parts.append('      <div class="ovl" id="ovl-tap" hidden><div class="big">Tap to start playback</div><div class="sub">Your browser requires a tap to play audio and video.</div></div>')
    parts.append('      <div class="ovl err" id="ovl-error" hidden><div class="big">The channel is temporarily unavailable.</div><div class="sub" id="err-sub">The live signal could not be loaded.</div></div>')
    parts.append('    </div>')
    parts.append('    <div class="player-actions">')
    refresh_style = ' style="display:none"' if channel.get('type') == 'youtube' else ''
    cast_style = ' style="display:none"' if channel.get('type') == 'youtube' else ''
    parts.append('      <button class="btn-refresh" id="btn-refresh" aria-label="Refresh stream token" title="Refresh stream token"' + refresh_style + '><span class="ico">🗘</span><span class="spin-sm"></span></button>')
    parts.append('      <button class="btn-copy" id="btn-copy" aria-label="Copy stream URL" title="Copy stream URL"' + cast_style + '><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>')
    parts.append('      <button class="btn-cast" id="btn-cast" aria-label="Cast to device" title="Cast to TV or monitor"' + cast_style + '><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"></path><line x1="2" y1="20" x2="2.01" y2="20"></line></svg></button>')
    parts.append('      <button class="btn-fullscreen" id="btn-fullscreen" aria-label="Fullscreen"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"></path></svg></button>')
    parts.append('    </div>')
    parts.append('  </div>')
    parts.append('  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js"></script>')
    parts.append('  <script src="/assets/player.js"></script>')
    parts.append('  <script>')
    parts.append('    var ac = window.ACTIVE_CHANNEL; if (ac) document.getElementById("channel-name").textContent = ac.name;')
    parts.append('    if ("serviceWorker" in navigator) { window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function (err) { console.error("SW registration failed:", err); }); }); }')
    parts.append('    document.getElementById("btn-fullscreen").addEventListener("click", function() { var player = document.querySelector(".player"); if (player.requestFullscreen) player.requestFullscreen(); else if (player.webkitRequestFullscreen) player.webkitRequestFullscreen(); else if (player.msRequestFullscreen) player.msRequestFullscreen(); });')
    parts.append('    var castBtn = document.getElementById("btn-cast"); if (castBtn) { castBtn.addEventListener("click", function () { var video = document.getElementById("vid"); if (video && video.remote && video.remote.prompt) { video.remote.prompt().catch(function (err) { console.error("Cast error:", err); }); } else { alert("Casting is not supported by this browser/device."); } }); }')
    parts.append('    var copyBtn = document.getElementById("btn-copy"); if (copyBtn) { copyBtn.addEventListener("click", function () { var url = window.ACTIVE_CHANNEL && window.ACTIVE_CHANNEL.url; if (!url) { alert("No stream URL available."); return; } navigator.clipboard.writeText(url).then(function () { var old = copyBtn.innerHTML; copyBtn.innerHTML = "<svg width=\\"20\\" height=\\"20\\" viewBox=\\"0 0 24 24\\" fill=\\"none\\" stroke=\\"currentColor\\" stroke-width=\\"2.5\\" stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\"><polyline points=\\"20 6 9 17 4 12\\"></polyline></svg>"; copyBtn.classList.add("copied"); setTimeout(function () { copyBtn.innerHTML = old; copyBtn.classList.remove("copied"); }, 1500); }).catch(function () { alert("Could not copy the URL to clipboard."); }); }); }')
    parts.append('    document.addEventListener("keydown", function(e) { if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return; var video = document.getElementById("vid"); if (!video) return; switch(e.key) { case " ": e.preventDefault(); if (video.paused) video.play(); else video.pause(); break; case "ArrowLeft": e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 10); break; case "ArrowRight": e.preventDefault(); video.currentTime = Math.min(video.duration, video.currentTime + 10); break; case "ArrowUp": e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); break; case "ArrowDown": e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); break; case "m": video.muted = !video.muted; break; case "f": var player = document.querySelector(".player"); if (player.requestFullscreen) player.requestFullscreen(); break; } });')
    parts.append('  </script>')
    parts.append('</body>')
    parts.append('</html>')
    return '\n'.join(parts)

def build_channel_pages():
    with open('./assets/channels_canonical.json', 'r') as f:
        channels = json.load(f)

    channel_dir = Path('./channel')
    channel_dir.mkdir(parents=True, exist_ok=True)

    valid_slugs = set()
    for channel in channels:
        slug = channel['slug']
        valid_slugs.add(slug)
        channel_dir_path = Path('./channel') / slug
        channel_dir_path.mkdir(parents=True, exist_ok=True)
        html = generate_channel_page(channel)
        with open(channel_dir_path / 'index.html', 'w') as f:
            f.write(html)

    # Remove stale channel dirs whose slug is no longer in the catalog.
    removed = 0
    for entry in channel_dir.iterdir():
        if entry.is_dir() and entry.name not in valid_slugs:
            # Safety: do not remove nested unrelated dirs
            for f in entry.iterdir():
                if f.is_file():
                    f.unlink()
            try:
                entry.rmdir()
                removed += 1
            except OSError:
                pass

    print(f"Generated {len(channels)} channel pages")
    print(f"Removed {removed} stale channel directories")
    print("Build complete!")

if __name__ == '__main__':
    build_channel_pages()
