"""Validate the generated archive before GitHub Pages can deploy it (stdlib only)."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse
import json
import re


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []
        self.ids = []
        self.heading_count = 0

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if 'id' in values:
            self.ids.append(values['id'])
        if tag == 'h1':
            self.heading_count += 1
        for key in ('src', 'href', 'poster'):
            if key in values:
                self.references.append(values[key])


def validate(root, base_path=''):
    root = Path(root).resolve()
    source = (root / 'assets/archive-data.js').read_text(encoding='utf-8')
    if source.startswith('---') or '{%' in source or '{{' in source:
        raise ValueError('Archive Liquid was not rendered by Jekyll')
    match = re.fullmatch(r'\s*window\.ARCHIVE_POSTS\s*=\s*(\[.*\]);\s*', source, re.S)
    if not match:
        raise ValueError('Invalid generated archive index')
    posts = json.loads(match.group(1))
    if not posts:
        raise ValueError('Refusing to deploy an empty archive')
    if len({p['url'] for p in posts}) != len(posts):
        raise ValueError('Duplicate archive permalinks')
    errors = []
    for post in posts:
        parsed = urlsplit(post['url'])
        if parsed.scheme or parsed.netloc:
            errors.append(f"Archive points outside the build: {post['url']}")
            continue
        path = unquote(parsed.path)
        if base_path and path.startswith(base_path.rstrip('/') + '/'):
            path = path[len(base_path.rstrip('/')):]
        article = root / path.lstrip('/')
        if article.is_dir():
            article /= 'index.html'
        if not article.is_file():
            errors.append(f'Missing article: {path}')
    for page in root.rglob('*.html'):
        parser = Links()
        parser.feed(page.read_text(encoding='utf-8'))
        if len(parser.ids) != len(set(parser.ids)):
            errors.append(f'{page.relative_to(root)}: duplicate IDs')
        if 'http-equiv="refresh"' not in page.read_text(encoding='utf-8') and parser.heading_count != 1:
            errors.append(f'{page.relative_to(root)}: expected one main heading')
        for ref in parser.references:
            parsed = urlsplit(ref)
            if not parsed.path and parsed.fragment and unquote(parsed.fragment) not in parser.ids:
                errors.append(f'{page.relative_to(root)}: missing anchor {ref}')
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            path = unquote(parsed.path)
            if base_path and path.startswith(base_path.rstrip('/') + '/'):
                path = path[len(base_path.rstrip('/')):]
            target = (root / path.lstrip('/')) if path.startswith('/') else (page.parent / path)
            if target.is_dir():
                target /= 'index.html'
            if not target.exists() and not target.with_suffix('.html').exists():
                errors.append(f'{page.relative_to(root)}: missing {ref}')
    if errors:
        raise ValueError('\n'.join(errors[:50]))
    print(f'Validated {len(posts)} archived articles and local references throughout the built site.')
    return len(posts)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', nargs='?', default='_site')
    parser.add_argument('--base-path', default='')
    args = parser.parse_args()
    validate(args.directory, args.base_path)
