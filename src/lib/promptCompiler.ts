interface PromptConfig {
  sourceUrl: string;
  referenceLayout: string;
  referenceUrl: string;
  packageTier: '350' | '550';
  modules: string[];
  addons: string[];
  primaryColor: string;
  secondaryColor: string;
  primaryFont: string;
  specialInstructions: string;
}

const moduleLabels: Record<string, string> = {
  team: 'Team', testimonials: 'Testimonials', faq: 'FAQ',
  portfolio: 'Portfolio / Projects', multilanguage: 'Multi-language', blog: 'Blog',
};

const addonLabels: Record<string, string> = {
  conversion: 'Conversion Strategy Layout',
  hero: 'Premium Hero Structure',
  luxury: 'Luxury Visual Direction',
};

function getDomain(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '');
  } catch { return url; }
}

export function compilePrompts(config: PromptConfig): { promptA: string; promptB: string } {
  const domain = getDomain(config.sourceUrl);
  const isHighTier = config.packageTier === '550';
  const ref = config.referenceUrl || config.referenceLayout || 'default agency layout';
  const tierA = isHighTier ? '$550 Standard' : '$350 Standard';
  const tierB = isHighTier ? '$750 Premium' : '$475 Premium';

  const moduleList = config.modules.map(m => moduleLabels[m] || m).join(', ');
  const addonList = config.addons.map(a => addonLabels[a] || a).join(', ');

  const brandBlock = (config.primaryColor || config.secondaryColor || config.primaryFont)
    ? `\n\nBRAND OVERRIDE\n${config.primaryColor ? `Primary Color: ${config.primaryColor}` : ''}${config.secondaryColor ? `\nSecondary Color: ${config.secondaryColor}` : ''}${config.primaryFont ? `\nPrimary Font: ${config.primaryFont} — override all heading and body typography with this font family.` : ''}`
    : '';

  const specialBlock = config.specialInstructions
    ? `\n\nSPECIAL INSTRUCTIONS\n${config.specialInstructions}`
    : '';

  // PROMPT A — Standard
  const promptA = `SWIFTLIFT BUILD PROMPT — ${tierA}
Project: ${domain}
Source: ${config.sourceUrl}
Reference: ${ref}
Package: ${tierA}

────────────────────────────────────

BASE INSTRUCTIONS
Build a modern, responsive website for ${domain} using the content scraped from the source URL. Follow the reference layout structure closely for section ordering, visual hierarchy, and component patterns.

The website must be:
- Fully responsive across desktop, tablet, and mobile
- SEO-optimized with proper heading hierarchy, meta descriptions, and alt text
- Fast-loading with optimized assets and lazy loading where appropriate
- Accessible following WCAG 2.1 AA guidelines

STRUCTURE REQUIREMENTS
${isHighTier ? `Create a comprehensive multi-page website with the following pages:
- Home (hero, key services overview, social proof, CTA)
- About (company story, mission, values)
- Services (detailed service pages with individual layouts)
- Contact (form, map integration, business hours)` : `Create a streamlined website with the following pages:
- Home (hero, services overview, brief about section, contact CTA)
- Services (combined services page)
- Contact (simple contact form and information)`}

CONTENT MODULES
${moduleList ? `Include the following content modules:\n${config.modules.map(m => {
  const label = moduleLabels[m] || m;
  switch(m) {
    case 'team': return `- ${label}: Display team members with photos, names, titles, and brief bios. Use a clean grid layout.`;
    case 'testimonials': return `- ${label}: Show client testimonials with names, company, and star ratings. Use a carousel or grid format.`;
    case 'faq': return `- ${label}: Implement an accordion-style FAQ section with at least 6 relevant questions and answers.`;
    case 'portfolio': return `- ${label}: Create a filterable portfolio/projects gallery. Include project images, descriptions, and categories. This covers all portfolio types including case studies and project showcases.`;
    case 'multilanguage': return `- ${label}: Implement language switching capability with proper content structure for multiple languages.`;
    case 'blog': return `- ${label}: Create a blog listing page with featured posts, categories, and pagination.`;
    default: return `- ${label}`;
  }
}).join('\n')}` : 'No additional content modules selected.'}
${brandBlock}${specialBlock}

────────────────────────────────────
END OF PROMPT A — ${tierA}`;

  // PROMPT B — Premium
  const promptB = `SWIFTLIFT BUILD PROMPT — ${tierB}
Project: ${domain}
Source: ${config.sourceUrl}
Reference: ${ref}
Package: ${tierB}

────────────────────────────────────

BASE INSTRUCTIONS
Build a premium, high-converting website for ${domain} using content from the source URL. This is an upgraded build that includes enhanced design patterns, advanced interactions, and premium visual treatment beyond the standard package.

The website must be:
- Fully responsive with device-specific optimizations
- SEO-optimized with schema markup, OG tags, and comprehensive meta data
- Performance-optimized targeting 90+ Lighthouse scores
- Accessible following WCAG 2.1 AA guidelines
- Built with premium micro-interactions and smooth transitions

STRUCTURE REQUIREMENTS
${isHighTier ? `Create a comprehensive, premium multi-page website:
- Home (cinematic hero with animation, dynamic services showcase, testimonial carousel, stats counter, newsletter signup, multi-CTA strategy)
- About (immersive company story with timeline, team showcase, company values with icons, client logos)
- Services (individual service pages with detailed layouts, process flows, related case studies)
- Portfolio (filterable gallery with lightbox, project detail pages with before/after)
- Contact (multi-step form, live chat widget placeholder, office locations map)
- Blog (magazine-style layout with featured posts, sidebar, newsletter integration)` : `Create an enhanced multi-page website:
- Home (animated hero, services grid, testimonials, stats section, CTA)
- About (company story, team section, values)
- Services (detailed service cards with hover effects, process section)
- Contact (enhanced form with validation, map, business details)`}

CONTENT MODULES
${moduleList ? `Include the following enhanced content modules:\n${config.modules.map(m => {
  const label = moduleLabels[m] || m;
  switch(m) {
    case 'team': return `- ${label}: Premium team section with hover effects, social links, detailed bios, and role descriptions. Include a leadership spotlight feature.`;
    case 'testimonials': return `- ${label}: Dynamic testimonial system with video testimonial placeholders, star ratings, company logos, and an auto-rotating carousel with manual navigation.`;
    case 'faq': return `- ${label}: Interactive FAQ with search functionality, categorized sections, and smooth accordion animations. Include at least 10 comprehensive Q&As.`;
    case 'portfolio': return `- ${label}: Premium filterable portfolio with masonry grid, lightbox previews, detailed case study pages, project stats, and before/after comparisons where applicable.`;
    case 'multilanguage': return `- ${label}: Full multi-language implementation with language detection, RTL support preparation, and seamless content switching with preserved navigation state.`;
    case 'blog': return `- ${label}: Magazine-style blog with featured hero posts, category filtering, reading time estimates, social sharing, related posts, and newsletter signup integration.`;
    default: return `- ${label}`;
  }
}).join('\n')}` : 'No additional content modules selected.'}

PREMIUM ADD-ONS
${addonList ? config.addons.map(a => {
  switch(a) {
    case 'conversion': return `✦ CONVERSION STRATEGY LAYOUT\nImplement conversion-optimized page structures including:\n- Strategic CTA placement throughout the user journey\n- Trust signals (badges, certifications, client counts)\n- Urgency elements (limited availability, booking counters)\n- Social proof positioning near decision points\n- Exit-intent triggers and sticky CTAs on mobile`;
    case 'hero': return `✦ PREMIUM HERO STRUCTURE\nBuild an immersive hero section featuring:\n- Full-viewport cinematic layout with parallax scrolling\n- Animated headline with staggered text reveals\n- Background video or high-quality image with overlay gradient\n- Floating UI elements and decorative motion graphics\n- Dual CTA buttons with hover micro-interactions`;
    case 'luxury': return `✦ LUXURY VISUAL DIRECTION\nApply luxury design treatment across all pages:\n- Refined color palette with gold/premium accent tones\n- Serif + sans-serif typography pairing for elegance\n- Generous whitespace and editorial-style layouts\n- Subtle animations on scroll (fade-in, parallax layers)\n- High-end photography treatment with overlays and borders`;
    default: return `✦ ${addonLabels[a] || a}`;
  }
}).join('\n\n') : 'No premium add-ons selected.'}
${brandBlock}${specialBlock}

────────────────────────────────────
END OF PROMPT B — ${tierB}`;

  return { promptA, promptB };
}

export function getProjectName(sourceUrl: string): string {
  try {
    const hostname = new URL(sourceUrl.startsWith('http') ? sourceUrl : `https://${sourceUrl}`).hostname;
    return hostname.replace('www.', '').split('.')[0].charAt(0).toUpperCase() +
      hostname.replace('www.', '').split('.')[0].slice(1);
  } catch {
    return 'Untitled Project';
  }
}
