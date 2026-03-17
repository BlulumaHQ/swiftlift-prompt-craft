const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Color utilities ──

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
}

function parseColorValue(raw: string): string | null {
  const v = raw.trim().toLowerCase();

  // hex
  const hexMatch = v.match(/#([0-9a-f]{3,8})\b/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    if (hex.length === 6) return `#${hex}`;
    if (hex.length === 8) return `#${hex.slice(0, 6)}`; // drop alpha
    return null;
  }

  // rgb/rgba
  const rgbMatch = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return rgbToHex(+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]);
  }

  // hsl
  const hslMatch = v.match(/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/);
  if (hslMatch) {
    const h = +hslMatch[1], s = +hslMatch[2] / 100, l = +hslMatch[3] / 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
    };
    return rgbToHex(f(0), f(8), f(4));
  }

  return null;
}

function isGrayscaleOrNeutral(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const [r, g, b] = rgb;
  const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
  const saturation = maxC === 0 ? 0 : (maxC - minC) / maxC;
  const brightness = (r + g + b) / 3;
  // Too dark, too bright, or too gray
  if (brightness < 30 || brightness > 235) return true;
  if (saturation < 0.12) return true;
  return false;
}

type ScoredColor = { hex: string; score: number; source: string };
type ScoredFont = { family: string; score: number; source: string };
type ScoredWeight = { weight: string; score: number; source: string };

// ── CSS parsing ──

function extractStyleBlocks(html: string): string {
  const blocks: string[] = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) blocks.push(m[1]);
  return blocks.join("\n");
}

function extractLinkedCssUrls(html: string, baseUrl: string): string[] {
  const re = /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const re2 = /<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi;
  const urls = new Set<string>();
  for (const regex of [re, re2]) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(html))) {
      try {
        urls.add(new URL(m[1], baseUrl).toString());
      } catch { /* skip */ }
    }
  }
  return [...urls].slice(0, 3);
}

function extractInlineStyles(html: string): Array<{ selector: string; style: string }> {
  const results: Array<{ selector: string; style: string }> = [];
  const re = /<(\w+)\b([^>]*?)style=["']([^"']+)["']([^>]*?)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase();
    const attrs = (m[2] + " " + m[4]).toLowerCase();
    let selector = tag;
    const classMatch = attrs.match(/class=["']([^"']+)["']/);
    if (classMatch) selector += "." + classMatch[1].split(/\s+/).join(".");
    results.push({ selector, style: m[3] });
  }
  return results;
}

interface CssRule {
  selector: string;
  declarations: string;
}

function parseCssRules(css: string): CssRule[] {
  // Remove comments and @media wrappers (flatten)
  const cleaned = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@media[^{]*\{/g, "")
    .replace(/@[^{;]*;/g, "");

  const rules: CssRule[] = [];
  const re = /([^{}]+)\{([^{}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) {
    const selector = m[1].trim();
    const declarations = m[2].trim();
    if (selector && declarations) {
      rules.push({ selector, declarations });
    }
  }
  return rules;
}

// ── Scoring logic ──

function selectorScore(selector: string, property: string): { score: number; source: string } {
  const s = selector.toLowerCase();
  const p = property.toLowerCase();

  // Logo-related
  if (s.includes("logo") || s.includes("brand")) return { score: 100, source: "logo" };

  // CTA / button
  if (s.includes("cta") || s.includes("btn") || s.includes("button") ||
      p === "background-color" && (s.includes("btn") || s.includes("button") || s.includes("cta")))
    return { score: 90, source: "CTA" };

  // Navigation
  if (s.includes("nav") || s.includes("header") || s.includes("menu"))
    return { score: 70, source: "navigation" };

  // Headings
  if (/\bh[1-3]\b/.test(s) || s.includes("hero") || s.includes("title") || s.includes("heading"))
    return { score: 75, source: "heading" };

  // Links
  if (s.includes(" a") || s === "a" || s.includes("link"))
    return { score: 60, source: "link" };

  // Accent
  if (s.includes("accent") || s.includes("highlight") || s.includes("badge") || s.includes("tag"))
    return { score: 55, source: "accent" };

  // Icon colors
  if (s.includes("icon") || s.includes("svg"))
    return { score: 50, source: "icon" };

  // Footer
  if (s.includes("footer"))
    return { score: 30, source: "footer" };

  // Background (low priority)
  if (p === "background-color" || p === "background")
    return { score: 15, source: "background" };

  // Generic color
  if (p === "color") return { score: 40, source: "text" };

  return { score: 20, source: "style" };
}

function fontSelectorScore(selector: string): { score: number; source: string } {
  const s = selector.toLowerCase();
  if (/\bh1\b/.test(s) || s.includes("hero")) return { score: 100, source: "hero headline" };
  if (/\bh2\b/.test(s)) return { score: 85, source: "heading" };
  if (/\bh3\b/.test(s)) return { score: 70, source: "heading" };
  if (s.includes("nav") || s.includes("header") || s.includes("menu")) return { score: 80, source: "navigation" };
  if (s.includes("title") || s.includes("heading")) return { score: 75, source: "heading" };
  if (s === "body" || s === "html" || s === "*") return { score: 30, source: "body" };
  return { score: 40, source: "style" };
}

function extractColorProps(declarations: string): Array<{ property: string; value: string }> {
  const colorProps = ["color", "background-color", "background", "border-color", "fill", "stroke"];
  const results: Array<{ property: string; value: string }> = [];

  for (const prop of colorProps) {
    const re = new RegExp(`${prop.replace("-", "\\-")}\\s*:\\s*([^;]+)`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(declarations))) {
      const parsed = parseColorValue(m[1]);
      if (parsed) results.push({ property: prop, value: parsed });
    }
  }
  return results;
}

function extractFontProps(declarations: string): { family?: string; weight?: string } {
  const familyMatch = declarations.match(/font-family\s*:\s*([^;]+)/i);
  const weightMatch = declarations.match(/font-weight\s*:\s*(\d+|bold|normal|bolder|lighter)/i);

  let family: string | undefined;
  if (familyMatch) {
    const raw = familyMatch[1].trim();
    // Get first non-generic font
    const families = raw.split(",").map((f) => f.trim().replace(/["']/g, ""));
    const generics = ["sans-serif", "serif", "monospace", "cursive", "fantasy", "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace", "inherit", "initial", "unset"];
    family = families.find((f) => !generics.includes(f.toLowerCase()));
  }

  let weight: string | undefined;
  if (weightMatch) {
    const w = weightMatch[1].toLowerCase();
    const map: Record<string, string> = { bold: "700", normal: "400", bolder: "800", lighter: "300" };
    weight = map[w] || w;
  }

  return { family, weight };
}

// ── Main detection ──

async function detectBrand(url: string): Promise<{
  primaryColor: { hex: string; source: string } | null;
  secondaryColor: { hex: string; source: string } | null;
  primaryFont: { family: string; source: string } | null;
  fontWeight: { weight: string; source: string } | null;
}> {
  let normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;

  const response = await fetch(normalizedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SwiftLiftBot/1.0; +https://lovable.dev)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

  const html = await response.text();
  const fetchedUrl = response.url || normalizedUrl;

  // Collect all CSS
  let allCss = extractStyleBlocks(html);

  // Fetch linked stylesheets (max 3, with timeout)
  const cssUrls = extractLinkedCssUrls(html, fetchedUrl);
  const cssPromises = cssUrls.map(async (cssUrl) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(cssUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SwiftLiftBot/1.0)" },
      });
      clearTimeout(timeout);
      if (res.ok) return await res.text();
    } catch { /* skip */ }
    return "";
  });
  const cssTexts = await Promise.all(cssPromises);
  allCss += "\n" + cssTexts.join("\n");

  // Parse CSS rules
  const cssRules = parseCssRules(allCss);
  const inlineStyles = extractInlineStyles(html);

  // Score colors
  const scoredColors: ScoredColor[] = [];

  for (const rule of cssRules) {
    const colorProps = extractColorProps(rule.declarations);
    for (const { property, value } of colorProps) {
      if (isGrayscaleOrNeutral(value)) continue;
      const { score, source } = selectorScore(rule.selector, property);
      scoredColors.push({ hex: value.toLowerCase(), score, source });
    }
  }

  for (const { selector, style } of inlineStyles) {
    const colorProps = extractColorProps(style);
    for (const { property, value } of colorProps) {
      if (isGrayscaleOrNeutral(value)) continue;
      const { score, source } = selectorScore(selector, property);
      scoredColors.push({ hex: value.toLowerCase(), score: score + 5, source: `inline ${source}` });
    }
  }

  // Also check CSS custom properties (--primary, --accent, etc.)
  const varRe = /--(primary|accent|brand|main|secondary|cta|highlight)[\w-]*\s*:\s*([^;]+)/gi;
  let varMatch: RegExpExecArray | null;
  while ((varMatch = varRe.exec(allCss))) {
    const parsed = parseColorValue(varMatch[2]);
    if (parsed && !isGrayscaleOrNeutral(parsed)) {
      const varName = varMatch[1].toLowerCase();
      let score = 85;
      let source = "CSS variable";
      if (varName.includes("primary") || varName.includes("brand") || varName.includes("main")) {
        score = 95;
        source = "CSS variable (primary)";
      } else if (varName.includes("secondary")) {
        score = 80;
        source = "CSS variable (secondary)";
      } else if (varName.includes("accent") || varName.includes("highlight")) {
        score = 70;
        source = "CSS variable (accent)";
      } else if (varName.includes("cta")) {
        score = 90;
        source = "CSS variable (CTA)";
      }
      scoredColors.push({ hex: parsed.toLowerCase(), score, source });
    }
  }

  // Deduplicate and aggregate scores
  const colorMap = new Map<string, { totalScore: number; bestSource: string; bestScore: number }>();
  for (const { hex, score, source } of scoredColors) {
    const existing = colorMap.get(hex);
    if (existing) {
      existing.totalScore += score;
      if (score > existing.bestScore) {
        existing.bestScore = score;
        existing.bestSource = source;
      }
    } else {
      colorMap.set(hex, { totalScore: score, bestSource: source, bestScore: score });
    }
  }

  const rankedColors = [...colorMap.entries()]
    .sort((a, b) => b[1].totalScore - a[1].totalScore);

  // Pick primary and secondary (must be distinct)
  let primaryColor: { hex: string; source: string } | null = null;
  let secondaryColor: { hex: string; source: string } | null = null;

  if (rankedColors.length > 0) {
    primaryColor = { hex: rankedColors[0][0], source: rankedColors[0][1].bestSource };
  }

  for (let i = 1; i < rankedColors.length; i++) {
    const candidateRgb = hexToRgb(rankedColors[i][0]);
    const primaryRgb = primaryColor ? hexToRgb(primaryColor.hex) : null;
    if (candidateRgb && primaryRgb) {
      // Ensure enough visual distance
      const dist = Math.sqrt(
        (candidateRgb[0] - primaryRgb[0]) ** 2 +
        (candidateRgb[1] - primaryRgb[1]) ** 2 +
        (candidateRgb[2] - primaryRgb[2]) ** 2
      );
      if (dist > 60) {
        secondaryColor = { hex: rankedColors[i][0], source: rankedColors[i][1].bestSource };
        break;
      }
    }
  }

  // Score fonts
  const scoredFonts: ScoredFont[] = [];
  const scoredWeights: ScoredWeight[] = [];

  for (const rule of cssRules) {
    const { family, weight } = extractFontProps(rule.declarations);
    const { score, source } = fontSelectorScore(rule.selector);
    if (family) scoredFonts.push({ family, score, source });
    if (weight && weight !== "400") scoredWeights.push({ weight, score, source });
  }

  for (const { selector, style } of inlineStyles) {
    const { family, weight } = extractFontProps(style);
    const { score, source } = fontSelectorScore(selector);
    if (family) scoredFonts.push({ family, score: score + 5, source: `inline ${source}` });
    if (weight && weight !== "400") scoredWeights.push({ weight, score: score + 5, source: `inline ${source}` });
  }

  // Also check Google Fonts link for font names
  const gfMatch = html.match(/fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/i);
  if (gfMatch) {
    const families = decodeURIComponent(gfMatch[1]).split("|").map((f) => f.split(":")[0].replace(/\+/g, " "));
    if (families[0]) scoredFonts.push({ family: families[0], score: 80, source: "Google Fonts" });
  }

  const fontMap = new Map<string, { totalScore: number; bestSource: string; bestScore: number }>();
  for (const { family, score, source } of scoredFonts) {
    const key = family.toLowerCase();
    const existing = fontMap.get(key);
    if (existing) {
      existing.totalScore += score;
      if (score > existing.bestScore) { existing.bestScore = score; existing.bestSource = source; }
    } else {
      fontMap.set(key, { totalScore: score, bestSource: source, bestScore: score });
    }
  }

  const rankedFonts = [...fontMap.entries()].sort((a, b) => b[1].totalScore - a[1].totalScore);
  const primaryFont = rankedFonts.length > 0
    ? { family: scoredFonts.find((f) => f.family.toLowerCase() === rankedFonts[0][0])!.family, source: rankedFonts[0][1].bestSource }
    : null;

  // Font weight - pick highest-scoring non-400 weight
  scoredWeights.sort((a, b) => b.score - a.score);
  const fontWeight = scoredWeights.length > 0
    ? { weight: scoredWeights[0].weight, source: scoredWeights[0].source }
    : null;

  return { primaryColor, secondaryColor, primaryFont, fontWeight };
}

// ── Handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Detecting brand for:", url);
    const result = await detectBrand(url);
    console.log("Brand detection result:", JSON.stringify(result));

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Brand detection error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Detection failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
