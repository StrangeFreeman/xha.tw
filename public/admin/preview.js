;(function registerPreviews() {
  const cms = window.CMS
  const h = window.h
  if (!cms || !h) return

  const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : [])
  const visible = (value) => list(value).filter((item) => item.visible !== false)
  const note = (text) => h('p', { className: 'preview-note' }, text)
  const text = (value) => h('p', { className: 'preview-text' }, value || '')

  function safeUrl(value, image = false) {
    if (!value) return undefined
    const url = String(value).trim()
    if (/^[\u0000-\u0020]*javascript:/i.test(url) || /[\u0000-\u001f]/.test(url)) return undefined
    if (/^(https?:\/\/|\/[^/]|#|\.\.?\/)/i.test(url)) return url
    if (!image && /^(mailto:|tel:)/i.test(url)) return url
    if (image && /^blob:/i.test(url)) return url
    return undefined
  }

  function link(label, href, className) {
    const url = safeUrl(href)
    return url
      ? h(
          'a',
          { href: url, className, target: '_blank', rel: 'noopener noreferrer' },
          label || 'More'
        )
      : h('span', { className }, label || '')
  }

  function picture(src, alt, context) {
    if (!src) return null
    const asset = context.getAsset ? context.getAsset(src) : src
    const url = safeUrl(asset?.toString(), true)
    return url ? h('img', { src: url, alt: alt || '', loading: 'lazy' }) : null
  }

  function markdown(value, context) {
    if (!value) return null
    // Reuse Decap's Markdown renderer and sanitization, including editor components.
    const preview = cms.getWidget('markdown')?.preview
    return preview
      ? h(preview, {
          value,
          getAsset: context.getAsset || ((path) => path),
          resolveWidget: (name) => cms.getWidget(name)
        })
      : text(value)
  }

  function timeline(events) {
    const items = list(events)
    if (!items.length) return note('尚未新增時間點。按「Add 時間點」後，新項目會出現在最上方。')
    return h(
      'ol',
      { className: 'preview-timeline' },
      items.map((event, index) =>
        h(
          'li',
          { key: index },
          h('span', { className: 'preview-date' }, event.date || '日期待填'),
          h(
            'div',
            { className: 'preview-event' },
            h('span', { className: 'preview-text' }, event.content || '內容待填'),
            event.link && link(event.linkLabel || 'More', event.link)
          )
        )
      )
    )
  }

  const TabsPreview = window.createClass({
    getInitialState() {
      return { active: 0 }
    },
    render() {
      const tabs = list(this.props.tabs)
      if (!tabs.length) return note('尚未新增分頁。')
      const active = Math.min(this.state.active, tabs.length - 1)
      return h(
        'div',
        { className: 'preview-tabs' },
        h(
          'div',
          { role: 'tablist', 'aria-label': '內容分頁' },
          tabs.map((tab, index) =>
            h(
              'button',
              {
                key: index,
                type: 'button',
                role: 'tab',
                'aria-selected': index === active,
                onClick: () => this.setState({ active: index })
              },
              tab.title || `分頁 ${index + 1}`
            )
          )
        ),
        h('div', { role: 'tabpanel' }, markdown(tabs[active].content, this.props.context))
      )
    }
  })

  function blockContent(block, context) {
    const md = (value) => markdown(value, context)
    const buttons = (items) =>
      h(
        'div',
        { className: 'preview-buttons' },
        list(items).map((button, index) =>
          h('span', { key: index }, link(button.label, button.href, 'preview-button'))
        )
      )
    const cards = (items, render) =>
      h(
        'div',
        { className: 'preview-grid' },
        list(items).map((item, index) =>
          h('div', { className: 'preview-card', key: index }, render(item))
        )
      )
    switch (block.type) {
      case 'timeline':
        return h('div', null, text(block.description), timeline(block.events))
      case 'link-history':
        return timeline(
          list(block.events).map((event) => ({
            date: event.date,
            content: `${event.name || ''} — ${event.status || ''}${event.content ? `: ${event.content}` : ''}`
          }))
        )
      case 'rich-text':
        return h(
          'div',
          null,
          md(block.content),
          block.buttonLabel && link(block.buttonLabel, block.buttonUrl, 'preview-button')
        )
      case 'aside':
        return h(
          'aside',
          { className: `preview-aside preview-aside-${block.variant || 'note'}` },
          md(block.content)
        )
      case 'collapse-list':
        return list(block.items).map((item, index) =>
          h(
            'details',
            { key: index },
            h('summary', null, item.title || '標題待填'),
            md(item.content)
          )
        )
      case 'tabs':
        return h(TabsPreview, { tabs: block.tabs, context })
      case 'steps':
        return h(
          'ol',
          { className: 'preview-steps' },
          list(block.steps).map((item, index) =>
            h('li', { key: index }, h('h3', null, item.title), md(item.content))
          )
        )
      case 'buttons':
        return buttons(block.buttons)
      case 'card-list':
      case 'feature-cards':
        return h(
          'div',
          { className: `resume-cards${block.layout === 'grid' ? ' resume-cards-grid' : ''}` },
          list(block.cards).map((card, index) => {
            const asset = card.logo && (context.getAsset ? context.getAsset(card.logo) : card.logo)
            const logo = card.showLogo !== false && safeUrl(asset?.toString(), true)
            return h(
              'article',
              { key: index, className: `resume-card${logo ? ' resume-card-with-logo' : ''}` },
              logo &&
                h('img', {
                  className: 'resume-card-logo',
                  src: logo,
                  alt: '',
                  'aria-hidden': true
                }),
              h(
                'div',
                { className: 'resume-card-copy' },
                h(
                  'h3',
                  { className: 'resume-card-title' },
                  card.href ? link(card.title, card.href) : card.title
                ),
                card.subtitle && h('p', { className: 'resume-card-subtitle' }, card.subtitle),
                card.content && h('div', { className: 'resume-card-body' }, md(card.content)),
                card.date && h('p', { className: 'resume-card-date' }, card.date)
              )
            )
          })
        )
      case 'website-cards':
        return cards(block.cards, (card) =>
          h(
            'div',
            null,
            picture(card.image, card.title, context),
            h('h3', null, link(card.title, card.href)),
            text(card.description)
          )
        )
      case 'skill-groups':
        return visible(block.groups).map((group, index) =>
          h(
            'div',
            { key: index },
            h('h3', null, group.title),
            h(
              'div',
              { className: 'preview-buttons' },
              list(group.skills).map((skill, i) =>
                h('span', { className: 'preview-pill', key: i }, String(skill))
              )
            )
          )
        )
      case 'tool-grid':
      case 'project-grid':
      case 'link-grid':
        return h(
          'div',
          null,
          text(block.description),
          visible(block.groups).map((group, index) => {
            const items = visible(group.tools || group.projects || group.links)
            const content = h(
              'div',
              null,
              text(group.description),
              cards(items, (item) =>
                h(
                  'div',
                  null,
                  picture(item.icon || item.image || item.avatar, item.name, context),
                  h('h4', null, link(item.name, item.href || item.link)),
                  text(item.description || item.intro),
                  buttons(
                    list(item.links).map((entry) => ({ label: entry.type, href: entry.href }))
                  )
                )
              )
            )
            return group.collapsed
              ? h('details', { key: index }, h('summary', null, group.title), content)
              : h('section', { key: index }, h('h3', null, group.title), content)
          })
        )
      case 'signature':
        return h(
          'div',
          { className: 'preview-signature', style: { textAlign: block.align || 'right' } },
          h(
            'div',
            {
              style: {
                display: 'inline-block',
                width: `${Number(block.width) || 160}px`,
                maxWidth: '100%'
              }
            },
            picture(block.src, block.alt, context)
          ),
          note('簽名為靜態預覽；動畫請開啟草稿網站確認。')
        )
      case 'apply-links':
        return h(
          'div',
          null,
          md(block.content),
          block.pullRequestUrl && link('Open Pull Request', block.pullRequestUrl, 'preview-button')
        )
      case 'latest-posts':
        return h(
          'div',
          null,
          note(`最新 ${block.limit || 10} 篇文章會在網站建置後載入；請在草稿網站確認。`),
          block.buttonLabel && link(block.buttonLabel, block.buttonUrl, 'preview-button')
        )
      default:
        return note(`此區塊尚無即時預覽：${block.type || '請選擇區塊類型'}`)
    }
  }

  function block(value, context = {}) {
    if (!value || value.visible === false) return null
    return h(
      'section',
      { className: 'preview-block', 'data-block-type': value.type },
      value.showHeading !== false && value.title && h('h2', { id: value.id }, value.title),
      blockContent(value, context)
    )
  }

  function EntryPreview(props) {
    const data = props.entry.get('data').toJS()
    const isPage = Boolean(data.key)
    const isArticle = !isPage && ['blog', 'docs'].includes(props.previewName)
    const blocks = visible(data.blocks)
    const headings = blocks.filter(
      (item) => item.showInToc !== false && item.showHeading !== false && item.title
    )
    return h(
      'main',
      { className: 'xha-preview' },
      h('div', { className: 'preview-banner' }, '即時預覽 · 包含尚未儲存的修改'),
      h('h1', null, data.title || '標題待填'),
      isPage && data.enabled === false && note('此頁面已停用，正式網站不會開放。'),
      data.description && text(data.description),
      headings.length > 0 &&
        h(
          'nav',
          { className: 'preview-toc', 'aria-label': '頁面目錄' },
          h('strong', null, '本頁內容'),
          headings.map((item, index) =>
            h('a', { key: index, href: `#${item.id}`, target: '_self' }, item.title)
          )
        ),
      isPage &&
        (blocks.length
          ? blocks.map((value, index) => h('div', { key: value.id || index }, block(value, props)))
          : note(
              ['blog', 'docs'].includes(data.key)
                ? '文章清單會在網站建置後載入，請開啟草稿網站確認。'
                : '尚無可顯示的內容區塊。'
            )),
      isArticle &&
        h(
          'article',
          null,
          data.draft && note('此文章標記為草稿。'),
          picture(data.heroImage?.src, data.heroImage?.alt, props),
          props.widgetFor('body')
        ),
      !isPage &&
        !isArticle &&
        h(
          'div',
          null,
          picture(data.avatarUrl, data.author, props),
          h('h2', null, data.author),
          text(data.location),
          link(data.githubLabel, data.githubUrl)
        )
    )
  }

  window.XhaPreview = { block, timeline, safeUrl }
  cms.registerPreviewStyle('/admin/preview.css')
  cms.registerPreviewStyle('/styles/resume-cards.css')
  // File names blog/docs also name folder collections; inspect entry data in the shared template.
  ;['site', 'home', 'blog', 'docs', 'projects', 'links', 'about'].forEach((name) =>
    cms.registerPreviewTemplate(name, (props) => h(EntryPreview, { ...props, previewName: name }))
  )
})()
