"""Fetch two reusable reading editions; no runtime dependency on these hosts.

Tanzil text is copied verbatim, including its original Unicode order. Bilara
segments are joined at verse boundaries; story headings/colophons are excluded
and the documented <j> joining marker is removed with an HTML parser.
"""
import concurrent.futures
import hashlib
import json
import pathlib
import re
import urllib.parse
import urllib.request
from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parents[1]
CACHE = ROOT / "data/cache/free-collections"
CACHE.mkdir(parents=True, exist_ok=True)
BILARA = "6a395ceb6f28549111d7d96859f7f6f6610afc01"


def fetch(url):
    path = CACHE / hashlib.sha256(url.encode()).hexdigest()
    if not path.exists():
        path.write_bytes(urllib.request.urlopen(url, timeout=60).read())
    return path.read_bytes()


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def save(slug, data, sources):
    path = ROOT / f"data/imports/{slug}.json"
    write_json(path, data)
    checksum = hashlib.sha256(path.read_bytes()).hexdigest()
    for source in sources:
        source.update(checksum=checksum, retrieved_at="2026-10-24", status="approved", commercial_ok=True)
        source["display_rules"]["bundle"] = f"{slug}.json"
        write_json(ROOT / f"data/sources/{source['id']}.yml", source)
    print(slug, len(data["passages"]), checksum)


def quran():
    url = "https://tanzil.net/pub/download/index.php?" + urllib.parse.urlencode({
        "quranType": "uthmani", "outType": "txt-2", "marks": "true",
        "sajdah": "true", "tatweel": "true", "agree": "true",
    })
    raw = fetch(url)
    lines = raw.decode("utf-8-sig").splitlines()
    passages = []
    for line in lines:
        if re.match(r"^\d+\|\d+\|", line):
            chapter, verse, text = line.split("|", 2)
            c, v = int(chapter), int(verse)
            passages.append(dict(id=f"quran.{c}.{v}", ref=f"Quran {c}:{v}", chapter=c,
                                 verse=v, ordinal=len(passages) + 1, original_text=text,
                                 transliteration="", translations=[]))
    assert len(passages) == 6236 and passages[-1]["ref"] == "Quran 114:6"
    notice = "\n".join(line for line in lines if line.startswith("#"))
    assert "CHANGING IT IS NOT ALLOWED" in notice
    canonical_lines = "\n".join(f"{p['chapter']}|{p['verse']}|{p['original_text']}" for p in passages)
    save("quran", dict(
        work=dict(id="quran", tradition="islam", title="Quran", lang="ar", script="Arabic", source_id="tanzil-uthmani"),
        divisions=[dict(number=c, title=f"Surah {c}") for c in range(1, 115)],
        copyright_notice=notice,
        provenance=dict(upstream=url, raw_sha256=hashlib.sha256(raw).hexdigest(),
                        verse_lines_sha256=hashlib.sha256(canonical_lines.encode()).hexdigest()),
        passages=passages), [dict(
            id="tanzil-uthmani", name="Tanzil Project · Quran Uthmani 1.1", url="https://tanzil.net/",
            license="CC-BY-3.0 with Tanzil verbatim-text terms", license_url="https://tanzil.net/docs/Text_License",
            attribution="Tanzil Project, Quran Uthmani text version 1.1. Copyright (C) 2007–2026 Tanzil Project. Copied verbatim; see the complete included notice.",
            display_rules=dict(layer="Primary text", language="Arabic", lang="ar", direction="rtl", preserve_verbatim=True,
                edition="Uthmani 1.1; pause marks, sajdah signs and tatweel included. Bismillah prefixes are preserved exactly as supplied.",
                description="Arabic Uthmani text from Tanzil. No English translation or transliteration is loaded for this edition.",
                copyright_notice=notice))])


def dhammapada():
    starts = [1,21,33,44,60,76,90,100,116,129,146,157,167,179,197,209,221,235,256,273,290,306,320,334,360,383,424]
    jobs = []
    for start, end in zip(starts, starts[1:]):
        name = f"dhp{start}-{end-1}"
        for folder, suffix in [("root/pli/ms", "root-pli-ms"), ("translation/en/sujato", "translation-en-sujato")]:
            jobs.append((start, end, suffix, f"https://raw.githubusercontent.com/suttacentral/bilara-data/{BILARA}/{folder}/sutta/kn/dhp/{name}_{suffix}.json"))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        contents = list(pool.map(lambda job: fetch(job[3]), jobs))
    sources = {(start, suffix): json.loads(raw) for (start, _, suffix, _), raw in zip(jobs, contents)}
    divisions, passages = [], []
    for chapter, (start, end) in enumerate(zip(starts, starts[1:]), 1):
        root, english = sources[start, "root-pli-ms"], sources[start, "translation-en-sujato"]
        title = english[f"dhp{start}:0.3"].strip()
        divisions.append(dict(number=chapter, title=title))
        for verse in range(start, end):
            keys = [k for k in root if re.fullmatch(fr"dhp{verse}:[1-9]\d*", k) and english.get(k, "").strip()]
            assert keys, verse
            def text(mapping):
                return "\n".join(BeautifulSoup(mapping[k], "html.parser").get_text().strip() for k in keys)
            passages.append(dict(id=f"dhp.{verse}", ref=f"Dhp {verse}", chapter=chapter, verse=verse,
                ordinal=verse, original_text=text(root), transliteration="", translations=[dict(
                    lang="en", translator="Bhikkhu Sujato", text=text(english), source_id="sujato-dhp", source_ref=f"Dhp {verse}")]))
    assert len(passages) == 423
    save("dhammapada", dict(
        work=dict(id="dhammapada", tradition="buddhism", title="Dhammapada", lang="pi", script="Latin", source_id="bilara-dhp-pali"),
        divisions=divisions, passages=passages,
        provenance=dict(commit=BILARA, files=[dict(url=job[3], sha256=hashlib.sha256(raw).hexdigest()) for job, raw in zip(jobs, contents)])), [dict(
            id="bilara-dhp-pali", name="SuttaCentral · Dhammapada Pali", url="https://suttacentral.net/dhp",
            license="Public-domain ancient text; SuttaCentral CC0 transcription", license_url="https://suttacentral.net/licensing?lang=en",
            attribution="Pali Dhammapada, Mahāsaṅgīti edition, via SuttaCentral Bilara. Segments joined into verses; headings and colophons excluded.",
            display_rules=dict(layer="Primary text", language="Pali", lang="pi", no_generative_ai=True,
                description="All 423 Pali verses in Roman script, with Bhikkhu Sujato’s English translation. SuttaCentral text is used for reading and ordinary search only; excluded from generative AI.",
                edition=f"Bilara published commit {BILARA}")), dict(
            id="sujato-dhp", name="Bhikkhu Sujato · Dhammapada English", url="https://suttacentral.net/dhp1-20/en/sujato",
            license="CC0-1.0", license_url="https://creativecommons.org/publicdomain/zero/1.0/",
            attribution="Translated by Bhikkhu Sujato for SuttaCentral. Public-domain dedication via CC0. Segment breaks joined; Bilara <j> join markers omitted from presentation.",
            display_rules=dict(layer="Human translation", language="English", lang="en", no_generative_ai=True,
                edition=f"Bilara published commit {BILARA}"))])


if __name__ == "__main__":
    quran()
    dhammapada()
