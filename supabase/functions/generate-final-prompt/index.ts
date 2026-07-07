import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

class StepError extends Error {
  step: string;
  status: number;

  constructor(step: string, message: string, status = 500) {
    super(message);
    this.name = "StepError";
    this.step = step;
    this.status = status;
  }
}

// ── Fetch required prompts from database ──
async function fetchRequiredPrompts(): Promise<{
  extractionPrompt: string;
  masterPrompt: string;
  assemblyRules: string;
}> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    throw new StepError("load_prompts", "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured.", 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Active prompt row IDs (Group B — the synced, authoritative rows)
  const activePromptIds: Record<string, string> = {
    "SwiftLift Source Extraction Prompt V1": "b7c1fb95-15f9-4e93-8a96-88e6152ee669",
    "SwiftLift Final Build Master Prompt V2": "035a3b80-251f-4bdf-9615-855a041eadca",
    "SwiftLift Prompt Assembly Rules V1": "cd77a34e-9cb0-44f1-8d31-e1764c531f8e",
  };

  const requiredNames = Object.keys(activePromptIds);
  const activeIds = Object.values(activePromptIds);

  const { data, error } = await supabase
    .from("prompts")
    .select("id, prompt_name, content")
    .in("id", activeIds);

  if (error) {
    throw new StepError("database_query", `Failed to fetch prompts from database: ${error.message}`, 500);
  }

  if (!data) {
    throw new StepError("database_query", "prompts table returned null", 500);
  }

  const promptMap = new Map<string, string>();
  for (const row of data) {
    promptMap.set(row.prompt_name, row.content);
  }

  for (const name of requiredNames) {
    if (!promptMap.has(name) || !promptMap.get(name)?.trim()) {
      throw new StepError("load_prompts", `Required prompt missing: ${name}`, 500);
    }
  }

  return {
    extractionPrompt: promptMap.get(requiredNames[0])!,
    masterPrompt: promptMap.get(requiredNames[1])!,
    assemblyRules: promptMap.get(requiredNames[2])!,
  };
}

type SourceWebsiteContext = {
  fetchedUrl: string;
  pageTitle: string;
  metaDescription: string;
  textSnapshot: string;
  headings: string[];
  paragraphs: string[];
  buttonTexts: string[];
  imageUrls: string[];
  discoveredUrls: string[];
};

function ensureHttpUrl(value: string): string {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtmlTags(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function uniqueStrings(values: string[], limit = 100): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= limit) break;
  }
  return result;
}

function extractTagText(html: string, tagName: string, limit = 40): string[] {
  const regex = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  return uniqueStrings(
    Array.from(html.matchAll(regex))
      .map((match) => stripHtmlTags(match[1] || ""))
      .filter((value) => value.length > 1),
    limit,
  );
}

function extractAttributeValues(html: string, tagName: string, attribute: string, limit = 40): string[] {
  const regex = new RegExp(`<${tagName}\\b[^>]*${attribute}=["']([^"']+)["'][^>]*>`, "gi");
  return uniqueStrings(
    Array.from(html.matchAll(regex))
      .map((match) => decodeHtmlEntities(match[1] || "").trim())
      .filter(Boolean),
    limit,
  );
}

function toAbsoluteUrl(baseUrl: string, rawUrl: string): string {
  try {
    const trimmed = (rawUrl || "").trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("javascript:") || trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) {
      return "";
    }
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return "";
  }
}

async function fetchSourceWebsiteContext(sourceUrl: string): Promise<SourceWebsiteContext> {
  const normalizedUrl = ensureHttpUrl(sourceUrl);
  if (!normalizedUrl) {
    throw new StepError("fetch_source", "Source URL is required for scraping.", 400);
  }

  const response = await fetch(normalizedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SwiftLiftBot/1.0; +https://lovable.dev)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new StepError("fetch_source", `Failed to fetch source URL: ${response.status} ${response.statusText}`, 400);
  }

  const html = await response.text();
  const fetchedUrl = response.url || normalizedUrl;
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescriptionMatch = html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    || html.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);

  const headings = uniqueStrings([
    ...extractTagText(html, "h1", 12),
    ...extractTagText(html, "h2", 20),
    ...extractTagText(html, "h3", 20),
  ], 40);
  const paragraphs = extractTagText(html, "p", 60).filter((value) => value.length > 25);
  const buttonTexts = uniqueStrings([
    ...extractTagText(html, "button", 30),
    ...extractAttributeValues(html, "input", "value", 20),
  ], 40);

  const imageUrls = uniqueStrings(
    Array.from(html.matchAll(/<(?:img|source)\b[^>]*(?:src|srcset)=["']([^"']+)["'][^>]*>/gi))
      .flatMap((match) => (match[1] || "").split(","))
      .map((value) => value.trim().split(" ")[0])
      .map((value) => toAbsoluteUrl(fetchedUrl, value))
      .filter(Boolean),
    80,
  );

  const discoveredUrls = uniqueStrings(
    [fetchedUrl, ...Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi))
      .map((match) => toAbsoluteUrl(fetchedUrl, match[1] || ""))
      .filter(Boolean)]
      .filter((url) => {
        try {
          const candidate = new URL(url);
          const origin = new URL(fetchedUrl).origin;
          return candidate.origin === origin;
        } catch {
          return false;
        }
      }),
    80,
  );

  const textSnapshot = stripHtmlTags(html).slice(0, 24000);

  return {
    fetchedUrl,
    pageTitle: stripHtmlTags(titleMatch?.[1] || ""),
    metaDescription: decodeHtmlEntities(metaDescriptionMatch?.[1] || "").trim(),
    textSnapshot,
    headings,
    paragraphs,
    buttonTexts,
    imageUrls,
    discoveredUrls,
  };
}

// ── compileExtractionUserPrompt ──
function compileExtractionUserPrompt(input: {
  sourceUrl: string;
  referenceUrl: string;
  businessType: string;
  userNotes: string;
  sourceContext: SourceWebsiteContext;
}): string {
  return `SOURCE URL:
${input.sourceUrl}

REFERENCE URL:
${input.referenceUrl || "(none)"}

BUSINESS TYPE:
${input.businessType || "(not specified)"}

USER NOTES:
${input.userNotes || "(none)"}

FETCHED SOURCE URL:
${input.sourceContext.fetchedUrl}

PAGE TITLE:
${input.sourceContext.pageTitle || "(none)"}

META DESCRIPTION:
${input.sourceContext.metaDescription || "(none)"}

DISCOVERED SOURCE URLS:
${input.sourceContext.discoveredUrls.length ? input.sourceContext.discoveredUrls.map((url) => `- ${url}`).join("\n") : "(none)"}

EXTRACTED HEADINGS:
${input.sourceContext.headings.length ? input.sourceContext.headings.map((value) => `- ${value}`).join("\n") : "(none)"}

EXTRACTED PARAGRAPHS:
${input.sourceContext.paragraphs.length ? input.sourceContext.paragraphs.map((value) => `- ${value}`).join("\n") : "(none)"}

EXTRACTED BUTTON TEXT:
${input.sourceContext.buttonTexts.length ? input.sourceContext.buttonTexts.map((value) => `- ${value}`).join("\n") : "(none)"}

EXTRACTED IMAGE URLS:
${input.sourceContext.imageUrls.length ? input.sourceContext.imageUrls.map((url) => `- ${url}`).join("\n") : "(none)"}

RAW SOURCE PAGE TEXT SNAPSHOT:
${input.sourceContext.textSnapshot || "(none)"}

TASK:
Extract the source website as completely as possible for downstream website rebuilding using the fetched source page content above as the primary dataset.

PRIORITIES
1. Preserve the original page URL structure and slug naming.
2. Extract all useful public-facing copywriting, including buttons, navigation, and section text.
3. Extract all business information, services, locations, testimonials, FAQs, offers, and contact details.
4. Extract design attributes including color palette, font families, font sizes, font weights, and visual direction.
5. Extract all usable public image URLs and classify them where possible.
6. Return only valid JSON in the required schema.

IMPORTANT
- Use the fetched source page content above; do not guess from the URL alone.
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
  // Strip markdown code blocks
  let cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch { /* continue */ }

  // Find JSON boundaries
  const jsonStart = cleaned.search(/[\{\[]/);
  if (jsonStart === -1) throw new Error("No JSON found in Claude response");

  const isArray = cleaned[jsonStart] === "[";
  const jsonEnd = cleaned.lastIndexOf(isArray ? "]" : "}");

  if (jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    try {
      return JSON.parse(cleaned);
    } catch { /* continue to repair */ }
  } else {
    cleaned = cleaned.substring(jsonStart);
  }

  // Repair common issues: trailing commas, control characters
  cleaned = cleaned
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\x00-\x1F\x7F]/g, (ch) => ch === "\n" || ch === "\r" || ch === "\t" ? ch : "");

  try {
    return JSON.parse(cleaned);
  } catch { /* continue to truncation repair */ }

  // Attempt truncated JSON repair
  const openBraces = (cleaned.match(/{/g) || []).length;
  const closeBraces = (cleaned.match(/}/g) || []).length;
  if (openBraces > closeBraces) {
    let repaired = cleaned;
    for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";
    try {
      console.warn("Recovered truncated JSON by closing braces");
      return JSON.parse(repaired);
    } catch { /* final fallback */ }
  }

  throw new Error("Could not parse Claude response as JSON after repair attempts");
}

// ── validateExtractionJson ──
// Accept any non-empty object — the normalization step will handle missing keys
function validateExtractionJson(data: any): boolean {
  return data && typeof data === "object" && Object.keys(data).length > 0;
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

function buildFallbackSiteStructure(urls: string[]): any[] {
  return urls.map((url, index) => {
    try {
      const parsed = new URL(url);
      const isHome = parsed.pathname === "/" || parsed.pathname === "";
      return {
        page_title: index === 0 ? "Home" : "",
        page_type: isHome ? "home" : "page",
        url,
        slug: isHome ? "/" : parsed.pathname,
        nav_label: "",
        meta_title: "",
        meta_description: "",
      };
    } catch {
      return {
        page_title: index === 0 ? "Home" : "",
        page_type: index === 0 ? "home" : "page",
        url,
        slug: "",
        nav_label: "",
        meta_title: "",
        meta_description: "",
      };
    }
  });
}

function hydrateExtractionFallbacks(normalized: any, sourceContext: SourceWebsiteContext, sourceUrl: string): any {
  const hydrated = structuredClone(normalized);
  hydrated.site_meta.source_url = hydrated.site_meta.source_url || sourceContext.fetchedUrl || sourceUrl;
  hydrated.site_meta.site_name = hydrated.site_meta.site_name || sourceContext.pageTitle || "";
  hydrated.site_meta.primary_domain = hydrated.site_meta.primary_domain || (() => {
    try {
      return new URL(sourceContext.fetchedUrl || sourceUrl).hostname;
    } catch {
      return "";
    }
  })();

  if (!hydrated.site_structure.length && sourceContext.discoveredUrls.length) {
    hydrated.site_structure = buildFallbackSiteStructure(sourceContext.discoveredUrls);
  }

  if (!hydrated.copywriting.all_headings.length && sourceContext.headings.length) {
    hydrated.copywriting.all_headings = sourceContext.headings;
  }
  if (!hydrated.copywriting.all_paragraphs.length && sourceContext.paragraphs.length) {
    hydrated.copywriting.all_paragraphs = sourceContext.paragraphs;
  }
  if (!hydrated.copywriting.all_button_texts.length && sourceContext.buttonTexts.length) {
    hydrated.copywriting.all_button_texts = sourceContext.buttonTexts;
  }

  if (!hydrated.images.all_image_urls.length && sourceContext.imageUrls.length) {
    hydrated.images.all_image_urls = sourceContext.imageUrls;
  }
  if (!hydrated.images.hero_images.length && sourceContext.imageUrls.length) {
    hydrated.images.hero_images = sourceContext.imageUrls.slice(0, 6);
  }

  if (!Array.isArray(hydrated.extraction_notes.warnings)) hydrated.extraction_notes.warnings = [];
  if (!hydrated.extraction_notes.warnings.includes("Direct source-page scrape was used to backfill empty extraction fields.")) {
    hydrated.extraction_notes.warnings.push("Direct source-page scrape was used to backfill empty extraction fields.");
  }

  return hydrated;
}

function findUnresolvedPlaceholders(value: string): string[] {
  const requiredTokens = [
    "{SOURCE_URL}", "{{SOURCE_URL}}",
    "{REFERENCE_URL}", "{{REFERENCE_URL}}",
    "{REFERENCE_SCREENSHOT}", "{{REFERENCE_SCREENSHOT}}",
    "{SCRAPED_DATA}", "{{SCRAPED_DATA}}",
    "{SCRAPED_URLS}", "{{SCRAPED_URLS}}",
    "{SITE_META}", "{{SITE_META}}",
    "{SITE_STRUCTURE}", "{{SITE_STRUCTURE}}",
    "{COPYWRITING}", "{{COPYWRITING}}",
    "{BUSINESS_INFO}", "{{BUSINESS_INFO}}",
    "{DESIGN_SYSTEM}", "{{DESIGN_SYSTEM}}",
    "{IMAGES}", "{{IMAGES}}",
    "{EXTRACTION_NOTES}", "{{EXTRACTION_NOTES}}",
    "{USER_NOTES}", "{{USER_NOTES}}",
    "{BRAND_NAME}", "{{BRAND_NAME}}",
    "{LAYOUT_MODE}", "{{LAYOUT_MODE}}",
    "{DEMO_SITE_URLS}", "{{DEMO_SITE_URLS}}",
    "{DEMO_SITE_SCREENSHOTS}", "{{DEMO_SITE_SCREENSHOTS}}",
    "{CONVERSION_REFERENCE_URLS}", "{{CONVERSION_REFERENCE_URLS}}",
    "{CONVERSION_REFERENCE_SCREENSHOTS}", "{{CONVERSION_REFERENCE_SCREENSHOTS}}",
    "{COMPANY_NAME}", "{{COMPANY_NAME}}",
  ];
  return requiredTokens.filter((token) => value.includes(token));
}

// ── Final sweep: resolve ANY remaining template tokens ──
function finalTokenSweep(prompt: string): string {
  // Replace any remaining {{...}} tokens with (none)
  let result = prompt.replace(/\{\{[A-Z_]+\}\}/g, "(none)");
  // Replace any remaining {SINGLE_BRACE_TOKENS} (uppercase + underscores only to avoid real content)
  result = result.replace(/\{([A-Z][A-Z_]{2,})\}/g, "(none)");
  return result;
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

// ── Safe string replace (avoids $ interpretation in replacement strings) ──
function safeReplace(str: string, search: string, replacement: string): string {
  const idx = str.indexOf(search);
  if (idx === -1) return str;
  return str.substring(0, idx) + replacement + str.substring(idx + search.length);
}

function safeReplaceAll(str: string, search: string, replacement: string): string {
  let result = str;
  let safety = 0;
  while (result.includes(search) && safety < 50) {
    result = safeReplace(result, search, replacement);
    safety++;
  }
  return result;
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
  runtimeValues: {
    sourceUrl: string;
    referenceUrl: string;
    referenceScreenshot: string;
    scrapedData: string;
    scrapedUrls: string;
    brandName: string;
    layoutMode: string;
  },
  userNotes: string,
  styleSeedContent: string = "",
): string {
  let result = template;

  const replacements: [string, string][] = [
    ["SOURCE_URL", runtimeValues.sourceUrl],
    ["REFERENCE_URL", runtimeValues.referenceUrl || "(none)"],
    ["REFERENCE_SCREENSHOT", runtimeValues.referenceScreenshot || "(none)"],
    ["SCRAPED_DATA", runtimeValues.scrapedData],
    ["SCRAPED_URLS", runtimeValues.scrapedUrls],
    ["BRAND_NAME", runtimeValues.brandName],
    ["LAYOUT_MODE", runtimeValues.layoutMode],
    ["COMPANY_NAME", runtimeValues.brandName],
    ["SITE_META", blocks.siteMeta || ""],
    ["SITE_STRUCTURE", blocks.siteStructure || ""],
    ["COPYWRITING", blocks.copywriting || ""],
    ["BUSINESS_INFO", blocks.businessInfo || ""],
    ["DESIGN_SYSTEM", blocks.designSystem || ""],
    ["IMAGES", blocks.images || ""],
    ["EXTRACTION_NOTES", blocks.extractionNotes || ""],
    ["USER_NOTES", userNotes || "(none)"],
    ["DEMO_SITE_URLS", "(none)"],
    ["DEMO_SITE_SCREENSHOTS", "(none)"],
    ["CONVERSION_REFERENCE_URLS", "(none)"],
    ["CONVERSION_REFERENCE_SCREENSHOTS", "(none)"],
    ["STYLE_SEED", styleSeedContent || "(none)"],
  ];

  for (const [key, value] of replacements) {
    result = safeReplaceAll(result, `{{${key}}}`, value);
    result = safeReplaceAll(result, `{${key}}`, value);
  }

  return result;
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let currentStep = "init";

  try {
    currentStep = "load_secrets";
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new StepError("load_secrets", "ANTHROPIC_API_KEY is not configured.", 500);
    }

    currentStep = "parse_request";
    const {
      sourceUrl, referenceUrl, conversionLayoutUrl, businessType, userNotes, packageTier, projectBrand,
      themeMode, primaryColor, secondaryColor, primaryFont, fontWeight,
      promptBThemeMode, promptBPrimaryColor, promptBSecondaryColor, promptBPrimaryFont, promptBFontWeight,
      promptALayoutOverride, promptBLayoutOverride,
      enabledModules, advancedModules, localPrompts,
      referenceAnalysis,
      styleSeedCode: rawStyleSeedCode,
    } = await req.json();
    const styleSeedCode: string = (typeof rawStyleSeedCode === 'string' && rawStyleSeedCode.trim())
      ? rawStyleSeedCode.trim()
      : 'AUTO';

    if (!sourceUrl) {
      throw new StepError("parse_request", "Source URL is required.", 400);
    }

    const resolvedBrand = projectBrand || "SwiftLift";
    const tier = packageTier === "350" ? "350" : "550";
    const layoutModeA = "STANDARD";
    const layoutModeB = "CONVERSION";
    const tierLabelA = tier === "350" ? "$350 Standard Layout" : "$550 Standard Layout";
    const tierLabelB = tier === "350" ? "$450 Premium Conversion Layout" : "$750 Premium Conversion Layout";

    let extractionPrompt: string;
    let masterPrompt: string;
    let assemblyRules: string;

    currentStep = "load_prompts";
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

    currentStep = "load_style_seed";
    const seedSupabaseUrl = Deno.env.get("SUPABASE_URL");
    const seedSupabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!seedSupabaseUrl || !seedSupabaseKey) {
      throw new StepError("load_style_seed", "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured.", 500);
    }
    const seedClient = createClient(seedSupabaseUrl, seedSupabaseKey);
    let styleSeed: { seed_code: string; seed_name: string; content: string };
    if (styleSeedCode && styleSeedCode !== 'AUTO') {
      const { data: seedRow, error: seedErr } = await seedClient
        .from('style_seeds')
        .select('seed_code, seed_name, content')
        .eq('active', true)
        .eq('seed_code', styleSeedCode)
        .maybeSingle();
      if (seedErr) {
        throw new StepError("load_style_seed", `Failed to load style seed: ${seedErr.message}`, 500);
      }
      if (!seedRow) {
        throw new StepError("load_style_seed", `Style seed not found or inactive: ${styleSeedCode}`, 404);
      }
      styleSeed = seedRow as any;
    } else {
      const { data: allSeeds, error: allErr } = await seedClient
        .from('style_seeds')
        .select('seed_code, seed_name, content')
        .eq('active', true);
      if (allErr) {
        throw new StepError("load_style_seed", `Failed to load style seeds: ${allErr.message}`, 500);
      }
      if (!allSeeds || allSeeds.length === 0) {
        throw new StepError("load_style_seed", "No active style seeds available.", 404);
      }
      styleSeed = allSeeds[Math.floor(Math.random() * allSeeds.length)] as any;
    }
    console.log("Selected style seed:", styleSeed.seed_code, styleSeed.seed_name);

    currentStep = "fetch_source";
    const sourceContext = await fetchSourceWebsiteContext(sourceUrl);

    currentStep = "compile_extraction_prompt";
    console.log("Starting extraction for:", sourceUrl);
    const userPrompt = compileExtractionUserPrompt({
      sourceUrl: ensureHttpUrl(sourceUrl),
      referenceUrl: referenceUrl || "",
      businessType: businessType || "",
      userNotes: userNotes || "",
      sourceContext,
    });

    currentStep = "call_claude";
    const rawText = await callClaudeExtraction(apiKey, extractionPrompt, userPrompt);
    console.log("Claude response received, length:", rawText.length);

    currentStep = "parse_extraction_response";
    const parsedData = parseClaudeTextToJson(rawText);

    currentStep = "validate_extraction_data";
    if (!validateExtractionJson(parsedData)) {
      throw new StepError("validate_extraction_data", "Claude returned invalid extraction data.", 422);
    }

    currentStep = "normalize_extraction_data";
    const normalized = hydrateExtractionFallbacks(
      normalizeExtractionData(parsedData),
      sourceContext,
      ensureHttpUrl(sourceUrl),
    );

    currentStep = "format_prompt_blocks";

    // ── Auto font selection logic ──
    function resolveAutoFont(font: string | undefined, industry: string | undefined): { heading: string; body: string } {
      if (font) {
        // Display-only fonts: pair with readable body font
        const displayOnly = ['Archivo Black', 'Clash Display', 'Syne'];
        const serifDisplay = ['Playfair Display', 'Cormorant Garamond', 'Lora', 'Merriweather', 'Libre Baskerville'];
        if (displayOnly.includes(font)) {
          return { heading: font, body: 'Inter' };
        }
        if (serifDisplay.includes(font)) {
          return { heading: font, body: 'Plus Jakarta Sans' };
        }
        return { heading: font, body: font };
      }
      // Auto-select based on industry
      const ind = (industry || '').toLowerCase();
      if (/tech|saas|ai|startup|software|app/.test(ind)) {
        return { heading: 'Sora', body: 'Inter' };
      }
      if (/creative|design|agency|brand|studio|art director/.test(ind)) {
        return { heading: 'Clash Display', body: 'Sora' };
      }
      if (/editorial|luxury|beauty|art|premium|fashion|jewelry/.test(ind)) {
        return { heading: 'Playfair Display', body: 'Inter' };
      }
      if (/landing|conversion|funnel/.test(ind)) {
        return { heading: 'Archivo Black', body: 'Inter' };
      }
      // Default: corporate / professional
      return { heading: 'Inter', body: 'Inter' };
    }




    const blocks = {
      siteMeta: formatSiteMeta(normalized),
      siteStructure: formatSiteStructure(normalized),
      copywriting: formatCopywriting(normalized),
      businessInfo: formatBusinessInfo(normalized),
      designSystem: formatDesignSystem(normalized),
      images: formatImages(normalized),
      extractionNotes: formatExtractionNotes(normalized),
    };

    // ── Build per-prompt brand & theme override blocks ──
    // Prompt B falls back to Prompt A values when its own fields are empty.
    const bPrimaryColorEff = promptBPrimaryColor || primaryColor || "";
    const bSecondaryColorEff = promptBSecondaryColor || secondaryColor || "";
    const bPrimaryFontEff = promptBPrimaryFont || primaryFont || "";
    const bFontWeightEff = promptBFontWeight || fontWeight || "";
    const bThemeModeEff = (promptBThemeMode && promptBThemeMode !== 'auto')
      ? promptBThemeMode
      : (themeMode || 'auto');

    const resolvedFontsA = resolveAutoFont(primaryFont, businessType);
    const resolvedFontsB = resolveAutoFont(bPrimaryFontEff, businessType);

    function buildBrandOverrideBlock(
      label: 'PROMPT A' | 'PROMPT B',
      pColor: string, sColor: string, fonts: { heading: string; body: string },
      fWeight: string, tMode: string,
    ): string {
      const parts: string[] = [];
      if (pColor) parts.push(`Primary Color: ${pColor}`);
      if (sColor) parts.push(`Secondary Color: ${sColor}`);
      parts.push(`Heading Font: ${fonts.heading}`);
      parts.push(`Body Font: ${fonts.body}`);
      if (fWeight) parts.push(`Font Weight: ${fWeight}`);
      if (tMode && tMode !== 'auto') {
        parts.push(`Theme Mode: ${tMode === 'force_light' ? 'Force Light — use light backgrounds, light surfaces, dark text' : 'Force Dark — use dark backgrounds, dark surfaces, light text'}`);
      }
      parts.push(`\nFont Usage Rules:`);
      parts.push(`- Maximum 2 font families total`);
      parts.push(`- Display fonts (Archivo Black, Clash Display, Syne) are for hero titles and major headings ONLY`);
      parts.push(`- Body text must use a highly readable font (Inter, Plus Jakarta Sans, Poppins, or Sora)`);
      parts.push(`- Do NOT use Archivo Black, Clash Display, or Syne for body text`);
      parts.push(`\nHero Title Typography Baseline:`);
      parts.push(`- Desktop hero title: 64px minimum, font-weight 700–900, line-height 1.0–1.1`);
      parts.push(`- Tablet hero title: 52px minimum, font-weight 700–900, line-height 1.0–1.1`);
      parts.push(`- Mobile hero title: 38px minimum, font-weight 700–900, line-height 1.05–1.15`);
      parts.push(`- Hero title must be the largest text element on the page`);
      parts.push(`- Prefer tight, impactful line-height — avoid paragraph-like hero sizing`);
      return `\n\n--------------------------------------------------\nBRAND & THEME OVERRIDE — ${label}\n--------------------------------------------------\n\n${parts.join('\n')}\n\nApply these brand overrides to the final design. Brand colors take priority over extracted design system colors. Theme mode affects page background, section backgrounds, surface/card tones, and text contrast — but does NOT override brand colors.`;
    }

    const brandOverrideBlockA = buildBrandOverrideBlock(
      'PROMPT A', primaryColor || "", secondaryColor || "", resolvedFontsA,
      fontWeight || "", themeMode || 'auto',
    );
    const brandOverrideBlockB = buildBrandOverrideBlock(
      'PROMPT B', bPrimaryColorEff, bSecondaryColorEff, resolvedFontsB,
      bFontWeightEff, bThemeModeEff,
    );

    // ── Content Modules (BluLuma CMS demo dataset) ──
    // Legacy ID backward compatibility
    const legacyModuleMap: Record<string, string> = {
      portfolio_login: 'portfolio_demo_cms',
      portfolio_nologin: 'portfolio_demo_cms',
      blog_login: 'blog_demo_cms',
      blog_nologin: 'blog_demo_cms',
      gallery: 'gallery_demo_cms',
    };
    const normalizedEnabledModules: string[] = Array.from(new Set(
      (enabledModules || []).map((m: string) => legacyModuleMap[m] || m)
    ));

    const cmsModuleBlocks: Record<string, string> = {
      portfolio_demo_cms: `PORTFOLIO / PROJECTS MODULE — BLULUMA DEMO CMS

- Build the Portfolio / Projects layout and page structure.
- Use BluLuma CMS demo portfolio data only.
- Do not generate random project names, fake client names, fake case studies, fake locations, or fake results.
- Connect the layout to the CMS-ready Portfolio schema.
- Use client_id = "bluluma_demo".
- Use content_type = "portfolio".
- Display 6 demo portfolio items.
- Each card must support: title, category, excerpt, featured_image, slug.
- Project detail pages must be template-based and CMS-ready.
- The final website must allow the client_id to be changed later without rebuilding the layout.`,
      blog_demo_cms: `BLOG MODULE — BLULUMA DEMO CMS

- Build the Blog listing layout and Article detail page template.
- Use BluLuma CMS demo blog data only.
- Do not generate random blog posts, fake authors, fake article content, or fake publication dates.
- Connect the layout to the CMS-ready Blog schema.
- Use client_id = "bluluma_demo".
- Use content_type = "blog".
- Display 6 demo blog posts.
- Each card must support: title, excerpt, featured_image, published_date, slug.
- Article pages must be template-based and CMS-ready.
- The final website must allow the client_id to be changed later without rebuilding the layout.`,
      gallery_demo_cms: `GALLERY MODULE — BLULUMA DEMO CMS

- Build the Gallery layout using BluLuma CMS demo gallery data only.
- Use client_id = "bluluma_demo".
- Use content_type = "gallery".
- Do not generate random gallery images or fake captions.
- The gallery must support image grid, image title, caption, alt text, and lightbox.`,
      team_demo_cms: `TEAM MODULE — BLULUMA DEMO CMS

- Build the Team layout using BluLuma CMS demo team data only.
- Use client_id = "bluluma_demo".
- Use content_type = "team".
- Do not generate random team members.
- Each team card must support: name, role, bio, featured_image.`,
      testimonials_demo_cms: `TESTIMONIALS MODULE — BLULUMA DEMO CMS

- Build the Testimonials layout using BluLuma CMS demo testimonials data only.
- Use client_id = "bluluma_demo".
- Use content_type = "testimonials".
- Do not generate random testimonials.
- Each testimonial must support: client_name, quote, rating, company_name.`,
      faq_demo_cms: `FAQ MODULE — BLULUMA DEMO CMS

- Build the FAQ layout using BluLuma CMS demo FAQ data only.
- Use client_id = "bluluma_demo".
- Use content_type = "faq".
- Do not generate random FAQ questions.
- Each FAQ item must support: question, answer, category, sort_order.`,
      services_demo_cms: `SERVICES MODULE — BLULUMA DEMO CMS

- Build the Services layout using BluLuma CMS demo services data only.
- Use client_id = "bluluma_demo".
- Use content_type = "services".
- Do not generate random services.
- Each service item must support: title, description, icon, featured_image, slug.`,
      multilanguage: `MULTI-LANGUAGE MODULE

- Build the website with a language-ready structure.
- Use localStorage or an equivalent simple frontend method for language switching.
- Do not use external translation APIs.
- Do not generate low-quality machine translation.
- Keep the structure ready for English and Traditional Chinese content.`,
    };

    const activeModuleSections = normalizedEnabledModules
      .map((m) => cmsModuleBlocks[m])
      .filter(Boolean);

    let contentModuleBlock = '';
    if (activeModuleSections.length > 0) {
      contentModuleBlock = `\n\n--------------------------------------------------
CONTENT MODULES — BLULUMA CMS DEMO DATASET
--------------------------------------------------

These modules must be built using BluLuma CMS demo data only.
Do NOT randomly generate sample content for these modules.
All CMS modules use client_id = "bluluma_demo" and a template-based, CMS-ready layout.

${activeModuleSections.join('\n\n')}`;
    }

    // ── Advanced Modules ──
    const advModuleBlocks: Record<string, string> = {
      lead_capture: `LEAD CAPTURE UPGRADE

- Add stronger lead capture sections.
- Include early contact form placement.
- Include CTA buttons in hero, middle section, and final CTA.
- Do not invent fake offers.`,
      conversion_layout: `CONVERSION LAYOUT

- Strengthen section hierarchy and CTA visibility.
- Keep it as a layout upgrade only.
- Do not add marketing strategy text or CRO analysis.`,
      trust_badges: `TRUST BADGE SECTION

- Add a trust badge section.
- Use generic badge labels only if source data does not provide real badges.
- Do not invent certifications, awards, or official memberships.`,
      service_comparison: `SERVICE COMPARISON

- Add a service comparison layout if the source website has multiple services or packages.
- Do not invent pricing unless source data includes pricing.`,
      case_study: `CASE STUDY SECTION

- Add a case study section layout.
- If Portfolio Demo CMS is selected, connect case study cards to portfolio_demo_cms.
- Do not invent fake business results.`,
      full_seo: `FULL SEO PACKAGE

- Add SEO-ready page structure.
- Include proper heading hierarchy.
- Include metadata-ready structure.
- Do not keyword stuff.
- Do not generate fake SEO claims.`,
    };

    const activeAdvSections = (advancedModules || [])
      .map((m: string) => advModuleBlocks[m])
      .filter(Boolean);

    let advancedModuleBlock = '';
    if (activeAdvSections.length > 0) {
      advancedModuleBlock = `\n\n--------------------------------------------------
ADVANCED MODULES
--------------------------------------------------

${activeAdvSections.join('\n\n')}`;
    }

    // ── Per-prompt Layout Override blocks ──
    const layoutOverrideBlockA = (promptALayoutOverride && promptALayoutOverride.trim())
      ? `\n\n--------------------------------------------------\nPROMPT A LAYOUT OVERRIDE\n--------------------------------------------------\n\n${promptALayoutOverride.trim()}`
      : '';
    const layoutOverrideBlockB = (promptBLayoutOverride && promptBLayoutOverride.trim())
      ? `\n\n--------------------------------------------------\nPROMPT B LAYOUT OVERRIDE\n--------------------------------------------------\n\n${promptBLayoutOverride.trim()}`
      : '';

    // ── Reference Design Analysis blocks ──
    function buildAnalysisBlock(target: 'A' | 'B'): string {
      if (!referenceAnalysis || typeof referenceAnalysis !== 'object') return '';
      const a = referenceAnalysis;
      if (!a.designStyle && !a.tone && !a.spacingStyle && !a.cardStyle && !a.buttonStyle) return '';
      const direction = target === 'A'
        ? 'Maintain strong visual alignment with the reference website.'
        : 'Maintain the same brand identity while enhancing premium presentation and conversion-focused hierarchy.';
      return `\n\n--------------------------------------------------\nREFERENCE DESIGN ANALYSIS\n--------------------------------------------------\n\nDesign Style: ${a.designStyle || '(none)'}\nTone: ${a.tone || '(none)'}\nSpacing: ${a.spacingStyle || '(none)'}\nCard Style: ${a.cardStyle || '(none)'}\nButton Style: ${a.buttonStyle || '(none)'}\n\nPrompt ${target} Theme Direction:\n${direction}`;
    }
    const analysisBlockA = buildAnalysisBlock('A');
    const analysisBlockB = buildAnalysisBlock('B');

    const convUrl = conversionLayoutUrl || referenceUrl || "";

    const fullScrapedData = [
      blocks.siteMeta && `== SITE META ==\n${blocks.siteMeta}`,
      blocks.siteStructure && `== SITE STRUCTURE ==\n${blocks.siteStructure}`,
      blocks.copywriting && `== COPYWRITING ==\n${blocks.copywriting}`,
      blocks.businessInfo && `== BUSINESS INFO ==\n${blocks.businessInfo}`,
      blocks.designSystem && `== DESIGN SYSTEM ==\n${blocks.designSystem}`,
      blocks.images && `== IMAGES ==\n${blocks.images}`,
      blocks.extractionNotes && `== EXTRACTION NOTES ==\n${blocks.extractionNotes}`,
    ].filter(Boolean).join("\n\n");

    const scrapedUrls = (normalized.site_structure || [])
      .map((p: any) => p.url || p.slug || "")
      .filter((u: string) => u)
      .map((u: string) => `- ${u}`)
      .join("\n");

    const hasExtractionData = Boolean(fullScrapedData.trim());
    const hasScrapedUrls = Boolean(scrapedUrls.trim());

    console.log("ASSEMBLY DEBUG", JSON.stringify({
      sourceUrl: ensureHttpUrl(sourceUrl),
      referenceUrl: referenceUrl || "",
      extractionReturnedData: Boolean(parsedData && Object.keys(parsedData).length),
      scrapedDataNonEmpty: hasExtractionData,
      scrapedUrlsNonEmpty: hasScrapedUrls,
      fetchedUrl: sourceContext.fetchedUrl,
    }));

    if (!hasExtractionData) {
      throw new StepError("assembly", "scraped_data was empty, template injection skipped", 422);
    }

    if (!hasScrapedUrls) {
      throw new StepError("assembly", "scraped_urls was empty, template injection skipped", 422);
    }

    const runtimeValuesA = {
      sourceUrl: ensureHttpUrl(sourceUrl),
      referenceUrl: referenceUrl || "",
      referenceScreenshot: "(not available)",
      scrapedData: fullScrapedData,
      scrapedUrls,
      brandName: resolvedBrand,
      layoutMode: layoutModeA,
    };

    const runtimeValuesB = {
      sourceUrl: ensureHttpUrl(sourceUrl),
      referenceUrl: convUrl,
      referenceScreenshot: "(not available)",
      scrapedData: fullScrapedData,
      scrapedUrls,
      brandName: resolvedBrand,
      layoutMode: layoutModeB,
    };

    currentStep = "assemble_prompts";
    let assembledA = assemblePrompt(masterPrompt, blocks, runtimeValuesA, userNotes || "", styleSeed.content);
    let assembledB = assemblePrompt(masterPrompt, blocks, runtimeValuesB, userNotes || "", styleSeed.content);

    // Final token sweep — replace any remaining unresolved template tokens
    assembledA = finalTokenSweep(assembledA);
    assembledB = finalTokenSweep(assembledB);

    const unresolvedA = findUnresolvedPlaceholders(assembledA);
    const unresolvedB = findUnresolvedPlaceholders(assembledB);
    const replacementCompleted = unresolvedA.length === 0 && unresolvedB.length === 0;

    console.log("PLACEHOLDER DEBUG", JSON.stringify({
      replacementCompleted,
      unresolvedPromptA: unresolvedA,
      unresolvedPromptB: unresolvedB,
    }));

    if (!replacementCompleted) {
      throw new StepError("assembly", `Placeholder replacement incomplete: ${[...unresolvedA, ...unresolvedB].join(", ")}`, 422);
    }

    // ── Explicit brand & layout header block ──
    const brandHeaderBlock = `--------------------------------------------------
SELECTED BRAND
--------------------------------------------------

Selected Brand: ${resolvedBrand}

Rules:
- This brand controls all footer credit logic
- Footer credit must reflect ${resolvedBrand} branding
- Do NOT use legacy source footer attribution as active footer output
- Source footer text is archival only — Master Prompt footer rules always win

`;

    const layoutHeaderA = `--------------------------------------------------
LAYOUT MODE
--------------------------------------------------

Layout Mode: ${layoutModeA}

`;

    const layoutHeaderB = `--------------------------------------------------
LAYOUT MODE
--------------------------------------------------

Layout Mode: ${layoutModeB}

`;

    // ── Footer attribution contamination safety block ──
    // MUST be placed BEFORE "FINAL BUILD INSTRUCTION", not after it
    const footerSafetyBlock = `\n\n--------------------------------------------------
FOOTER ATTRIBUTION SAFETY
--------------------------------------------------

If extracted source copywriting contains legacy footer credits such as:
- "Site by ..."
- "Designed by ..."
- "Built by ..."
- "Powered by ..."

These MUST be treated as non-authoritative archival text only.
They must NOT override the locked footer credit rules in this prompt.
The Master Prompt footer rules always take priority without exception.
The active footer credit must reflect the Selected Brand above.
`;

    // Insert footer safety block BEFORE "FINAL BUILD INSTRUCTION" in the assembled prompt
    function insertFooterSafetyBeforeFinalInstruction(assembled: string): string {
      const marker = '--------------------------------------------------\nFINAL BUILD INSTRUCTION\n--------------------------------------------------';
      const idx = assembled.indexOf(marker);
      if (idx > 0) {
        // Insert the footer safety block just before the FINAL BUILD INSTRUCTION divider
        return assembled.substring(0, idx) + footerSafetyBlock.trim() + '\n\n' + assembled.substring(idx);
      }
      // Fallback: append before the end with proper spacing
      return assembled + footerSafetyBlock;
    }

    // Apply footer safety insertion and ensure clean formatting
    assembledA = insertFooterSafetyBeforeFinalInstruction(assembledA);
    assembledB = insertFooterSafetyBeforeFinalInstruction(assembledB);

    // ── Deduplicate FOOTER ATTRIBUTION SAFETY blocks ──
    // The Master Prompt may already contain this section; the injection above
    // may add a second copy. Keep only the first occurrence.
    function deduplicateFooterSafety(prompt: string): string {
      const sectionHeader = 'FOOTER ATTRIBUTION SAFETY';
      const firstIdx = prompt.indexOf(sectionHeader);
      if (firstIdx === -1) return prompt;
      const secondIdx = prompt.indexOf(sectionHeader, firstIdx + sectionHeader.length);
      if (secondIdx === -1) return prompt; // only one occurrence, nothing to do

      // Find the start of the second block's divider line (the "----" line before it)
      const dividerPattern = '--------------------------------------------------';
      let blockStart = prompt.lastIndexOf(dividerPattern, secondIdx);
      // Walk back past any preceding whitespace/newlines to find the true start
      while (blockStart > 0 && (prompt[blockStart - 1] === '\n' || prompt[blockStart - 1] === '\r' || prompt[blockStart - 1] === ' ')) {
        blockStart--;
      }

      // Find the end of the second block: next divider or end of string
      const afterHeader = secondIdx + sectionHeader.length;
      const nextDivider = prompt.indexOf(dividerPattern, afterHeader + 1);
      let blockEnd: number;
      if (nextDivider !== -1) {
        // Walk back to trim trailing whitespace before the next divider
        blockEnd = nextDivider;
        while (blockEnd > afterHeader && (prompt[blockEnd - 1] === '\n' || prompt[blockEnd - 1] === '\r')) {
          blockEnd--;
        }
      } else {
        blockEnd = prompt.length;
      }

      return prompt.substring(0, blockStart) + prompt.substring(blockEnd);
    }

    assembledA = deduplicateFooterSafety(assembledA);
    assembledB = deduplicateFooterSafety(assembledB);

    // Final output formatting cleanup pass
    function cleanOutputFormatting(prompt: string): string {
      // Fix merged section dividers (no line break before dashes)
      let result = prompt.replace(/([^\n])(\n--------------------------------------------------)/g, '$1\n$2');
      // Remove triple+ blank lines
      result = result.replace(/\n{4,}/g, '\n\n\n');
      return result;
    }

    const promptA = cleanOutputFormatting(
      `SWIFTLIFT BUILD PROMPT — ${tierLabelA}\nSource: ${ensureHttpUrl(sourceUrl)}\n\n` +
      brandHeaderBlock + layoutHeaderA + assembledA + brandOverrideBlockA + analysisBlockA + layoutOverrideBlockA + contentModuleBlock + advancedModuleBlock
    );

    const conversionDirective = `--------------------------------------------------
LAYOUT MODE: PREMIUM CONVERSION LAYOUT
--------------------------------------------------

Build a conversion-oriented layout using the same source business content.

This is NOT a marketing strategy or CRO analysis.
This is a LAYOUT UPGRADE ONLY.

Prompt B MUST be structurally different from Prompt A.
If both layouts feel similar → FAILURE.

MANDATORY CONVERSION ELEMENTS:

1. Sticky CTA
   - Desktop: fixed right-side button, always visible while scrolling
   - Mobile: sticky bottom bar

2. Hero Conversion Focus
   - Strong value proposition
   - Clear CTA
   - May include: contact form OR call / booking button

3. Conversion Flow
   - Problem → Solution → Trust → Action

4. CTA Repetition
   - Minimum 3 CTA placements: top / middle / bottom

5. Trust Section
   - Testimonials OR badges OR proof

6. Early Contact Trigger
   - Contact / booking must appear early

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

REFERENCE USAGE: Use Style Reference PLUS apply conversion structure. Conversion rules OVERRIDE visual reference when conflict occurs.

DATA CONSISTENCY (CRITICAL): ALL extracted business data used in Prompt A MUST also appear in Prompt B — business name, services, address, Google Map embed, phone, email, description. No exceptions.

IMPORTANT: Do NOT add conversion strategy, CRO analysis, sales funnel planning, audience targeting, or marketing consulting content. Only restructure the layout for better conversion flow.

`;

    const promptB = cleanOutputFormatting(
      `SWIFTLIFT BUILD PROMPT — ${tierLabelB}\nSource: ${ensureHttpUrl(sourceUrl)}\n\n` +
      brandHeaderBlock + layoutHeaderB + conversionDirective +
      assembledB + brandOverrideBlockB + analysisBlockB + layoutOverrideBlockB + contentModuleBlock + advancedModuleBlock
    );

    console.log("Prompts assembled from database prompts. A length:", promptA.length, "B length:", promptB.length, "Assembly rules length:", assemblyRules?.length || 0);

    return new Response(
      JSON.stringify({ success: true, promptA, promptB }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Generation error:", error);
    const step = error instanceof StepError ? error.step : currentStep;
    const status = error instanceof StepError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({ success: false, step, error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
