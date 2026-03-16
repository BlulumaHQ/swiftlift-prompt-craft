import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Fetch required prompts from database ──
async function fetchRequiredPrompts(): Promise<{
  extractionPrompt: string;
  masterPrompt: string;
  assemblyRules: string;
}> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const requiredNames = [
    "SwiftLift Source Extraction Prompt V1",
    "SwiftLift Final Build Master Prompt V1",
    "SwiftLift Prompt Assembly Rules V1",
  ];

  const { data, error } = await supabase
    .from("prompts")
    .select("prompt_name, content")
    .in("prompt_name", requiredNames);

  if (error) {
    throw new Error(`Failed to fetch prompts from database: ${error.message}`);
  }

  const promptMap = new Map<string, string>();
  for (const row of data || []) {
    promptMap.set(row.prompt_name, row.content);
  }

  for (const name of requiredNames) {
    if (!promptMap.has(name) || !promptMap.get(name)?.trim()) {
      throw new Error(`Required prompt missing: ${name}`);
    }
  }

  return {
    extractionPrompt: promptMap.get(requiredNames[0])!,
    masterPrompt: promptMap.get(requiredNames[1])!,
    assemblyRules: promptMap.get(requiredNames[2])!,
  };
}

// ── compileExtractionUserPrompt ──
function compileExtractionUserPrompt(input: {
  sourceUrl: string;
  referenceUrl: string;
  businessType: string;
  userNotes: string;
}): string {
  return `SOURCE URL:
${input.sourceUrl}

REFERENCE URL:
${input.referenceUrl || "(none)"}

BUSINESS TYPE:
${input.businessType || "(not specified)"}

USER NOTES:
${input.userNotes || "(none)"}

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
- Return valid JSON only.`;
}

// ── callClaudeExtraction ──
async function callClaudeExtraction(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const textBlock = message.content.find((b: any) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content");
  }
  return textBlock.text;
}

// ── parseClaudeTextToJson ──
function parseClaudeTextToJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      return JSON.parse(match[1].trim());
    }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("Could not parse Claude response as JSON");
  }
}

// ── validateExtractionJson ──
function validateExtractionJson(data: any): boolean {
  return (
    data &&
    typeof data === "object" &&
    data.site_meta !== undefined &&
    data.copywriting !== undefined &&
    data.business_info !== undefined
  );
}

// ── normalizeExtractionData ──
function normalizeExtractionData(data: any): any {
  const str = (v: any) => (typeof v === "string" ? v : "");
  const arr = (v: any) => (Array.isArray(v) ? v : []);
  const obj = (v: any, defaults: any) => {
    const result: any = {};
    for (const key of Object.keys(defaults)) {
      const def = defaults[key];
      if (Array.isArray(def)) result[key] = arr(v?.[key]);
      else if (typeof def === "object" && def !== null)
        result[key] = obj(v?.[key], def);
      else result[key] = str(v?.[key]);
    }
    return result;
  };

  const template = {
    site_meta: { source_url: "", site_name: "", logo_url: "", favicon_url: "", primary_domain: "" },
    site_structure: [],
    copywriting: {
      global_value_proposition: "", brand_summary: "", tone_of_voice: "",
      all_headings: [], all_subheadings: [], all_paragraphs: [], all_button_texts: [],
      all_ctas: [], all_form_labels: [], all_nav_labels: [], all_footer_text: [],
      all_faqs: [], all_testimonials: [], all_offers: [],
    },
    business_info: {
      business_name: "", services: [], service_details: [], target_audience: [],
      locations_served: [], contact_info: { phone: "", email: "", address: "" },
      hours: [], social_links: [], trust_signals: [],
    },
    design_system: {
      primary_color: "", secondary_color: "", accent_color: "", additional_colors: [],
      heading_font_family: "", body_font_family: "",
      font_sizes: { hero_title: "", page_title: "", section_title: "", body_text: "", button_text: "" },
      font_weights: { hero_title: "", page_title: "", section_title: "", body_text: "", button_text: "" },
      button_style: "", border_radius_style: "", overall_visual_direction: "",
    },
    images: {
      hero_images: [], logo_images: [], section_images: [], gallery_images: [],
      team_images: [], service_images: [], background_images: [], all_image_urls: [],
    },
    extraction_notes: { missing_information: [], warnings: [] },
  };

  const normalized: any = {};
  normalized.site_meta = obj(data.site_meta, template.site_meta);
  normalized.site_structure = arr(data.site_structure);
  normalized.copywriting = obj(data.copywriting, template.copywriting);
  normalized.business_info = obj(data.business_info, template.business_info);
  normalized.design_system = obj(data.design_system, template.design_system);
  normalized.images = obj(data.images, template.images);
  normalized.extraction_notes = obj(data.extraction_notes, template.extraction_notes);
  return normalized;
}

// ── Formatting functions ──

function formatBulletList(items: any[]): string {
  if (!items || items.length === 0) return "";
  return items
    .map((item) => {
      if (typeof item === "string") return `- ${item}`;
      if (typeof item === "object") return `- ${JSON.stringify(item)}`;
      return `- ${String(item)}`;
    })
    .join("\n");
}

function formatLabeledLines(obj: any): string {
  if (!obj || typeof obj !== "object") return "";
  return Object.entries(obj)
    .filter(([, v]) => v !== "" && v !== undefined && v !== null)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: ${v.join(", ")}`;
      if (typeof v === "object" && v !== null) return `${k}:\n${formatLabeledLines(v)}`;
      return `${k}: ${v}`;
    })
    .join("\n");
}

function formatSiteMeta(data: any): string {
  return formatLabeledLines(data.site_meta);
}

function formatSiteStructure(data: any): string {
  const pages = data.site_structure || [];
  if (pages.length === 0) return "";
  return pages
    .map(
      (p: any) =>
        `Page Title: ${p.page_title || ""}
Page Type: ${p.page_type || ""}
URL: ${p.url || ""}
Slug: ${p.slug || ""}
Nav Label: ${p.nav_label || ""}
Meta Title: ${p.meta_title || ""}
Meta Description: ${p.meta_description || ""}`,
    )
    .join("\n\n");
}

function formatCopywriting(data: any): string {
  const c = data.copywriting || {};
  const sections: string[] = [];
  if (c.global_value_proposition) sections.push(`Global Value Proposition:\n${c.global_value_proposition}`);
  if (c.brand_summary) sections.push(`Brand Summary:\n${c.brand_summary}`);
  if (c.tone_of_voice) sections.push(`Tone of Voice:\n${c.tone_of_voice}`);
  const listSections: [string, string][] = [
    ["Headings", "all_headings"], ["Subheadings", "all_subheadings"],
    ["Paragraphs", "all_paragraphs"], ["Button Texts", "all_button_texts"],
    ["CTAs", "all_ctas"], ["Form Labels", "all_form_labels"],
    ["Navigation Labels", "all_nav_labels"], ["Footer Text", "all_footer_text"],
    ["FAQs", "all_faqs"], ["Testimonials", "all_testimonials"], ["Offers", "all_offers"],
  ];
  for (const [label, key] of listSections) {
    const items = c[key];
    if (items && items.length > 0) sections.push(`${label}:\n${formatBulletList(items)}`);
  }
  return sections.join("\n\n");
}

function formatBusinessInfo(data: any): string {
  const b = data.business_info || {};
  const sections: string[] = [];
  if (b.business_name) sections.push(`Business Name: ${b.business_name}`);
  if (b.services?.length) sections.push(`Services:\n${formatBulletList(b.services)}`);
  if (b.service_details?.length) sections.push(`Service Details:\n${formatBulletList(b.service_details)}`);
  if (b.target_audience?.length) sections.push(`Target Audience:\n${formatBulletList(b.target_audience)}`);
  if (b.locations_served?.length) sections.push(`Locations Served:\n${formatBulletList(b.locations_served)}`);
  const ci = b.contact_info;
  if (ci && (ci.phone || ci.email || ci.address)) {
    sections.push(
      `Contact Information:\n${ci.phone ? `Phone: ${ci.phone}\n` : ""}${ci.email ? `Email: ${ci.email}\n` : ""}${ci.address ? `Address: ${ci.address}` : ""}`.trim(),
    );
  }
  if (b.hours?.length) sections.push(`Hours:\n${formatBulletList(b.hours)}`);
  if (b.social_links?.length) sections.push(`Social Links:\n${formatBulletList(b.social_links)}`);
  if (b.trust_signals?.length) sections.push(`Trust Signals:\n${formatBulletList(b.trust_signals)}`);
  return sections.join("\n\n");
}

function formatDesignSystem(data: any): string {
  const d = data.design_system || {};
  const lines: string[] = [];
  if (d.primary_color) lines.push(`Primary Color: ${d.primary_color}`);
  if (d.secondary_color) lines.push(`Secondary Color: ${d.secondary_color}`);
  if (d.accent_color) lines.push(`Accent Color: ${d.accent_color}`);
  if (d.additional_colors?.length) lines.push(`Additional Colors: ${d.additional_colors.join(", ")}`);
  if (d.heading_font_family) lines.push(`Heading Font Family: ${d.heading_font_family}`);
  if (d.body_font_family) lines.push(`Body Font Family: ${d.body_font_family}`);
  if (d.font_sizes) {
    const fsLines = Object.entries(d.font_sizes).filter(([, v]) => v).map(([k, v]) => `  ${k}: ${v}`);
    if (fsLines.length) lines.push(`Font Sizes:\n${fsLines.join("\n")}`);
  }
  if (d.font_weights) {
    const fwLines = Object.entries(d.font_weights).filter(([, v]) => v).map(([k, v]) => `  ${k}: ${v}`);
    if (fwLines.length) lines.push(`Font Weights:\n${fwLines.join("\n")}`);
  }
  if (d.button_style) lines.push(`Button Style: ${d.button_style}`);
  if (d.border_radius_style) lines.push(`Border Radius Style: ${d.border_radius_style}`);
  if (d.overall_visual_direction) lines.push(`Overall Visual Direction: ${d.overall_visual_direction}`);
  return lines.join("\n");
}

function formatImages(data: any): string {
  const img = data.images || {};
  const categories: [string, string][] = [
    ["Hero Images", "hero_images"], ["Logo Images", "logo_images"],
    ["Section Images", "section_images"], ["Gallery Images", "gallery_images"],
    ["Team Images", "team_images"], ["Service Images", "service_images"],
    ["Background Images", "background_images"], ["All Image URLs", "all_image_urls"],
  ];
  const sections: string[] = [];
  for (const [label, key] of categories) {
    const items = img[key];
    if (items && items.length > 0) sections.push(`${label}:\n${formatBulletList(items)}`);
  }
  return sections.join("\n\n");
}

function formatExtractionNotes(data: any): string {
  const notes = data.extraction_notes || {};
  const sections: string[] = [];
  if (notes.missing_information?.length) sections.push(`Missing Information:\n${formatBulletList(notes.missing_information)}`);
  if (notes.warnings?.length) sections.push(`Warnings:\n${formatBulletList(notes.warnings)}`);
  return sections.join("\n\n");
}

// ── assemblePrompt — fill template with formatted blocks ──
function assemblePrompt(
  template: string,
  blocks: {
    siteMeta: string;
    siteStructure: string;
    copywriting: string;
    businessInfo: string;
    designSystem: string;
    images: string;
    extractionNotes: string;
  },
  referenceUrl: string,
  userNotes: string,
): string {
  return template
    .replace("{{SITE_META}}", blocks.siteMeta || "")
    .replace("{{SITE_STRUCTURE}}", blocks.siteStructure || "")
    .replace("{{COPYWRITING}}", blocks.copywriting || "")
    .replace("{{BUSINESS_INFO}}", blocks.businessInfo || "")
    .replace("{{DESIGN_SYSTEM}}", blocks.designSystem || "")
    .replace("{{IMAGES}}", blocks.images || "")
    .replace("{{EXTRACTION_NOTES}}", blocks.extractionNotes || "")
    .replace("{{REFERENCE_URL}}", referenceUrl || "(none)")
    .replace("{{USER_NOTES}}", userNotes || "(none)")
    .replace("{{SOURCE_URL}}", blocks.siteMeta || "")
    .replace("{{REFERENCE_URL}}", referenceUrl || "(none)")
    .replace("{{SCRAPED_DATA}}", blocks.siteMeta || "");
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "ANTHROPIC_API_KEY is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { sourceUrl, referenceUrl, conversionLayoutUrl, businessType, userNotes, packageTier, themeMode, primaryColor, secondaryColor, primaryFont, fontWeight, enabledModules, localPrompts } = await req.json();

    if (!sourceUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Source URL is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tier = packageTier === "350" ? "350" : "550";
    const tierLabelA = tier === "350" ? "$350 Standard Layout" : "$550 Standard Layout";
    const tierLabelB = tier === "350" ? "$450 Premium Conversion Layout" : "$750 Premium Conversion Layout";

    // DEBUG MODE: Use local prompts passed from the client if available
    let extractionPrompt: string;
    let masterPrompt: string;
    let assemblyRules: string;

    if (localPrompts?.extractionPrompt && localPrompts?.masterPrompt && localPrompts?.assemblyRules) {
      console.log("DEBUG MODE: Using local prompts from client.");
      extractionPrompt = localPrompts.extractionPrompt;
      masterPrompt = localPrompts.masterPrompt;
      assemblyRules = localPrompts.assemblyRules;
    } else {
      console.log("Fetching prompts from database...");
      const dbPrompts = await fetchRequiredPrompts();
      extractionPrompt = dbPrompts.extractionPrompt;
      masterPrompt = dbPrompts.masterPrompt;
      assemblyRules = dbPrompts.assemblyRules;
      console.log("Prompts loaded from database successfully.");
    }

    // Step 2: Compile extraction user prompt
    console.log("Starting extraction for:", sourceUrl);
    const userPrompt = compileExtractionUserPrompt({
      sourceUrl,
      referenceUrl: referenceUrl || "",
      businessType: businessType || "",
      userNotes: userNotes || "",
    });

    // Step 3: Call Claude for extraction using DB extraction prompt
    const rawText = await callClaudeExtraction(apiKey, extractionPrompt, userPrompt);
    console.log("Claude response received, length:", rawText.length);

    // Step 4: Parse JSON
    const parsedData = parseClaudeTextToJson(rawText);

    // Step 5: Validate
    if (!validateExtractionJson(parsedData)) {
      return new Response(
        JSON.stringify({ success: false, error: "Claude returned invalid extraction data." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 6: Normalize
    const normalized = normalizeExtractionData(parsedData);

    // Step 7: Format blocks (shared between both prompts)
    const blocks = {
      siteMeta: formatSiteMeta(normalized),
      siteStructure: formatSiteStructure(normalized),
      copywriting: formatCopywriting(normalized),
      businessInfo: formatBusinessInfo(normalized),
      designSystem: formatDesignSystem(normalized),
      images: formatImages(normalized),
      extractionNotes: formatExtractionNotes(normalized),
    };

    // Build brand override block
    const brandOverrideParts: string[] = [];
    if (primaryColor) brandOverrideParts.push(`Primary Color: ${primaryColor}`);
    if (secondaryColor) brandOverrideParts.push(`Secondary Color: ${secondaryColor}`);
    if (primaryFont) brandOverrideParts.push(`Primary Font: ${primaryFont}`);
    if (fontWeight) brandOverrideParts.push(`Font Weight: ${fontWeight}`);
    if (themeMode && themeMode !== 'auto') {
      brandOverrideParts.push(`Theme Mode: ${themeMode === 'force_light' ? 'Force Light — use light backgrounds, light surfaces, dark text' : 'Force Dark — use dark backgrounds, dark surfaces, light text'}`);
    }
    const brandOverrideBlock = brandOverrideParts.length > 0
      ? `\n\n--------------------------------------------------\nBRAND & THEME OVERRIDE\n--------------------------------------------------\n\n${brandOverrideParts.join('\n')}\n\nApply these brand overrides to the final design. Brand colors take priority over extracted design system colors. Theme mode affects page background, section backgrounds, surface/card tones, and text contrast — but does NOT override brand colors.`
      : '';

    // Build content module design continuity block
    const contentModuleNames: Record<string, string> = {
      portfolio: 'Portfolio / Projects',
      blog: 'Blog',
      gallery: 'Gallery',
    };
    const activeContentModules = (enabledModules || []).filter((m: string) => ['portfolio', 'blog', 'gallery'].includes(m));
    let contentModuleBlock = '';
    if (activeContentModules.length > 0) {
      const moduleList = activeContentModules.map((m: string) => contentModuleNames[m] || m).join(', ');
      contentModuleBlock = `\n\n--------------------------------------------------
CONTENT MODULE DESIGN CONTINUITY
--------------------------------------------------

Enabled Content Modules: ${moduleList}

CRITICAL RULE: Generated content modules must visually follow the existing website design system.

They must inherit:
- Typography (heading hierarchy, paragraph spacing, font families)
- Spacing (section padding, element gaps, margins)
- Grid layout (column structure, responsive breakpoints)
- Button style (shape, colors, hover states)
- Card style (borders, shadows, padding, radius)
- Color palette (primary, secondary, accent usage)
- Image aspect ratios
- Hover interactions

Do NOT introduce a new design system for these modules.
New pages must look like they were originally part of the website.

${activeContentModules.includes('portfolio') ? `PORTFOLIO MODULE:
- Generate a Portfolio listing page and individual Project detail pages.
- Portfolio cards must reuse the website's existing card style.
- Project pages must use the same typography hierarchy and spacing system.
` : ''}${activeContentModules.includes('blog') ? `BLOG MODULE:
- Generate a Blog listing page and an Article page template.
- Typography must follow the website's heading hierarchy and paragraph spacing.
` : ''}${activeContentModules.includes('gallery') ? `GALLERY MODULE:
- Generate an image grid layout and a lightbox image viewer.
- Gallery must inherit image border radius, spacing, overlay style, and hover effects.
` : ''}`;
    }

    // Use conversion layout URL for prompt B if provided
    const convUrl = conversionLayoutUrl || referenceUrl || "";

    // Step 8: Assemble BOTH prompts using the Master Prompt from the database
    // Prompt A = Standard Layout (uses masterPrompt as-is)
    // Prompt B = Premium Conversion Layout (uses masterPrompt with conversion layout modifications)
    
    // The master prompt template contains placeholders like {{SITE_META}}, {{COPYWRITING}}, etc.
    // Assembly Rules V1 governs how we fill those placeholders — we use deterministic formatting (already done above).
    
    const promptA = `SWIFTLIFT BUILD PROMPT — ${tierLabelA}\nSource: ${sourceUrl}\n\n` +
      assemblePrompt(masterPrompt, blocks, referenceUrl || "", userNotes || "") + brandOverrideBlock + contentModuleBlock;

    // For Prompt B, prepend a conversion layout directive before the master prompt
    const conversionDirective = `--------------------------------------------------
LAYOUT MODE: PREMIUM CONVERSION LAYOUT
--------------------------------------------------

Build a conversion-oriented layout using the same source business content.

This is NOT a marketing strategy or CRO analysis.
This is a LAYOUT UPGRADE ONLY.

Apply these layout principles:

1. Lead with the strongest value proposition or hero headline.
2. Place the primary call-to-action prominently above the fold.
3. Use a landing-page-inspired section flow:
   - Hero with clear CTA
   - Key benefits or services (visual, scannable)
   - Social proof / testimonials / trust signals early
   - Detailed service or offering breakdown
   - Secondary CTA or lead capture
   - About / credibility section
   - Final CTA / contact
   - Footer
4. Use stronger visual hierarchy: larger headings, bolder CTAs, more whitespace between sections.
5. Place trust signals (testimonials, certifications, years in business) closer to CTAs.
6. Use more prominent button styling for primary actions.
7. Repeat the primary CTA at strategic intervals throughout the page.
8. Use visual separators, background color alternation, or card layouts to create clear section breaks.

IMPORTANT: Do NOT add conversion strategy, CRO analysis, sales funnel planning, audience targeting, or marketing consulting content. Only restructure the layout for better conversion flow.

`;

    const promptB = `SWIFTLIFT BUILD PROMPT — ${tierLabelB}\nSource: ${sourceUrl}\n\n` +
      conversionDirective +
      assemblePrompt(masterPrompt, blocks, convUrl, userNotes || "") + brandOverrideBlock + contentModuleBlock;

    console.log("Prompts assembled from database prompts. A length:", promptA.length, "B length:", promptB.length);

    return new Response(
      JSON.stringify({ success: true, promptA, promptB }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
