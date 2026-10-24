"""Prepare reusable, attributed reading editions. No generated scripture.

Run with the optional local lxml/BeautifulSoup preparation dependencies. Runtime
reading is independent of upstream hosts. Every gzip and upstream file is hashed.
English edition text is labelled as a human translation, not an original language.
"""
import concurrent.futures,gzip,hashlib,io,json,pathlib,re,sqlite3,sys,time,unicodedata,urllib.parse,urllib.request,xml.etree.ElementTree as ET,zipfile
from bs4 import BeautifulSoup

ROOT=pathlib.Path(__file__).resolve().parents[1]
CACHE=ROOT/'data/cache/library-expansion';CACHE.mkdir(parents=True,exist_ok=True)
OUT=ROOT/'data/imports/library';OUT.mkdir(parents=True,exist_ok=True)
BASE='https://archive.sacred-texts.com/'
SOURCES={};WORKS=[];CATALOG=[]

def fetch(url):
    path=CACHE/(hashlib.sha256(url.encode()).hexdigest()+'.html')
    if not path.exists():
        request=urllib.request.Request(url,headers={'User-Agent':'OpenScripture/0.2 (college library; github.com/KaartikeyKusshwaha/Bhagavad-Gita-Shloka)'})
        for attempt in range(3):
            try:path.write_bytes(urllib.request.urlopen(request,timeout=60).read());break
            except Exception:
                if attempt==2:raise
                time.sleep(attempt+1)
    return path.read_bytes()

def soup(url):return BeautifulSoup(fetch(url),'lxml')
def clean(text):return unicodedata.normalize('NFC',re.sub(r'[ \t\r\f\v\xa0]+',' ',text).strip())
def plain(node):return clean(node.get_text())
def roman(value):
    values={'I':1,'V':5,'X':10,'L':50,'C':100,'D':500,'M':1000};result=0;previous=0
    for letter in value.upper()[::-1]:
        number=values.get(letter,0);result+=-number if number<previous else number;previous=max(previous,number)
    return result

def source(id,name,url,attribution,lang='en',license='Public-domain text; noncommercial archive republication permission',license_url='https://sacred-texts.com/copyrights',**rules):
    SOURCES[id]=dict(id=id,name=name,url=url,license=license,license_url=license_url,commercial_ok=license in ['Public Domain','CC0-1.0','CC-BY-SA-4.0'],attribution=attribution,retrieved_at='2026-10-25',status='approved',display_rules={'bundle':'library-manifest.json','layer':'Human translation' if lang=='en' else 'Primary text','language':{'en':'English','he':'Hebrew','pa':'Punjabi (Gurmukhi)','hi':'Hindi'}.get(lang,lang),'lang':lang,'direction':'rtl' if lang in ['ar','he','fa','ur'] else 'ltr','machine_translation_allowed':True,**rules})
    return id

def work(slug,title,tradition,source_id,prefix,group,description,**metadata):
    lang=SOURCES[source_id]['display_rules']['lang']
    return dict(work=dict(id=slug,title=title,tradition=tradition,source_id=source_id,lang=lang,script={'he':'Hebrew','pa':'Gurmukhi','hi':'Devanagari','ar':'Arabic'}.get(lang,'Latin'),metadata={'group':group,'description':description,'reference_prefix':prefix,'section_label':'Section','passage_label':'Passage','is_translation':lang=='en',**metadata}),divisions=[],passages=[],provenance={})

def add_section(data,title,texts,source_url,part='',ref_prefix=None,source_numbers=None):
    number=len(data['divisions'])+1;w=data['work'];prefix=w['metadata']['reference_prefix']
    data['divisions'].append(dict(number=number,title=title,metadata=dict(part=part,source_url=source_url)))
    for i,text in enumerate(texts,1):
        text=clean(text)
        if not text:continue
        verse=source_numbers[i-1] if source_numbers else i
        ref=(ref_prefix or f'{prefix} {number}')+f'.{verse}'
        data['passages'].append(dict(id=f'{w["id"]}.{number}.{verse}',ref=ref,chapter=number,verse=verse,ordinal=len(data['passages'])+1,original_text=text,transliteration='',translations=[],metadata=dict(source_url=source_url,source_ref=title,locator='Source verse' if source_numbers else 'Platform reading block; consult source section for original numbering')))

def save(data):
    w=data['work'];slug=w['id'];assert data['passages'],slug
    names={'khandogya':('Chandogya Upanishad','Chandogya'),'talavakara':('Kena Upanishad','Kena'),'aitareya':('Aitareya Āraṇyaka','Aitareya'),'kaushitaki':('Kaushitaki Upanishad','Kaushitaki'),'vagasaneyi':('Isha Upanishad','Isha'),'katha':('Katha Upanishad','Katha'),'mundaka':('Mundaka Upanishad','Mundaka'),'taittiriyaka':('Taittiriya Upanishad','Taittiriya'),'brihadaranyaka':('Brihadaranyaka Upanishad','Brihadaranyaka'),'svetasvatara':('Shvetashvatara Upanishad','Shvetashvatara'),'prasna':('Prashna Upanishad','Prashna'),'maitrayana':('Maitri Upanishad','Maitri')}
    if slug.startswith('upanishad-'):
        key=slug.split('-')[1]
        if key in names:
            title,prefix=names[key];previous=w['metadata']['reference_prefix'];w['title']=title;w['metadata']['reference_prefix']=prefix
            w['metadata']['aliases']=list(dict.fromkeys([previous,title,*w['metadata'].get('aliases',[])]))
            for passage in data['passages']:
                if passage['ref'].startswith(previous+' '):passage['ref']=prefix+passage['ref'][len(previous):]
    assert len({p['id'] for p in data['passages']})==len(data['passages']),slug
    assert all('\ufffd' not in p['original_text'] for p in data['passages']),f'Invalid Unicode: {slug}'
    blob=(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n').encode()
    compressed=gzip.compress(blob,mtime=0);path=OUT/f'{slug}.json.gz';path.write_bytes(compressed)
    item=dict(id=slug,title=w['title'],tradition=w['tradition'],source_id=w['source_id'],file=f'library/{slug}.json.gz',checksum=hashlib.sha256(compressed).hexdigest(),passages=len(data['passages']),sections=len(data['divisions']),first_ref=data['passages'][0]['ref'],languages=sorted({w['lang'],*(t['lang'] for p in data['passages'] for t in p['translations'])}),metadata=w['metadata'])
    WORKS.append(item);CATALOG.append({k:v for k,v in item.items() if k not in ['file','checksum','passages','sections']})
    print(slug,item['sections'],item['passages'],flush=True)

def archive_body(url):
    doc=soup(url)
    for node in doc.select('script,style,iframe,nav,table.stnav,a[href^="#fn"],a[name^="page_"],sup'):node.decompose()
    html=str(doc.body or doc)
    heading=re.search(r'<h[1-6]\b[^>]*>',html,re.I)
    credit=next((p for p in doc.find_all('p') if 'at sacred-texts.com' in p.get_text() and len(p.get_text())<700),None)
    if credit:
        html=''.join(str(n) for n in credit.next_siblings)
        html=re.sub(r'^\s*<hr[^>]*>\s*','',html,count=1)
    elif heading:html=html[heading.start():]
    else:raise ValueError('No content heading or edition credit: '+url)
    end=re.search(r'<h[1-6][^>]*>\s*Footnotes\b|<a[^>]+name="fn_|<hr\b|\bNext:\s*<',html,re.I)
    if end:html=html[:end.start()]
    doc=BeautifulSoup(html,'lxml')
    if '/bhi/sog/' in url:
        for node in doc.select('p[align="center"]'):node.decompose()
    for node in doc.select('h1,h2,h3,h4,h5,h6'):node.decompose()
    for node in doc.find_all('br'):node.replace_with('\n')
    for node in doc.find_all('p'):node.append('\n\n')
    text=doc.get_text()
    text=re.sub(r'\[paragraph continues\]\s*','',text)
    paragraphs=[clean(p) for p in re.split(r'\n\s*\n',text)]
    paragraphs=[p for p in paragraphs if p and not re.fullmatch(r'[\s*─—-]+|p\.\s*\d+',p)]
    # Long source paragraphs are split only at existing sentence/line boundaries.
    result=[]
    for paragraph in paragraphs:
        if len(paragraph)<1800:result.append(paragraph);continue
        lines=re.split(r'(?<=[.!?])\s+(?=[A-Z“"\'])|\n',paragraph);block=''
        for line in lines:
            if len(block)+len(line)>1500 and block:result.append(block.strip());block=''
            block+=(('\n' if '\n' in paragraph else ' ') if block else '')+line
        if block.strip():result.append(block.strip())
    grouped=[];block=''
    for paragraph in result:
        if len(paragraph)<180 and len(block)+len(paragraph)<700:
            block+=('\n' if block else '')+paragraph
        else:
            if block:grouped.append(block);block=''
            grouped.append(paragraph)
    if block:grouped.append(block)
    return grouped

def upstream(url):return dict(url=url,sha256=hashlib.sha256(fetch(url)).hexdigest())

def usfx(name):
    with zipfile.ZipFile(CACHE/f'{name}-usfx.zip') as archive:
        xml=next(n for n in archive.namelist() if n.endswith('_usfx.xml'))
        root=ET.fromstring(archive.read(xml));names=ET.fromstring(archive.read('BookNames.xml').decode('utf-8-sig'))
    titles={b.attrib['code']:dict(b.attrib) for b in names};result={}
    for book in root.findall('book'):
        code=book.attrib['id'];chapter=0;verse=None;chunks=[];entries=[]
        def flush():
            if verse is not None:
                text=clean(''.join(chunks))
                if text:entries.append((chapter,verse,text))
        def walk(node,skip=False):
            nonlocal chapter,verse,chunks
            if node.tag=='c':flush();chapter=int(node.attrib['id']);verse=None;chunks=[]
            elif node.tag=='v':
                flush();mark=node.attrib.get('id','');verse=int(mark) if mark.isdigit() else None;chunks=[]
            elif node.tag=='ve':flush();verse=None;chunks=[]
            elif node.tag in ['f','x','fe','ref','fig','toc','h','id'] or (node.tag=='p' and node.attrib.get('sfm','').startswith(('s','ms','mt','is','ip'))):return
            elif node.text and verse is not None:chunks.append(node.text)
            for child in node:
                walk(child)
                if child.tail and verse is not None:chunks.append(child.tail)
            if verse is not None and node.tag in ['p','q']:chunks.append(' ')
        walk(book);flush()
        if entries:result[code]=dict(title=titles.get(code,{}).get('short',code),aliases=[titles.get(code,{}).get('abbr',code)],entries=entries)
    return result

def bibles():
    web=source('web-english','World English Bible · Protestant edition','https://ebible.org/engwebp/','World English Bible contributors, public-domain Protestant edition via eBible.org. Verse wording retained; publisher notes and cross-reference markers omitted.',license='Public Domain',license_url='https://ebible.org/engwebp/copyright.htm',description='Human English translation; the original Hebrew/Greek is not loaded in this edition.')
    hindi=source('irv-hindi','Indian Revised Version · Hindi 2019','https://ebible.org/hin2017/','Copyright © 2017, 2018, 2019 Bridge Connectivity Solutions. Indian Revised Version Hindi; CC BY-SA 4.0. Text unchanged except removal of footnote/reference markup.',lang='hi',license='CC-BY-SA-4.0',license_url='https://ebible.org/hin2017/copyright.htm')
    eng={k:v for k,v in usfx('web').items() if k not in ['TOB','JDT','ESG','WIS','SIR','BAR','1MA','2MA','1ES','MAN','PS2','3MA','2ES','4MA','DAG']};hin=usfx('hindi')
    assert len(eng)==66,(len(eng),list(eng))
    for order,(code,book) in enumerate(eng.items(),1):
        slug='bible-'+re.sub('[^a-z0-9]+','-',book['title'].lower()).strip('-')
        group='Torah / Pentateuch' if order<=5 else 'Historical books' if order<=17 else 'Wisdom & poetry' if order<=22 else 'Prophets' if order<=39 else 'Gospels & Acts' if order<=44 else 'Letters & Revelation'
        data=work(slug,book['title'],'christianity',web,book['title'],group,'World English Bible, with the licensed Hindi IRV edition where verse references align.',family='The Bible',aliases=book['aliases'],section_label='Chapter',passage_label='Verse',canonical_order=order)
        hindi_by_ref={(c,v):t for c,v,t in hin.get(code,{}).get('entries',[])}
        chapters=sorted({c for c,v,t in book['entries']})
        for chapter in chapters:
            entries=[(v,t) for c,v,t in book['entries'] if c==chapter]
            add_section(data,f'Chapter {chapter}',[t for v,t in entries],f'https://ebible.org/engwebp/{code}{chapter:02d}.htm',part='Old Testament' if order<=39 else 'New Testament',ref_prefix=f'{book["title"]} {chapter}',source_numbers=[v for v,t in entries])
        for p in data['passages']:
            if text:=hindi_by_ref.get((p['chapter'],p['verse'])):p['translations'].append(dict(lang='hi',translator='Bridge Connectivity Solutions · IRV 2019',text=text,source_id=hindi,source_ref=f'IRV {p["ref"]}'))
        data['provenance']=dict(zip_sha256=hashlib.sha256((CACHE/'web-usfx.zip').read_bytes()).hexdigest(),hindi_zip_sha256=hashlib.sha256((CACHE/'hindi-usfx.zip').read_bytes()).hexdigest(),alignment='Matched explicit USFX book/chapter/verse identifiers only; absent Hindi verses are not generated.')
        save(data)
    jps=source('jps-1917','Jewish Publication Society · Tanakh 1917','https://ebible.org/engjps/','Jewish Publication Society, The Holy Scriptures (1917); public-domain edition transcribed by eBible.org. No modern JPS translation is included.',license='Public Domain',license_url='https://ebible.org/engjps/copyright.htm',description='Human English translation of the Hebrew Bible. This is the 1917 JPS edition.')
    for order,(code,book) in enumerate(usfx('jps').items(),1):
        slug='tanakh-'+re.sub('[^a-z0-9]+','-',book['title'].lower()).strip('-')
        group='Torah' if code in ['GEN','EXO','LEV','NUM','DEU'] else 'Prophets' if code in ['JOS','JDG','1SA','2SA','1KI','2KI','ISA','JER','EZK','HOS','JOL','AMO','OBA','JON','MIC','NAM','HAB','ZEP','HAG','ZEC','MAL'] else 'Writings'
        data=work(slug,book['title'],'judaism',jps,'Tanakh '+book['title'],group,'The Jewish Publication Society’s 1917 English edition, organized by its source book and verse identifiers.',family='Tanakh · JPS 1917',aliases=['JPS '+book['title'],'Torah '+book['title']],section_label='Chapter',passage_label='Verse',canonical_order=order)
        for chapter in sorted({c for c,v,t in book['entries']}):
            entries=[(v,t) for c,v,t in book['entries'] if c==chapter]
            add_section(data,f'Chapter {chapter}',[t for v,t in entries],f'https://ebible.org/engjps/{code}{chapter:02d}.htm',part=group,ref_prefix=f'Tanakh {book["title"]} {chapter}',source_numbers=[v for v,t in entries])
        data['provenance']=dict(zip_sha256=hashlib.sha256((CACHE/'jps-usfx.zip').read_bytes()).hexdigest())
        save(data)

def mahabharata():
    sid=source('ganguli-mahabharata','Kisari Mohan Ganguli · Mahabharata (1883–1896)',BASE+'hin/maha/index.htm','Kisari Mohan Ganguli, English translation (1883–1896); Internet Sacred Text Archive, Distributed Proofing, Mantra Caitanya and J. B. Hare. Text-format edition; source-listed printed/section-number errata are retained.',description='Historical human English translation. Paragraph blocks are reading locators, not Sanskrit shloka numbers.')
    data=work('mahabharata','Mahabharata','hinduism',sid,'Mahabharata','Epics & Mahākāvya','Ganguli’s complete 18-book English text edition, with source section headings and explicit reading-block locators.',family='Itihāsa / Epics',aliases=['MB'],section_label='Section',passage_label='Reading block')
    titles=['Adi','Sabha','Vana','Virata','Udyoga','Bhishma','Drona','Karna','Shalya','Sauptika','Stri','Santi','Anusasana','Aswamedha','Asramavasika','Mausala','Mahaprasthanika','Svargarohanika']
    with zipfile.ZipFile(CACHE/'mahabharata.zip') as archive:
        for book in range(1,19):
            text=archive.read(f'maha{book:02d}.txt').decode('utf8',errors='strict').replace('\r\r\n','\n').replace('\r\n','\n')
            text=re.split(r'\nFOOTNOTES\s*\n',text)[0]
            sections=list(re.finditer(r'(?m)^SECTION\s+([IVXLCDM]+)(?:\s*\(([^\n]*)\))?\s*$',text))
            if not sections:sections=list(re.finditer(r'(?m)^(\d+)()[ \t]*$',text))
            assert sections,(book,'No sections')
            for i,match in enumerate(sections):
                body=text[match.end():sections[i+1].start() if i+1<len(sections) else len(text)]
                body=re.sub(r'\nEND OF [^\n]+\s*$','',body)
                paragraphs=[clean(p) for p in body.split('\n\n') if clean(p)]
                add_section(data,f'Section {match[1]}'+(f' · {match[2]}' if match[2] else ''),paragraphs,BASE+f'hin/m{book:02d}/index.htm',part=f'Book {book} · {titles[book-1]} Parva',ref_prefix=f'Mahabharata {book}.{i+1}')
    data['provenance']=dict(zip_sha256=hashlib.sha256((CACHE/'mahabharata.zip').read_bytes()).hexdigest(),source_errata_url=BASE+'hin/maha/index.htm',text_edition='Source zip, updated 2005; later HTML-only corrections not silently applied.')
    save(data)

def archive_collection(slug,title,tradition,prefix,group,index_url,selected,description,translator):
    sid=source(slug+'-edition',translator+' · '+title,index_url,translator+'; Internet Sacred Text Archive transcription. Source wording retained; navigation, page markers and separated footnotes omitted. Reading-block numbers are platform locators.',description=description)
    data=work(slug,title,tradition,sid,prefix,group,description,aliases=[],family=group)
    cached=OUT/f'{slug}.json.gz'
    if '--reuse-prepared' in sys.argv and cached.exists():
        save(json.loads(gzip.decompress(cached.read_bytes())));return
    jobs=[(label,urllib.parse.urljoin(index_url,href),part) for label,href,part in selected]
    jobs=list({url:(label,url,part) for label,url,part in jobs}.values())
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results=list(pool.map(lambda item:archive_body(item[1]),jobs))
    for (label,url,part),paragraphs in zip(jobs,results):
        if not paragraphs:raise ValueError('No text: '+url)
        add_section(data,label,paragraphs,url,part=part)
    data['provenance']=dict(pages=[upstream(url) for label,url,part in jobs])
    save(data)

def main():
    bibles()
    mahabharata()
    # Further families use the same verified archive reader, configured below.
    configure_archive_collections()
    other_traditions()
    quran_english()
    manifest=dict(version='2026-10-25',works=WORKS)
    path=ROOT/'data/imports/library-manifest.json';path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    for record in SOURCES.values():
        record['checksum']=digest
        (ROOT/f'data/sources/{record["id"]}.yml').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    (ROOT/'packages/shared/src/library-catalog.json').write_text(json.dumps(CATALOG,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    print('Library:',len(WORKS),'works;',sum(w['passages'] for w in WORKS),'passages; manifest',digest)

def quran_english():
    url='https://d.clearquran.com/text/clearquran-txt-god-edition.zip'
    archive=zipfile.ZipFile(io.BytesIO(fetch(url)))
    text=archive.read('clearquran-god-edition.txt').decode('utf-8-sig')
    records=[]
    for line in text.splitlines():
        m=re.fullmatch(r'(\d+)\|(\d+)\|(.+)',line)
        if m:records.append(dict(passage_id=f'quran.{m[1]}.{m[2]}',text=m[3],source_ref=f'ClearQuran {m[1]}:{m[2]}'))
    assert len(records)==6236,len(records)
    base=json.loads((ROOT/'data/imports/quran.json').read_text('utf8'))
    assert {r['passage_id'] for r in records}=={p['id'] for p in base['passages']}
    data=dict(translations=records,provenance=dict(upstream_url=url,zip_sha256=hashlib.sha256(fetch(url)).hexdigest(),verse_strings_sha256=hashlib.sha256('\n'.join(f'{r["passage_id"]}|{r["text"]}' for r in records).encode()).hexdigest(),copyright_notice=archive.read('_readme.txt').decode('utf-8-sig')))
    path=ROOT/'data/imports/quran-english.json';path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    record=dict(id='clearquran-itani',name='ClearQuran · Talal Itani (God edition)',url='https://www.clearquran.com/',license='CC-BY-ND-4.0',license_url='https://creativecommons.org/licenses/by-nd/4.0/',attribution='Copyright © Talal Itani. ClearQuran, God edition, updated October 9, 2026. Reproduced verbatim under CC BY-ND 4.0; no endorsement. https://www.clearquran.com/',retrieved_at='2026-10-25',status='approved',commercial_ok=True,checksum=hashlib.sha256(path.read_bytes()).hexdigest(),display_rules=dict(bundle='quran-english.json',language='English',lang='en',preserve_verbatim=True,no_generative_ai=True,machine_translation_allowed=False,copyright_notice=data['provenance']['copyright_notice']))
    (ROOT/'data/sources/clearquran-itani.yml').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    print('ClearQuran English: 6236 verbatim verse mappings',flush=True)

def other_traditions():
    from gurmukhiutils.unicode import unicode as to_unicode
    sid=source('shabados-gurbani','Shabad OS · Sri Guru Granth Sahib','https://github.com/shabados/database/releases/tag/4.8.7','Sri Guru Granth Sahib; Shabad OS Database 4.8.7, Gurbani data public domain. Legacy Gurmukhi font encoding converted with gurmukhiutils 0.3.1 (MIT); Unicode Consortium mapping. Modern copyrighted translations are not included.',lang='pa',license='Public Domain',license_url='https://github.com/shabados/shabados/blob/main/database/README.md',machine_translation_allowed=False)
    data=work('guru-granth-sahib','Sri Guru Granth Sahib','sikhism',sid,'SGGS','Guru Granth Sahib','The Gurmukhi text on 1,430 angs from Shabad OS. English translations from that database are not republished without edition permissions.',section_label='Ang',passage_label='Line',is_translation=False)
    db=sqlite3.connect(CACHE/'sikh.sqlite')
    rows=db.execute('SELECT l.id,l.source_page,l.source_line,l.gurmukhi,sec.name_english FROM lines l JOIN shabads s ON s.id=l.shabad_id LEFT JOIN sections sec ON sec.id=s.section_id WHERE s.source_id=1 ORDER BY l.order_id').fetchall()
    for page in sorted({r[1] for r in rows}):
        lines=[r for r in rows if r[1]==page]
        # Several database segments share one printed source line. Keep all segments
        # together, in source order, instead of inventing extra printed line numbers.
        by_line={}
        for row in lines:by_line.setdefault(row[2],[]).append(row)
        numbers=list(by_line)
        add_section(data,f'Ang {page}',['\n'.join(to_unicode(r[3]) for r in by_line[n]) for n in numbers],SOURCES[sid]['url'],part=lines[0][4] or 'Gurbani',ref_prefix=f'SGGS {page}',source_numbers=numbers)
        for passage,n in zip(data['passages'][-len(numbers):],numbers):passage['metadata']['source_segment_ids']=[r[0] for r in by_line[n]]
    assert len(data['divisions'])==1430
    data['provenance']=dict(database_sha256=hashlib.sha256((CACHE/'sikh.sqlite').read_bytes()).hexdigest(),encoding_conversion='gurmukhiutils 0.3.1, Unicode Consortium; no generated words',upstream_version='4.8.7');save(data)
    url=BASE+'skh/tsr1/tsr121.htm';doc=soup(url)
    for n in doc.select('script,style,nav,iframe'):n.decompose()
    for h in doc.select('h3'):h.replace_with('\n###'+plain(h)+'###\n')
    text=doc.body.get_text();text=text[text.index('THERE is but one God'):]
    text=text.split('Next:')[0]
    # This transcription places bracketed editorial footnotes within the text.
    output='';depth=0
    for character in text:
        if character=='[':depth+=1
        elif character==']' and depth:depth-=1
        elif not depth:output+=character
    output=re.sub(r'\{[^}]*\}','',output)
    sid=source('macauliffe-japji','M. A. Macauliffe · Japji Sahib (1909)',url,'Max Arthur Macauliffe, The Sikh Religion, volume I (1909); Internet Sacred Text Archive. Bracketed editorial footnotes and print page markers omitted; verse wording unchanged.')
    data=work('japji-sahib-macauliffe','Japji Sahib · English','sikhism',sid,'Japji','Nitnem · historical English edition','Macauliffe’s historical English translation (1909). Its reading blocks are not aligned to the separate Shabad OS Gurmukhi lines.',passage_label='Reading block')
    sections=re.split(r'\n###([^#]+)###\n',output)
    add_section(data,'Opening',[clean(sections[0])],url)
    for i in range(1,len(sections),2):
        add_section(data,sections[i],[clean(sections[i+1])],url)
    data['provenance']=upstream(url);save(data)
    path='bhi/sog/index.htm';selected=[]
    for a in soup(BASE+path).select('a[href]'):
        m=re.fullmatch(r'sog(\d{2})\.htm',a['href'])
        if m and 9<=int(m[1])<=36 and int(m[1])!=21:selected.append((plain(a),a['href'],'Seven Valleys' if int(m[1])<=15 else 'Tablets & sayings'))
    archive_collection('bahai-splendour','Bahá’í writings · The Splendour of God','bahai','Splendour','Historical translations & anthologies',BASE+path,selected,'Eric Hammond’s 1909 historical anthology of Bahá’í writings, including Seven Valleys and tablets. These are historical translations and extracts, not the current authorized Reference Library editions.','Eric Hammond, 1909')
    text=(CACHE/'mormon.txt').read_text('utf8');text=text.split('*** END OF THE PROJECT GUTENBERG')[0]
    for name in ['Enos','Jarom','Omni']:
        text=re.sub(r'(?m)^\s*THE BOOK OF '+name.upper()+r'[ \t]*$',name+' Chapter 1',text)
    text=re.sub(r'(?m)^\s*THE WORDS OF MORMON[ \t]*$','Words of Mormon Chapter 1',text)
    text=text.replace('4 Nephi 1:1 ','4 Nephi Chapter 1\n\n4 Nephi 1:1 ',1)
    sid=source('book-of-mormon-gutenberg','Book of Mormon · Project Gutenberg #17','https://www.gutenberg.org/ebooks/17','The Book of Mormon, historical English edition; Project Gutenberg #17, transcription by David Widger. Project Gutenberg terms retained in provenance. No endorsement by The Church of Jesus Christ of Latter-day Saints.',license='Public Domain',license_url='https://www.gutenberg.org/policy/license.html')
    data=work('book-of-mormon','Book of Mormon','lds',sid,'Book of Mormon','Scripture','The historical English text from Project Gutenberg, with source book, chapter and verse identifiers.',section_label='Chapter',passage_label='Verse')
    chapters=list(re.finditer(r'(?m)^((?:[1-4] )?[A-Z][A-Za-z ]+) Chapter (\d+)\s*$',text))
    for i,m in enumerate(chapters):
        body=text[m.end():chapters[i+1].start() if i+1<len(chapters) else len(text)]
        body=re.split(r'(?m)^[ \t]*(?:(?:THE (?:(?:FIRST|SECOND|THIRD|FOURTH) )?)?(?:BOOK|WORDS) OF [A-Z —-]+|(?:FIRST|SECOND|THIRD|FOURTH) NEPHI|THE END\.?)[ \t]*$',body)[0]
        # A few source verse markers occur within a paragraph rather than at its start.
        verses=list(re.finditer(r'(?<!\S)(?:[1-4] Nephi )?(\d+):(\d+)\s+',body))
        parts=[];numbers=[]
        for j,v in enumerate(verses):
            parts.append(clean(re.sub(r'\s+',' ',body[v.end():verses[j+1].start() if j+1<len(verses) else len(body)])));numbers.append(int(v[2]))
        if parts:add_section(data,f'{m[1]} {m[2]}',parts,'https://www.gutenberg.org/ebooks/17',part=m[1],ref_prefix=f'Book of Mormon {m[1]} {m[2]}',source_numbers=numbers)
    assert len(data['divisions'])==239,len(data['divisions'])
    assert len(data['passages'])==6604,len(data['passages'])
    data['work']['metadata']['reference_units']=list(dict.fromkeys(re.sub(r' \d+\.\d+$','',p['ref']) for p in data['passages']))
    data['provenance']=dict(upstream_sha256=hashlib.sha256((CACHE/'mormon.txt').read_bytes()).hexdigest(),license_notice=(CACHE/'mormon.txt').read_text('utf8').split('*** END OF THE PROJECT GUTENBERG')[1]);save(data)

def configure_archive_collections():
    def links(path,pattern):
        return [(plain(a),a['href'],'') for a in soup(BASE+path).select('a[href]') if re.match(pattern,plain(a))]
    path='hin/rama/index.htm';selected=[];part=''
    for a in soup(BASE+path).select('a[href]'):
        label=plain(a)
        if re.fullmatch(r'Book [IVXLCDM]+',label):part=label
        if label.startswith('Canto '):selected.append((label,a['href'],part))
    archive_collection('valmiki-ramayana','Valmiki Ramayana','hinduism','Ramayana','Epics & Mahākāvya',BASE+path,selected,'Griffith’s historical English verse translation, organized by the archive’s books and cantos. Source omissions and numbering are retained; reading blocks are not Sanskrit shloka numbers.','Ralph T. H. Griffith, 1870–1874')
    archive_collection('white-yajurveda','White Yajurveda','hinduism','Yajurveda','The four Vedas',BASE+'hin/wyv/index.htm',links('hin/wyv/index.htm',r'^Book [IVXLCDM]+$'),'The Vājasaneyi Saṃhitā in Griffith’s historical English edition, in 40 books. This is the White Yajurveda recension.','Ralph T. H. Griffith, 1899')
    atharva=[]
    for label,href,_ in links('hin/av/index.htm',r'^Book \d+$'):
        index=urllib.parse.urljoin(BASE+'hin/av/index.htm',href)
        for a in soup(index).select('a[href]'):
            if re.fullmatch(r'av\d{5}\.htm',a['href']):atharva.append((plain(a),urllib.parse.urljoin(index,a['href']),label))
    archive_collection('atharvaveda','Atharvaveda','hinduism','Atharvaveda','The four Vedas',BASE+'hin/av/index.htm',atharva,'Griffith’s historical English edition, arranged by source books and hymns. Reading-block locators are separate from source verse numbers.','Ralph T. H. Griffith, 1895–1896')
    rig=[]
    for book in range(1,11):
        index=BASE+f'hin/rigveda/rvi{book:02d}.htm'
        for a in soup(index).select('a[href]'):
            if re.fullmatch(r'rv\d{5}\.htm',a['href']):rig.append((plain(a),urllib.parse.urljoin(index,a['href']),f'Book {book}'))
    archive_collection('rigveda','Rigveda','hinduism','Rigveda','The four Vedas',BASE+'hin/rigveda/index.htm',rig,'Griffith’s English hymns, arranged in ten books. A historical translation with source transcription limitations.','Ralph T. H. Griffith, 1896')
    # A complete source has many headings in one HTML file. Keep these boundaries.
    url=BASE+'hin/sv.htm';doc=soup(url);selected=[];part='';book='';chapter=''
    sid=source('samaveda-edition','Ralph T. H. Griffith · Samaveda',url,'Ralph T. H. Griffith, 1895; Internet Sacred Text Archive. Historical English edition; preface and footnotes omitted.')
    data=work('samaveda','Samaveda','hinduism',sid,'Samaveda','The four Vedas','English hymns in the source’s two parts, books, chapters and decades. Reading blocks retain source verse numbers in their text.')
    for h in doc.select('h1,h2,h3,h4'):
        label=plain(h)
        if label.rstrip('.') in ['FIRST PART','SECOND PART','PART SECOND']:part='SECOND PART' if label.startswith('PART SECOND') else label.rstrip('.')
        elif part and re.match('BOOK ',label):book=label
        elif part and re.match('CHAPTER ',label):chapter=label
        elif part and (label.startswith('DECADE ') or (part=='SECOND PART' and h.name=='h4')):
            nodes=[]
            for n in h.next_siblings:
                if getattr(n,'name',None) in ['h1','h2','h3','h4']:break
                nodes.append(str(n))
            body=BeautifulSoup(''.join(nodes),'lxml').get_text('\n',strip=True)
            if body:add_section(data,f'{book} · {chapter} · {label}',[body],url,part=part)
    assert len(data['divisions'])>100,len(data['divisions'])
    data['provenance']=upstream(url);save(data)
    for slug,title,path,pattern in [
        ('acaranga-sutra','Ācārāṅga Sutra','jai/sbe22/index.htm',r'^Book I{1,2},'),
        ('kalpa-sutra','Kalpa Sutra','jai/sbe22/index.htm',r'^(Life of|Epochs of|List of the Sthaviras|Rules for Yatis)'),
        ('uttaradhyayana-sutra','Uttarādhyayana Sutra','jai/sbe45/index.htm',r'^(?!Book )[^:]*Lecture'),
        ('sutrakritanga','Sūtrakṛtāṅga Sutra','jai/sbe45/index.htm',r'^Book [12],')]:
        archive_collection(slug,title,'jainism',title,'Jain āgamas',BASE+path,links(path,pattern),'Jacobi’s historical English edition, with the source lectures and lessons. This collection represents these texts, not every Jain canon.','Hermann Jacobi, '+('1884' if '22/' in path else '1895'))
    archive_collection('lotus-sutra','Lotus Sutra','buddhism','Lotus','Mahāyāna sūtras',BASE+'bud/lotus/index.htm',links('bud/lotus/index.htm',r'^Chapter \d+$'),'Kern’s historical English translation of the Saddharma Puṇḍarīka, in the source edition’s 27 chapters.','H. Kern, 1884')
    sid=source('sutta-nipata-edition','V. Fausbøll · Sutta Nipāta (1881)',BASE+'bud/sbe10/index.htm','V. Fausbøll, Sutta Nipāta, 1881; Internet Sacred Text Archive. Numbered verse paragraphs only; translator introductions, glosses, prose interludes and footnotes omitted.')
    data=work('sutta-nipata','Sutta Nipāta · numbered verses','buddhism',sid,'Sutta Nipata','Early Buddhist discourses','Fausbøll’s historical English verse paragraphs in five parts. This verse selection omits prose interludes and editorial notes; source numbers remain in the text.')
    for number in range(33,38):
        url=BASE+f'bud/sbe10/sbe10{number:02d}.htm';doc=soup(url)
        for node in doc.select('a[href^="#fn"],sup'):node.decompose()
        texts=[plain(p) for p in doc.select('p') if re.match(r'^\d+\.\s',plain(p)) and re.search(r'\(\d+\)\s*$',plain(p))]
        add_section(data,plain(doc.find('h1')),texts,url)
    assert len(data['passages'])>1000,len(data['passages']);data['provenance']=dict(pages=[upstream(BASE+f'bud/sbe10/sbe10{n:02d}.htm') for n in range(33,38)]);save(data)
    archive_collection('vendidad','Avesta · Vendīdād','zoroastrianism','Vendidad','Avesta',BASE+'zor/sbe04/index.htm',links('zor/sbe04/index.htm',r'^Fargard '),'Darmesteter’s historical English translation of the Vendīdād, in 22 fargards. Other Avesta collections are not implied.','James Darmesteter, 1880')
    path='shi/kj/index.htm';selected=[];part=''
    for n in soup(BASE+path).select('h3,a[href]'):
        label=plain(n)
        if n.name=='h3' and label.startswith('Volume'):part=label
        if n.name=='a' and label.startswith('Section '):selected.append((label,n['href'],part))
    archive_collection('kojiki','Kojiki','shinto','Kojiki','Early chronicles',BASE+path,selected,'Chamberlain’s historical English edition in three volumes. Source numbering and historical language are retained.','Basil Hall Chamberlain, 1919')
    url=BASE+'tao/taote.htm';doc=soup(url)
    sid=source('tao-te-ching-edition','James Legge · Tao Te Ching',url,'Lao-tzu, translated by James Legge, 1891; Internet Sacred Text Archive.')
    data=work('tao-te-ching','Tao Te Ching','taoism',sid,'Tao','Foundational texts','Legge’s historical English edition in 81 chapters.',section_label='Chapter')
    for h in doc.select('h2'):
        if not plain(h).isdigit():continue
        nodes=[]
        for n in h.next_siblings:
            if getattr(n,'name',None)=='h2':break
            if getattr(n,'name',None)=='hr':break
            nodes.append(str(n))
        text=BeautifulSoup(''.join(nodes),'lxml').get_text('\n',strip=True)
        add_section(data,'Chapter '+plain(h),[text],url)
    assert len(data['divisions'])==81;data['provenance']=upstream(url);save(data)
    url=BASE+'cfu/conf1.htm';text=soup(url).find('pre').get_text()
    sid=source('analects-edition','James Legge · Confucian Analects',url,'Confucius, translated by James Legge; historical English edition via Internet Sacred Text Archive.')
    data=work('analects','Analects','confucianism',sid,'Analects','The Four Books','Legge’s historical English edition, arranged in twenty books.',section_label='Book')
    sections=list(re.finditer(r'(?m)^[ \t]*(\d{1,2})()[ \t]*$',text))
    for i,m in enumerate(sections):
        body=text[m.end():sections[i+1].start() if i+1<len(sections) else len(text)]
        add_section(data,'Book '+m[1]+m[2],re.split(r'\n(?=   \S)',body),url)
    assert len(data['divisions'])==20,len(data['divisions']);data['provenance']=upstream(url);save(data)
    # The two Müller volumes: exclude introductions, then use the source's own group headings.
    for path,minimum in [('hin/sbe01/index.htm',22),('hin/sbe15/index.htm',10)]:
        groups={};part=''
        for n in soup(BASE+path).select('h3,a[href]'):
            if n.name=='h3':part=plain(n)
            elif re.fullmatch(r'sbe\d{5}\.htm',n.get('href','')) and int(n['href'][5:8])>=minimum and part and not part.startswith('Introduction'):
                groups.setdefault(part,[]).append((plain(n),n['href'],part))
        for part,selected in groups.items():
            slug='upanishad-'+re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',part).encode('ascii','ignore').decode().lower()).strip('-')[:65]
            archive_collection(slug,part,'hinduism',part,'Upanishads',BASE+path,selected,'Max Müller’s historical English edition. The source’s khanda and vallī labels are retained; reading blocks are platform locators.','Max Müller, '+('1879' if '01/' in path else '1884'))

if __name__=='__main__':main()
