#!/usr/bin/env python3
import subprocess, sys, json, re

queries = {
    "capitol": "United States Capitol building dome Washington DC",
    "war": "soldiers and tanks on a battlefield Eastern Europe war",
    "ai": "advanced artificial intelligence microchip processor close up glowing",
    "market": "stock market trading floor financial district tickers screens",
    "climate": "wildfire burning forest climate change smoke orange sky",
    "sports": "packed football stadium under floodlights night aerial",
    "court": "supreme court gavel justice law wooden",
    "storm": "hurricane satellite view storm swirling clouds ocean",
    "election": "election voting ballot box democracy polling station",
    "city": "city skyline at dusk modern downtown skyscrapers lights",
    "protest": "large crowd protest demonstration city street signs",
    "lab": "scientists research laboratory microscope biotech",
}

results = {}
for key, q in queries.items():
    try:
        out = subprocess.run(
            ["z-ai", "image-search", "-q", q, "--count", "2", "--gl", "us", "--no-rank"],
            capture_output=True, text=True, timeout=150,
        )
        text = out.stdout
        # extract JSON object
        m = re.search(r"\{.*\}", text, re.S)
        urls = []
        if m:
            try:
                d = json.loads(m.group(0))
                for r in d.get("results", []):
                    urls.append(r.get("original_url", ""))
            except Exception:
                pass
        results[key] = urls
        print(f"{key}: {urls}", flush=True)
    except Exception as e:
        results[key] = []
        print(f"{key}: ERROR {e}", flush=True)

with open("/home/z/my-project/src/data/images.json", "w") as f:
    json.dump(results, f, indent=2)
print("WROTE images.json")
