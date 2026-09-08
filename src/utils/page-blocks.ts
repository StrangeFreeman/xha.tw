import type { CmsBlock } from '@/cms-config'

export function getBlockHeadings(blocks: CmsBlock[]) {
  return blocks.flatMap((block) => {
    if (!block.visible) return []

    const blockHeading =
      block.showHeading && block.showInToc && block.title
        ? [{ depth: 2, slug: block.id, text: block.title }]
        : []

    if (block.type !== 'project-grid' && block.type !== 'link-grid') return blockHeading

    const groupHeadings = block.groups.flatMap((group, index) =>
      group.visible && !group.collapsed
        ? [{ depth: 2, slug: `${block.id}-${index + 1}`, text: group.title }]
        : []
    )
    return [...blockHeading, ...groupHeadings]
  })
}
