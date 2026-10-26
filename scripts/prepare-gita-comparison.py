"""Copy Swarupananda's 1909 human translation for the college reader.

Source verse ranges stay intact and visibly labelled; no verse text is generated
or split by an algorithm. The host explicitly permits noncommercial republication.
"""
import hashlib,json,pathlib,re,time,unicodedata,urllib.request
from bs4 import BeautifulSoup

ROOT=pathlib.Path(__file__).resolve().parents[1]
CACHE=ROOT/'data/cache/gita-comparison'
CACHE.mkdir(parents=True,exist_ok=True)
BASE='https://sacred-texts.com/book/srimad-bhagavad-gita'

def fetch(url,name):
    path=CACHE/name
    if not path.exists():
        request=urllib.request.Request(url,headers={'User-Agent':'OpenScripture/0.1 (college reader; github.com/KaartikeyKusshwaha/Bhagavad-Gita-Shloka)'})
        path.write_bytes(urllib.request.urlopen(request,timeout=60).read())
        time.sleep(.5)
    return path.read_bytes()

index=BeautifulSoup(fetch(BASE,'index.html').decode('utf8'),'html.parser')
links={}
ordinals=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth','sixteenth','seventeenth','eighteenth']
for anchor in index.select('a[href]'):
    url=anchor['href']
    if url.startswith('/'):url='https://sacred-texts.com'+url
    for c,ordinal in enumerate(ordinals,1):
        if url.startswith(BASE+'/'+ordinal+'-chapter-'):links[c]=url
assert len(links)==18
expected={c:sum(p['chapter']==c for p in json.loads((ROOT/'data/imports/gita.json').read_text(encoding='utf8'))['passages']) for c in range(1,19)}
translations=[];provenance=[];range_count=0
for chapter in range(1,19):
    raw=fetch(links[chapter],f'{chapter}.html')
    soup=BeautifulSoup(raw.decode('utf8'),'html.parser')
    content=soup.select_one('[data-slot="reader-prose"] .contents')
    assert content is not None
    groups=[];current=None
    for paragraph in content.find_all('p'):
        for node in paragraph.select('[data-footnote-ref],sup,script,style'):node.decompose()
        text=re.sub(r'\s+',' ',paragraph.get_text(' ',strip=True)).strip()
        if not text or re.fullmatch(r'(?:p\.\s*\d+\s*)+',text):continue
        if re.search(r'\bsaid\s*:$',text):continue
        if text.lower().startswith('the end of'):break
        marker=re.match(r'^(\d+)(?:\s*[-–]\s*(\d+))?\.\s*(.+)$',text)
        if marker:
            start=int(marker[1]);end=int(marker[2] or start)
            current={'start':start,'end':end,'text':marker[3]}
            groups.append(current)
        elif current is not None:
            continuation=re.sub(r'^\[paragraph continues\]\s*','',text)
            current['text']+=' '+continuation
    found={}
    for group in groups:
        start,end=group['start'],group['end']
        # The host prints 29 for the paragraph spanning BG 1.28–29. Preserve
        # all words and disclose that source marker rather than invent a split.
        marker_note=''
        if chapter==1 and start==29 and end==29:
            start=28
            marker_note='; source prints 29'
        if start!=end:range_count+=1
        ref=f'Swarupananda {chapter}.{start}'+(f'–{end} (combined verses{marker_note})' if start!=end else '')
        for verse in range(start,end+1):
            assert verse not in found,(chapter,verse,'duplicate')
            found[verse]=dict(passage_id=f'bg.{chapter}.{verse}',source_id='swarupananda-1909',lang='en',translator='Swami Swarupananda (1909)',text=unicodedata.normalize('NFC',group['text']),source_ref=ref)
    assert set(found)==set(range(1,expected[chapter]+1)),(chapter,sorted(set(range(1,expected[chapter]+1))-set(found)),sorted(set(found)-set(range(1,expected[chapter]+1))))
    translations.extend(found[v] for v in sorted(found))
    provenance.append(dict(chapter=chapter,url=links[chapter],sha256=hashlib.sha256(raw).hexdigest()))
    print(chapter,len(found),flush=True)
# Crosscheck paragraphs spanning multiple page markers against the original
# archive. Keep the complete original paragraph; never guess missing words.
for chapter,verse,filename in [(6,19,'sbg11.htm'),(8,25,'sbg13.htm')]:
    url='https://archive.sacred-texts.com/hin/sbg/'+filename
    raw=fetch(url,f'archive-{chapter}.html')
    soup=BeautifulSoup(raw.decode('utf8'),'html.parser')
    candidates=[]
    for p in soup.find_all('p'):
        for node in p.select('a[href^="#fn_"],sup'):node.decompose()
        text=re.sub(r'\s+',' ',p.get_text(' ',strip=True)).strip()
        if re.match(fr'^{verse}\.\s',text):candidates.append(re.sub(fr'^{verse}\.\s*','',text))
    assert len(candidates)==1 and '\ufffd' not in candidates[0]
    record=next(t for t in translations if t['passage_id']==f'bg.{chapter}.{verse}')
    assert record['text']==candidates[0]
    record['text']=candidates[0]
    provenance.append(dict(chapter=chapter,verse=verse,url=url,sha256=hashlib.sha256(raw).hexdigest(),reason='Paragraph spanning multiple page markers crosschecked against original archive.'))
assert len(translations)==700 and all('\ufffd' not in t['text'] for t in translations)
data=dict(translations=translations,provenance=provenance,combined_ranges=range_count)
path=ROOT/'data/imports/gita-comparison.json'
path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
source=dict(id='swarupananda-1909',name='Swami Swarupananda · Srimad-Bhagavad-Gita (1909)',url=BASE,license='Public-domain text; noncommercial host republication permission',license_url='https://sacred-texts.com/copyrights',commercial_ok=False,attribution='Swami Swarupananda (credited translator), Advaita Ashrama, 1909; Internet Sacred Text Archive transcription. Verse wording retained; page and footnote markers omitted. Combined verse ranges are preserved and labelled.',retrieved_at='2026-10-25',checksum=hashlib.sha256(path.read_bytes()).hexdigest(),status='approved',display_rules=dict(layer='Translation',bundle='gita-comparison.json',edition='1909 English edition. Chapter 13 uses verses 1–34; its unnumbered opening question is not loaded. Some translations cover a labelled range of verses.',reuse_scope='Noncommercial college website, offline packs and attributed classroom sharing. Commercial reuse is not approved by this source record.'))
(ROOT/'data/sources/swarupananda-1909.yml').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
print('Saved',len(translations),'verse mappings;',range_count,'combined ranges;',source['checksum'])
