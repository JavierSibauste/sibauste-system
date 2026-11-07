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
test('post paths and image descriptions are validated',()=>{
  assert.equal(validatePost({...post,cover:'uploads/blog/photo.png',cover_alt:'Project collage'},'note.json').cover,'/uploads/blog/photo.png');
  assert.throws(()=>validatePost(post,'../invalid.json'),/Invalid post filename/);
  assert.throws(()=>validatePost({...post,cover:'/uploads/blog/photo.png'},'note.json'),/cover image description/);
  assert.throws(()=>validatePost({...post,date:'not-a-date'},'note.json'),/invalid publication date/);
});
test('published posts generate crawlable pages and future posts stay out of the index and sitemap',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'sibauste-blog-test-'));
  try {
    const source=join(temporary,'posts');const output=join(temporary,'dist');await mkdir(source);
    await writeFile(join(source,'note.json'),JSON.stringify({...post,cover:'/uploads/blog/collage.png',cover_alt:'Project collage'}));
    await writeFile(join(source,'future.json'),JSON.stringify({...post,title:'Future note',date:'2099-01-01'}));
    assert.deepEqual(await buildBlog({contentDirectory:source,outputDirectory:output,now:new Date('2026-11-01')}),{published:1});
    const html=await readFile(join(output,'blog/articles/note/index.html'),'utf8');
    assert.match(html,/<h2>Finding<\/h2>/);assert.match(html,/<strong>content<\/strong>/);assert.match(html,/BlogPosting/);
    assert.doesNotMatch(html, /class="cover"/);
    assert.match(await readFile(join(output,'blog/index.html'),'utf8'), /<img src="\/uploads\/blog\/collage.png"/);
    assert.doesNotMatch(await readFile(join(output,'sitemap.xml'),'utf8'),/future/);
    assert.doesNotMatch(await readFile(join(output,'blog/index.html'),'utf8'),/Future note/);
  } finally {await rm(temporary,{recursive:true,force:true});}
});
