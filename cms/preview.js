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
  const articleImage = data.get('article_image');
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
    articleImage ? h('img', {className:'article-cover', src:String(getAsset(articleImage)), alt:data.get('article_image_alt') || ''}) : null,
    h('p', {className:'article-topic'}, data.get('topic')),
    h('h1', {}, data.get('title')),
    h('div', {className:'meta article-meta'}, ['Javier Sibauste', formattedDate].filter(Boolean).join(' · ')),
    h('div', {className:'prose'}, widgetFor('body'))
  ));
});

// Keep ordinary Markdown images editable while storing explicit sizes as safe HTML.
CMS.registerEditorComponent({
  id: 'image', label: 'Image',
  fields: [
    {name:'image', label:'Image', widget:'image'},
    {name:'alt', label:'Image description', widget:'string', required:false},
    {name:'title', label:'Title', widget:'string', required:false},
    {name:'size', label:'Display size', widget:'select', default:'small', options:[
      {label:'Small (product pictures)',value:'small'},
      {label:'Medium (regular photos)',value:'medium'},
      {label:'Full article width (diagrams and guides)',value:'full'}
    ]}
  ],
  pattern: /^(?:!\[(.*?)\]\((\S+?)(?:\s+"(.*?)")?\)|<img\s+src="([^"]*)"\s+alt="([^"]*)"\s+title="([^"]*)"\s+data-image-size="(small|medium|full)"\s*\/?>)$/,
  fromBlock: match => ({image:match[4] || match[2], alt:match[5] ?? match[1] ?? '', title:match[6] ?? match[3] ?? '', size:match[7] || 'small'}),
  toBlock: data => imageMarkup(data),
  toPreview: (data, getAsset) => imageMarkup({...data,image:String(getAsset(data.image))})
});
function imageMarkup(data) {
  const escape = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const size = ['small','medium','full'].includes(data.size) ? data.size : 'small';
  return '<img src="'+escape(data.image)+'" alt="'+escape(data.alt)+'" title="'+escape(data.title)+'" data-image-size="'+size+'">';
}

// Created by Sibauste System 💻
