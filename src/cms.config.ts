import { z } from 'astro/zod'

import aboutPage from './data/pages/about.json'
import blogPage from './data/pages/blog.json'
import docsPage from './data/pages/docs.json'
import homePage from './data/pages/home.json'
import linksPage from './data/pages/links.json'
import projectsPage from './data/pages/projects.json'
import siteData from './data/site.json'

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([schema, z.literal(''), z.null()])
    .optional()
    .transform((value) => value || undefined)

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

const blockBase = {
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().max(80).default(''),
  visible: z.boolean().default(true),
  showHeading: z.boolean().default(true),
  showInToc: z.boolean().default(true)
}

const markdownItem = z.object({
  title: z.string().min(1).max(80),
  content: z.string().default('')
})

const pageBlockSchema = z.discriminatedUnion('type', [
  z.object({
    ...blockBase,
    type: z.literal('rich-text'),
    content: z.string().default(''),
    buttonLabel: z.string().max(40).default(''),
    buttonUrl: z.string().default('')
  }),
  z.object({
    ...blockBase,
    type: z.literal(['card-list', 'feature-cards']),
    layout: z.enum(['stack', 'grid']).default('stack'),
    cards: z
      .array(
        z.object({
          title: z.string().min(1).max(80),
          subtitle: z.string().max(160).default(''),
          date: z.string().max(80).default(''),
          href: z.string().default(''),
          logo: z
            .string()
            .nullish()
            .transform((value) => value ?? ''),
          showLogo: z.boolean().default(true),
          content: z.string().default('')
        })
      )
      .default([])
  }),
  z.object({
    ...blockBase,
    type: z.literal('collapse-list'),
    items: z.array(markdownItem).default([])
  }),
  z.object({
    ...blockBase,
    type: z.literal('aside'),
    variant: z.enum(['note', 'tip', 'caution', 'danger']).default('note'),
    content: z.string().default('')
  }),
  z.object({ ...blockBase, type: z.literal('tabs'), tabs: z.array(markdownItem).default([]) }),
  z.object({ ...blockBase, type: z.literal('steps'), steps: z.array(markdownItem).default([]) }),
  z.object({
    ...blockBase,
    type: z.literal('timeline'),
    description: z.string().max(240).default(''),
    events: z
      .array(
        z.object({
          date: z.string().min(1).max(80),
          content: z.string().min(1).max(240),
          link: emptyToUndefined(z.url()),
          linkLabel: z.string().max(80).default('')
        })
      )
      .default([])
  }),
  z.object({
    ...blockBase,
    type: z.literal('signature'),
    src: z.string().default(''),
    alt: z.string().max(120).default('Signature'),
    mode: z.enum(['static', 'once-on-view', 'loop']).default('once-on-view'),
    align: z.enum(['left', 'center', 'right']).default('right'),
    width: z.number().int().min(80).max(640).default(160),
    drawDelay: z.number().int().min(0).max(5000).default(200),
    rollbackDelay: z.number().int().min(0).max(5000).default(80),
    loopPause: z.number().int().min(0).max(30000).default(2000),
    defaultDuration: z.number().int().min(50).max(10000).default(600)
  }),
  z.object({
    ...blockBase,
    type: z.literal('buttons'),
    buttons: z
      .array(
        z.object({
          label: z.string().min(1).max(40),
          href: z.string().min(1),
          variant: z.enum(['primary', 'secondary', 'outline']).default('primary')
        })
      )
      .default([])
  }),
  z.object({
    ...blockBase,
    type: z.literal('latest-posts'),
    limit: z.number().int().min(1).max(20).default(10),
    buttonLabel: z.string().max(40).default(''),
    buttonUrl: z.string().default('')
  }),
  z.object({
    ...blockBase,
    type: z.literal('skill-groups'),
    groups: z
      .array(
        z.object({
          title: z.string().min(1).max(80),
          visible: z.boolean().default(true),
          skills: z.array(z.string()).default([])
        })
      )
      .default([])
  }),
  z.object({
    ...blockBase,
    type: z.literal('website-cards'),
    cards: z
      .array(
        z.object({
          title: z.string().min(1).max(80),
          description: z.string().max(240).default(''),
          image: z.string().default(''),
          href: z.string().min(1)
        })
      )
      .default([])
  }),
  z.object({
    ...blockBase,
    type: z.literal('tool-grid'),
    description: z.string().max(240).default(''),
    groups: z
      .array(
        z.object({
          title: z.string().min(1).max(80),
          visible: z.boolean().default(true),
          tools: z
            .array(
              z.object({
                name: z.string().min(1).max(80),
                description: z.string().max(120).default(''),
                href: z.string().min(1),
                icon: z.string().min(1),
                darkIcon: z.string().default(''),
                visible: z.boolean().default(true)
              })
            )
            .default([])
        })
      )
      .default([])
  }),
  z.object({
    ...blockBase,
    type: z.literal('project-grid'),
    groups: z
      .array(
        z.object({
          title: z.string().min(1).max(80),
          description: z.string().max(240).default(''),
          visible: z.boolean().default(true),
          collapsed: z.boolean().default(false),
          projects: z
            .array(
              z.object({
                name: z.string().min(1).max(80),
                description: z.string().max(240).default(''),
                image: z.string().default(''),
                visible: z.boolean().default(true),
                links: z
                  .array(
                    z.object({
                      type: z.enum(['github', 'site', 'doc', 'release']),
                      href: z.string().min(1)
                    })
                  )
                  .default([])
              })
            )
            .default([])
        })
      )
      .default([])
  }),
  z.object({
    ...blockBase,
    type: z.literal('link-grid'),
    groups: z
      .array(
        z.object({
          title: z.string().min(1).max(80),
          description: z.string().max(240).default(''),
          visible: z.boolean().default(true),
          collapsed: z.boolean().default(false),
          randomize: z.boolean().default(true),
          links: z
            .array(
              z.object({
                name: z.string().min(1).max(80),
                intro: z.string().max(160).default(''),
                link: z.string().min(1),
                avatar: z.string().min(1),
                visible: z.boolean().default(true)
              })
            )
            .default([])
        })
      )
      .default([])
  }),
  z.object({
    ...blockBase,
    type: z.literal('link-history'),
    events: z
      .array(
        z.object({
          date: z.string().min(1).max(80),
          name: z.string().min(1).max(80),
          status: z.enum(['added', 'updated', 'removed']),
          content: z.string().max(240).default('')
        })
      )
      .default([])
  }),
  z.object({
    ...blockBase,
    type: z.literal('apply-links'),
    content: z.string().default(''),
    pullRequestUrl: z.string().default('')
  })
])

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
    .transform((value) => value ?? ''),
  blocks: z.array(pageBlockSchema).default([])
})

export type PageKey = z.infer<typeof pageKeySchema>
export type CmsPage = z.infer<typeof pageSchema>
export type CmsBlock = z.infer<typeof pageBlockSchema>

export const cmsSite = siteSchema.parse(siteData)
export const cmsPages = pageSchema
  .array()
  .parse([homePage, blogPage, docsPage, projectsPage, linksPage, aboutPage])

export const cmsPage = Object.fromEntries(cmsPages.map((page) => [page.key, page])) as Record<
  PageKey,
  CmsPage
>
