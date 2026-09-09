import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

import { previewBranch } from '../preview/pages-api.mjs'

const templates = new Map()
const components = new Map()
const h = (type, props, ...children) =>
  typeof type === 'function'
    ? type(props || {})
    : {
        type,
        props,
        children: children.flat(Infinity).filter((item) => item != null && item !== false)
      }
const window = {
  h,
  createClass: () => (props) => h('tabs', props),
  CMS: {
    registerPreviewTemplate: (name, component) => templates.set(name, component),
    registerPreviewStyle: () => {},
    registerEditorComponent: (component) => components.set(component.id, component),
    getWidget: () => ({ preview: ({ value }) => h('markdown', null, value) })
  }
}
const context = vm.createContext({ window, console })
for (const file of ['preview.js', 'blocks.js'])
  vm.runInContext(
    await readFile(new URL(`../public/admin/${file}`, import.meta.url), 'utf8'),
    context
  )
const content = (node) =>
  typeof node === 'object' ? (node?.children || []).map(content).join(' ') : String(node || '')
const render = (name, data) =>
  templates.get(name)({
    entry: { get: () => ({ toJS: () => data }) },
    widgetFor: () => h('article-body', null, 'Body')
  })

test('timeline preserves prepend and drag order, including non-date labels', () => {
  const events = [
    { date: '???', content: '未來精彩繼續' },
    { date: '2026.08.26', content: '成立網站' },
    { date: '2026.06.02', content: '起點' }
  ]
  events.unshift({ date: '新時間點', content: '新增內容' })
  const tree = window.XhaPreview.timeline(events)
  assert.deepEqual(
    tree.children.map((child) => content(child.children[0])),
    ['新時間點', '???', '2026.08.26', '2026.06.02']
  )
  events.unshift(events.pop())
  assert.equal(content(window.XhaPreview.timeline(events).children[0].children[0]), '2026.06.02')
})
test('page previews handle empty drafts, hidden blocks and heading visibility', () => {
  assert.match(content(render('about', { key: 'about', blocks: [] })), /尚無/)
  const result = content(
    render('about', {
      key: 'about',
      title: 'About',
      enabled: false,
      blocks: [
        {
          type: 'timeline',
          title: 'Hidden',
          visible: false,
          events: [{ date: 'secret', content: 'hidden event' }]
        },
        {
          type: 'timeline',
          title: 'No heading',
          showHeading: false,
          events: [{ date: '???', content: 'Visible event' }]
        }
      ]
    })
  )
  assert.match(result, /已停用/)
  assert.match(result, /Visible event/)
  assert.doesNotMatch(result, /Hidden|hidden event|No heading/)
  assert.match(content(window.XhaPreview.timeline([])), /尚未新增/)
})
test('blog and docs file/collection names do not collide', () => {
  assert.match(content(render('blog', { key: 'blog', title: 'Blog' })), /文章清單/)
  assert.match(content(render('blog', { title: 'New post' })), /Body/)
  assert.match(content(render('docs', { title: 'New doc' })), /Body/)
})
test('embedded timeline round-trips data and shares detailed preview', () => {
  const component = components.get('cms-timeline')
  const data = {
    events: [
      { date: '???', content: '引號 " 與 <標記>', link: 'https://example.test', linkLabel: 'More' }
    ]
  }
  const source = component.toBlock(data)
  assert.equal(
    JSON.stringify(component.fromBlock(source.match(component.pattern))),
    JSON.stringify(data)
  )
  assert.match(content(component.toPreview(data)), /引號/)
  assert.equal(component.fields.find((field) => field.name === 'events').add_to_top, true)
})
test('preview links reject executable URLs and cleanup only accepts numeric PR identifiers', () => {
  for (const url of [
    'javascript:alert(1)',
    'java\nscript:alert(1)',
    '//evil.test',
    'data:text/html,hi'
  ])
    assert.equal(window.XhaPreview.safeUrl(url), undefined)
  assert.equal(window.XhaPreview.safeUrl('/about'), '/about')
  assert.equal(previewBranch('123'), 'cms-pr-123')
  for (const value of ['../main', '0', '', '1;rm']) assert.throws(() => previewBranch(value))
})
