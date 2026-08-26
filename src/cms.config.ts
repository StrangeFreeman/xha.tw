import { z } from 'astro/zod'

import aboutPage from './data/pages/about.json'
import blogPage from './data/pages/blog.json'
import docsPage from './data/pages/docs.json'
import homePage from './data/pages/home.json'
import linksPage from './data/pages/links.json'
import projectsPage from './data/pages/projects.json'
import siteData from './data/site.json'

const siteSchema = z.object({
  title: z.string().min(1).max(60),
  author: z.string().min(1).max(60),
  description: z.string().min(1).max(160),
  location: z.string().max(80),
  githubLabel: z.string().min(1).max(40),
  githubUrl: z.url(),
  sourceLabel: z.string().min(1).max(40),
  sourceUrl: z.url(),
  showSource: z.boolean(),
  avatarUrl: z
    .string()
    .nullish()
    .transform((value) => value ?? '')
})

const pageKeySchema = z.enum(['home', 'blog', 'projects', 'links', 'about', 'docs'])

const pageSchema = z.object({
  key: pageKeySchema,
  title: z.string().min(1).max(60),
  navigationLabel: z.string().min(1).max(30),
  path: z.string().startsWith('/'),
  navigationOrder: z.number().int(),
  enabled: z.boolean(),
  showInNavigation: z.boolean(),
  view: z.boolean(),
  comment: z.boolean(),
  description: z
    .string()
    .max(160)
    .nullish()
    .transform((value) => value ?? '')
})

export type PageKey = z.infer<typeof pageKeySchema>
export type CmsPage = z.infer<typeof pageSchema>

export const cmsSite = siteSchema.parse(siteData)

export const cmsPages = pageSchema
  .array()
  .parse([homePage, blogPage, docsPage, projectsPage, linksPage, aboutPage])

export const cmsPage = Object.fromEntries(cmsPages.map((page) => [page.key, page])) as Record<
  PageKey,
  CmsPage
>
