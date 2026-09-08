import { z } from 'astro/zod'

import signatureData from './data/about-signature.json'
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

const signatureSchema = z.object({
  enabled: z.boolean(),
  title: z.string().min(1).max(80),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  order: z.number().int(),
  showHeading: z.boolean(),
  src: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  alt: z.string().max(120),
  mode: z.enum(['static', 'once-on-view', 'loop']),
  align: z.enum(['left', 'center', 'right']),
  width: z.number().int().min(80).max(640),
  drawDelay: z.number().int().min(0).max(5000),
  rollbackDelay: z.number().int().min(0).max(5000),
  loopPause: z.number().int().min(0).max(30000),
  defaultDuration: z.number().int().min(50).max(10000)
})

export type PageKey = z.infer<typeof pageKeySchema>
export type CmsPage = z.infer<typeof pageSchema>

export const cmsSite = siteSchema.parse(siteData)
export const cmsSignature = signatureSchema.parse(signatureData)

export const cmsPages = pageSchema
  .array()
  .parse([homePage, blogPage, docsPage, projectsPage, linksPage, aboutPage])

export const cmsPage = Object.fromEntries(cmsPages.map((page) => [page.key, page])) as Record<
  PageKey,
  CmsPage
>
