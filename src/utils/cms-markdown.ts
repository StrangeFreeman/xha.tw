import { createMarkdownProcessor } from '@astrojs/markdown-remark'

const processor = await createMarkdownProcessor()

export async function renderCmsMarkdown(content: string) {
  if (!content.trim()) return ''
  return (await processor.render(content)).code
}
