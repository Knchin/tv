#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function slugify(text) {
  return text.toLowerCase().trim().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateUniqueSlug(name, existingSlugs) {
  let baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;
  while (existingSlugs.has(slug)) {
    slug = baseSlug + '-' + counter;
    counter++;
  }
  existingSlugs.add(slug);
  return slug;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;');
}

function escapeHtmlDQ(text) {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;');
}

function buildChannelPages() {
  const rawChannels = JSON.parse(fs.readFileSync('./assets/channels_new.json', 'utf8'));
  
  const existingSlugs = new Set();
  const channelsWithSlugs = [];
  
  rawChannels.forEach(ch => {
    const slug = generateUniqueSlug(ch.name, existingSlugs);
    channelsWithSlugs.push({ ...ch, slug });
  });

  const channelDir = path.join('./channel');
  if (!fs.existsSync(channelDir)) {
    fs.mkdirSync(channelDir, { recursive: true });
  }

  channelsWithSlugs.forEach(channel => {
    const channelDirPath = path.join('./channel', channel.slug);
    if (!fs.existsSync(channelDirPath)) {
      fs.mkdirSync(channelDirPath, { recursive: true });
    }
    const html = generateChannelPage(channel);
    fs.writeFileSync(path.join(channelDirPath, 'index.html'), html);
  }
  console.log('Generated ' + channelsWithSlugs.length + ' channel pages');
  console.log('Build complete!');
}

function generateChannelPage(channel) {
  const escapedName = escapeHtmlDQ(channel.name);
  const escapedCountry = escapeHtmlDQ(channel.country);
  const escapedCategory = escapeHtml(channel.category);
  const escapedUrl = escapeHtml(channel.url);
  const isYouTube = channel.type === 'youtube';
  const channelId = channel.id;
  const channelSlug = channel.slug;

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <meta name="theme-color" content="#050816">\n  <meta name="description" content="' + escapeHtml(channel.name) + ' \u2014 Live Stream">\n  <title>' + escapeHtml(channel.name) + ' \u00b7 Live Stream</title>\n  <link rel="manifest" href="/manifest.webmanifest">\n  <meta name="mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n  <meta name="apple-mobile-web-app-title" content="Tfarraj">\n  <link rel="apple-touch-icon" href="/icons/icon-192.png">\n  <link rel="icon" type="image/png" href="/icons/icon-192.png">\n  <link rel="stylesheet" href="/assets/app.css">\n  <script src="/assets/channels.js"></script>\n  <script>\n    window.ACTIVE_CHANNEL = {\n      id: "' + channel.id + '",\n      name: "' + escapeHtmlDQ(channel.name) + '",\n      slug: "' + escapeHtml(channel.slug) + '",\n      country: "' + escapeHtmlDQ(channel.country) + '",\n      countryCode: "' + (channel.countryCode || 'XX') + '",\n      category: "' + escapeHtml(channel.category) + '",\n      type: "' + channel.type + '",\n      url: "' + escapeHtml(channel.url) + '",\n      languages: ' + JSON.stringify(channel.languages || []) + ',\n      isGeoBlocked: ' + (channel.isGeoBlocked || false) + '\n    };\n  </script>\n</head>\n<body>\n  <div class="wrap">\n    <header class="app-header">\n      <a class="back" href="/">\u2190 Back to channels</a>\n      <h1><span id="channel-name">' + escapeHtmlDQ(channel.name) + '</span> <span style="color:#ff3b5c">\uD83D\uDD34</span></h1>\n    </header>\n    <div class="player">\n      <video id="vid" controls playsinline></video>\n      <div class="ovl" id="ovl-loading" hidden><div class="spin"></div><div class="big">Connecting to live stream\u2026</div></div>\n      <div class="ovl" id="ovl-tap" hidden><div class="big">Tap to start playback</div><div class="sub">Your browser requires a tap to play audio and video.</div></div>\n      <div class="ovl err" id="ovl-error" hidden><div class="big">The channel is temporarily unavailable.</div><div class="sub" id="err-sub">The live signal could not be loaded.</div></div>\n    </div>\n    <div class="player-actions">\n      <button class="btn-refresh" id="btn-refresh" aria-label="Refresh stream token" title="Refresh stream token"' + (channel.type === 'youtube' ? ' style="display:none"' : '') + '><span class="ico">\uD83D\uDDD8</span><span class="spin-sm"></span></button>\n      <button class="btn-fullscreen" id="btn-fullscreen" aria-label="Fullscreen"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"></path></svg></button>\n      <button class="btn-pip" id="btn-pip" aria-label="Picture in Picture"' + (channel.type === 'youtube' ? ' style="display:none"' : '') + '><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3m14 0v10a2 2 0 0 1-2 2h-2m0-10V7a2 2 0 0 1 2-2h2"></path></svg></button>\n    </div>\n  </div>\n  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js"></script>\n  <script src="/assets/player.js"></script>\n  <script>\n    var ac = window.ACTIVE_CHANNEL; if (ac) document.getElementById("channel-name").textContent = ac.name;\n    if ("serviceWorker" in navigator) { window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function (err) { console.error("SW registration failed:", err); }); }); }\n    document.getElementById("btn-fullscreen").addEventListener("click", function() { var player = document.querySelector(".player"); if (player.requestFullscreen) player.requestFullscreen(); else if (player.webkitRequestFullscreen) player.webkitRequestFullscreen(); else if (player.msRequestFullscreen) player.msRequestFullscreen(); });\n    var pipBtn = document.getElementById("btn-pip"); if (pipBtn) { pipBtn.addEventListener("click", async function() { var video = document.getElementById("vid"); if (video !== document.pictureInPictureElement) { try { await video.requestPictureInPicture(); } catch (err) { console.error("PiP error:", err); } } else { await document.exitPictureInPicture(); } }); }\n    document.addEventListener("keydown", function(e) { if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return; var video = document.getElementById("vid"); if (!video) return; switch(e.key) { case " ": e.preventDefault(); if (video.paused) video.play(); else video.pause(); break; case "ArrowLeft": e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 10); break; case "ArrowRight": e.preventDefault(); video.currentTime = Math.min(video.duration, video.currentTime + 10); break; case "ArrowUp": e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); break; case "ArrowDown": e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); break; case "m": video.muted = !video.muted; break; case "f": var player = document.querySelector(".player"); if (player.requestFullscreen) player.requestFullscreen(); break; } });\n  </script>\n</body>\n</html>';
  return html;
}

function generateUniqueSlug(name, existingSlugs) {
  let baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;
  while (existingSlugs.has(slug)) { slug = baseSlug + '-' + counter; counter++; }
  existingSlugs.add(slug);
  return slug;
}

function slugify(text) {
  return text.toLowerCase().trim().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;');
}

function escapeHtmlDQ(text) {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;');
}

function generateUniqueSlug(name, existingSlugs) {
  let baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;
  while (existingSlugs.has(slug)) { slug = baseSlug + '-' + counter; counter++; }
  existingSlugs.add(slug);
  return slug;
}

function slugify(text) {
  return text.toLowerCase().trim().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildChannelPages() {
  const rawChannels = JSON.parse(fs.readFileSync('./assets/channels_new.json', 'utf8'));
  const existingSlugs = new Set();
  const channelsWithSlugs = [];
  rawChannels.forEach(ch => { const slug = generateUniqueSlug(ch.name, existingSlugs); channelsWithSlugs.push({ ...ch, slug }); });
  const channelDir = path.join('./channel');
  if (!fs.existsSync('./channel')) fs.mkdirSync('./channel', { recursive: true });
  channelsWithSlugs.forEach(channel => {
    const channelDirPath = path.join('./channel', channel.slug);
    if (!fs.existsSync(channelDirPath)) fs.mkdirSync(channelDirPath, { recursive: true });
    const html = generateChannelPage(channel);
    fs.writeFileSync(path.join(channelDirPath, 'index.html'), html);
  }
  console.log('Generated ' + channelsWithSlugs.length + ' channel pages');
  console.log('Build complete!');
}

buildChannelPages();
