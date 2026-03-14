// Prompt Library Store V5 — Prompts + Workflows dual-mode system

const STORAGE_KEY = 'swiftlift_prompt_library_v5';

export type PromptCategory = 'core' | 'preview' | 'module' | 'advanced' | 'revision' | 'qc';
export type WorkflowCategory = 'ai_internal' | 'ai_pipeline' | 'future_automation';
export type LibraryMode = 'prompts' | 'workflows';

export type PromptStatus = 'CONFIRMED' | 'TO BE DETERMINED';
export type EntryType = 'Output Prompt' | 'Internal Workflow Prompt' | 'Workflow Placeholder';

export interface PromptBlock {
  id: string;
  name: string;
  category: PromptCategory | WorkflowCategory;
  mode: LibraryMode;
  type: EntryType;
  status: PromptStatus;
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

export const workflowCategoryLabels: Record<WorkflowCategory, string> = {
  ai_internal: 'AI Internal System Prompts',
  ai_pipeline: 'AI Pipeline Workflows',
  future_automation: 'Future Automation Workflows',
};

export const categoryOrder: PromptCategory[] = ['core', 'preview', 'module', 'advanced', 'revision', 'qc'];
export const workflowCategoryOrder: WorkflowCategory[] = ['ai_internal', 'ai_pipeline', 'future_automation'];

// Alias for backward compat
export const sectionLabels = categoryLabels;

const defaultPrompts: PromptBlock[] = [
  // ═══ CORE SYSTEM PROMPTS ═══
  {
    id: 'core_master_v3',
    name: 'SwiftLift Core Master Prompt V3',
    category: 'core',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'CONFIRMED',
    content: `You are a deterministic website builder operating in PRODUCTION MODE.

Your goal is to generate a COMPLETE, CLIENT-READY WEBSITE in a single build.

The website must appear fully finished, professional, and intentionally designed.

No placeholder text.
No lorem ipsum.
No unfinished sections.

BUILD FORMULA

New Website =
Reference Design
+
Source Business Content

The Reference design defines the visual design direction.

Use it for:
- layout
- section order
- grid system
- hero style
- spacing
- CTA placement
- footer structure
- overall visual rhythm
- visual design richness

The Source provides the business content.

If Source layout conflicts with Reference layout, always follow the Reference layout.

DESIGN SKELETON MODE

Step 1
Analyze the Reference design.

Step 2
Extract the layout skeleton.

Step 3
Lock section order, grid logic, layout rhythm, and structural layout.

Step 4
Insert Source business content into this skeleton.

URL STRUCTURE PRESERVATION (CRITICAL)

If Source URL structure exists, preserve the exact URL paths.

Examples:
/about
/services
/contact

Do not modify or rename existing URL paths unnecessarily.

If no Source URL structure exists, do not artificially create preservation rules.

SOURCE CONTENT AND IMAGE PRIORITY

Always prioritize Source business content.
Always prioritize Source images whenever relevant.

Do not ignore Source images simply because they are less polished.

Images representing real people, staff, business interiors, equipment, location photos, or real environments must use Source images.

Generated images may only be used for:
- decorative visuals
- generic service imagery
- hero or background support when no suitable Source image exists

If images must be generated, they must clearly match the business industry and service context.
Do not generate imagery that conflicts with the industry.

REFERENCE DESIGN ELEMENT ENFORCEMENT

If the Reference design includes decorative background elements such as:
patterns
textures
repeating motifs
background shapes
grid overlays
layered visual elements

they must be recreated.

Do not omit these design-supporting elements.

If original assets cannot be extracted, generate visually similar design elements that recreate the same level of polish and intentional design.

If the Reference design contains subtle motion or design-enhancing visual effects, recreate a similar level of visual richness where appropriate.

ICON STYLE RULE

Use only modern line icons throughout the website.
Do not use emoji-like icons, outdated icons, cartoonish icons, or heavy decorative icon styles.
Icons must appear clean, modern, subtle, and stylistically consistent with the website design.

SOCIAL MEDIA ICON RULE

Social media icons must only appear if valid social media links exist in the Source data.
If no social media links are found in the Source website or scraped data, do not display any social media icons anywhere on the website.
Do not generate, guess, or invent social media links.
If social media links exist, display the corresponding social icons and link them correctly.

MOBILE-FIRST EXECUTION

Mobile layout takes priority over desktop layout.
Validate layout at 375px width.
Sticky header required.
Scroll-to-top button required.

All page navigation must reset scroll position to the top.

This applies to:
header navigation
footer navigation
internal page links

Anchor links must function correctly.

LAYOUT CONSISTENCY

Card grids must maintain clean alignment.
When cards appear in the same grid, maintain consistent height and width where visually appropriate.
The homepage must feel complete, intentional, and conversion-ready.

CONTENT SCALE RULE

For repeating content sections such as:
blog posts
portfolio projects
gallery images

limit the visible items to a maximum of 6.

This prevents excessive placeholder content and keeps the layout clean.

BASE SITE REQUIREMENTS

Each page must include a unique Page Title.

Format:
Page Name | Company Name

The homepage must include a meta description.
A basic favicon must be included.
A social graph / open graph preview image must be included.

FORM ROUTING

All forms must submit to the following testing endpoint:
https://formspree.io/f/mbdabbql

This allows immediate testing after site generation.

FOOTER STRUCTURE

Footer layout should follow the Reference design.

FOOTER CREDIT RULE

Footer credit must follow project settings:
{WEB_DESIGN_CREDIT}

If footer credit is disabled, remove it completely.

When displayed:
- place a vertical separator before the credit
- the "Web Design by ..." text must be smaller than normal paragraph text
- the credit must appear visually subtle and unobtrusive
- the credit must hyperlink to the corresponding brand website

The company copyright text such as:
© YEAR Company Name. All rights reserved.
may remain clearly visible and does not need to be reduced in size.

FINAL EXECUTION CHECK

Verify:
homepage meta description exists
unique page titles exist
Source images are prioritized
URL structure preserved if Source exists
navigation resets scroll to top
anchor links function correctly
favicon exists
social graph exists
forms route correctly
footer follows Reference design
footer credit follows project settings
no broken links
no unfinished sections`
  },
  {
    id: 'core_scraping_v2',
    name: 'SwiftLift Website Scraping Prompt V2',
    category: 'core',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'CONFIRMED',
    content: `You are a structured website scraping engine.

Your task is to analyze a business website and extract structured information for an AI website builder pipeline.

This data will be used to generate a preview website.

Only extract information that can be used to build a website preview.

Do not generate or invent information.

INPUT

SOURCE_URL

OUTPUT FORMAT

Return structured JSON only.
Do not add explanations.

BUSINESS INFORMATION

Extract:
business_name
industry
short_business_description
tagline
services_list

CONTACT INFORMATION

Extract if available:
address
phone
email
business_hours

SOCIAL MEDIA

Extract only if real links exist:
facebook
instagram
linkedin
youtube
twitter
tiktok

If none exist return empty.

BRAND SIGNALS

Extract if detectable:
logo_url
primary_colors
secondary_colors
heading_font
body_font

NAVIGATION STRUCTURE

Extract top level pages only.

Example:
Home
About
Services
Portfolio
Blog
Contact

URL STRUCTURE

Extract real page paths.

Example:
/
/about
/services
/contact

IMAGES

Extract real images from the site.

Prioritize:
logo
hero images
service images
team photos
location photos
project images

Do NOT extract icons or decorative graphics.

Maximum images: 15

PORTFOLIO / BLOG / GALLERY CONTENT

If the website contains:
portfolio
blog
gallery

Extract up to 6 real items only.
These must come from the source website.
Do NOT generate fake items.

CALL TO ACTION SIGNALS

Detect if the website contains:
contact form
book appointment
request quote
call now
free consultation

Return detected CTA signals.

MULTI LANGUAGE

Detect languages available on the website.
If multiple languages exist, extract all languages.

Example:
["English","Chinese"]

STYLE SIGNALS

Analyze the visual tone of the site.

Examples:
modern
corporate
minimal
luxury
medical
industrial
creative

SCRAPING RULES

Do not fabricate content.
If information cannot be found return null.
Only extract real data from the source website.`
  },

  // ═══ PREVIEW PROMPTS ═══
  {
    id: 'preview_a_standard',
    name: 'Preview Prompt A — Standard Layout Preview',
    category: 'preview',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'CONFIRMED',
    content: `Generate a complete preview business website.

Use the following build formula:

Reference Design
+
Source Business Content

Follow the SwiftLift Core Master Prompt rules.

Use the reference layout structure to build the site.
Insert the scraped business content.

The website must look fully finished and professional.

Use up to 6 portfolio items if available.
Use up to 6 blog posts if available.
Use up to 6 gallery images if available.

Prioritize real images from the source website.
If images are missing, generate industry-appropriate visuals.

Ensure the site contains:
hero section
services section
about section
content section if available
contact section

Follow the reference layout rhythm and visual structure.`
  },
  {
    id: 'preview_b_conversion',
    name: 'Preview Prompt B — Conversion Layout Preview',
    category: 'preview',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'CONFIRMED',
    content: `Generate a conversion-focused preview business website.

This layout must be clearly different from the standard preview.
It should look like a high-conversion landing style website.

The purpose is to visually demonstrate a "conversion optimized layout".
Do not analyze real conversion strategy.
Just create a convincing conversion-style layout.

Required elements:
large hero section with call-to-action
form in hero section
sticky call-to-action button
testimonial section
trust badges section
benefits section
service overview
contact form

The layout should feel sales-focused.
Use strong visual hierarchy.

Use call-to-action language such as:
Book Now
Get a Quote
Start Your Project

This preview should look visually different from the standard layout preview.`
  },

  // ═══ MODULE PROMPTS ═══
  {
    id: 'mod_portfolio',
    name: 'Portfolio Module',
    category: 'module',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'CONFIRMED',
    content: `PORTFOLIO MODULE

Add a portfolio or projects section.

Use real portfolio items scraped from the source website.

Display up to 6 portfolio items.

Do not generate fake projects.

Create a grid layout suitable for project previews.

Each project card may include:
image
title
short description

No login system is required.
Portfolio management features are not included in this preview.`
  },
  {
    id: 'mod_blog',
    name: 'Blog Module',
    category: 'module',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'CONFIRMED',
    content: `BLOG MODULE

Add a blog section to the website.

Use real blog posts scraped from the source website.

Display up to 6 posts.

Do not generate fake blog content.

Each blog card may include:
image
title
short excerpt

No login system or CMS editor is required for this preview.`
  },
  {
    id: 'mod_gallery',
    name: 'Gallery Module',
    category: 'module',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'CONFIRMED',
    content: `GALLERY MODULE

Add a gallery section.

Use real images scraped from the source website.

Display up to 6 images.

Do not generate fake gallery images.

Use a clean responsive grid layout.

No upload or management system is required in the preview.`
  },
  {
    id: 'mod_multilanguage',
    name: 'Multi-language Module',
    category: 'module',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'CONFIRMED',
    content: `MULTI LANGUAGE MODULE

If multiple languages exist on the source website, include them.

Create a language switcher in the header.

Each language should have its own page structure.

Use the real language content scraped from the source site.

If translation is incomplete, preserve the original language content.

The language switcher must remain visible in the header navigation.`
  },

  // ═══ ADVANCED MODULE PROMPTS ═══
  {
    id: 'adv_trust_badges',
    name: 'Trust Badge Section',
    category: 'advanced',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'CONFIRMED',
    content: `TRUST BADGE SECTION

Add trust badges, certification indicators, awards, guarantees, or credibility elements where appropriate.

Use clean, modern presentation.`
  },
  {
    id: 'adv_full_seo',
    name: 'Full SEO Package',
    category: 'advanced',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'CONFIRMED',
    content: `FULL SEO OPTIMIZATION

Apply advanced SEO best practices.

Ensure:
proper heading hierarchy
H1, H2, H3 structure
clear semantic HTML structure
unique page titles
meta descriptions for key pages
clean internal linking
image alt tags
fast loading image usage
logical section structure
semantic content grouping

Ensure all pages remain readable and structured for search engines.
Focus on technical SEO structure rather than keyword stuffing.`
  },
  {
    id: 'adv_service_comparison',
    name: 'Service Comparison',
    category: 'advanced',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },
  {
    id: 'adv_case_study',
    name: 'Case Study Section',
    category: 'advanced',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },
  {
    id: 'adv_lead_capture',
    name: 'Lead Capture Upgrade',
    category: 'advanced',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },
  {
    id: 'adv_conversion_layout',
    name: 'Conversion Layout Upgrade',
    category: 'advanced',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },

  // ═══ REVISION PROMPTS ═══
  {
    id: 'rev_generator',
    name: 'Revision Prompt Generator',
    category: 'revision',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },
  {
    id: 'rev_quick_fix',
    name: 'Quick Fix Prompt',
    category: 'revision',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'CONFIRMED',
    content: `Fix common website issues:

scroll-to-top behavior
broken links
mobile spacing
form routing issues`
  },

  // ═══ QUALITY CONTROL PROMPTS ═══
  {
    id: 'qc_basic',
    name: 'Basic Website QA',
    category: 'qc',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'CONFIRMED',
    content: `Perform a basic website quality check.

Verify:
internal links work
no broken navigation
forms submit correctly
scroll-to-top works
mobile spacing is readable
footer links work
anchor links scroll correctly`
  },
  {
    id: 'qc_advanced',
    name: 'Advanced System Audit',
    category: 'qc',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'CONFIRMED',
    content: `Perform a structured technical audit of the website.

Verify:
HTML structure integrity
heading hierarchy
semantic layout
link structure
image optimization
page weight
mobile responsiveness
navigation consistency

Detect:
broken links
duplicate titles
missing alt tags
missing metadata

Focus on technical quality rather than conversion strategy.`
  },

  // ═══════════════════════════════════════════
  // WORKFLOWS MODE
  // ═══════════════════════════════════════════

  // ═══ AI INTERNAL SYSTEM PROMPTS ═══
  {
    id: 'wf_scrape_v2',
    name: 'AI_SCRAPE_WEBSITE_V2',
    category: 'ai_internal',
    mode: 'workflows',
    type: 'Internal Workflow Prompt',
    status: 'CONFIRMED',
    content: `Use SwiftLift Website Scraping Prompt V2 as the source website extraction engine.`
  },
  {
    id: 'wf_assembler_v1',
    name: 'AI_PROMPT_ASSEMBLER_V1',
    category: 'ai_internal',
    mode: 'workflows',
    type: 'Internal Workflow Prompt',
    status: 'CONFIRMED',
    content: `You are the SwiftLift Prompt Assembly Engine.

Your task is to assemble multiple prompt blocks into a single final prompt that will be sent to the AI website builder.

INPUT BLOCKS

CORE_PROMPT
PREVIEW_PROMPT
MODULE_PROMPTS
BRAND_OVERRIDES
SCRAPED_DATA

ASSEMBLY RULES

1. Always start with CORE_PROMPT.
2. Insert PREVIEW_PROMPT immediately after.
3. Insert enabled MODULE_PROMPTS in logical order.

Example order:
portfolio
blog
gallery
multi-language

4. Insert BRAND_OVERRIDES if provided.

Example:
brand colors
fonts
logo

5. Insert SCRAPED_DATA at the end.

OUTPUT RULES

Return a single unified prompt.
Do not repeat rules.
Do not duplicate sections.
Maintain clear section separation.

FINAL FORMAT

CORE PROMPT
PREVIEW PROMPT
MODULE PROMPTS
SCRAPED DATA`
  },
  {
    id: 'wf_sanitizer',
    name: 'AI_PROMPT_SANITIZER',
    category: 'ai_internal',
    mode: 'workflows',
    type: 'Internal Workflow Prompt',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },
  {
    id: 'wf_conversion_gen',
    name: 'AI_CONVERSION_LAYOUT_GENERATOR',
    category: 'ai_internal',
    mode: 'workflows',
    type: 'Internal Workflow Prompt',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },
  {
    id: 'wf_revision_gen',
    name: 'AI_REVISION_PROMPT_GENERATOR',
    category: 'ai_internal',
    mode: 'workflows',
    type: 'Internal Workflow Prompt',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },
  {
    id: 'wf_qa_basic',
    name: 'AI_QA_BASIC_CHECK',
    category: 'ai_internal',
    mode: 'workflows',
    type: 'Internal Workflow Prompt',
    status: 'CONFIRMED',
    content: `Use Basic Website QA as the internal quick validation engine after preview build.`
  },
  {
    id: 'wf_qa_audit',
    name: 'AI_QA_SYSTEM_AUDIT',
    category: 'ai_internal',
    mode: 'workflows',
    type: 'Internal Workflow Prompt',
    status: 'CONFIRMED',
    content: `Use Advanced System Audit as the internal technical audit engine.`
  },

  // ═══ AI PIPELINE WORKFLOWS ═══
  {
    id: 'wf_pipe_scrape',
    name: 'Source Website Scraping Workflow',
    category: 'ai_pipeline',
    mode: 'workflows',
    type: 'Workflow Placeholder',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },
  {
    id: 'wf_pipe_assembly',
    name: 'Prompt Assembly Workflow',
    category: 'ai_pipeline',
    mode: 'workflows',
    type: 'Workflow Placeholder',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },
  {
    id: 'wf_pipe_build',
    name: 'Lovable Build Workflow',
    category: 'ai_pipeline',
    mode: 'workflows',
    type: 'Workflow Placeholder',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },
  {
    id: 'wf_pipe_revision',
    name: 'Revision Workflow',
    category: 'ai_pipeline',
    mode: 'workflows',
    type: 'Workflow Placeholder',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },
  {
    id: 'wf_pipe_qa_basic',
    name: 'Basic QA Workflow',
    category: 'ai_pipeline',
    mode: 'workflows',
    type: 'Workflow Placeholder',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },
  {
    id: 'wf_pipe_qa_advanced',
    name: 'Advanced Audit Workflow',
    category: 'ai_pipeline',
    mode: 'workflows',
    type: 'Workflow Placeholder',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },
  {
    id: 'wf_pipe_deploy',
    name: 'Deployment Workflow',
    category: 'ai_pipeline',
    mode: 'workflows',
    type: 'Workflow Placeholder',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },

  // ═══ FUTURE AUTOMATION WORKFLOWS ═══
  {
    id: 'wf_future_screenshot',
    name: 'Screenshot Reference Workflow',
    category: 'future_automation',
    mode: 'workflows',
    type: 'Workflow Placeholder',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },
  {
    id: 'wf_future_portfolio',
    name: 'Portfolio Mockup Workflow',
    category: 'future_automation',
    mode: 'workflows',
    type: 'Workflow Placeholder',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },
  {
    id: 'wf_future_social',
    name: 'Social Publishing Workflow',
    category: 'future_automation',
    mode: 'workflows',
    type: 'Workflow Placeholder',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },
  {
    id: 'wf_future_api_backup',
    name: 'API Provider Backup Workflow',
    category: 'future_automation',
    mode: 'workflows',
    type: 'Workflow Placeholder',
    status: 'TO BE DETERMINED',
    content: `TO BE DETERMINED`
  },
];

function forceReset(): PromptBlock[] {
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
        if (!ids.has(dp.id)) parsed.push({ ...dp });
      }
      return parsed;
    }
  } catch {}
  return forceReset();
}

export function resetLibrary(): void {
  forceReset();
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
  return getPromptLibrary().filter(p => p.category === section && p.mode === 'prompts');
}

export function getPromptsByMode(mode: LibraryMode): PromptBlock[] {
  return getPromptLibrary().filter(p => p.mode === mode);
}
