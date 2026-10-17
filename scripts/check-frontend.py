"""Check the dependency-free frontend without a browser (stdlib only)."""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import subprocess
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.links = []
        self.resources = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'a' and 'href' in attrs:
            self.links.append(attrs['href'])
        if tag in {'script', 'img'} and 'src' in attrs:
            self.resources.append(attrs['src'])
        if tag == 'link' and 'href' in attrs:
            self.resources.append(attrs['href'])


document = Document()
document.feed((ROOT / 'index.html').read_text(encoding='utf-8'))
assert len(set(document.ids)) == len(document.ids), 'Duplicate document IDs'
for link in document.links:
    if link.startswith('#'):
        assert link[1:] in document.ids, f'Missing section: {link}'
for resource in document.resources:
    parsed = urlsplit(resource)
    if parsed.scheme or parsed.netloc:
        assert parsed.scheme == 'https' and parsed.netloc, f'Insecure external resource: {resource}'
        continue  # Remote badge images are checked by the browser, not as local files.
    assert (ROOT / parsed.path).is_file(), f'Missing resource: {resource}'
javascript = (ROOT / 'assets/site.js').read_text(encoding='utf-8')
for identifier in re.findall(r"\$\('#([\w-]+)'\)", javascript):
    assert identifier in document.ids, f'JS references missing element: {identifier}'
archive = (ROOT / 'assets/archive-data.js').read_text(encoding='utf-8')
posts = json.loads(archive.split('window.ARCHIVE_POSTS = ', 1)[1].rstrip().removesuffix(';'))
assert len({post['url'] for post in posts}) == len(posts), 'Duplicate preview URLs'
for post in posts:
    assert post['url'].startswith('/'), 'Archive must use a local reader'
    assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', post['date']), 'Invalid date'
for script in (ROOT / 'assets').glob('*.js'):
    subprocess.run(['node', '--check', str(script)], check=True)
print(f'Frontend valid: {len(document.ids)} unique IDs, all section anchors/resources, JS element references, and {len(posts)} archive entries.')
