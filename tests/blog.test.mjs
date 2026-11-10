import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { articleHtml, validatePost, buildBlog } from '../scripts/build-blog.mjs';

const post = {title:'A technical note',date:'2026-01-01T12:00:00Z',topic:'IT',description:'A useful summary',body:'## Finding\n\nReadable **content**.'};
test('unsafe Markdown cannot execute scripts or inject event handlers',()=>{
  const rendered=articleHtml('<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[click](javascript:alert(1))');
  assert.doesNotMatch(rendered, /<script|onerror|javascript:/i);
});
test('article images use site-root media paths without changing external URLs or captions',()=>{
  const html=articleHtml('![Product](uploads/blog/bottle.png "Product title")\n\n![Existing](/uploads/blog/existing.png)\n\n![External](https://example.com/image.png)');
  assert.match(html, /src="\/uploads\/blog\/bottle.png"/);
  assert.match(html, /alt="Product" title="Product title"/);
  assert.match(html, /src="\/uploads\/blog\/existing.png"/);
  assert.match(html, /src="https:\/\/example.com\/image.png"/);
  assert.doesNotMatch(html, /src="uploads\//);
});

test('post paths and image descriptions are validated',()=>{
  assert.equal(validatePost(post,'what-i’ve-learned.json').slug,'what-ive-learned');
  assert.equal(validatePost({...post,cover:'uploads/blog/photo.png',cover_alt:'Project collage'},'note.json').cover,'/uploads/blog/photo.png');
  assert.throws(()=>validatePost(post,'../invalid.json'),/Invalid post filename/);
  assert.throws(()=>validatePost({...post,cover:'/uploads/blog/photo.png'},'note.json'),/cover image description/);
  assert.throws(()=>validatePost({...post,article_image:'/uploads/blog/inside.png'},'note.json'),/article image description/);
  assert.throws(()=>validatePost({...post,article_image:'https://example.com/image.png',article_image_alt:'Image'},'note.json'),/article_image must/);
  assert.throws(()=>validatePost({...post,date:'not-a-date'},'note.json'),/invalid publication date/);
});
test('published posts generate crawlable pages and future posts stay out of the index and sitemap',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'sibauste-blog-test-'));
  try {
    const source=join(temporary,'posts');const output=join(temporary,'dist');await mkdir(source);
    await writeFile(join(source,'note.json'),JSON.stringify({...post,cover:'/uploads/blog/collage.png',cover_alt:'Project collage',article_image:'uploads/blog/inside.png',article_image_alt:'Inside the article'}));
    await writeFile(join(source,'future.json'),JSON.stringify({...post,title:'Future note',date:'2099-01-01'}));
    assert.deepEqual(await buildBlog({contentDirectory:source,outputDirectory:output,now:new Date('2026-11-01')}),{published:1});
    const html=await readFile(join(output,'blog/articles/note/index.html'),'utf8');
    assert.match(html,/<h2>Finding<\/h2>/);assert.match(html,/<strong>content<\/strong>/);assert.match(html,/BlogPosting/);
    assert.match(html, /class="article-cover" src="\/uploads\/blog\/inside.png"/);
    assert.doesNotMatch(html.split('<body>')[1], /collage.png/);
    assert.match(html, /src="\/blog\/cables.js"/);
    assert.doesNotMatch(html.split('<body>')[1], /A useful summary/);
    assert.match(html, /<meta name="description" content="A useful summary">/);
    assert.match(await readFile(join(output,'blog/index.html'),'utf8'), /<p>A useful summary<\/p>/);
    assert.match(await readFile(join(output,'blog/index.html'),'utf8'), /<img src="\/uploads\/blog\/collage.png"/);
    assert.doesNotMatch(await readFile(join(output,'blog/index.html'),'utf8'),/inside.png/);
    await writeFile(join(source,'note.json'),JSON.stringify({...post,cover:'/uploads/blog/collage.png',cover_alt:'Project collage'}));
    await buildBlog({contentDirectory:source,outputDirectory:output,now:new Date('2026-11-01')});
    assert.doesNotMatch(await readFile(join(output,'blog/articles/note/index.html'),'utf8'),/class="article-cover"/);
    assert.doesNotMatch(await readFile(join(output,'sitemap.xml'),'utf8'),/future/);
    assert.doesNotMatch(await readFile(join(output,'blog/index.html'),'utf8'),/Future note/);
  } finally {await rm(temporary,{recursive:true,force:true});}
});

test('inline image sizes preserve defaults and only allow supported choices',()=>{
  const html=articleHtml('<img src="uploads/blog/diagram.png" data-image-size="full" onerror="bad()">\n\n<img src="/uploads/blog/photo.png" data-image-size="medium">\n\n![Legacy](/uploads/blog/product.png)\n\n<img src="/uploads/blog/x.png" data-image-size="invalid">');
  assert.match(html,/src="\/uploads\/blog\/diagram.png" data-image-size="full"/);
  assert.match(html,/data-image-size="medium"/);
  assert.equal((html.match(/data-image-size="small"/g)||[]).length,2);
  assert.doesNotMatch(html,/onerror|invalid/);
});
