import type { CollectionEntry } from 'astro:content'
import { getCollection } from 'astro:content'

export type BlogEntry = CollectionEntry<'blog'>

export const prod = import.meta.env.PROD

export async function getBlogCollection(): Promise<BlogEntry[]> {
  return getCollection('blog', ({ data }) => (prod ? !data.draft : true))
}

export function sortMDByDate(collections: BlogEntry[]): BlogEntry[] {
  return [...collections].sort((a, b) => {
    const aDate = new Date(a.data.updatedDate ?? a.data.publishDate).valueOf()
    const bDate = new Date(b.data.updatedDate ?? b.data.publishDate).valueOf()
    return bDate - aDate
  })
}

export function groupCollectionsByYear(collections: BlogEntry[]): [number, BlogEntry[]][] {
  const grouped = collections.reduce((result, entry) => {
    const date = entry.data.updatedDate ?? entry.data.publishDate
    const year = new Date(date).getFullYear()
    const entries = result.get(year) ?? []
    entries.push(entry)
    result.set(year, entries)
    return result
  }, new Map<number, BlogEntry[]>())

  return [...grouped.entries()].sort((a, b) => b[0] - a[0])
}

export function getUniqueTags(collections: BlogEntry[]): string[] {
  return [...new Set(collections.flatMap(({ data }) => data.tags))]
}

export function getUniqueTagsWithCount(collections: BlogEntry[]): [string, number][] {
  const counts = collections
    .flatMap(({ data }) => data.tags)
    .reduce((result, tag) => result.set(tag, (result.get(tag) ?? 0) + 1), new Map<string, number>())

  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}
