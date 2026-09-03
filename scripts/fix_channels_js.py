#!/usr/bin/env python3
import json
import os
import re

def slugify(text):
    text = text.lower().strip()
    text = text.encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'\s+', '-', text)
    text = re.sub(r'-+', '-', text)
    text = text.strip('-')
    return text

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

def slugify(text):
    text = text.lower().strip()
    text = text.encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'\s+', '-', text)
    text = re.sub(r'-+', '-', text)
    text = text.strip('-')
    return text

# Load channels
with open('./assets/channels_new.json', 'r') as f:
    raw_channels = json.load(f)

# Generate slugs and add metadata
existing_slugs = set()
channels_with_slugs = []

for ch in raw_channels:
    slug = slugify(ch['name'])
    base_slug = slug
    counter = 1
    while slug in existing_slugs:
        slug = f"{slug}-{counter}"
        counter += 1
    existing_slugs.add(slug)
    
    channel_with_meta = {
        **ch,
        'slug': slug,
        'category': 'general'
    }
    channels_with_slugs.append(channel_with_meta)

# Write channels.js
js_lines = []
js_lines.append("// Channel catalog. Add a new channel by appending an object here; the home")
js_lines.append("// page renders cards from this array, so no other UI change is required.")
js_lines.append("window.CHANNELS = [\n")

for i, ch in enumerate(channels_with_slugs):
    name = ch["name"].replace('\\', '\\\\').replace('"', '\\"')
    desc = ch.get("description", "").replace('\\', '\\\\').replace('"', '\\"')
    
    js_lines.append("  {")
    js_lines.append('    id: "' + ch["id"] + '",')
    js_lines.append('    name: "' + name + '",')
    js_lines.append('    description: "' + desc + '",')
    js_lines.append('    type: "' + ch.get("type", "hls") + '",')
    js_lines.append('    url: "' + ch["url"] + '",')
    js_lines.append('    slug: "' + ch["slug"] + '",')
    js_lines.append('    country: "' + ch["country"] + '",')
    js_lines.append('    countryCode: "' + ch.get("country_code", "XX") + '",')
    js_lines.append('    category: "' + 'general' + '",')
    if ch.get('languages'):
        js_lines.append('    languages: ' + json.dumps(ch.get("languages", [])) + ',')
    if ch.get('isGeoBlocked'):
        js_lines.append('    isGeoBlocked: ' + str(ch.get("isGeoBlocked", False)).lower() + ',')
    js_lines.append("  }")
    if i < len(channels_with_slugs) - 1:
        js_lines[-1] += ","
    js_lines.append("")

js_lines.append("];\n\n")
js_lines.append("window.findChannel = function (id) {")
js_lines.append("  return (window.CHANNELS || []).find(function (c) {")
js_lines.append("    return c.id === id;")
js_lines.append("  });")
js_lines.append("};\n")

with open('./assets/channels.js', 'w') as f:
    f.write('\n'.join(js_lines))

print("Updated channels.js")