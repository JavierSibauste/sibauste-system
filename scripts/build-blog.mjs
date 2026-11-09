import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const domain = 'https://sibaustesystem.com';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

/** Validate author content before it can enter HTML, URLs or search metadata. */
export function validatePost(value, filename) {
  const sourceSlug = basename(filename, '.json');
  const slug = sourceSlug.replace(/['’]/g, '');
  if (filename !== `${sourceSlug}.json` || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new TypeError(`Invalid post filename: ${filename}; use lowercase words separated by hyphens`);
  for (const field of ['title', 'date', 'topic', 'description', 'body']) {
    if (typeof value[field] !== 'string' || !value[field].trim()) throw new TypeError(`${filename}: ${field} must be nonempty text`);
  }
  if (!Number.isFinite(Date.parse(value.date))) throw new TypeError(`${filename}: invalid publication date ${value.date}`);
  for (const [field, label] of [['cover', 'cover'], ['article_image', 'article']]) {
    if (value[field] != null && typeof value[field] !== 'string') throw new TypeError(`${filename}: ${label} image must be a path`);
    if (value[field]?.startsWith('uploads/blog/')) value = {...value, [field]: '/' + value[field]};
    if (value[field] && !/^\/uploads\/blog\/[a-z0-9_./% -]+$/i.test(value[field])) throw new TypeError(`${filename}: ${field} must be an image under /uploads/blog/`);
    if (value[field] && (typeof value[field + '_alt'] !== 'string' || !value[field + '_alt'].trim())) throw new TypeError(`${filename}: add a ${label} image description`);
  }
  return {...value, slug};
}

/** Render Markdown with unsafe HTML, script URLs and embedded frames removed. */
export function articleHtml(markdown) {
  return sanitizeHtml(marked.parse(markdown), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
    allowedAttributes: {...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt', 'title', 'width', 'height', 'loading']},
    // Decap uses relative media paths for draft previews; published articles need root-relative URLs.
    transformTags: {
      img: (tagName, attributes) => ({tagName, attribs: {
        ...attributes,
        ...(attributes.src?.startsWith('uploads/blog/') ? {src: '/' + attributes.src} : {})
      }})
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowProtocolRelative: false
  });
}

function page({title, description, path, content, article}) {
  const structured = article ? { '@context':'https://schema.org', '@type':'BlogPosting', headline:article.title, description:article.description, datePublished:article.date, author:{'@type':'Person',name:'Javier Sibauste',url:domain}, mainEntityOfPage:domain + path, ...(article.cover ? {image:domain + article.cover} : {}) } : {'@context':'https://schema.org','@type':'Blog',name:'Javier Sibauste’s blog',url:domain + '/blog/',author:{'@type':'Person',name:'Javier Sibauste'}};
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} | Sibauste Systems</title><meta name="description" content="${escape(description)}"><meta name="theme-color" content="#06130d"><link rel="canonical" href="${domain}${path}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${domain}${path}"><meta property="og:type" content="${article ? 'article' : 'website'}">${article?.cover ? `<meta property="og:image" content="${domain}${escape(article.cover)}">` : ''}<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="stylesheet" href="/blog/blog.css"><link rel="stylesheet" href="/blog/journal.css"><script defer src="/blog/cables.js"></script><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Marcellus&display=swap" rel="stylesheet"><link rel="alternate" type="application/rss+xml" title="Javier Sibauste’s blog" href="/blog/feed.xml"><script type="application/ld+json">${JSON.stringify(structured).replace(/</g,'\\u003c')}</script></head><body><a class="skip" href="#main">Skip to content</a><header><a href="/" aria-label="Sibauste Systems home"><img src="/assets/sibauste-systems-logo-transparent-v2.png" alt="Sibauste Systems"></a><nav aria-label="Main navigation"><a href="/#services">Services</a><a href="/blog/" aria-current="${article ? 'false' : 'page'}">Blog</a><a href="/#contact">Contact Javier</a></nav></header><main id="main">${content}</main><footer><span>Javier Sibauste · Sibauste Systems</span><a href="/#contact">Get in touch</a><span>Created by Sibauste System 💻</span></footer></body></html>`;
}

/** Build crawlable article pages from published JSON files committed by Decap. Draft branches are not deployed. */
export async function buildBlog({contentDirectory = resolve(root,'content/posts'), outputDirectory = resolve(root,'dist'), now = new Date()} = {}) {
  const files = (await readdir(contentDirectory)).filter(file => file.endsWith('.json'));
  const allPosts = await Promise.all(files.map(async file => validatePost(JSON.parse(await readFile(resolve(contentDirectory,file),'utf8')),file)));
  const posts = allPosts.filter(post => Date.parse(post.date) <= now.getTime()).sort((a,b) => Date.parse(b.date)-Date.parse(a.date));
  await mkdir(resolve(outputDirectory,'blog'),{recursive:true});
  const metadata = post => `${escape(post.topic)} · ${new Date(post.date).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'})}`;
  const postPath = post => `/blog/articles/${post.slug}/`;
  const rows = posts.map(post => `<article class="post-row" data-search="${escape(`${post.title} ${post.topic} ${post.description}`.toLowerCase())}">${post.cover ? `<img src="${escape(post.cover)}" alt="${escape(post.cover_alt)}" loading="lazy">` : ''}<div><div class="meta">${metadata(post)}</div><h2><a href="${postPath(post)}">${escape(post.title)}</a></h2><p>${escape(post.description)}</p><a href="${postPath(post)}">Read article</a></div></article>`).join('');
  const search = posts.length ? `<form class="search" role="search" onsubmit="return false"><label for="search">Find an article</label><input id="search" type="search" placeholder="Search titles and topics"></form>` : '';
  const empty = `<section class="empty"><h2>The first post is on its way.</h2><p>In the meantime, explore my <a href="/#portfolio">project work</a> or <a href="/#contact">get in touch</a>.</p></section>`;
  const filter = posts.length ? `<p id="no-results" hidden>No articles match your search.</p><script>document.getElementById('search').addEventListener('input',function(){const query=this.value.trim().toLowerCase();let visible=0;document.querySelectorAll('[data-search]').forEach(row=>{row.hidden=!row.dataset.search.includes(query);if(!row.hidden)visible++});document.getElementById('no-results').hidden=visible>0});</script>` : '';
  await writeFile(resolve(outputDirectory,'blog/index.html'),page({title:'Javier’s blog',description:'Personal notes by Javier Sibauste on IT, technology companies and the systems behind digital business.',path:'/blog/',content:`<section class="intro"><h1>Javier’s blog</h1><p>My perspective on IT, technology companies and the systems behind digital business.</p></section>${search}<div class="post-list">${rows || empty}</div>${filter}`}));
  for (const post of posts) {
    const target = resolve(outputDirectory,'blog/articles',post.slug);
    await mkdir(target,{recursive:true});
    await writeFile(resolve(target,'index.html'),page({title:post.title,description:post.description,path:postPath(post),article:post,content:`<article class="article"><a class="back" href="/blog/">Back to the blog</a>${post.article_image ? `<img class="article-cover" src="${escape(post.article_image)}" alt="${escape(post.article_image_alt)}" width="460" fetchpriority="high">` : ''}<p class="article-topic">${escape(post.topic)}</p><h1>${escape(post.title)}</h1><div class="meta article-meta">Javier Sibauste · ${new Date(post.date).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'})}</div><div class="prose">${articleHtml(post.body)}</div></article>`}));
  }
  await writeFile(resolve(outputDirectory,'blog/feed.xml'),`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Javier Sibauste’s blog</title><link>${domain}/blog/</link><description>Personal notes on IT and technology</description>${posts.map(post=>`<item><title>${escape(post.title)}</title><link>${domain}${postPath(post)}</link><guid>${domain}${postPath(post)}</guid><pubDate>${new Date(post.date).toUTCString()}</pubDate><description>${escape(post.description)}</description></item>`).join('')}</channel></rss>`);
  await writeFile(resolve(outputDirectory,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/','/blog/',...posts.map(postPath)].map(path=>`<url><loc>${domain}${path}</loc></url>`).join('')}</urlset>`);
  return {published:posts.length};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await buildBlog()));
