/* Use the same reading layout and margin animation as the published article. */
CMS.registerPreviewStyle('/preview.css');
CMS.registerPreviewStyle('/journal.css');
CMS.registerPreviewTemplate('posts', function ArticlePreview({entry, widgetFor, getAsset}) {
  const data = entry.get('data');
  const date = data.get('date');
  const timestamp = Date.parse(date);
  const formattedDate = Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric', timeZone:'UTC'})
    : '';
  const cover = data.get('cover');
  function preparePreview(node) {
    if (!node) return;
    const doc = node.ownerDocument;
    doc.body.classList.add('cms-preview');
    if (!doc.querySelector('script[data-blog-cables]')) {
      const script = doc.createElement('script');
      script.src = new URL('/cables.js', window.location.href).href;
      script.dataset.blogCables = 'true';
      doc.body.append(script);
    }
  }
  return h('main', {}, h('article', {className:'article', ref:preparePreview},
    cover ? h('img', {className:'article-cover', src:String(getAsset(cover)), alt:data.get('cover_alt') || ''}) : null,
    h('p', {className:'article-topic'}, data.get('topic')),
    h('h1', {}, data.get('title')),
    h('div', {className:'meta article-meta'}, ['Javier Sibauste', formattedDate].filter(Boolean).join(' · ')),
    h('div', {className:'prose'}, widgetFor('body'))
  ));
});
// Created by Sibauste System 💻
