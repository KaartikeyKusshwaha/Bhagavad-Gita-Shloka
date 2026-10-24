"""Import-time only. Copy existing human-authored text; never synthesize missing verses."""
import hashlib, html, json, re, time, urllib.request
from pathlib import Path
from bs4 import BeautifulSoup

CACHE = Path('data/cache')
OUT = Path('data/imports')
CACHE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

def fetch(url, path):
    if path.exists():
        return path.read_bytes()
    req = urllib.request.Request(url, headers={'User-Agent': 'OpenScripture/0.1 (open-source text importer; github.com/KaartikeyKusshwaha/Bhagavad-Gita-Shloka)'})
    data = urllib.request.urlopen(req, timeout=40).read()
    path.write_bytes(data)
    time.sleep(0.5)
    return data

raw = fetch('https://sanatan.digital/api/v1/works/bhagavad-gita.json', CACHE / 'sanatan-gita.json')
data = json.loads(raw)
units = data['units']
assert len(units) == 700
provenance = []
translations = {}
for chapter in range(1, 19):
    url = f'https://en.wikisource.org/wiki/Bhagavad-Gita_(Besant_4th)/Discourse_{chapter}'
    body = fetch(url, CACHE / f'besant-{chapter}.html')
    text = body.decode('utf-8')
    revision = re.search(r'oldid=(\d+)', text)
    provenance.append({'url': url, 'revision': revision.group(1) if revision else None, 'sha256': hashlib.sha256(body).hexdigest()})
    found = {}
    last_sanskrit_number = None
    soup = BeautifulSoup(text, 'html.parser')
    for paragraph in soup.find_all('p'):
        annotation = paragraph.select_one('[title^="[sic]"]')
        annotated_marker = re.search(r'\((\d+)\)', annotation.get('title', '')) if annotation else None
        for decoration in paragraph.select('style, script, sup, .pagenum, .ws-noexport'):
            decoration.decompose()
        clean = paragraph.get_text().replace('\u200b', '').replace('\xa0', ' ')
        clean = re.sub(r'\s+', ' ', clean).strip()
        sanskrit_number = re.search(r'॥\s*([०-९0-9]+)\s*॥\s*$', clean)
        if sanskrit_number:
            last_sanskrit_number = int(sanskrit_number.group(1).translate(str.maketrans('०१२३४५६७८९', '0123456789')))
        # The printed 3.42 marker lacks its closing parenthesis (Wikisource marks [sic]).
        clean = re.sub(r'(?<!\()\b(\d+)\)\s*$', r'(\1)', clean)
        match = re.search(r'\((\d+)\)?\s*$', clean)
        if not match and annotated_marker:
            clean += f' ({annotated_marker.group(1)})'
            match = re.search(r'\((\d+)\)\s*$', clean)
        if match and re.search(r'[a-zA-Z]', clean) and not re.search(r'[\u0900-\u097f]', clean):
            if re.search(r'<[^>]+>|\{\s*"|Proofreadpage|data-mw', clean):
                raise ValueError(f'Markup leaked into chapter {chapter}')
            verse = last_sanskrit_number or int(match.group(1))
            if verse != int(match.group(1)):
                print(f'Printed English marker {chapter}.{match.group(1)} aligned to preceding Sanskrit {verse}', flush=True)
            if verse in found:
                raise ValueError(f'Duplicate translation {chapter}.{verse}')
            found[verse] = clean[:match.start()].strip()
    count = sum(1 for u in units if u['ref']['chapter'] == chapter)
    # Besant numbers Arjuna's introductory question in chapter 13, adding one.
    # Align by a documented reference map, never by altering either source text.
    if chapter == 13 and len(found) == 35:
        found = {number - 1: value for number, value in found.items() if number > 1}
    missing = sorted(set(range(1, count + 1)) - set(found))
    print(f'Chapter {chapter}: {len(found)}/{count}; missing {missing}', flush=True)
    if missing:
        raise ValueError('Missing primary-source translations; fix parser, do not fill with model output')
    for verse, text in found.items():
        translations[(chapter, verse)] = text

records = []
for ordinal, unit in enumerate(units, 1):
    chapter, verse = unit['ref']['chapter'], unit['ref']['verse']
    records.append({'id': unit['id'], 'ref': f'BG {chapter}.{verse}', 'chapter': chapter, 'verse': verse, 'ordinal': ordinal,
        'original_text': '\n'.join(unit['lines_deva']), 'transliteration': '\n'.join(unit['lines']),
        'speaker': unit.get('meta', {}).get('speaker_deva'),
        'translations': [{'lang': 'en', 'translator': 'Annie Besant (1922)', 'text': translations[(chapter, verse)], 'source_id': 'besant-1922',
            'source_ref': f'Besant {chapter}.{verse + 1 if chapter == 13 else verse}'}]})

result = {'work': 'bhagavad-gita', 'edition': '700-verse recension; chapter 13 begins with idam shariram',
    'retrieved_at': '2026-10-24', 'upstream_url': 'https://sanatan.digital/api/v1/works/bhagavad-gita.json',
    'upstream_sha256': hashlib.sha256(raw).hexdigest(), 'translation_provenance': provenance, 'passages': records}
(OUT / 'gita.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print('Saved 700 passages and 700 human-authored translations. Editorial signoff remains pending.')
