import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

function removeDupsAndLowerCase(array: string[]) {
  if (!array.length) return array
  const lowercaseItems = array.map((str) => str.toLowerCase())
  const distinctItems = new Set(lowercaseItems)
  return Array.from(distinctItems)
}

// Define blog collection
const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  // Required
  schema: ({ image }) =>
    z.object({
      // Required
      title: z.string().max(60),
      description: z.string().max(160),
      publishDate: z.coerce.date(),
      // Optional
      updatedDate: z.coerce.date().optional(),
      heroImage: z
        .object({
          src: image(),
          alt: z.string().optional(),
          inferSize: z.boolean().optional(),
          width: z.number().optional(),
          height: z.number().optional(),

          color: z.string().optional()
        })
        .optional(),
      tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
      language: z.string().optional(),
      draft: z.boolean().default(false),
      // Special fields
      comment: z.boolean().default(true)
    })
})

const sectionBase = z.object({
  title: z.string().min(1).max(80),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  order: z.number().int().default(0),
  visible: z.boolean().default(true)
})

const homeSections = defineCollection({
  loader: glob({ base: './src/content/sections/home', pattern: '**/*.{md,mdx}' }),
  schema: sectionBase.extend({
    kind: z.enum(['markdown', 'latest-posts']).default('markdown'),
    postLimit: z.number().int().min(1).max(20).optional(),
    buttonLabel: z.string().max(40).optional(),
    buttonUrl: z.string().startsWith('/').optional()
  })
})

const aboutSections = defineCollection({
  loader: glob({ base: './src/content/sections/about', pattern: '**/*.{md,mdx}' }),
  schema: sectionBase
})

const projectSections = defineCollection({
  loader: glob({ base: './src/content/sections/projects', pattern: '**/*.{md,mdx}' }),
  schema: sectionBase
})

const linkSections = defineCollection({
  loader: glob({ base: './src/content/sections/links', pattern: '**/*.{md,mdx}' }),
  schema: sectionBase.extend({
    showHeading: z.boolean().default(true)
  })
})

const projectCategories = defineCollection({
  loader: glob({ base: './src/content/project-categories', pattern: '**/*.{yml,yaml,json}' }),
  schema: z.object({
    title: z.string().min(1).max(80),
    description: z.string().max(240).default(''),
    order: z.number().int().default(0),
    visible: z.boolean().default(true)
  })
})

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{yml,yaml,json}' }),
  schema: z.object({
    name: z.string().min(1).max(80),
    description: z.string().min(1).max(240),
    category: z.string().min(1),
    image: z
      .string()
      .nullish()
      .transform((value) => value || undefined),
    order: z.number().int().default(0),
    visible: z.boolean().default(true),
    links: z
      .array(
        z.object({
          type: z.enum(['github', 'site', 'doc', 'release']),
          href: z.url()
        })
      )
      .min(1)
  })
})

const linkGroups = defineCollection({
  loader: glob({ base: './src/content/link-groups', pattern: '**/*.{yml,yaml,json}' }),
  schema: z.object({
    title: z.string().min(1).max(80),
    description: z.string().max(240).default(''),
    order: z.number().int().default(0),
    visible: z.boolean().default(true),
    collapsed: z.boolean().default(false)
  })
})

const links = defineCollection({
  loader: glob({ base: './src/content/links', pattern: '**/*.{yml,yaml,json}' }),
  schema: z.object({
    name: z.string().min(1).max(80),
    intro: z.string().min(1).max(160),
    link: z.url(),
    avatar: z.string().min(1),
    group: z.string().min(1),
    order: z.number().int().default(0),
    visible: z.boolean().default(true)
  })
})

const docs = defineCollection({
  loader: glob({ base: './src/content/docs', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string().min(1).max(80),
    description: z.string().max(160),
    category: z.string().min(1).max(60).default('General'),
    order: z.number().int().default(0),
    draft: z.boolean().default(true),
    comment: z.boolean().default(false),
    updatedDate: z.coerce.date().optional()
  })
})

export const collections = {
  blog,
  homeSections,
  aboutSections,
  projectSections,
  linkSections,
  projectCategories,
  projects,
  linkGroups,
  links,
  docs
}
