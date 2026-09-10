;(function registerContentBlocks() {
  const cms = window.CMS
  if (!cms) return

  const markdownItemFields = [
    { label: '標題', name: 'title', widget: 'string' },
    { label: '內容', name: 'content', widget: 'markdown', required: false }
  ]

  const definitions = [
    {
      id: 'cms-feature-cards',
      label: '圖文卡片（Feature Cards）',
      kind: 'feature-cards',
      fields: [
        {
          label: '卡片排列',
          name: 'layout',
          widget: 'select',
          default: 'stack',
          options: [
            { label: '直向寬卡片', value: 'stack' },
            { label: '雙欄卡片', value: 'grid' }
          ]
        },
        {
          label: '卡片',
          name: 'cards',
          widget: 'list',
          add_to_top: true,
          summary: '{{fields.title}}',
          hint: '新增卡片會放在最上方，可拖曳調整順序。',
          fields: [
            { label: '標題', name: 'title', widget: 'string' },
            { label: '副標題', name: 'subtitle', widget: 'string', required: false },
            { label: '日期或期間', name: 'date', widget: 'string', required: false },
            { label: '網址', name: 'href', widget: 'string', required: false },
            { label: '右側圖片或 Logo', name: 'logo', widget: 'image', required: false },
            {
              label: '顯示右側 Logo',
              name: 'showLogo',
              widget: 'boolean',
              default: true,
              required: false
            },
            { label: '內容', name: 'content', widget: 'markdown', required: false }
          ]
        }
      ]
    },
    {
      id: 'cms-aside',
      label: 'Aside',
      kind: 'aside',
      fields: [
        {
          label: '樣式',
          name: 'variant',
          widget: 'select',
          default: 'note',
          options: ['note', 'tip', 'caution', 'danger']
        },
        { label: '標題', name: 'title', widget: 'string', required: false },
        { label: '內容', name: 'content', widget: 'markdown', required: false }
      ]
    },
    {
      id: 'cms-collapse',
      label: 'Collapse',
      kind: 'collapse-list',
      fields: [
        {
          label: '收合項目',
          name: 'items',
          widget: 'list',
          min: 1,
          fields: markdownItemFields
        }
      ]
    },
    {
      id: 'cms-tabs',
      label: 'Tabs',
      kind: 'tabs',
      fields: [{ label: '分頁', name: 'tabs', widget: 'list', min: 1, fields: markdownItemFields }]
    },
    {
      id: 'cms-steps',
      label: 'Steps',
      kind: 'steps',
      fields: [{ label: '步驟', name: 'steps', widget: 'list', min: 1, fields: markdownItemFields }]
    },
    {
      id: 'cms-timeline',
      label: 'Timeline',
      kind: 'timeline',
      fields: [
        { label: '說明', name: 'description', widget: 'text', required: false },
        {
          label: '時間點',
          name: 'events',
          widget: 'list',
          add_to_top: true,
          hint: '新增時間點會放在最上方，可拖曳調整順序；日期也可填入「???」。',
          summary: '{{fields.date}} · {{fields.content}}',
          min: 1,
          fields: [
            { label: '日期', name: 'date', widget: 'string' },
            { label: '內容', name: 'content', widget: 'text' },
            { label: '相關網址', name: 'link', widget: 'string', required: false },
            { label: '連結文字', name: 'linkLabel', widget: 'string', required: false }
          ]
        }
      ]
    },
    {
      id: 'cms-signature',
      label: 'Signature',
      kind: 'signature',
      fields: [
        { label: '簽名 SVG', name: 'src', widget: 'file' },
        { label: '替代文字', name: 'alt', widget: 'string', default: 'xhA signature' },
        {
          label: '動畫模式',
          name: 'mode',
          widget: 'select',
          default: 'once-on-view',
          options: ['static', 'once-on-view', 'loop']
        },
        {
          label: '對齊',
          name: 'align',
          widget: 'select',
          default: 'right',
          options: ['left', 'center', 'right']
        },
        { label: '寬度（px）', name: 'width', widget: 'number', default: 160 },
        { label: '每筆間隔（ms）', name: 'drawDelay', widget: 'number', default: 200 },
        { label: '回收間隔（ms）', name: 'rollbackDelay', widget: 'number', default: 80 },
        { label: '循環停留（ms）', name: 'loopPause', widget: 'number', default: 2000 },
        { label: '單筆時間（ms）', name: 'defaultDuration', widget: 'number', default: 600 }
      ]
    },
    {
      id: 'cms-buttons',
      label: 'Buttons',
      kind: 'buttons',
      fields: [
        {
          label: '按鈕',
          name: 'buttons',
          widget: 'list',
          min: 1,
          fields: [
            { label: '文字', name: 'label', widget: 'string' },
            { label: '網址', name: 'href', widget: 'string' },
            {
              label: '樣式',
              name: 'variant',
              widget: 'select',
              default: 'primary',
              options: ['primary', 'secondary', 'outline']
            }
          ]
        }
      ]
    }
  ]

  function decode(match) {
    try {
      return JSON.parse(decodeURIComponent(match[1]))
    } catch (error) {
      console.warn('Could not decode CMS content block.', error)
      return {}
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  definitions.forEach((definition) => {
    cms.registerEditorComponent({
      id: definition.id,
      label: definition.label,
      fields: definition.fields,
      pattern: new RegExp(
        `<CmsBlock\\s+kind=["']${definition.kind}["']\\s+data=["']([^"']*)["']\\s*\\/>`
      ),
      fromBlock: decode,
      toBlock: (data) =>
        `<CmsBlock kind="${definition.kind}" data="${encodeURIComponent(JSON.stringify(data))}" />`,
      toPreview: (data) => {
        if (window.XhaPreview) {
          return window.XhaPreview.block({ ...data, type: definition.kind, showHeading: false })
        }
        const title = data.title || data.description || definition.label
        return `<div style="border:1px solid #d1d5db;border-radius:8px;padding:12px"><strong>${escapeHtml(definition.label)}</strong><div>${escapeHtml(title)}</div></div>`
      }
    })
  })
})()
