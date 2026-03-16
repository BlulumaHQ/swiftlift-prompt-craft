// Prompt Library Store — Clean 4-prompt system

const STORAGE_KEY = 'swiftlift_prompt_library_v6';

export type PromptCategory = 'core';
export type LibraryMode = 'prompts';
export type PromptStatus = 'CONFIRMED';
export type EntryType = 'Output Prompt';

// Backward compat aliases
export type WorkflowCategory = string;
export type PromptSection = PromptCategory;

export interface PromptBlock {
  id: string;
  name: string;
  category: PromptCategory;
  mode: LibraryMode;
  type: EntryType;
  status: PromptStatus;
  content: string;
}

export const categoryLabels: Record<PromptCategory, string> = {
  core: 'Core Prompt Library',
};

export const workflowCategoryLabels: Record<string, string> = {};

export const categoryOrder: PromptCategory[] = ['core'];
export const workflowCategoryOrder: string[] = [];

export const sectionLabels = categoryLabels;

const defaultPrompts: PromptBlock[] = [
  {
    id: 'final_build_master_v1',
    name: 'SwiftLift Final Build Master Prompt V1',
    category: 'core',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'CONFIRMED',
    content: `You are a deterministic website builder operating in PRODUCTION MODE.

Your goal is to generate a COMPLETE, CLIENT-READY WEBSITE in a single build.

The website must appear fully finished, professional, intentional, and conversion-focused.

No placeholder text.
No lorem ipsum.
No unfinished sections.
No generic filler copy.

--------------------------------------------------
BUILD FORMULA
--------------------------------------------------

New Website =
Reference Design Direction
+
Extracted Source Business Content
+
Preserved Source URL Structure
+
Preserved Source Copywriting Database

--------------------------------------------------
CORE BUILD RULES
--------------------------------------------------

1. Use the extracted source business content as the primary source of truth.
2. Preserve the original public page URL structure and slug naming from the source website whenever available.
3. Do not rename source page URLs unless explicitly required.
4. Preserve important business wording, service names, CTA text, and trust signals whenever possible.
5. Do not invent unsupported claims, certifications, awards, offers, or service details.
6. Rebuild the website with a modern, polished, high-conversion presentation while keeping the business identity intact.
7. Use the reference design direction for layout and visual refinement, but do not overwrite source business facts.
8. Every public-facing page must feel complete and intentional.
9. All pages must be mobile responsive and visually consistent.
10. The final site must feel fully designed, not templated.
11. Use only valid public-facing pages from the extracted source structure.
12. Preserve page intent from the source site.
13. Preserve important CTA wording, buttons, testimonials, FAQs, offers, and trust signals when available.
14. Use the extracted design system as a continuity guide where appropriate.
15. Do not omit meaningful button labels, navigation labels, form labels, or footer text when they are relevant to the site structure.
16. If some design assets cannot be extracted, generate visually appropriate equivalents that maintain the same level of polish.
17. Social media icons must only appear if valid social links exist in the extracted source data.
18. If no social links are found, do not display social icons anywhere.
19. Use clean, modern, visually consistent iconography only.
20. Mobile-first execution is required.

--------------------------------------------------
SOURCE SITE META
--------------------------------------------------

{{SITE_META}}

--------------------------------------------------
SOURCE SITE STRUCTURE
--------------------------------------------------

Use this as the required public page structure and preserve the original page slugs wherever possible:

{{SITE_STRUCTURE}}

--------------------------------------------------
SOURCE COPYWRITING DATABASE
--------------------------------------------------

Use this extracted copywriting database as the main source of business content. Preserve useful original wording whenever possible.

{{COPYWRITING}}

--------------------------------------------------
SOURCE BUSINESS INFORMATION
--------------------------------------------------

{{BUSINESS_INFO}}

--------------------------------------------------
SOURCE DESIGN SYSTEM
--------------------------------------------------

Use the extracted design system as a source reference for maintaining brand continuity where appropriate:

{{DESIGN_SYSTEM}}

--------------------------------------------------
SOURCE IMAGE URL DATABASE
--------------------------------------------------

Use these extracted image URLs where relevant. Preserve meaningful brand and content imagery.

{{IMAGES}}

--------------------------------------------------
EXTRACTION WARNINGS AND MISSING INFORMATION
--------------------------------------------------

Respect these limitations. Do not invent missing facts.

{{EXTRACTION_NOTES}}

--------------------------------------------------
REFERENCE DESIGN DIRECTION
--------------------------------------------------

Reference URL:
{{REFERENCE_URL}}

Use the reference site only as inspiration for layout quality, section flow, spacing, hierarchy, visual polish, and modern presentation.

Do not copy the source content from the reference site.
Do not replace the source business identity with the reference site.

--------------------------------------------------
USER NOTES
--------------------------------------------------

{{USER_NOTES}}

--------------------------------------------------
FINAL BUILD INSTRUCTION
--------------------------------------------------

Build the complete website using the extracted source website database above.

Requirements:
- preserve source page intent
- preserve source URL structure
- preserve critical service wording
- preserve important CTA wording
- preserve testimonials, FAQs, offers, and trust signals when available
- use the extracted design system as a continuity guide
- use the reference design direction to improve presentation quality
- output a fully built, client-ready website`,
  },
  {
    id: 'source_extraction_v1',
    name: 'SwiftLift Source Extraction Prompt V1',
    category: 'core',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'CONFIRMED',
    content: `You are a deterministic website source extraction engine.

Your task is to extract ALL usable business, structural, design, and asset information from the Source URL so the website can be rebuilt as accurately as possible.

This output will be used as a structured database for rebuilding the website and generating a final website build prompt.

CRITICAL RULES

1. Use the Source URL as the primary source of truth.
2. Preserve original wording whenever possible.
3. Do not summarize aggressively.
4. Do not omit meaningful public-facing copywriting.
5. Extract and preserve the original public URL structure and slug naming whenever available.
6. Do not rename page URLs unless the source clearly does not provide a usable public slug.
7. Extract all meaningful page titles, headings, subheadings, paragraph copy, button labels, navigation labels, form labels, footer text, CTA copy, FAQ content, testimonial content, and offer text.
8. Extract all meaningful business information including services, service details, locations served, contact information, hours, trust signals, and social links.
9. Extract design-related information including primary color, secondary color, accent color, additional colors, heading font family, body font family, font size hierarchy, font weight hierarchy, button style, border radius style, and overall visual direction.
10. Extract all usable public image URLs including logo, favicon, hero images, section images, service images, gallery images, team images, background images, and any other meaningful image assets.
11. Ignore privacy policy, terms, login, account, cart, checkout, cookie notices, and unrelated blog clutter unless they contain important business facts.
12. Do not invent facts.
13. Merge duplicate information cleanly while preserving important wording.
14. Return valid JSON only.
15. Do not output markdown.
16. Do not output explanations.
17. Leave missing values blank or as empty arrays.

RETURN THIS EXACT JSON STRUCTURE

{
  "site_meta": {
    "source_url": "",
    "site_name": "",
    "logo_url": "",
    "favicon_url": "",
    "primary_domain": ""
  },
  "site_structure": [
    {
      "page_title": "",
      "page_type": "",
      "url": "",
      "slug": "",
      "nav_label": "",
      "meta_title": "",
      "meta_description": ""
    }
  ],
  "copywriting": {
    "global_value_proposition": "",
    "brand_summary": "",
    "tone_of_voice": "",
    "all_headings": [],
    "all_subheadings": [],
    "all_paragraphs": [],
    "all_button_texts": [],
    "all_ctas": [],
    "all_form_labels": [],
    "all_nav_labels": [],
    "all_footer_text": [],
    "all_faqs": [],
    "all_testimonials": [],
    "all_offers": []
  },
  "business_info": {
    "business_name": "",
    "services": [],
    "service_details": [],
    "target_audience": [],
    "locations_served": [],
    "contact_info": {
      "phone": "",
      "email": "",
      "address": ""
    },
    "hours": [],
    "social_links": [],
    "trust_signals": []
  },
  "design_system": {
    "primary_color": "",
    "secondary_color": "",
    "accent_color": "",
    "additional_colors": [],
    "heading_font_family": "",
    "body_font_family": "",
    "font_sizes": {
      "hero_title": "",
      "page_title": "",
      "section_title": "",
      "body_text": "",
      "button_text": ""
    },
    "font_weights": {
      "hero_title": "",
      "page_title": "",
      "section_title": "",
      "body_text": "",
      "button_text": ""
    },
    "button_style": "",
    "border_radius_style": "",
    "overall_visual_direction": ""
  },
  "images": {
    "hero_images": [],
    "logo_images": [],
    "section_images": [],
    "gallery_images": [],
    "team_images": [],
    "service_images": [],
    "background_images": [],
    "all_image_urls": []
  },
  "extraction_notes": {
    "missing_information": [],
    "warnings": []
  }
}`,
  },
  {
    id: 'assembly_rules_v1',
    name: 'SwiftLift Prompt Assembly Rules V1',
    category: 'core',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'CONFIRMED',
    content: `ASSEMBLY RULES

1. Do not rewrite the locked Master Prompt structure.
2. Replace each placeholder block with formatted extracted data.
3. Arrays must be formatted as plain text bullet lines beginning with "- ".
4. Nested objects must be formatted as labeled plain text lines.
5. Empty values must remain blank.
6. Preserve original source URLs and slugs exactly as extracted.
7. Do not summarize or compress extracted content during assembly.
8. The final output must be one complete copy-paste-ready Lovable website build prompt.

BLOCK FORMATTING RULES

SITE_META
- format as labeled lines

SITE_STRUCTURE
- format each page as:
  - Page Title: ...
    Page Type: ...
    URL: ...
    Slug: ...
    Nav Label: ...
    Meta Title: ...
    Meta Description: ...

COPYWRITING
- format all arrays as bullet lists
- keep original wording
- group into:
  - Global Value Proposition
  - Brand Summary
  - Tone of Voice
  - Headings
  - Subheadings
  - Paragraphs
  - Button Texts
  - CTAs
  - Form Labels
  - Navigation Labels
  - Footer Text
  - FAQs
  - Testimonials
  - Offers

BUSINESS_INFO
- format as labeled sections with bullet lists

DESIGN_SYSTEM
- format as labeled lines and nested sections
- preserve color values and font data exactly as extracted

IMAGES
- format by category with bullet lists of URLs

EXTRACTION_NOTES
- format as bullet lists`,
  },
  {
    id: 'generator_app_build_v1',
    name: 'SwiftLift Generator App Build Prompt V1',
    category: 'core',
    mode: 'prompts',
    type: 'Output Prompt',
    status: 'CONFIRMED',
    content: `You are building a production-ready internal web app called:

SwiftLift Prompt Generator

GOAL

Rebuild the Prompt Library and backend workflow from scratch into a minimal, clean, fully usable system focused on one primary function only:

The user enters:
- Source URL
- Reference URL
- Business Type
- User Notes

Then clicks:
- Generate

The app must automatically:
1. send a structured extraction request to Claude
2. extract website data from the Source URL
3. validate and normalize the extracted JSON
4. format the extracted data into structured text blocks
5. inject those blocks into a locked Master Prompt template
6. output one final copy-paste-ready Lovable website build prompt

DO NOT build extra future features.
DO NOT create empty placeholder workflows.
DO NOT create speculative prompt categories.
DO NOT add unnecessary modules.

Only build the minimum production-ready system required for this Generate flow.

--------------------------------------------------
PROMPT LIBRARY REQUIREMENTS
--------------------------------------------------

Delete the previous cluttered library structure and rebuild the Prompt Library using only these 4 entries:

1. SwiftLift Final Build Master Prompt V1
2. SwiftLift Source Extraction Prompt V1
3. SwiftLift Prompt Assembly Rules V1
4. SwiftLift Generator App Build Prompt V1

Do not create additional empty prompts.
Do not create future placeholder workflows.
This library must remain minimal and immediately usable.

--------------------------------------------------
APP FUNCTIONAL REQUIREMENTS
--------------------------------------------------

Build a clean internal admin-style interface.

The app must have these input fields:
- Source URL
- Reference URL
- Business Type
- User Notes

Main action:
- Generate

Output panels:
- Final Lovable Prompt
- Extraction Preview JSON
- Status / Error Panel

Buttons:
- Generate
- Copy Final Prompt
- Copy Extraction JSON

The user should not need to manually trigger scraping or assembly.
There must be only one main generation flow.

--------------------------------------------------
BACKEND GENERATION FLOW
--------------------------------------------------

Create one main API route:
POST /api/generate-final-prompt

This route must:
1. accept:
   - sourceUrl
   - referenceUrl
   - businessType
   - userNotes
2. compile a Claude extraction request
3. call Anthropic API securely from the backend
4. parse the returned JSON
5. validate the JSON structure
6. normalize missing fields to blank strings or empty arrays
7. format extracted data into these assembly blocks:
   - SITE_META
   - SITE_STRUCTURE
   - COPYWRITING
   - BUSINESS_INFO
   - DESIGN_SYSTEM
   - IMAGES
   - EXTRACTION_NOTES
8. inject the formatted blocks into the locked Master Prompt template
9. return:
   - success
   - finalPrompt
   - extractedData
   - error if failed

--------------------------------------------------
ANTHROPIC API INTEGRATION
--------------------------------------------------

Use Anthropic official SDK with a backend environment variable.

Environment variable:
ANTHROPIC_API_KEY

Do not expose the API key on the frontend.
The app should be ready to work once the user adds the real API key in the environment.

Use the Messages API architecture.
Claude should be used only for source extraction.
Final Master Prompt assembly must be deterministic and programmatic, not AI rewritten.

--------------------------------------------------
CLAUDE EXTRACTION SYSTEM PROMPT
--------------------------------------------------

Store this prompt in the Prompt Library as:
SwiftLift Source Extraction Prompt V1

Use this exact content:

You are a deterministic website source extraction engine.

Your task is to extract ALL usable business, structural, design, and asset information from the Source URL so the website can be rebuilt as accurately as possible.

This output will be used as a structured database for rebuilding the website and generating a final website build prompt.

CRITICAL RULES

1. Use the Source URL as the primary source of truth.
2. Preserve original wording whenever possible.
3. Do not summarize aggressively.
4. Do not omit meaningful public-facing copywriting.
5. Extract and preserve the original public URL structure and slug naming whenever available.
6. Do not rename page URLs unless the source clearly does not provide a usable public slug.
7. Extract all meaningful page titles, headings, subheadings, paragraph copy, button labels, navigation labels, form labels, footer text, CTA copy, FAQ content, testimonial content, and offer text.
8. Extract all meaningful business information including services, service details, locations served, contact information, hours, trust signals, and social links.
9. Extract design-related information including primary color, secondary color, accent color, additional colors, heading font family, body font family, font size hierarchy, font weight hierarchy, button style, border radius style, and overall visual direction.
10. Extract all usable public image URLs including logo, favicon, hero images, section images, service images, gallery images, team images, background images, and any other meaningful image assets.
11. Ignore privacy policy, terms, login, account, cart, checkout, cookie notices, and unrelated blog clutter unless they contain important business facts.
12. Do not invent facts.
13. Merge duplicate information cleanly while preserving important wording.
14. Return valid JSON only.
15. Do not output markdown.
16. Do not output explanations.
17. Leave missing values blank or as empty arrays.

RETURN THIS EXACT JSON STRUCTURE

{
  "site_meta": {
    "source_url": "",
    "site_name": "",
    "logo_url": "",
    "favicon_url": "",
    "primary_domain": ""
  },
  "site_structure": [
    {
      "page_title": "",
      "page_type": "",
      "url": "",
      "slug": "",
      "nav_label": "",
      "meta_title": "",
      "meta_description": ""
    }
  ],
  "copywriting": {
    "global_value_proposition": "",
    "brand_summary": "",
    "tone_of_voice": "",
    "all_headings": [],
    "all_subheadings": [],
    "all_paragraphs": [],
    "all_button_texts": [],
    "all_ctas": [],
    "all_form_labels": [],
    "all_nav_labels": [],
    "all_footer_text": [],
    "all_faqs": [],
    "all_testimonials": [],
    "all_offers": []
  },
  "business_info": {
    "business_name": "",
    "services": [],
    "service_details": [],
    "target_audience": [],
    "locations_served": [],
    "contact_info": {
      "phone": "",
      "email": "",
      "address": ""
    },
    "hours": [],
    "social_links": [],
    "trust_signals": []
  },
  "design_system": {
    "primary_color": "",
    "secondary_color": "",
    "accent_color": "",
    "additional_colors": [],
    "heading_font_family": "",
    "body_font_family": "",
    "font_sizes": {
      "hero_title": "",
      "page_title": "",
      "section_title": "",
      "body_text": "",
      "button_text": ""
    },
    "font_weights": {
      "hero_title": "",
      "page_title": "",
      "section_title": "",
      "body_text": "",
      "button_text": ""
    },
    "button_style": "",
    "border_radius_style": "",
    "overall_visual_direction": ""
  },
  "images": {
    "hero_images": [],
    "logo_images": [],
    "section_images": [],
    "gallery_images": [],
    "team_images": [],
    "service_images": [],
    "background_images": [],
    "all_image_urls": []
  },
  "extraction_notes": {
    "missing_information": [],
    "warnings": []
  }
}

--------------------------------------------------
CLAUDE EXTRACTION USER PROMPT TEMPLATE
--------------------------------------------------

Create a backend function that dynamically compiles this request:

SOURCE URL:
{sourceUrl}

REFERENCE URL:
{referenceUrl}

BUSINESS TYPE:
{businessType}

USER NOTES:
{userNotes}

TASK:
Extract the source website as completely as possible for downstream website rebuilding.

PRIORITIES
1. Preserve the original page URL structure and slug naming.
2. Extract all useful public-facing copywriting, including buttons, navigation, and section text.
3. Extract all business information, services, locations, testimonials, FAQs, offers, and contact details.
4. Extract design attributes including color palette, font families, font sizes, font weights, and visual direction.
5. Extract all usable public image URLs and classify them where possible.
6. Return only valid JSON in the required schema.

IMPORTANT
- Do not aggressively summarize.
- Do not omit public-facing copy.
- Do not rewrite service names.
- Do not invent facts.
- If information is missing, leave it blank.
- Return valid JSON only.

--------------------------------------------------
MASTER PROMPT TEMPLATE
--------------------------------------------------

Store this prompt in the Prompt Library as:
SwiftLift Final Build Master Prompt V1

Use this exact content:

You are a deterministic website builder operating in PRODUCTION MODE.

Your goal is to generate a COMPLETE, CLIENT-READY WEBSITE in a single build.

The website must appear fully finished, professional, intentional, and conversion-focused.

No placeholder text.
No lorem ipsum.
No unfinished sections.
No generic filler copy.

--------------------------------------------------
BUILD FORMULA
--------------------------------------------------

New Website =
Reference Design Direction
+
Extracted Source Business Content
+
Preserved Source URL Structure
+
Preserved Source Copywriting Database

--------------------------------------------------
CORE BUILD RULES
--------------------------------------------------

1. Use the extracted source business content as the primary source of truth.
2. Preserve the original public page URL structure and slug naming from the source website whenever available.
3. Do not rename source page URLs unless explicitly required.
4. Preserve important business wording, service names, CTA text, and trust signals whenever possible.
5. Do not invent unsupported claims, certifications, awards, offers, or service details.
6. Rebuild the website with a modern, polished, high-conversion presentation while keeping the business identity intact.
7. Use the reference design direction for layout and visual refinement, but do not overwrite source business facts.
8. Every public-facing page must feel complete and intentional.
9. All pages must be mobile responsive and visually consistent.
10. The final site must feel fully designed, not templated.
11. Use only valid public-facing pages from the extracted source structure.
12. Preserve page intent from the source site.
13. Preserve important CTA wording, buttons, testimonials, FAQs, offers, and trust signals when available.
14. Use the extracted design system as a continuity guide where appropriate.
15. Do not omit meaningful button labels, navigation labels, form labels, or footer text when they are relevant to the site structure.
16. If some design assets cannot be extracted, generate visually appropriate equivalents that maintain the same level of polish.
17. Social media icons must only appear if valid social links exist in the extracted source data.
18. If no social links are found, do not display social icons anywhere.
19. Use clean, modern, visually consistent iconography only.
20. Mobile-first execution is required.

--------------------------------------------------
SOURCE SITE META
--------------------------------------------------

{{SITE_META}}

--------------------------------------------------
SOURCE SITE STRUCTURE
--------------------------------------------------

Use this as the required public page structure and preserve the original page slugs wherever possible:

{{SITE_STRUCTURE}}

--------------------------------------------------
SOURCE COPYWRITING DATABASE
--------------------------------------------------

Use this extracted copywriting database as the main source of business content. Preserve useful original wording whenever possible.

{{COPYWRITING}}

--------------------------------------------------
SOURCE BUSINESS INFORMATION
--------------------------------------------------

{{BUSINESS_INFO}}

--------------------------------------------------
SOURCE DESIGN SYSTEM
--------------------------------------------------

Use the extracted design system as a source reference for maintaining brand continuity where appropriate:

{{DESIGN_SYSTEM}}

--------------------------------------------------
SOURCE IMAGE URL DATABASE
--------------------------------------------------

Use these extracted image URLs where relevant. Preserve meaningful brand and content imagery.

{{IMAGES}}

--------------------------------------------------
EXTRACTION WARNINGS AND MISSING INFORMATION
--------------------------------------------------

Respect these limitations. Do not invent missing facts.

{{EXTRACTION_NOTES}}

--------------------------------------------------
REFERENCE DESIGN DIRECTION
--------------------------------------------------

Reference URL:
{{REFERENCE_URL}}

Use the reference site only as inspiration for layout quality, section flow, spacing, hierarchy, visual polish, and modern presentation.

Do not copy the source content from the reference site.
Do not replace the source business identity with the reference site.

--------------------------------------------------
USER NOTES
--------------------------------------------------

{{USER_NOTES}}

--------------------------------------------------
FINAL BUILD INSTRUCTION
--------------------------------------------------

Build the complete website using the extracted source website database above.

Requirements:
- preserve source page intent
- preserve source URL structure
- preserve critical service wording
- preserve important CTA wording
- preserve testimonials, FAQs, offers, and trust signals when available
- use the extracted design system as a continuity guide
- use the reference design direction to improve presentation quality
- output a fully built, client-ready website

--------------------------------------------------
ASSEMBLY RULES
--------------------------------------------------

Store this prompt in the Prompt Library as:
SwiftLift Prompt Assembly Rules V1

Use this exact content:

ASSEMBLY RULES

1. Do not rewrite the locked Master Prompt structure.
2. Replace each placeholder block with formatted extracted data.
3. Arrays must be formatted as plain text bullet lines beginning with "- ".
4. Nested objects must be formatted as labeled plain text lines.
5. Empty values must remain blank.
6. Preserve original source URLs and slugs exactly as extracted.
7. Do not summarize or compress extracted content during assembly.
8. The final output must be one complete copy-paste-ready Lovable website build prompt.

BLOCK FORMATTING RULES

SITE_META
- format as labeled lines

SITE_STRUCTURE
- format each page as:
  - Page Title: ...
    Page Type: ...
    URL: ...
    Slug: ...
    Nav Label: ...
    Meta Title: ...
    Meta Description: ...

COPYWRITING
- format all arrays as bullet lists
- keep original wording
- group into:
  - Global Value Proposition
  - Brand Summary
  - Tone of Voice
  - Headings
  - Subheadings
  - Paragraphs
  - Button Texts
  - CTAs
  - Form Labels
  - Navigation Labels
  - Footer Text
  - FAQs
  - Testimonials
  - Offers

BUSINESS_INFO
- format as labeled sections with bullet lists

DESIGN_SYSTEM
- format as labeled lines and nested sections
- preserve color values and font data exactly as extracted

IMAGES
- format by category with bullet lists of URLs

EXTRACTION_NOTES
- format as bullet lists

--------------------------------------------------
IMPLEMENTATION DETAILS
--------------------------------------------------

Build helper functions for:
- compileExtractionPrompt(input)
- callClaudeExtraction(input)
- validateExtractionJson(data)
- normalizeExtractionData(data)
- formatSiteMeta(data)
- formatSiteStructure(data)
- formatCopywriting(data)
- formatBusinessInfo(data)
- formatDesignSystem(data)
- formatImages(data)
- formatExtractionNotes(data)
- assembleFinalPrompt(blocks)

Use deterministic programmatic assembly for the final prompt.
Do not use AI to rewrite the final assembled Master Prompt.

--------------------------------------------------
UI / UX REQUIREMENTS
--------------------------------------------------

The app should look clean, modern, minimal, and internal-tool focused.

Requirements:
- keep the existing app layout unchanged
- keep the existing app functions unchanged except for the prompt library cleanup requested here
- keep the existing top bar unchanged
- keep the existing builder / revision / demo sites / quality control / lock preview areas unchanged
- do not redesign the prompt editor
- do not add new layout sections
- do not remove existing functional UI outside this prompt library cleanup scope

Within that restriction:
- keep the prompt library clean
- show only the 4 final prompts
- allow easy prompt editing for the 4 core prompt entries only

--------------------------------------------------
FINAL DELIVERY REQUIREMENT
--------------------------------------------------

Deliver the app with the Prompt Library fully cleaned and replaced by these exact 4 prompts only.
Do not leave old prompt entries behind.
Do not create additional empty prompts.
Do not modify anything outside the requested cleanup and prompt replacement scope.`,
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
