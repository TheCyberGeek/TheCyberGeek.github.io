"""Check real archive preservation, complete output and deployment paths."""
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
def module(name,file):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/file)
    obj=importlib.util.module_from_spec(spec);spec.loader.exec_module(obj);return obj
builder=module('builder','build.py')
validate=module('validator','check-build.py').validate

class ArchiveBuildTests(unittest.TestCase):
    def test_wiki_is_external_and_old_page_is_removed(self):
        wiki='https://wiki.thecybergeek.co.uk/'
        home=(ROOT/'_site/index.html').read_text(encoding='utf-8')
        self.assertNotIn('<section id="guidelines"',home)
        self.assertIn('href="'+wiki+'"',home)
        self.assertFalse((ROOT/'_site/guidelines').exists())
        self.assertNotIn('guidelines',builder.PAGES)
        about=(ROOT/'_site/about/index.html').read_text(encoding='utf-8')
        self.assertIn('href="'+wiki+'"',about)
        sitemap=(ROOT/'_site/sitemap.xml').read_text(encoding='utf-8')
        self.assertNotIn('/guidelines/',sitemap)

    def test_complete_original_directory_and_sources(self):
        posts=builder.load_posts()
        self.assertEqual(len(posts),55)
        self.assertEqual(sum(p['kind']=='document' for p in posts),50)
        self.assertEqual(sum(p['kind']=='research' for p in posts),5)
        self.assertEqual({p['category'] for p in posts},{'HackTheBox','CVEs'})
        for p in posts:
            self.assertIn(p['source'],(ROOT/'_posts'/p['filename']).read_text(encoding='utf-8'))
            original=ROOT/'.archive-source/_posts'/p['filename']
            if original.exists():self.assertEqual(original.read_bytes(),(ROOT/'_posts'/p['filename']).read_bytes())

    def test_missing_archive_refuses_build(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as tmp:
            with self.assertRaisesRegex(ValueError,'missing'):builder.load_posts(Path(tmp))

    def test_out_of_scope_posts_are_not_published(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as tmp:
            root=Path(tmp)
            shutil.copytree(ROOT/'_posts',root/'_posts')
            (root/'_posts/2020-01-01-excluded.markdown').write_text(
                '---\ntitle: Excluded\ndate: 2020-01-01\ncategories: walkthrough OtherPlatform\n---\n'
                '<iframe src="https://example.com/excluded"></iframe>')
            self.assertEqual(len(builder.load_posts(root)),55)

    def test_every_reader_preserves_target_and_has_navigation(self):
        for post in builder.load_posts():
            page=(ROOT/'_site'/post['url'].lstrip('/')).read_text(encoding='utf-8')
            self.assertIn(post['source'],page)
            self.assertIn(post['date'],page)
            self.assertIn('reader-nav',page)
            self.assertNotIn('position:fixed',page)
            self.assertNotIn('http-equiv="refresh"',page)
        archive=(ROOT/'_site/archive/index.html').read_text(encoding='utf-8')
        self.assertEqual(archive.count('<time datetime='),55)

    def test_build_links_and_metadata(self):
        self.assertEqual(validate(ROOT/'_site'),55)
        self.assertTrue((ROOT/'_site/.nojekyll').exists())
        for name in builder.PAGES:self.assertTrue((ROOT/'_site'/name/'index.html').is_file())
        self.assertNotIn('{{',(ROOT/'_site/404.html').read_text(encoding='utf-8'))

    def test_project_subpath_complete_build(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as tmp:
            root=Path(tmp)
            for folder in ['assets','_posts','scripts']:shutil.copytree(ROOT/folder,root/folder)
            for file in ['index.html','CNAME','403.html','404.html']:shutil.copy2(ROOT/file,root/file)
            builder.build(root,base='/portfolio')
            self.assertEqual(validate(root/'_site','/portfolio'),55)
            data=(root/'_site/assets/archive-data.js').read_text()
            self.assertIn('/portfolio/walkthrough/',data)

    def test_validator_catches_missing_article_and_media(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as tmp:
            root=Path(tmp);(root/'assets').mkdir()
            (root/'assets/archive-data.js').write_text('window.ARCHIVE_POSTS = '+json.dumps([{'url':'/test.html'}])+';')
            with self.assertRaisesRegex(ValueError,'Missing article'):validate(root)
            (root/'test.html').write_text('<img src="/missing.png" alt="Screenshot">')
            with self.assertRaisesRegex(ValueError,'missing.png'):validate(root)

if __name__=='__main__':unittest.main()
