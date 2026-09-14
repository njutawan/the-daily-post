#!/usr/bin/env python3
"""Download all 24 news images from the CDN to /public/images for offline self-containment."""
import json, os, urllib.request, hashlib

IMAGES_JSON = "/home/z/my-project/src/data/images.json"
DEST_DIR = "/home/z/my-project/public/images"
ARTICLES_TS = "/home/z/my-project/src/data/articles.ts"

os.makedirs(DEST_DIR, exist_ok=True)

with open(IMAGES_JSON) as f:
    data = json.load(f)

# Build a mapping of CDN URL -> local filename
url_to_local = {}
download_count = 0
skip_count = 0

for key, urls in data.items():
    for i, url in enumerate(urls):
        # Derive a stable filename from the key + index + original extension
        original_ext = url.rsplit(".", 1)[-1].split("?")[0].lower()
        if original_ext not in ("jpg", "jpeg", "png", "webp", "gif"):
            original_ext = "jpg"
        filename = f"{key}-{i+1}.{original_ext}"
        filepath = os.path.join(DEST_DIR, filename)
        url_to_local[url] = f"/images/{filename}"
        if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
            skip_count += 1
            print(f"  skip (exists): {filename}")
            continue
        try:
            print(f"  downloading: {filename} <- {url[:60]}...")
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=60) as resp, open(filepath, "wb") as out:
                out.write(resp.read())
            size = os.path.getsize(filepath)
            print(f"    ok ({size} bytes)")
            download_count += 1
        except Exception as e:
            print(f"    FAIL: {e}")

print(f"\nDownloaded {download_count}, skipped {skip_count}")

# Save the URL->local mapping for the next step
with open("/home/z/my-project/src/data/image-map.json", "w") as f:
    json.dump(url_to_local, f, indent=2)
print("Wrote image-map.json")
