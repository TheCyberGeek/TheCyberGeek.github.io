"""Build the complete GitHub Pages site using only Python's standard library.

Original posts are preserved byte-for-byte. Their document embeds and external
research destinations are wrapped in accessible readers at the original URLs.
"""
from pathlib import Path
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlsplit
import argparse
import hashlib
import json
import re
import shutil

ROOT=Path(__file__).resolve().parents[1]
DOMAIN='https://thecybergeek.co.uk'
WIKI='https://wiki.thecybergeek.co.uk/'
PAGES={'archive':'The writeup archive','about':'The human','terminal':'Interactive terminal','research':'Vulnerability research','contact':'Get in touch'}

class Destinations(HTMLParser):
    def __init__(self):
        super().__init__();self.embed=None;self.redirect=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='iframe':self.embed=a.get('src')
        if tag=='meta' and a.get('http-equiv','').lower()=='refresh':
            match=re.search(r'url=(.*)',a.get('content',''),re.I)
            if match:self.redirect=match[1].strip()

def load_posts(root=ROOT):
    posts=[]
    for path in sorted((root/'_posts').glob('*')):
        if path.suffix not in {'.md','.markdown','.html'}:continue
        text=path.read_text(encoding='utf-8-sig')
        sections=text.split('---',2)
        if len(sections)!=3:raise ValueError(f'Missing frontmatter: {path.name}')
        fields={}
        for line in sections[1].splitlines():
            if ':' in line:
                key,value=line.split(':',1);fields[key.strip()]=value.strip().strip('"').strip("'")
        title=fields['title'];categories=fields['categories'].split()
        date=fields['date'][:10].replace('/','-')
        slug=path.stem[11:]
        url='/'+('/'.join(c.lower() for c in categories))+'/'+date.replace('-','/')+'/'+slug+'.html'
        category=next((c for c in ['HackTheBox','CVEs'] if c in categories),None)
        if category is None:continue
        parser=Destinations();parser.feed(sections[2]);target=parser.embed or parser.redirect
        if not target or urlsplit(target).scheme!='https':raise ValueError(f'Unrecognized original content in {path.name}; add a renderer before publishing.')
        posts.append(dict(title=title,date=date,category=category,tags=categories,url=url,source=target,kind='document' if parser.embed else 'research',filename=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    if not posts:raise ValueError('Original _posts are missing; refusing to build an empty archive.')
    posts.sort(key=lambda p:(p['date'],p['filename']),reverse=True)
    if len({p['url'] for p in posts})!=len(posts):raise ValueError('Duplicate original URLs')
    manifest=root/'scripts/archive-manifest.json'
    if manifest.exists():
        expected={urlsplit(p['url']).path for p in json.loads(manifest.read_text(encoding='utf-8'))}
        actual={p['url'] for p in posts}
        if expected-actual:raise ValueError('Missing original posts: '+str(sorted(expected-actual)))
    return posts

def build(root=ROOT,base='',preview=False):
    root=Path(root).resolve();base=('/'+base.strip('/')) if base.strip('/') else ''
    if base and not re.fullmatch(r'/[A-Za-z0-9_/-]+',base):raise ValueError('Invalid Pages base path')
    posts=load_posts(root)
    research_path=root/'scripts/research.json'
    research=json.loads(research_path.read_text(encoding='utf-8')) if research_path.exists() else {}
    out=root/'_site'
    if out.is_symlink() or out.resolve().parent!=root:raise ValueError('Unsafe build destination')
    if out.exists():shutil.rmtree(out)
    out.mkdir()
    shutil.copytree(root/'assets',out/'assets',ignore=shutil.ignore_patterns('*.scss','*.sass'))
    (out/'.nojekyll').write_text('')
    shutil.copy2(root/'CNAME',out/'CNAME')
    def link(path):return base+'/'+path.lstrip('/')
    def write(path,content):
        p=out/path.lstrip('/');p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content,encoding='utf-8')
    def header():return f'<header class="lab-header"><a class="room-return" data-home href="{link("")}">← Return to the room</a><a class="github-link" href="https://github.com/TheCyberGeek" target="_blank" rel="noopener noreferrer">GITHUB ↗</a></header>'
    def nav(active=''):return '<nav class="page-nav" aria-label="Site navigation"><a href="'+link('')+'">← ROOM</a>'+''.join(f'<a href="{WIKI if name=="wiki" else link(name+"/")}"'+(' aria-current="page"' if active==name else '')+f'>{escape(title.upper())}</a>' for name,title in [*list(PAGES.items())[:-1],('wiki','Content Wiki'),list(PAGES.items())[-1]])+'</nav>'
    def footer():return f'<footer class="lab-footer"><span>THECYBERGEEK / KEEPING IT GEEKY.</span><nav class="footer-links" aria-label="Footer"><a href="{link("")}">ROOM</a><a href="{link("archive/")}">ARCHIVE</a><a href="{link("contact/")}">CONTACT</a></nav></footer>'
    def doc(title,body,path,scripts=(),description='TheCyberGeek’s personal security lab, research and writeup archive.'):
        return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#111927"><meta name="description" content="'+escape(description,quote=True)+'"><title>'+escape(title)+' | TheCyberGeek</title><link rel="canonical" href="'+DOMAIN+link(path)+'"><link rel="stylesheet" href="'+link('assets/site.css?v=htb-archive-1')+'"><link rel="stylesheet" href="'+link('assets/pages.css?v=htb-archive-1')+'"><link rel="stylesheet" href="'+link('assets/parrot.css?v=20261017-rounded-frame')+'"><link rel="stylesheet" href="'+link('assets/htb-theme.css?v=wiki-subdomain-1')+'">'+''.join('<script src="'+link('assets/'+s)+'" defer></script>' for s in scripts)+'</head><body><a class="skip" href="#main-content">Skip to content</a>'+header()+body+footer()+'</body></html>'
    source=(root/'index.html').read_text(encoding='utf-8')
    urls={p['title']:base+p['url'] for p in posts}
    source=re.sub(r'data-article="([^"]+)" href="[^"]+"',lambda m:'data-article="'+m[1]+'" href="'+urls.get(m[1],link('archive/'))+'"',source)
    # The root stays directly viewable; the production build has the same interface.
    home=source.replace('</head>',f'<link rel="canonical" href="{DOMAIN}{link("")}"><meta property="og:title" content="TheCyberGeek | Welcome to the lab"><meta property="og:type" content="website"><meta property="og:image" content="{DOMAIN}{link("assets/lab-room-grey-beard.png")}"></head>')
    write('index.html',home)
    public=[{k:p[k] for k in ['title','date','category','tags','url']} for p in posts]
    for p in public:p['url']=base+p['url']
    write('assets/archive-data.js','window.ARCHIVE_POSTS = '+json.dumps(public,indent=2,ensure_ascii=False)+';\n')
    for name,title in PAGES.items():
        match=re.search(r'<section id="'+name+r'".*?</section>',source,re.S)
        if not match:raise ValueError(f'Missing panel {name}')
        panel=match.group().replace(' hidden','').replace('class="panel','class="panel standalone-panel')
        panel=panel.replace('<h2 id=','<h1 id=',1).replace('</h2>','</h1>',1)
        if name=='terminal':panel='<h1 class="standalone-intro">Interactive terminal</h1><noscript><p>The terminal needs JavaScript. Use the navigation above to explore every section.</p></noscript>'+panel
        panel=re.sub(r'\sdata-panel="[^"]*"','',panel)
        panel=re.sub(r'\sdata-open="[^"]*"','',panel)
        panel=re.sub(r'href="#(archive|about|terminal|research|contact)"',lambda m:'href="'+link(m[1]+'/')+'"',panel)
        panel=panel.replace('src="assets/','src="'+link('assets/')).replace('href="archive/"','href="'+link('archive/')+'"')
        panel=re.sub(r'<a([^>]*?)href="'+re.escape(link('archive/'))+r'"([^>]*?)data-category="([^"]+)"',lambda m:'<a'+m[1]+'href="'+link('archive/?category=')+m[3]+'"'+m[2],panel)
        if name=='archive':
            fallback='<div class="plain-archive" aria-label="All archived files">'+''.join(f'<a href="{base+p["url"]}"><span>{escape(p["title"])}</span><time datetime="{p["date"]}">{p["date"]}</time></a>' for p in posts)+'</div>'
            panel=panel.replace('</section>',fallback+'</section>')
        if name=='terminal':
            panel='<div class="terminal-desktop"><div class="terminal-titlebar"><span>Terminal</span><div class="window-actions"><a href="'+link('')+'" aria-label="Close terminal and return to room" title="Close">×</a><button id="expand-terminal" aria-label="Maximize terminal" aria-pressed="false" title="Toggle terminal size">□</button><a href="'+link('')+'" aria-label="Minimize terminal and return to room" title="Minimize">−</a></div></div>'+panel+'</div>'
        body='<main id="main-content" class="page-shell">'+nav(name)+panel+'</main>'
        scripts=['archive-data.js?v=htb-archive-1','archive-utils.js','archive-ui.js?v=htb-archive-1','contact.js?v=htb-badge-1','terminal-menus.js','terminal.js?v=wiki-subdomain-1','page.js?v=wiki-subdomain-1']
        write(name+'/index.html',doc(title,body,name+'/',scripts))
    for i,p in enumerate(posts):
        title=escape(p['title']);target=escape(p['source'],quote=True)
        heading=f'<div class="reader-heading"><p class="eyebrow">ARCHIVED FIELD NOTES / {escape(p["category"].upper())}</p><h1>{title}</h1><div class="reader-meta"><time datetime="{p["date"]}">ORIGINALLY PUBLISHED {p["date"]}</time><span>{escape(" · ".join(p["tags"]))}</span></div><p class="archive-notice">An original archive entry. Its publication date and source document are preserved.</p><div class="article-tools"><button class="button secondary" id="reader-save" aria-pressed="false">☆ Save file</button><button class="button secondary" id="copy-link">Copy article link</button><a class="button secondary" href="{link("archive/?category="+p["category"])}">More {escape(p["category"])} files →</a></div><p class="reader-status" id="reader-status" role="status" aria-live="polite"></p></div>'
        if p['kind']=='document':
            view=target.removesuffix('/preview')+'/view'
            article=f'<div class="document-toolbar"><span>ORIGINAL WRITEUP / GOOGLE DRIVE DOCUMENT</span><a class="text-link" href="{view}" target="_blank" rel="noopener noreferrer">Open document in a new tab ↗</a></div><iframe class="document-frame" src="{target}" title="{title} | original writeup" loading="lazy" allow="fullscreen" allowfullscreen></iframe><p class="document-fallback">If the document viewer is blocked or too small, <a href="{view}" target="_blank" rel="noopener noreferrer">open the original document</a>. This is the same hosted document used by the original website.</p>'
        else:
            host=escape(urlsplit(p['source']).netloc)
            article=f'<article class="source-card"><p class="eyebrow">ORIGINAL RESEARCH DESTINATION</p><h2>{title}</h2><p>The original site linked this entry to an external publication. The source below contains the research or proof of concept.</p><p>Published on <strong>{host}</strong>.</p><div class="action-row"><a class="button primary" href="{target}" target="_blank" rel="noopener noreferrer">Open original research ↗</a><a class="button secondary" href="https://nvd.nist.gov/vuln/detail/{title}" target="_blank" rel="noopener noreferrer">CVE record ↗</a></div></article>'
            if p['title'] in research:
                detail=research[p['title']]
                article=article.replace('<h2>'+title+'</h2>', '<h2>'+escape(detail['product'])+'</h2><p class="green">'+escape(detail['topic'])+'</p><p>'+escape(detail['summary'])+'</p>')
        adjacent='<nav class="reader-nav" aria-label="Adjacent archive entries">'
        for offset,label in [(-1,'NEWER FILE'),(1,'OLDER FILE')]:
            n=i+offset
            if 0<=n<len(posts):other=posts[n];adjacent+=f'<a href="{base+other["url"]}"><small>{label}</small>{escape(other["title"])}</a>'
            else:adjacent+=f'<a href="{link("archive/")}"><small>ARCHIVE</small>Browse all files →</a>'
        adjacent+='</nav>'
        body='<main id="main-content" class="reader-layout">'+nav('archive')+heading+article+adjacent+'</main>'
        write(p['url'],doc(p['title'],body,p['url'],['reader.js'],p['title']+' | original '+p['category']+' archive entry, published '+p['date']+'.'))
    for category in ['HackTheBox','CVEs']:
        destination=link('archive/?category='+category)
        redirect='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url='+destination+'"><title>Archive | TheCyberGeek</title></head><body><a href="'+destination+'">Open the archive</a></body></html>'
        write(category+'.html',redirect);write(category+'/index.html',redirect)
    body='<main id="main-content" class="page-shell">'+nav()+'<section class="panel standalone-panel"><p class="eyebrow">404 / SIGNAL LOST</p><h1>This path leads to a dead end.</h1><p>The file you’re looking for may be in the archive.</p><div class="action-row"><a class="button primary" href="'+link('archive/')+'">Search the archive →</a><a class="button secondary" href="'+link('')+'">Return to the room</a></div></section></main>'
    write('404.html',doc('Signal lost',body,'404.html'))
    paths=['']+[name+'/' for name in PAGES]+[p['url'].lstrip('/') for p in posts]
    write('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+escape(DOMAIN+link(path))+'</loc></url>' for path in paths)+'</urlset>')
    write('robots.txt','User-agent: *\nAllow: /\nSitemap: '+DOMAIN+link('sitemap.xml')+'\n')
    if preview:
        if base:raise ValueError('Local preview must use an empty base path')
        for name in [*PAGES,'walkthrough','challenge','poc','HackTheBox','CVEs']:
            if (out/name).is_dir():shutil.copytree(out/name,root/name,dirs_exist_ok=True)
        for name in ['404.html','HackTheBox.html','CVEs.html','sitemap.xml','robots.txt','assets/archive-data.js']:
            shutil.copy2(out/name,root/name)
    print(f'Built {len(posts)} original archive readers, {len(PAGES)} full pages, room, legacy routes, 404 and sitemap in {out}.')
    return posts

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--base-path',default='');parser.add_argument('--preview',action='store_true');args=parser.parse_args();build(base=args.base_path,preview=args.preview)
