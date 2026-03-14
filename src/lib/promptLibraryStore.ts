// Prompt Library Store - manages editable prompt blocks

const STORAGE_KEY = 'swiftlift_prompt_library_v4';

export type PromptCategory = 'core' | 'preview' | 'module' | 'advanced' | 'revision' | 'qc';

export interface PromptBlock {
  id: string;
  name: string;
  category: PromptCategory;
  content: string;
}

// Keep old type for backward compat in promptCompiler
export type PromptSection = PromptCategory;

export const categoryLabels: Record<PromptCategory, string> = {
  core: 'Core System Prompts',
  preview: 'Preview Prompts',
  module: 'Module Prompts',
  advanced: 'Advanced Module Prompts',
  revision: 'Revision Prompts',
  qc: 'Quality Control Prompts',
};

export const categoryOrder: PromptCategory[] = ['core', 'preview', 'module', 'advanced', 'revision', 'qc'];

// Alias for backward compat
export const sectionLabels = categoryLabels;

const defaultPrompts: PromptBlock[] = [
  // ═══ CORE SYSTEM PROMPTS ═══
  {
    id: 'core_master_v3',
    name: 'SwiftLift Core Master Prompt V3',
    category: 'core',
    content: `You are a deterministic website builder operating in PRODUCTION MODE.

Your goal is to generate a COMPLETE, CLIENT-READY WEBSITE in a single build.

The website must appear fully finished and professional.

No placeholder text.
No lorem ipsum.
No unfinished sections.

BUILD FORMULA

New Website =
Reference Design
+
Source Business Content

DESIGN AUTHORITY

The Reference URL defines the visual design.

Use it for:
- layout
- section order
- grid system
- hero style
- spacing
- background decoration
- animations
- CTA placement

The Source URL provides business content.

DESIGN SKELETON MODE

Step 1: Analyze the Reference design.
Step 2: Extract the layout skeleton.
Step 3: Lock section order and layout rhythm.
Step 4: Insert Source business content.

REFERENCE PRIORITY

If Source layout conflicts with Reference layout, follow Reference layout.

SOURCE IMAGE PRIORITY

Real images from the source website must be prioritized.

Examples:
- team photos
- staff photos
- company interior
- equipment
- location photos

Generated images are allowed only for decorative or generic visuals.

MOBILE FIRST

Validate layout at 375px width.
Sticky header required.
Scroll-to-top button required.

NAVIGATION BEHAVIOR

All page navigation must reset scroll position to the top.

Applies to:
- Header links
- Footer links
- Internal links

LAYOUT SANITY RULES

Card grids must maintain equal height and equal width.
Cards must align cleanly.

SEO BASELINE

Each page must include a unique page title.
Homepage must include a meta description.
Favicon must exist.
Open Graph / Social Graph image must exist.

FORM ROUTING

All forms must submit to:
https://formspree.io/f/mbdabbql

FOOTER CREDIT SYSTEM

Footer credit is controlled by project variables.

{SHOW_FOOTER_CREDIT}

Credit format:
| Web Design by {WEB_DESIGN_CREDIT}

The credit text must be visually subtle and smaller than body text.

FINAL EXECUTION CHECK

Verify:
- homepage meta description exists
- page titles exist
- source images prioritized
- navigation resets scroll
- favicon exists
- social graph exists
- forms submit correctly`
  },
  {
    id: 'core_scraping_v2',
    name: 'SwiftLift Website Scraping Prompt V2',
    category: 'core',
    content: `Extract structured information from the source website.

Return structured JSON only.

Extract:
- business name
- industry
- services
- contact information
- navigation structure
- url structure
- brand colors
- logo
- fonts
- social media links

Extract up to 6 items for:
- portfolio
- blog
- gallery

Extract CTA signals.
Extract language availability.

Do not fabricate content.`
  },

  // ═══ PREVIEW PROMPTS ═══
  {
    id: 'preview_a_standard',
    name: 'Preview Prompt A – Standard Layout',
    category: 'preview',
    content: `Generate a professional business website preview.

Use:
Reference Design
+
Source Business Content

The site must look fully finished.

Use up to 6 portfolio items if available.
Use up to 6 blog posts if available.
Use up to 6 gallery images if available.

Ensure the site contains:
- hero section
- services section
- about section
- content section
- contact section`
  },
  {
    id: 'preview_b_conversion',
    name: 'Preview Prompt B – Conversion Layout',
    category: 'preview',
    content: `Generate a conversion-style website preview.

This layout must be visually different from the standard layout.

Required sections:
- hero with CTA
- form in hero
- sticky CTA button
- testimonial section
- trust badge section
- benefits section
- contact form

The layout should feel conversion-focused.`
  },

  // ═══ MODULE PROMPTS ═══
  {
    id: 'mod_portfolio',
    name: 'Portfolio Module',
    category: 'module',
    content: `Add a portfolio section.

Use real portfolio items scraped from the source site.

Maximum:
6 items.

No login system.`
  },
  {
    id: 'mod_blog',
    name: 'Blog Module',
    category: 'module',
    content: `Add a blog section.

Use real blog posts scraped from the source site.

Maximum:
6 posts.

No CMS system.`
  },
  {
    id: 'mod_gallery',
    name: 'Gallery Module',
    category: 'module',
    content: `Add a gallery section.

Use real images scraped from the source site.

Maximum:
6 images.`
  },
  {
    id: 'mod_multilanguage',
    name: 'Multi-Language Module',
    category: 'module',
    content: `Create a language switcher.

Use real languages detected from the source website.

Each language must have its own page structure.`
  },

  // ═══ ADVANCED MODULE PROMPTS ═══
  {
    id: 'adv_trust_badges',
    name: 'Trust Badge Section',
    category: 'advanced',
    content: `Add trust badges and certification indicators.`
  },
  {
    id: 'adv_service_comparison',
    name: 'Service Comparison',
    category: 'advanced',
    content: `TO BE DETERMINED`
  },
  {
    id: 'adv_case_study',
    name: 'Case Study Section',
    category: 'advanced',
    content: `TO BE DETERMINED`
  },
  {
    id: 'adv_lead_capture',
    name: 'Lead Capture Upgrade',
    category: 'advanced',
    content: `TO BE DETERMINED`
  },
  {
    id: 'adv_conversion_layout',
    name: 'Conversion Layout Upgrade',
    category: 'advanced',
    content: `TO BE DETERMINED`
  },
  {
    id: 'adv_full_seo',
    name: 'Full SEO Package',
    category: 'advanced',
    content: `Apply advanced SEO structure.

Ensure:
- clean heading hierarchy
- semantic HTML
- internal linking
- image alt tags
- metadata consistency`
  },

  // ═══ REVISION PROMPTS ═══
  {
    id: 'rev_generator',
    name: 'Revision Prompt Generator',
    category: 'revision',
    content: `TO BE DETERMINED`
  },
  {
    id: 'rev_quick_fix',
    name: 'Quick Fix Prompt',
    category: 'revision',
    content: `Fix common website issues:
- scroll-to-top behavior
- broken links
- mobile spacing
- form routing issues`
  },

  // ═══ QUALITY CONTROL PROMPTS ═══
  {
    id: 'qc_basic',
    name: 'Basic Website QA',
    category: 'qc',
    content: `Verify:
- links work
- forms submit
- navigation scroll resets
- mobile layout readable`
  },
  {
    id: 'qc_advanced',
    name: 'Advanced System Audit',
    category: 'qc',
    content: `Perform technical audit:
- HTML structure
- heading hierarchy
- image optimization
- link structure
- mobile responsiveness`
  },
];

function getStoredLibrary(): PromptBlock[] {
  // Always force the new v4 defaults — clear old data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPrompts));
  return [...defaultPrompts];
}

export function getPromptLibrary(): PromptBlock[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: PromptBlock[] = JSON.parse(stored);
      // Ensure all defaults exist
      const ids = new Set(parsed.map(p => p.id));
      for (const dp of defaultPrompts) {
        if (!ids.has(dp.id)) parsed.push(dp);
      }
      return parsed;
    }
  } catch {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPrompts));
  return [...defaultPrompts];
}

export function resetLibrary(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPrompts));
}

export function getPromptBlock(id: string): PromptBlock | undefined {
  return getPromptLibrary().find(p => p.id === id);
}

export function savePromptBlock(block: PromptBlock): void {
  const library = getPromptLibrary();
  const idx = library.findIndex(p => p.id === block.id);
  if (idx >= 0) {
    library[idx] = block;
  } else {
    library.push(block);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
}

export function deletePromptBlock(id: string): void {
  const library = getPromptLibrary().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
}

export function getPromptsBySection(section: PromptCategory): PromptBlock[] {
  return getPromptLibrary().filter(p => p.category === section);
}
