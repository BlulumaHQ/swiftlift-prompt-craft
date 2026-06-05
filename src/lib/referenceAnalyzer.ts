// Reference Design Analyzer
// Takes a reference URL (optionally) + detected brand data and produces
// a design token model + Prompt A / Prompt B theme recommendations.

import { supabase } from '@/integrations/supabase/client';
import { googleFonts } from '@/lib/mockData';

export type FontDirection =
  | 'Modern Sans' | 'Corporate Sans' | 'Luxury Serif'
  | 'Editorial Serif' | 'Minimal Sans' | 'Creative Mixed';
export type FontWeightLabel = 'Light' | 'Regular' | 'Medium' | 'SemiBold' | 'Bold';
export type VisualDensity = 'Minimal' | 'Balanced' | 'Content Heavy';
export type DesignStyle = 'Corporate' | 'Luxury' | 'Editorial' | 'Modern' | 'Creative' | 'Premium' | 'Minimalist';
export type Tone = 'Light' | 'Dark' | 'Mixed';
export type SpacingStyle = 'Compact' | 'Balanced' | 'Spacious';
export type ButtonStyle = 'Sharp' | 'Rounded' | 'Pill' | 'Mixed';
export type CardStyle = 'Flat' | 'Elevated' | 'Minimal Border' | 'Luxury Shadow';
export type ThemeMode = 'auto' | 'force_light' | 'force_dark';

export interface ReferenceAnalysis {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundTone: string;
  fontDirection: FontDirection;
  fontWeight: FontWeightLabel;
  visualDensity: VisualDensity;
  designStyle: DesignStyle;
  tone: Tone;
  spacingStyle: SpacingStyle;
  buttonStyle: ButtonStyle;
  cardStyle: CardStyle;
  sourceUsed: 'url' | 'screenshot' | 'none';
  sourceValue: string;
}

export interface ThemeRecommendation {
  themeMode: ThemeMode;
  primaryColor: string;
  secondaryColor: string;
  primaryFont: string; // google font family
  fontWeight: string;  // numeric e.g. "600"
}

export interface AnalysisResult {
  analysis: ReferenceAnalysis;
  promptA: ThemeRecommendation;
  promptB: ThemeRecommendation;
  confidence: number; // 0-100
}

// ── Color utils ──
function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
function rgbBrightness(rgb: [number, number, number]): number {
  return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
}

function shiftColor(hex: string, dl: number, ds: number, dh: number): string {
  if (!hex) return '';
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb.map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const nh = (h + dh / 360 + 1) % 1;
  const ns = Math.min(1, Math.max(0, s + ds));
  const nl = Math.min(0.95, Math.max(0.05, l + dl));
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = nl < 0.5 ? nl * (1 + ns) : nl + ns - nl * ns;
  const p = 2 * nl - q;
  const ro = Math.round(hue2rgb(p, q, nh + 1 / 3) * 255);
  const go = Math.round(hue2rgb(p, q, nh) * 255);
  const bo = Math.round(hue2rgb(p, q, nh - 1 / 3) * 255);
  return `#${ro.toString(16).padStart(2, '0')}${go.toString(16).padStart(2, '0')}${bo.toString(16).padStart(2, '0')}`;
}

// ── Font heuristics ──
const SERIF_FONTS = ['Playfair Display', 'Lora', 'Cormorant Garamond', 'Merriweather', 'Libre Baskerville'];
const DISPLAY_FONTS = ['Archivo Black', 'Clash Display', 'Syne'];
const MODERN_SANS = ['Inter', 'Plus Jakarta Sans', 'Space Grotesk', 'Sora', 'General Sans'];
const CORPORATE_SANS = ['Montserrat', 'Poppins'];

function fontDirectionFor(font: string): FontDirection {
  if (!font) return 'Modern Sans';
  if (SERIF_FONTS.includes(font)) {
    if (['Playfair Display', 'Cormorant Garamond'].includes(font)) return 'Luxury Serif';
    return 'Editorial Serif';
  }
  if (DISPLAY_FONTS.includes(font)) return 'Creative Mixed';
  if (CORPORATE_SANS.includes(font)) return 'Corporate Sans';
  if (['Inter', 'Space Grotesk'].includes(font)) return 'Minimal Sans';
  return 'Modern Sans';
}

function matchGoogleFont(family?: string | null): string {
  if (!family) return '';
  return googleFonts.find(f => f.toLowerCase() === family.toLowerCase()) || '';
}

function fontWeightLabel(weight: string): FontWeightLabel {
  const n = parseInt(weight || '400');
  if (n <= 300) return 'Light';
  if (n <= 450) return 'Regular';
  if (n <= 550) return 'Medium';
  if (n <= 650) return 'SemiBold';
  return 'Bold';
}

function designStyleFor(direction: FontDirection): DesignStyle {
  switch (direction) {
    case 'Luxury Serif': return 'Luxury';
    case 'Editorial Serif': return 'Editorial';
    case 'Creative Mixed': return 'Creative';
    case 'Corporate Sans': return 'Corporate';
    case 'Minimal Sans': return 'Minimalist';
    default: return 'Modern';
  }
}

function spacingFor(style: DesignStyle): SpacingStyle {
  if (style === 'Luxury' || style === 'Editorial' || style === 'Minimalist') return 'Spacious';
  if (style === 'Corporate') return 'Balanced';
  return 'Balanced';
}
function densityFor(style: DesignStyle): VisualDensity {
  if (style === 'Minimalist' || style === 'Luxury') return 'Minimal';
  if (style === 'Editorial' || style === 'Corporate') return 'Balanced';
  return 'Balanced';
}
function buttonFor(style: DesignStyle): ButtonStyle {
  if (style === 'Luxury' || style === 'Editorial') return 'Sharp';
  if (style === 'Creative' || style === 'Modern') return 'Pill';
  return 'Rounded';
}
function cardFor(style: DesignStyle): CardStyle {
  if (style === 'Luxury') return 'Luxury Shadow';
  if (style === 'Minimalist' || style === 'Editorial') return 'Minimal Border';
  if (style === 'Corporate') return 'Elevated';
  return 'Flat';
}

function toneFor(primaryHex: string): Tone {
  const rgb = hexToRgb(primaryHex);
  if (!rgb) return 'Light';
  const b = rgbBrightness(rgb);
  if (b < 70) return 'Dark';
  if (b > 200) return 'Light';
  return 'Mixed';
}

export interface AnalyzeInput {
  referenceUrl?: string;
  demoSiteUrl?: string;
  screenshotUrl?: string;
}

export async function analyzeReference(input: AnalyzeInput): Promise<AnalysisResult | null> {
  const url = (input.referenceUrl || input.demoSiteUrl || '').trim();
  let sourceUsed: ReferenceAnalysis['sourceUsed'] = 'none';
  let sourceValue = '';
  let primary = '';
  let secondary = '';
  let fontFamily = '';
  let fontWeight = '400';
  let success = false;

  if (url) {
    sourceUsed = 'url';
    sourceValue = url;
    try {
      const { data, error } = await supabase.functions.invoke('detect-brand', { body: { url } });
      if (!error && data?.success) {
        primary = data.primaryColor?.hex || '';
        secondary = data.secondaryColor?.hex || '';
        fontFamily = matchGoogleFont(data.primaryFont?.family);
        fontWeight = data.fontWeight?.weight || '600';
        success = !!(primary || fontFamily);
      }
    } catch {/* ignore */}
  } else if (input.screenshotUrl) {
    sourceUsed = 'screenshot';
    sourceValue = input.screenshotUrl;
  }

  // Fallbacks when detection partial
  if (!primary && sourceUsed === 'none') return null;
  if (!primary) primary = '#1f2937';
  if (!secondary) secondary = shiftColor(primary, 0.2, -0.1, 30);
  if (!fontFamily) fontFamily = 'Inter';

  const direction = fontDirectionFor(fontFamily);
  const style = designStyleFor(direction);
  const tone = toneFor(primary);
  const accent = shiftColor(primary, -0.05, 0.15, -20);
  const backgroundTone = tone === 'Dark' ? '#0f1115' : '#ffffff';

  const analysis: ReferenceAnalysis = {
    primaryColor: primary,
    secondaryColor: secondary,
    accentColor: accent,
    backgroundTone,
    fontDirection: direction,
    fontWeight: fontWeightLabel(fontWeight),
    visualDensity: densityFor(style),
    designStyle: style,
    tone,
    spacingStyle: spacingFor(style),
    buttonStyle: buttonFor(style),
    cardStyle: cardFor(style),
    sourceUsed,
    sourceValue,
  };

  // Prompt A — faithful to source
  const promptA: ThemeRecommendation = {
    themeMode: tone === 'Dark' ? 'force_dark' : 'auto',
    primaryColor: primary,
    secondaryColor: secondary,
    primaryFont: fontFamily,
    fontWeight: String(Math.max(400, Math.min(900, parseInt(fontWeight || '600')))),
  };

  // Prompt B — same brand family, more premium / higher contrast
  const bPrimary = shiftColor(primary, -0.10, 0.08, 8);
  const bSecondary = shiftColor(secondary, -0.08, 0.06, -8);
  // Bolder weight, same font family kept to keep brand identity
  const bWeight = Math.min(900, parseInt(promptA.fontWeight) + 100);
  const promptB: ThemeRecommendation = {
    themeMode: promptA.themeMode,
    primaryColor: bPrimary,
    secondaryColor: bSecondary,
    primaryFont: fontFamily,
    fontWeight: String(bWeight),
  };

  // Confidence
  let confidence = 0;
  if (sourceUsed === 'url' && success) {
    confidence = primary && fontFamily ? 95 : 85;
  } else if (sourceUsed === 'url') {
    confidence = 80;
  } else if (sourceUsed === 'screenshot') {
    confidence = 60;
  }

  return { analysis, promptA, promptB, confidence };
}

// Format analysis for prompt injection
export function buildAnalysisInjection(a: ReferenceAnalysis, target: 'A' | 'B'): string {
  const direction = target === 'A'
    ? 'Maintain strong visual alignment with the reference website.'
    : 'Maintain the same brand identity while enhancing premium presentation and conversion-focused hierarchy.';
  return [
    '',
    '--------------------------------------------------',
    'REFERENCE DESIGN ANALYSIS',
    '--------------------------------------------------',
    '',
    `Design Style: ${a.designStyle}`,
    `Tone: ${a.tone}`,
    `Spacing: ${a.spacingStyle}`,
    `Card Style: ${a.cardStyle}`,
    `Button Style: ${a.buttonStyle}`,
    '',
    `Prompt ${target} Theme Direction:`,
    direction,
    '',
  ].join('\n');
}
