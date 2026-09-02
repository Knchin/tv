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

# Load the original channels_new.json
with open('./assets/channels_new.json', 'r') as f:
    raw_channels = json.load(f)

# Add LB2 channel manually (it's not in the new data)
lb2_channel = {
    "id": "lb2",
    "name": "LB2",
    "country": "United States",  # or appropriate country
    "country_code": "us",
    "type": "hls",
    "url": "https://games1.elahmad.store/tv14_www_elahmad._lb2/index.m3u8?token=0635cde8c0cb4bbca6741b3dd5d4d1c3ca0d91ff-d1c49752b0551250256f24ee4d520e77-1788293474-1788291674",
    "languages": ["spa"],
    "isGeoBlocked": False,
    "description": "Live stream"
}

# Add AlHadath channel
alhadath_channel = {
    "id": "alhadath",
    "name": "AlHadath",
    "country": "Saudi Arabia",
    "country_code": "sa",
    "type": "youtube",
    "url": "https://www.youtube.com/embed/8c-yPig6tIw?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0",
    "languages": ["ara"],
    "isGeoBlocked": False,
    "description": "AlHadath Live Stream (YouTube)"
}

# Load existing channels
with open('./assets/channels_new.json', 'r') as f:
    raw_channels = json.load(f)

# Check if lb2 and alhadath are already in the list
existing_ids = {ch['id'] for ch in raw_channels}

if 'lb2' not in existing_ids:
    raw_channels.insert(0, lb2_channel)
    print("Added LB2 channel")

if 'alhadath' not in existing_ids:
    raw_channels.insert(1, alhadath_channel)
    print("Added AlHadath channel")

# Write back
with open('./assets/channels_new.json', 'w') as f:
    json.dump(raw_channels, f, indent=2)

print("Updated channels_new.json")

# Now regenerate static pages
import subprocess
result = subprocess.run(['python3', 'scripts/build.py'], capture_output=True, text=True)
print(result.stdout)
if result.stderr:
    print(result.stderr)
