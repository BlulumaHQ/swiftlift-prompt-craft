// Prompt Library Store - manages editable prompt blocks

const STORAGE_KEY = 'swiftlift_prompt_library_v3';

export type PromptSection = 'master' | 'builder' | 'module' | 'override' | 'revision' | 'claude';

export interface PromptBlock {
  id: string;
  name: string;
  section: PromptSection;
  content: string;
}

const defaultPrompts: PromptBlock[] = [
  // === MASTER PROMPTS ===
  {
    id: 'base_core_engine',
    name: 'Base Core Engine',
    section: 'master',
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

URL STRUCTURE PRESERVATION

Preserve exact URL paths.

SOURCE IMAGE ENFORCEMENT

Always prioritize images from the Source website.

IMAGE GENERATION

Allowed for hero backgrounds and decorative visuals.

MOBILE FIRST DESIGN

Validate layout at 375px width.
Sticky header required.
Scroll-to-top button required.

PAGE NAVIGATION RESET

Header, footer, and internal links must reset scroll position to top.

CARD GRID CONSISTENCY

Cards must maintain equal height and width.

METADATA

Each page must include a Page Title.
Homepage must include a meta description.

FORM ROUTING

Forms must submit to:
https://formspree.io/f/mbdabbql

FOOTER CREDIT

© YEAR Company Name | Web Design by Bluluma.com`
  },

  // === BUILDER PROMPTS ===
  {
    id: 'pkg_350_standard',
    name: '$350 Standard Package',
    section: 'builder',
    content: `PACKAGE MODE: LAUNCH

1–2 pages maximum.

Typical structure:
- Homepage
- Contact

Focus on simplicity and clarity.`
  },
  {
    id: 'pkg_550_standard',
    name: '$550 Standard Package',
    section: 'builder',
    content: `PACKAGE MODE: GROWTH

3–7 pages.

Typical pages:
- Home
- About
- Services
- Projects
- Testimonials
- Contact
- FAQ (optional)`
  },
  {
    id: 'fake_conversion_layout_upgrade',
    name: 'Conversion Layout Upgrade',
    section: 'builder',
    content: `Enhance layout to feel visually conversion-oriented.

Do NOT perform deep conversion analysis.

Enhancements may include:
- Stronger hero messaging
- More prominent CTA
- Lead emphasis
- Benefit-focused service sections
- Testimonial placement

The goal is visual persuasion only.`
  },
  {
    id: 'ref_use_reference_url',
    name: 'Use Reference URL',
    section: 'builder',
    content: `REFERENCE SOURCE: DIRECT URL

A Reference URL has been provided directly.

Use this URL as the primary design reference.

Analyze the page layout, section structure, visual hierarchy, color application, typography, and animation patterns.

Apply the extracted design skeleton to the new website build.`
  },
  {
    id: 'ref_use_reference_library',
    name: 'Use Reference Library',
    section: 'builder',
    content: `REFERENCE SOURCE: LIBRARY SELECTION

A reference layout has been selected from the Reference Library.

Use the stored Reference URL as the design reference.

Follow the same analysis process:
- Extract layout skeleton
- Lock section order
- Apply visual patterns
- Maintain design rhythm

The Reference Library entry may include industry context to guide design decisions.`
  },

  // === MODULE PROMPTS ===
  {
    id: 'mod_portfolio_login',
    name: 'Portfolio — With Login',
    section: 'module',
    content: `PORTFOLIO MODULE (WITH LOGIN)

Create a filterable portfolio gallery with authentication.

Include:
- Project images
- Project titles
- Brief descriptions
- Category tags
- Login-protected admin area for managing projects

Support category filtering.
Use masonry or uniform grid layout.
Include lightbox functionality for images.`
  },
  {
    id: 'mod_portfolio_nologin',
    name: 'Portfolio — Without Login',
    section: 'module',
    content: `PORTFOLIO MODULE (PUBLIC)

Create a filterable portfolio gallery.

Include:
- Project images
- Project titles
- Brief descriptions
- Category tags

Support category filtering.
Use masonry or uniform grid layout.
Include lightbox functionality for images.`
  },
  {
    id: 'mod_blog_login',
    name: 'Blog — With Login',
    section: 'module',
    content: `BLOG MODULE (WITH LOGIN)

Create a blog system with authentication for content management.

Blog listing page:
- Featured post highlight
- Post thumbnails
- Post titles and excerpts
- Publication dates
- Category tags
- Pagination

Login-protected admin for creating/editing posts.`
  },
  {
    id: 'mod_blog_nologin',
    name: 'Blog — Without Login',
    section: 'module',
    content: `BLOG MODULE (PUBLIC)

Create a blog listing page with:
- Featured post highlight
- Post thumbnails
- Post titles and excerpts
- Publication dates
- Category tags
- Pagination

Individual blog post pages should include:
- Full content
- Author info
- Related posts
- Social sharing buttons`
  },
  {
    id: 'mod_gallery',
    name: 'Gallery Module',
    section: 'module',
    content: `GALLERY MODULE

Create a visual gallery section with:
- Image grid layout
- Lightbox functionality
- Category filtering (optional)
- Responsive columns
- Lazy loading for performance

Support both landscape and portrait images.`
  },
  {
    id: 'mod_multilanguage',
    name: 'Multi-language Module',
    section: 'module',
    content: `MULTI-LANGUAGE MODULE

Implement language switching capability.

Requirements:
- Clear language selector (flags or text)
- Preserve navigation state on switch
- Proper content structure for translations
- RTL support preparation if needed

Seamless switching without page reload preferred.`
  },
  {
    id: 'mod_lead_capture',
    name: 'Lead Capture Upgrade',
    section: 'module',
    content: `LEAD CAPTURE UPGRADE

Add enhanced lead capture elements:
- Exit-intent popup
- Floating CTA bar
- Inline lead forms in content sections
- Newsletter signup
- Free consultation booking widget`
  },
  {
    id: 'mod_conversion_layout',
    name: 'Conversion Layout',
    section: 'module',
    content: `CONVERSION LAYOUT MODULE

Apply conversion-focused design patterns:
- Above-the-fold value proposition
- Social proof near CTAs
- Urgency/scarcity indicators
- Benefit-driven headlines
- Streamlined user flow`
  },
  {
    id: 'mod_trust_badges',
    name: 'Trust Badge Section',
    section: 'module',
    content: `TRUST BADGE SECTION

Add trust-building elements:
- Certification badges
- Partner logos
- Security seals
- Guarantee badges
- Industry association logos
- Years in business indicator`
  },
  {
    id: 'mod_service_comparison',
    name: 'Service Comparison',
    section: 'module',
    content: `SERVICE COMPARISON MODULE

Create a comparison table or section:
- Feature comparison grid
- Pricing tiers (if applicable)
- Highlighted recommended option
- Clear CTAs per tier
- Mobile-friendly layout`
  },
  {
    id: 'mod_case_study',
    name: 'Case Study Section',
    section: 'module',
    content: `CASE STUDY SECTION

Display detailed case studies:
- Client challenge/problem
- Solution provided
- Results and metrics
- Client testimonial
- Before/after visuals
- CTA to contact for similar results`
  },
  {
    id: 'mod_full_seo',
    name: 'Full SEO Package',
    section: 'module',
    content: `FULL SEO PACKAGE

Implement comprehensive SEO:
- Optimized meta titles and descriptions for all pages
- Schema markup (LocalBusiness, FAQ, etc.)
- Open Graph tags
- Sitemap generation
- Canonical URLs
- Alt text for all images
- Internal linking structure
- Header hierarchy (H1-H6)`
  },

  // === OVERRIDE PROMPTS ===
  {
    id: 'brand_override_colors',
    name: 'Brand Override – Colors',
    section: 'override',
    content: `BRAND COLOR OVERRIDE

When brand colors are specified:
- Replace all primary brand colors with the provided Primary Color
- Replace all secondary/accent colors with the provided Secondary Color
- Apply Accent Color for highlights and interactive elements
- Maintain proper contrast ratios for accessibility
- Update hover states, active states, and focus rings
- Apply consistently across all pages and components
- Ensure buttons, links, and CTAs reflect the brand palette

If no colors are specified, use colors detected from the Source URL.`
  },
  {
    id: 'brand_override_font',
    name: 'Brand Override – Font',
    section: 'override',
    content: `BRAND FONT OVERRIDE

When a primary font is specified:
- Apply to all headings (h1–h6)
- Apply to body text and paragraphs
- Ensure proper font weights are loaded (400, 500, 600, 700 minimum)
- Maintain readability at all sizes
- Load font via Google Fonts or appropriate CDN
- Set appropriate fallback font stack

If no font is specified, use the font detected from the Source URL.`
  },

  // === REVISION PROMPTS ===
  {
    id: 'revision_client_feedback',
    name: 'Client Feedback Template',
    section: 'revision',
    content: `REVISION MODE: CLIENT FEEDBACK

Apply the following client-requested changes to the existing website build.

Maintain all existing design patterns and layout structure unless specifically requested to change.

Changes must be surgical — only modify what the client has asked for.

Do not reorganize sections unless explicitly requested.`
  },
  {
    id: 'revision_quick_fix',
    name: 'Quick Fix Template',
    section: 'revision',
    content: `REVISION MODE: QUICK FIX

Apply the selected quick fixes to the existing website build.

Each fix should be minimal and targeted.
Do not alter unrelated sections.
Maintain design consistency throughout.`
  },

  // === FOR CLAUDE ===
  {
    id: 'scraping_engine_prompt',
    name: 'Scraping Engine Prompt',
    section: 'claude',
    content: `You are a professional website content extraction engine.

Extract ALL usable business information from the Source URL.

Preserve wording when possible.

Return structured data including:
- Company profile (name, tagline, description)
- Page structure (existing pages and navigation)
- Navigation menu (items and hierarchy)
- URL structure (all internal links)
- Hero content (headlines, subheadlines, CTAs)
- About content (company story, mission, values)
- Services (list with descriptions)
- Projects/Portfolio (if available)
- Team members (names, titles, bios)
- Testimonials (quotes, authors, companies)
- Images (URLs, alt text, context)
- Contact information (address, phone, email, hours)
- Social media links
- Language detection

Return results as a structured content database in JSON format.`
  }
];

function getStoredLibrary(): PromptBlock[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: PromptBlock[] = JSON.parse(stored);
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

export function getPromptLibrary(): PromptBlock[] {
  return getStoredLibrary();
}

export function getPromptBlock(id: string): PromptBlock | undefined {
  return getStoredLibrary().find(p => p.id === id);
}

export function savePromptBlock(block: PromptBlock): void {
  const library = getStoredLibrary();
  const idx = library.findIndex(p => p.id === block.id);
  if (idx >= 0) {
    library[idx] = block;
  } else {
    library.push(block);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
}

export function getPromptsBySection(section: PromptSection): PromptBlock[] {
  return getStoredLibrary().filter(p => p.section === section);
}

export const sectionLabels: Record<PromptSection, string> = {
  master: 'Master Prompts',
  builder: 'Builder Prompts',
  module: 'Module Prompts',
  override: 'Override Prompts',
  revision: 'Revision Prompts',
  claude: 'For Claude',
};

export const categoryLabels: Record<string, string> = {
  base: 'Base Engine',
  packages: 'Packages',
  upgrades: 'Upgrades',
  modules: 'Modules',
  reference_rules: 'Reference Rules',
  brand_overrides: 'Brand Overrides',
  scraping: 'Scraping Prompt'
};
