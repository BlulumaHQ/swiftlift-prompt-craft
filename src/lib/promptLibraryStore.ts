// Prompt Library Store - manages editable prompt blocks

const STORAGE_KEY = 'swiftlift_prompt_library';

export interface PromptBlock {
  id: string;
  name: string;
  category: 'base' | 'packages' | 'upgrades' | 'modules' | 'reference_rules' | 'brand_overrides' | 'scraping';
  content: string;
}

const defaultPrompts: PromptBlock[] = [
  {
    id: 'base_core_engine',
    name: 'Base Core Engine',
    category: 'base',
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
    category: 'packages',
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
    category: 'packages',
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
    category: 'upgrades',
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
    id: 'mod_team',
    name: 'Team Module',
    category: 'modules',
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
    category: 'modules',
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
    category: 'modules',
    content: `FAQ MODULE

Implement an accordion-style FAQ section.

Include at least 6 relevant questions and answers.
Questions should address common client concerns.
Answers should be concise but informative.

Smooth expand/collapse animations.
Clear visual hierarchy between question and answer.`
  },
  {
    id: 'mod_portfolio',
    name: 'Portfolio Module',
    category: 'modules',
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
    category: 'modules',
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
    category: 'modules',
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
  {
    id: 'reference_rules',
    name: 'Reference Rules',
    category: 'reference_rules',
    content: `REFERENCE LAYOUT RULES

The Reference URL defines ALL visual design decisions.

Follow the Reference for:
- Overall page structure
- Section ordering
- Component styles
- Spacing and rhythm
- Color application patterns
- Typography hierarchy
- Animation patterns

Do NOT deviate from Reference layout structure.
Source content fills the Reference skeleton.`
  },
  {
    id: 'brand_overrides',
    name: 'Brand Override Rules',
    category: 'brand_overrides',
    content: `BRAND OVERRIDE RULES

When brand colors are specified:
- Replace all primary brand colors
- Replace all secondary/accent colors
- Maintain proper contrast ratios
- Update hover and active states

When primary font is specified:
- Apply to all headings
- Apply to body text
- Ensure proper font weights are loaded
- Maintain readability at all sizes

Brand consistency must be maintained across all pages.`
  },
  {
    id: 'scraping_engine_prompt',
    name: 'Scraping Engine Prompt',
    category: 'scraping',
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
    if (stored) return JSON.parse(stored);
  } catch {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPrompts));
  return defaultPrompts;
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

export function getPromptsByCategory(category: PromptBlock['category']): PromptBlock[] {
  return getStoredLibrary().filter(p => p.category === category);
}

export const categoryLabels: Record<PromptBlock['category'], string> = {
  base: 'Base Engine',
  packages: 'Packages',
  upgrades: 'Upgrades',
  modules: 'Modules',
  reference_rules: 'Reference Rules',
  brand_overrides: 'Brand Overrides',
  scraping: 'Scraping Prompt'
};
