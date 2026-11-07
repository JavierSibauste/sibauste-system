/* Match the published article; the cover belongs to the blog listing only. */
CMS.registerPreviewStyle('/preview.css');
CMS.registerPreviewTemplate('posts', function ArticlePreview({entry, widgetFor}) {
  const data = entry.get('data');
  const date = data.get('date');
  const timestamp = Date.parse(date);
  const formattedDate = Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric', timeZone:'UTC'})
    : '';
  return h('main', {}, h('article', {className:'article'},
    h('div', {className:'meta'}, ['Javier Sibauste', data.get('topic'), formattedDate].filter(Boolean).join(' · ')),
    h('h1', {}, data.get('title')),
    h('p', {className:'description'}, data.get('description')),
    h('div', {className:'prose'}, widgetFor('body'))
  ));
});
