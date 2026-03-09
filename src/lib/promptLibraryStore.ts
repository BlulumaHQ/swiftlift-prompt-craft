// Prompt Library Store - manages editable prompt blocks

const STORAGE_KEY = 'swiftlift_prompt_library_v2';

export type PromptSection = 'lovable' | 'claude';

export interface PromptBlock {
  id: string;
  name: string;
  section: PromptSection;
  content: string;
}

const defaultPrompts: PromptBlock[] = [
  // === FOR LOVABLE ===
  {
    id: 'base_core_engine',
    name: 'Base Core Engine',
    section: 'lovable',
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
  {
    id: 'pkg_350_standard',
    name: '$350 Standard Package',
    section: 'lovable',
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
    section: 'lovable',
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
    section: 'lovable',
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
    section: 'lovable',
    content: `REFERENCE SOURCE: DIRECT URL

A Reference URL has been provided directly.

Use this URL as the primary design reference.

Analyze the page layout, section structure, visual hierarchy, color application, typography, and animation patterns.

Apply the extracted design skeleton to the new website build.`
  },
  {
    id: 'ref_use_reference_library',
    name: 'Use Reference Library',
    section: 'lovable',
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
  {
    id: 'brand_override_colors',
    name: 'Brand Override – Colors',
    section: 'lovable',
    content: `BRAND COLOR OVERRIDE

When brand colors are specified:
- Replace all primary brand colors with the provided Primary Color
- Replace all secondary/accent colors with the provided Secondary Color
- Maintain proper contrast ratios for accessibility
- Update hover states, active states, and focus rings
- Apply consistently across all pages and components
- Ensure buttons, links, and CTAs reflect the brand palette

If no colors are specified, use colors detected from the Source URL.`
  },
  {
    id: 'brand_override_font',
    name: 'Brand Override – Font',
    section: 'lovable',
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
  {
    id: 'mod_team',
    name: 'Team Module',
    section: 'lovable',
    content: `TEAM MODULE

Display team members with:
- Professional photos
- Full names
- Job titles
- Brief professional bios

Use a clean, consistent grid layout.
Ensure equal card heights.
Include social links if available.`
  },
  {
    id: 'mod_testimonials',
    name: 'Testimonials Module',
    section: 'lovable',
    content: `TESTIMONIALS MODULE

Display client testimonials with:
- Client name
- Company/business name
- Star rating (if applicable)
- Testimonial quote

Use carousel or grid format.
Include client photos when available.
Maintain consistent card styling.`
  },
  {
    id: 'mod_faq',
    name: 'FAQ Module',
    section: 'lovable',
    content: `FAQ MODULE

Implement an accordion-style FAQ section.

Include at least 6 relevant questions and answers.
Questions should address common client concerns.
Answers should be concise but informative.

Smooth expand/collapse animations.
Clear visual hierarchy between question and answer.`
  },
  {
    id: 'mod_portfolio_projects',
    name: 'Portfolio / Projects Module',
    section: 'lovable',
    content: `PORTFOLIO / PROJECTS MODULE

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
    id: 'mod_multilanguage',
    name: 'Multi-language Module',
    section: 'lovable',
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
    id: 'mod_blog',
    name: 'Blog Module',
    section: 'lovable',
    content: `BLOG MODULE

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
      // Ensure all default prompts exist (merge new ones)
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
  lovable: 'For Lovable',
  claude: 'For Claude'
};

// Keep backward compat
export const categoryLabels: Record<string, string> = {
  base: 'Base Engine',
  packages: 'Packages',
  upgrades: 'Upgrades',
  modules: 'Modules',
  reference_rules: 'Reference Rules',
  brand_overrides: 'Brand Overrides',
  scraping: 'Scraping Prompt'
};
