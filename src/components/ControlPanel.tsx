import { useState, useEffect, useRef, useCallback } from 'react';
import { googleFonts, contentModules, advancedModules } from '@/lib/mockData';
import { saveProject } from '@/lib/store';
import type { SavedProject } from '@/lib/mockData';
import ReferenceLibraryModal from './ReferenceLibraryModal';
import { LayoutGrid, Sparkles, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { DemoSite } from '@/lib/demoSiteStore';
import { supabase } from '@/integrations/supabase/client';
import { getPromptLibrary } from '@/lib/promptLibraryStore';
import { getCloudPrompts, computeContentHash } from '@/lib/promptCloudStore';
import { analyzeReference, type AnalysisResult, type ReferenceAnalysis } from '@/lib/referenceAnalyzer';

// Authoritative Group B cloud prompt IDs
const CLOUD_PROMPT_IDS: Record<string, string> = {
  'SwiftLift Source Extraction Prompt V1': 'b7c1fb95-15f9-4e93-8a96-88e6152ee669',
  'SwiftLift Final Build Master Prompt V1': '035a3b80-251f-4bdf-9615-855a041eadca',
  'SwiftLift Prompt Assembly Rules V1': 'cd77a34e-9cb0-44f1-8d31-e1764c531f8e',
};

const projectBrands = ['SwiftLift', 'Bluluma', 'Sonykun', 'SwiftSite'];

function SummaryItem({ label, value, swatch }: { label: string; value: string; swatch?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-muted/50 border border-border">
      {swatch && <span className="w-3 h-3 rounded shrink-0 border border-border" style={{ background: swatch }} />}
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-[11px] font-medium text-foreground truncate">{value}</span>
      </div>
    </div>
  );
}

interface Props {
  onPromptsGenerated: (promptA: string, promptB: string, tier: '350' | '550') => void;
  onGenerateStart: (tier: '350' | '550') => void;
  onGenerateError: (error: string) => void;
  onClear: () => void;
  onSaveResult: (success: boolean, message?: string) => void;
  clearSignal: number;
  saveSignal: number;
  newSignal: number;
  currentPromptA: string;
  currentPromptB: string;
}

function getProjectName(sourceUrl: string): string {
  try {
    const hostname = new URL(sourceUrl.startsWith('http') ? sourceUrl : `https://${sourceUrl}`).hostname;
    return hostname.replace('www.', '').split('.')[0].charAt(0).toUpperCase() +
      hostname.replace('www.', '').split('.')[0].slice(1);
  } catch {
    return 'Untitled Project';
  }
}

interface RefSelection {
  reference_name: string;
  live_url: string;
}

interface DetectedBrand {
  primaryColor: { hex: string; source: string } | null;
  secondaryColor: { hex: string; source: string } | null;
  primaryFont: { family: string; source: string } | null;
  fontWeight: { weight: string; source: string } | null;
}

// Auto-differentiation: derive Prompt B palette from Prompt A's detected values
function differentiateColorForB(hex: string): string {
  if (!hex) return '';
  // Parse hex
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Convert to HSL
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rN) h = ((gN - bN) / d + (gN < bN ? 6 : 0)) / 6;
    else if (max === gN) h = ((bN - rN) / d + 2) / 6;
    else h = ((rN - gN) / d + 4) / 6;
  }
  // Shift: darken by 12%, increase saturation by 8%, shift hue by 8°
  h = (h + 8 / 360) % 1;
  s = Math.min(1, s + 0.08);
  l = Math.max(0.08, l - 0.12);
  // HSL to hex
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p2 = 2 * l - q2;
  const rOut = Math.round(hue2rgb(p2, q2, h + 1 / 3) * 255);
  const gOut = Math.round(hue2rgb(p2, q2, h) * 255);
  const bOut = Math.round(hue2rgb(p2, q2, h - 1 / 3) * 255);
  return `#${rOut.toString(16).padStart(2, '0')}${gOut.toString(16).padStart(2, '0')}${bOut.toString(16).padStart(2, '0')}`;
}

function differentiateFontForB(fontA: string): string {
  if (!fontA) return '';
  // Pick a complementary font from the list
  const sansSerif = ['Inter', 'Montserrat', 'Poppins', 'Plus Jakarta Sans', 'Sora', 'Space Grotesk', 'Syne', 'General Sans'];
  const serif = ['Playfair Display', 'Lora', 'Cormorant Garamond', 'Merriweather', 'Libre Baskerville'];
  const display = ['Archivo Black', 'Clash Display'];
  // If A is sans-serif, B gets a premium sans or display
  if (sansSerif.includes(fontA)) {
    const alternatives = [...display, ...sansSerif.filter(f => f !== fontA)];
    return alternatives[0] || fontA;
  }
  // If A is serif, B gets a modern sans
  if (serif.includes(fontA)) {
    return 'Space Grotesk';
  }
  // If A is display, B gets a clean sans
  if (display.includes(fontA)) {
    return 'Plus Jakarta Sans';
  }
  return fontA;
}

export default function ControlPanel({ onPromptsGenerated, onGenerateStart, onGenerateError, onClear, onSaveResult, clearSignal, saveSignal, newSignal, currentPromptA, currentPromptB }: Props) {
  const [projectBrand, setProjectBrand] = useState('SwiftLift');
  const [sourceUrl, setSourceUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');

  // Style Reference
  const [styleRef, setStyleRef] = useState<RefSelection | null>(null);
  const [showStyleLibrary, setShowStyleLibrary] = useState(false);

  // Conversion Layout Reference
  const [convRef, setConvRef] = useState<RefSelection | null>(null);
  const [showConvLibrary, setShowConvLibrary] = useState(false);

  // Manual reference URL overrides
  const [styleRefUrl, setStyleRefUrl] = useState('');
  const [convRefUrl, setConvRefUrl] = useState('');
  const [styleUrlError, setStyleUrlError] = useState('');
  const [convUrlError, setConvUrlError] = useState('');

  const [packageTier, setPackageTier] = useState<'350' | '550'>('550');

  // Prompt A theme overrides
  const [aPrimaryColor, setAPrimaryColor] = useState('');
  const [aSecondaryColor, setASecondaryColor] = useState('');
  const [aPrimaryFont, setAPrimaryFont] = useState('');
  const [aFontWeight, setAFontWeight] = useState('');
  const [aThemeMode, setAThemeMode] = useState<'auto' | 'force_light' | 'force_dark'>('auto');

  // Prompt B theme overrides
  const [bPrimaryColor, setBPrimaryColor] = useState('');
  const [bSecondaryColor, setBSecondaryColor] = useState('');
  const [bPrimaryFont, setBPrimaryFont] = useState('');
  const [bFontWeight, setBFontWeight] = useState('');
  const [bThemeMode, setBThemeMode] = useState<'auto' | 'force_light' | 'force_dark'>('auto');

  const [brandDetected, setBrandDetected] = useState(false);
  const [brandDetecting, setBrandDetecting] = useState(false);
  const [detectedSources, setDetectedSources] = useState<{
    primaryColor?: string; secondaryColor?: string; primaryFont?: string; fontWeight?: string;
  }>({});
  // Track manual overrides per prompt — a_ and b_ prefixed
  const manualOverrides = useRef<Set<string>>(new Set());
  const [modules, setModules] = useState<string[]>([]);
  const [advModules, setAdvModules] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [promptALayoutOverride, setPromptALayoutOverride] = useState('');
  const [promptBLayoutOverride, setPromptBLayoutOverride] = useState('');
  const [generating, setGenerating] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'unknown' | 'synced' | 'unsynced' | 'checking'>('unknown');
  const [unsyncedPrompt, setUnsyncedPrompt] = useState<string | null>(null);
  const [showBrandConfirm, setShowBrandConfirm] = useState(false);
  const [confirmBrand, setConfirmBrand] = useState('SwiftLift');
  const detectAbortRef = useRef<AbortController | null>(null);

  // Reference Design Analysis
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [themeLockedA, setThemeLockedA] = useState(false);
  const [themeLockedB, setThemeLockedB] = useState(false);

  // Style Seed selection
  const [styleSeedCode, setStyleSeedCode] = useState<string>('AUTO');
  const [styleSeedOptions, setStyleSeedOptions] = useState<Array<{ seed_code: string; seed_name: string; vertical_tags: string | null }>>([]);
  const [lastUsedSeedName, setLastUsedSeedName] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('style_seeds')
        .select('seed_code, seed_name, vertical_tags')
        .eq('active', true)
        .order('seed_code');
      if (!cancelled && !error && data) {
        setStyleSeedOptions(data as any);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleModule = (id: string) => setModules(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAdvModule = (id: string) => setAdvModules(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  // ── Reference Design Analyzer ──
  const applyRecommendation = (target: 'A' | 'B', force: boolean) => {
    if (!analysisResult) return;
    const rec = target === 'A' ? analysisResult.promptA : analysisResult.promptB;
    if (target === 'A') {
      if (themeLockedA) return;
      setAPrimaryColor(rec.primaryColor);
      setASecondaryColor(rec.secondaryColor);
      setAPrimaryFont(rec.primaryFont);
      setAFontWeight(rec.fontWeight);
      setAThemeMode(rec.themeMode);
      ['primaryColor', 'secondaryColor', 'primaryFont', 'fontWeight'].forEach(k =>
        manualOverrides.current.delete(`a_${k}`));
    } else {
      if (themeLockedB) return;
      setBPrimaryColor(rec.primaryColor);
      setBSecondaryColor(rec.secondaryColor);
      setBPrimaryFont(rec.primaryFont);
      setBFontWeight(rec.fontWeight);
      setBThemeMode(rec.themeMode);
      ['primaryColor', 'secondaryColor', 'primaryFont', 'fontWeight'].forEach(k =>
        manualOverrides.current.delete(`b_${k}`));
    }
  };

  const hasExistingA = !!(aPrimaryColor || aSecondaryColor || aPrimaryFont || aFontWeight);
  const hasExistingB = !!(bPrimaryColor || bSecondaryColor || bPrimaryFont || bFontWeight);

  const runAnalysis = async () => {
    setAnalyzeError('');
    setAnalyzing(true);
    try {
      const refUrl = normalizeUrl(styleRefUrl) || styleRef?.live_url || '';
      const convUrl = normalizeUrl(convRefUrl) || convRef?.live_url || '';
      const result = await analyzeReference({
        referenceUrl: refUrl || convUrl,
        demoSiteUrl: styleRef?.live_url || convRef?.live_url || '',
      });
      if (!result) {
        setAnalyzeError('No usable reference source. Add a Reference URL or select a Demo Site.');
        setAnalysisResult(null);
        setAnalyzing(false);
        return;
      }
      setAnalysisResult(result);

      // Apply Prompt A
      if (!themeLockedA) {
        if (hasExistingA) {
          if (window.confirm('Replace existing Prompt A theme settings?')) {
            applyRecommendationFromResult(result, 'A');
          }
        } else {
          applyRecommendationFromResult(result, 'A');
        }
      }
      // Apply Prompt B
      if (!themeLockedB) {
        if (hasExistingB) {
          if (window.confirm('Replace existing Prompt B theme settings?')) {
            applyRecommendationFromResult(result, 'B');
          }
        } else {
          applyRecommendationFromResult(result, 'B');
        }
      }
    } catch (err: any) {
      setAnalyzeError(err.message || 'Analysis failed');
    }
    setAnalyzing(false);
  };

  const applyRecommendationFromResult = (result: AnalysisResult, target: 'A' | 'B') => {
    const rec = target === 'A' ? result.promptA : result.promptB;
    if (target === 'A') {
      setAPrimaryColor(rec.primaryColor);
      setASecondaryColor(rec.secondaryColor);
      setAPrimaryFont(rec.primaryFont);
      setAFontWeight(rec.fontWeight);
      setAThemeMode(rec.themeMode);
      ['primaryColor', 'secondaryColor', 'primaryFont', 'fontWeight'].forEach(k =>
        manualOverrides.current.delete(`a_${k}`));
    } else {
      setBPrimaryColor(rec.primaryColor);
      setBSecondaryColor(rec.secondaryColor);
      setBPrimaryFont(rec.primaryFont);
      setBFontWeight(rec.fontWeight);
      setBThemeMode(rec.themeMode);
      ['primaryColor', 'secondaryColor', 'primaryFont', 'fontWeight'].forEach(k =>
        manualOverrides.current.delete(`b_${k}`));
    }
  };


  // Check prompt sync status
  const checkSyncStatus = useCallback(async () => {
    setSyncStatus('checking');
    try {
      const cloudPrompts = await getCloudPrompts();
      const requiredNames = Object.keys(CLOUD_PROMPT_IDS);

      for (const name of requiredNames) {
        const cloudId = CLOUD_PROMPT_IDS[name];
        const cloud = cloudPrompts.find(p => p.id === cloudId) as any;
        if (!cloud || !cloud.content) {
          setSyncStatus('unsynced');
          const shortName = name.replace('SwiftLift ', '').replace(' V1', '');
          setUnsyncedPrompt(shortName + ' missing from cloud');
          return;
        }
        const actualHash = computeContentHash(cloud.content);
        if (cloud.content_hash && cloud.content_hash !== actualHash) {
          setSyncStatus('unsynced');
          const shortName = name.replace('SwiftLift ', '').replace(' V1', '');
          setUnsyncedPrompt(shortName + ' content integrity mismatch');
          return;
        }
      }
      setSyncStatus('synced');
      setUnsyncedPrompt(null);
    } catch {
      setSyncStatus('synced');
      setUnsyncedPrompt(null);
    }
  }, []);

  useEffect(() => {
    checkSyncStatus();
  }, [checkSyncStatus]);

  // Real brand detection — populates both A and B with differentiation
  const runBrandDetection = useCallback(async (url: string) => {
    if (!url || url.length < 5) return;

    if (detectAbortRef.current) detectAbortRef.current.abort();
    const controller = new AbortController();
    detectAbortRef.current = controller;

    setBrandDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-brand', {
        body: { url },
      });

      if (controller.signal.aborted) return;

      if (error || !data?.success) {
        console.warn('Brand detection failed:', error?.message || data?.error);
        setBrandDetecting(false);
        return;
      }

      const result = data as DetectedBrand & { success: boolean };
      const newSources: typeof detectedSources = {};

      // Prompt A gets source-faithful values
      if (result.primaryColor?.hex && !manualOverrides.current.has('a_primaryColor')) {
        setAPrimaryColor(result.primaryColor.hex);
        newSources.primaryColor = result.primaryColor.source;
      }
      if (result.secondaryColor?.hex && !manualOverrides.current.has('a_secondaryColor')) {
        setASecondaryColor(result.secondaryColor.hex);
        newSources.secondaryColor = result.secondaryColor.source;
      }
      if (result.primaryFont?.family && !manualOverrides.current.has('a_primaryFont')) {
        const matched = googleFonts.find(f => f.toLowerCase() === result.primaryFont!.family.toLowerCase());
        if (matched) {
          setAPrimaryFont(matched);
          newSources.primaryFont = result.primaryFont.source;
        }
      }
      if (result.fontWeight?.weight && !manualOverrides.current.has('a_fontWeight')) {
        setAFontWeight(result.fontWeight.weight);
        newSources.fontWeight = result.fontWeight.source;
      }

      // Prompt B gets differentiated values (premium/elevated direction)
      if (result.primaryColor?.hex && !manualOverrides.current.has('b_primaryColor')) {
        setBPrimaryColor(differentiateColorForB(result.primaryColor.hex));
      }
      if (result.secondaryColor?.hex && !manualOverrides.current.has('b_secondaryColor')) {
        setBSecondaryColor(differentiateColorForB(result.secondaryColor.hex));
      }
      if (result.primaryFont?.family && !manualOverrides.current.has('b_primaryFont')) {
        const matched = googleFonts.find(f => f.toLowerCase() === result.primaryFont!.family.toLowerCase());
        if (matched) {
          setBPrimaryFont(differentiateFontForB(matched));
        }
      }
      if (result.fontWeight?.weight && !manualOverrides.current.has('b_fontWeight')) {
        // B gets a slightly bolder weight
        const w = parseInt(result.fontWeight.weight);
        setBFontWeight(String(Math.min(900, w + 100)));
      }

      setDetectedSources(newSources);
      setBrandDetected(true);
    } catch (err) {
      if (!controller.signal.aborted) console.warn('Brand detection error:', err);
    }
    if (!controller.signal.aborted) setBrandDetecting(false);
  }, []);

  const handleSourceUrlChange = (url: string) => {
    setSourceUrl(url);
    if (!url) {
      setBrandDetected(false);
      setDetectedSources({});
    }
  };

  const handleSourceUrlBlur = () => {
    if (sourceUrl && sourceUrl.length > 5) {
      runBrandDetection(sourceUrl);
    }
  };

  function normalizeUrl(url: string): string {
    let u = url.trim();
    if (!u) return '';
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      u = u.startsWith('www.') ? `https://${u}` : `https://${u}`;
    }
    return u;
  }

  const executeGenerate = async () => {
    const normalizedStyleUrl = normalizeUrl(styleRefUrl);
    const normalizedConvUrl = normalizeUrl(convRefUrl);

    if (styleRefUrl && normalizedStyleUrl) {
      try { new URL(normalizedStyleUrl); setStyleUrlError(''); }
      catch { setStyleUrlError('Unable to access the reference URL. Please check the address.'); return; }
    }
    if (convRefUrl && normalizedConvUrl) {
      try { new URL(normalizedConvUrl); setConvUrlError(''); }
      catch { setConvUrlError('Unable to access the reference URL. Please check the address.'); return; }
    }

    setGenerating(true);
    onGenerateStart(packageTier);

    const resolvedStyleRef = normalizedStyleUrl || styleRef?.live_url || '';
    const resolvedConvRef = normalizedConvUrl || convRef?.live_url || '';

    try {
      let cloudPrompts: Awaited<ReturnType<typeof getCloudPrompts>> = [];
      try { cloudPrompts = await getCloudPrompts(); }
      catch (fetchErr) { console.warn('Cloud prompt fetch failed:', fetchErr); }

      const requiredNames = Object.keys(CLOUD_PROMPT_IDS);
      const resolvedPrompts: Record<string, string> = {};

      for (const name of requiredNames) {
        const cloudId = CLOUD_PROMPT_IDS[name];
        const cloud = cloudPrompts.find(p => p.id === cloudId);
        if (!cloud?.content) {
          const localPrompts = getPromptLibrary();
          const local = localPrompts.find(p => p.name === name);
          if (!local?.content) {
            onGenerateError(`Required prompt missing: "${name}". Check Prompt Library.`);
            setGenerating(false);
            return;
          }
          resolvedPrompts[name] = local.content;
        } else {
          resolvedPrompts[name] = cloud.content;
        }
      }

      const extractionPrompt = resolvedPrompts['SwiftLift Source Extraction Prompt V1'];
      const masterPrompt = resolvedPrompts['SwiftLift Final Build Master Prompt V1'];
      const assemblyRules = resolvedPrompts['SwiftLift Prompt Assembly Rules V1'];

      setSyncStatus('synced');
      setUnsyncedPrompt(null);

      // Map legacy module IDs to new CMS IDs for backward compat
      const legacyModuleMap: Record<string, string> = {
        portfolio_login: 'portfolio_demo_cms',
        portfolio_nologin: 'portfolio_demo_cms',
        blog_login: 'blog_demo_cms',
        blog_nologin: 'blog_demo_cms',
        gallery: 'gallery_demo_cms',
      };
      const normalizedModules = Array.from(new Set(modules.map(m => legacyModuleMap[m] || m)));

      const { data, error } = await supabase.functions.invoke('generate-final-prompt', {
        body: {
          sourceUrl,
          referenceUrl: resolvedStyleRef,
          conversionLayoutUrl: resolvedConvRef,
          businessType: '',
          userNotes: specialInstructions || '',
          packageTier,
          projectBrand: projectBrand || 'SwiftLift',
          // Prompt A theme
          themeMode: aThemeMode,
          primaryColor: aPrimaryColor,
          secondaryColor: aSecondaryColor,
          primaryFont: aPrimaryFont,
          fontWeight: aFontWeight,
          // Prompt B theme (separate)
          promptBThemeMode: bThemeMode,
          promptBPrimaryColor: bPrimaryColor,
          promptBSecondaryColor: bSecondaryColor,
          promptBPrimaryFont: bPrimaryFont,
          promptBFontWeight: bFontWeight,
          // Layout overrides
          promptALayoutOverride,
          promptBLayoutOverride,
          enabledModules: normalizedModules,
          advancedModules: advModules,
          referenceAnalysis: analysisResult?.analysis || null,
          styleSeedCode,
          localPrompts: {
            extractionPrompt,
            masterPrompt,
            assemblyRules,
          },
        },
      });

      if (error) {
        onGenerateError(error.message || 'Edge function call failed');
      } else if (data?.success) {
        if (data.styleSeedName) setLastUsedSeedName(data.styleSeedName);
        onPromptsGenerated(data.promptA, data.promptB, packageTier);
      } else {
        onGenerateError(data?.error || 'Generation failed');
      }
    } catch (err: any) {
      onGenerateError(err.message || 'Network error');
    }

    setGenerating(false);
  };

  const handleGenerate = () => {
    if (!sourceUrl) return;
    setConfirmBrand(projectBrand);
    setShowBrandConfirm(true);
  };

  const handleConfirmGenerate = () => {
    setProjectBrand(confirmBrand);
    setShowBrandConfirm(false);
    executeGenerate();
  };

  // Stable project ID
  const currentProjectIdRef = useRef<string>(crypto.randomUUID());
  const lastSavedHashRef = useRef<string>('');

  const getProjectHash = useCallback(() => {
    return JSON.stringify({
      sourceUrl, projectName, clientName, packageTier,
      modules, advModules, aPrimaryColor, aSecondaryColor, aPrimaryFont,
      aFontWeight, bPrimaryColor, bSecondaryColor, bPrimaryFont, bFontWeight,
      specialInstructions, promptA: currentPromptA, promptB: currentPromptB,
    });
  }, [sourceUrl, projectName, clientName, packageTier, modules, advModules, aPrimaryColor, aSecondaryColor, aPrimaryFont, aFontWeight, bPrimaryColor, bSecondaryColor, bPrimaryFont, bFontWeight, specialInstructions, currentPromptA, currentPromptB]);

  const doSave = useCallback(() => {
    try {
      const currentHash = getProjectHash();
      if (currentHash === lastSavedHashRef.current) {
        onSaveResult(true, 'No new changes to save');
        return;
      }

      const resolvedStyleRef = normalizeUrl(styleRefUrl) || styleRef?.live_url || '';
      const project: SavedProject = {
        id: currentProjectIdRef.current,
        name: projectName || getProjectName(sourceUrl),
        sourceUrl, referenceLayout: styleRef?.reference_name || '', referenceUrl: resolvedStyleRef, packageTier,
        modules, addons: [], primaryColor: aPrimaryColor, secondaryColor: aSecondaryColor, primaryFont: aPrimaryFont,
        specialInstructions, promptA: currentPromptA, promptB: currentPromptB,
        dateCreated: new Date().toISOString().slice(0, 10),
        producedBy: projectBrand, projectName, clientName,
        fontWeight: aFontWeight, advancedModules: advModules,
        // A/B theme overrides
        promptAPrimaryColor: aPrimaryColor, promptASecondaryColor: aSecondaryColor,
        promptAPrimaryFont: aPrimaryFont, promptAFontWeight: aFontWeight, promptAThemeMode: aThemeMode,
        promptBPrimaryColor: bPrimaryColor, promptBSecondaryColor: bSecondaryColor,
        promptBPrimaryFont: bPrimaryFont, promptBFontWeight: bFontWeight, promptBThemeMode: bThemeMode,
        // Reference design analysis
        referenceAnalysis: analysisResult?.analysis,
        promptAThemeRecommendation: analysisResult?.promptA,
        promptBThemeRecommendation: analysisResult?.promptB,
        analysisConfidence: analysisResult?.confidence,
        themeLockedA, themeLockedB,
      };
      saveProject(project);
      lastSavedHashRef.current = currentHash;
      onSaveResult(true);
    } catch (err: any) {
      onSaveResult(false, err.message || 'Save failed');
    }
  }, [getProjectHash, styleRefUrl, styleRef, sourceUrl, projectName, clientName, projectBrand, packageTier, modules, advModules, aPrimaryColor, aSecondaryColor, aPrimaryFont, aFontWeight, aThemeMode, bPrimaryColor, bSecondaryColor, bPrimaryFont, bFontWeight, bThemeMode, specialInstructions, currentPromptA, currentPromptB, onSaveResult]);

  const doClear = useCallback(() => {
    setProjectBrand('SwiftLift'); setSourceUrl(''); setProjectName(''); setClientName('');
    setStyleRef(null); setConvRef(null); setStyleRefUrl(''); setConvRefUrl('');
    setStyleUrlError(''); setConvUrlError('');
    setPackageTier('550'); setModules([]); setAdvModules([]);
    setAPrimaryColor(''); setASecondaryColor('');
    setAPrimaryFont(''); setAFontWeight(''); setAThemeMode('auto');
    setBPrimaryColor(''); setBSecondaryColor('');
    setBPrimaryFont(''); setBFontWeight(''); setBThemeMode('auto');
    setSpecialInstructions(''); setPromptALayoutOverride(''); setPromptBLayoutOverride('');
    setBrandDetected(false); setBrandDetecting(false);
    setDetectedSources({});
    setAnalysisResult(null); setAnalyzeError(''); setAnalyzing(false);
    setThemeLockedA(false); setThemeLockedB(false);
    manualOverrides.current = new Set();
    currentProjectIdRef.current = crypto.randomUUID();
    lastSavedHashRef.current = '';
    onClear();
  }, [onClear]);

  useEffect(() => { if (clearSignal > 0) doClear(); }, [clearSignal]);
  useEffect(() => { if (saveSignal > 0) doSave(); }, [saveSignal]);
  useEffect(() => { if (newSignal > 0) { doSave(); doClear(); } }, [newSignal]);

  // Reusable theme override section renderer
  const renderThemeSection = (
    prefix: 'a' | 'b',
    label: string,
    sublabel: string,
    pColor: string, setPColor: (v: string) => void,
    sColor: string, setSColor: (v: string) => void,
    font: string, setFont: (v: string) => void,
    weight: string, setWeight: (v: string) => void,
    mode: 'auto' | 'force_light' | 'force_dark', setMode: (v: 'auto' | 'force_light' | 'force_dark') => void,
  ) => {
    const locked = prefix === 'a' ? themeLockedA : themeLockedB;
    const setLocked = prefix === 'a' ? setThemeLockedA : setThemeLockedB;
    return (
    <div className="panel-section">
      <h3 className="panel-section-title">{label}</h3>
      <p className="text-xs text-muted-foreground mb-3">{sublabel}</p>
      <label className="flex items-center gap-2 mb-3 text-xs cursor-pointer select-none">
        <input type="checkbox" checked={locked} onChange={e => setLocked(e.target.checked)} className="rounded accent-primary" />
        <span className="text-foreground">Lock Prompt {prefix.toUpperCase()} Theme</span>
        <span className="text-muted-foreground">(prevent auto-overwrite)</span>
      </label>
      {prefix === 'a' && brandDetected && (
        <div className="mb-3 px-3 py-2 rounded-md bg-accent text-accent-foreground text-xs">
          ✨ Brand styling auto-detected from live website
        </div>
      )}
      {prefix === 'a' && brandDetecting && (
        <div className="mb-3 px-3 py-2 rounded-md bg-muted text-muted-foreground text-xs flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" /> Detecting brand from source URL…
        </div>
      )}
      {prefix === 'b' && brandDetected && (
        <div className="mb-3 px-3 py-2 rounded-md bg-accent text-accent-foreground text-xs">
          ✨ Premium direction auto-derived from source
        </div>
      )}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="control-label">Primary Color</label>
            <div className="flex items-center gap-1.5">
              <label className="relative w-8 h-8 rounded border border-border shrink-0 cursor-pointer overflow-hidden" style={{ background: pColor ? pColor : 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 8px 8px' }}>
                <input type="color" value={pColor || '#000000'} onChange={e => {
                  manualOverrides.current.add(`${prefix}_primaryColor`);
                  setPColor(e.target.value);
                }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </label>
              <input type="text" value={pColor ? pColor.replace(/^#/, '') : ''} onChange={e => {
                manualOverrides.current.add(`${prefix}_primaryColor`);
                const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                setPColor(v ? `#${v}` : '');
              }}
                placeholder="______" className="control-input flex-1 font-mono text-xs" maxLength={6} />
            </div>
            {prefix === 'a' && detectedSources.primaryColor && !manualOverrides.current.has('a_primaryColor') && (
              <p className="text-[10px] text-muted-foreground mt-1 italic">from {detectedSources.primaryColor}</p>
            )}
          </div>
          <div>
            <label className="control-label">Secondary Color</label>
            <div className="flex items-center gap-1.5">
              <label className="relative w-8 h-8 rounded border border-border shrink-0 cursor-pointer overflow-hidden" style={{ background: sColor ? sColor : 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 8px 8px' }}>
                <input type="color" value={sColor || '#000000'} onChange={e => {
                  manualOverrides.current.add(`${prefix}_secondaryColor`);
                  setSColor(e.target.value);
                }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </label>
              <input type="text" value={sColor ? sColor.replace(/^#/, '') : ''} onChange={e => {
                manualOverrides.current.add(`${prefix}_secondaryColor`);
                const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                setSColor(v ? `#${v}` : '');
              }}
                placeholder="______" className="control-input flex-1 font-mono text-xs" maxLength={6} />
            </div>
            {prefix === 'a' && detectedSources.secondaryColor && !manualOverrides.current.has('a_secondaryColor') && (
              <p className="text-[10px] text-muted-foreground mt-1 italic">from {detectedSources.secondaryColor}</p>
            )}
          </div>
        </div>
        <div>
          <label className="control-label">Primary Font</label>
          <select value={font} onChange={e => { manualOverrides.current.add(`${prefix}_primaryFont`); setFont(e.target.value); }} className="control-input">
            <option value="">— No override —</option>
            {googleFonts.map(f => (
              <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
            ))}
          </select>
          {prefix === 'a' && detectedSources.primaryFont && !manualOverrides.current.has('a_primaryFont') && (
            <p className="text-[10px] text-muted-foreground mt-1 italic">from {detectedSources.primaryFont}</p>
          )}
          {font && (
            <p className="mt-2 text-lg text-foreground" style={{ fontFamily: `"${font}", sans-serif` }}>
              The quick brown fox jumps over the lazy dog
            </p>
          )}
        </div>
        <div>
          <label className="control-label">Font Weight</label>
          <select value={weight} onChange={e => { manualOverrides.current.add(`${prefix}_fontWeight`); setWeight(e.target.value); }} className="control-input">
            <option value="">— No override —</option>
            <option value="400">400 — Regular</option>
            <option value="500">500 — Medium</option>
            <option value="600">600 — Semi Bold</option>
            <option value="700">700 — Bold</option>
            <option value="800">800 — Extra Bold</option>
            <option value="900">900 — Black</option>
          </select>
          {prefix === 'a' && detectedSources.fontWeight && !manualOverrides.current.has('a_fontWeight') && (
            <p className="text-[10px] text-muted-foreground mt-1 italic">from {detectedSources.fontWeight}</p>
          )}
        </div>
        <div>
          <label className="control-label">Theme Mode</label>
          <select value={mode} onChange={e => setMode(e.target.value as any)} className="control-input">
            <option value="auto">Auto — Follow source / reference</option>
            <option value="force_light">Force Light</option>
            <option value="force_dark">Force Dark</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === 'auto' && 'Inherits theme from the source site or reference design.'}
            {mode === 'force_light' && 'Forces light backgrounds, light surfaces, and dark text.'}
            {mode === 'force_dark' && 'Forces dark backgrounds, dark surfaces, and light text.'}
          </p>
        </div>
      </div>
    </div>
    );
  };

  return (
    <>
      <div className="space-y-5 overflow-y-auto pr-1">
        {/* 1. Project Setup */}
        <div className="panel-section">
          <h3 className="panel-section-title">Project Setup</h3>
          <div className="space-y-3">
            <div>
              <label className="control-label">Project Brand</label>
              <select value={projectBrand} onChange={e => setProjectBrand(e.target.value)} className="control-input">
                {projectBrands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="control-label">Source URL</label>
              <div className="flex items-center gap-1.5">
                <input type="text" value={sourceUrl} onChange={e => handleSourceUrlChange(e.target.value)}
                  onBlur={handleSourceUrlBlur}
                  placeholder="https://example.com" className="control-input flex-1" />
                {brandDetecting && <Loader2 size={16} className="animate-spin text-muted-foreground shrink-0" />}
              </div>
            </div>
            <div>
              <label className="control-label">Project Name</label>
              <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
                placeholder="Auto-filled from Source URL" className="control-input" />
            </div>
            <div>
              <label className="control-label">Client Name</label>
              <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                placeholder="Client or business name" className="control-input" />
            </div>
          </div>
        </div>

        {/* 2. Reference Design */}
        <div className="panel-section">
          <h3 className="panel-section-title">Reference Design</h3>
          <div className="space-y-3">
            {/* Style Reference */}
            <div>
              <label className="control-label">Style Reference</label>
              {styleRef ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/50 min-h-[40px]">
                  <LayoutGrid size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{styleRef.reference_name}</span>
                  <button onClick={() => setStyleRef(null)} className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowStyleLibrary(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                  <LayoutGrid size={16} /> Select Style Demo Site
                </button>
              )}
            </div>

            {/* Style Reference URL (manual override) */}
            <div>
              <label className="control-label">Style Reference URL <span className="text-muted-foreground font-normal">(manual override)</span></label>
              <input type="text" value={styleRefUrl} onChange={e => { setStyleRefUrl(e.target.value); setStyleUrlError(''); }}
                placeholder="https://reference-site.com" className="control-input" />
              {styleUrlError && <p className="text-xs text-destructive mt-1">{styleUrlError}</p>}
            </div>

            {/* Conversion Layout Reference */}
            <div>
              <label className="control-label">Conversion Layout Reference <span className="text-muted-foreground font-normal">(premium)</span></label>
              {convRef ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/50 min-h-[40px]">
                  <LayoutGrid size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{convRef.reference_name}</span>
                  <button onClick={() => setConvRef(null)} className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowConvLibrary(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                  <LayoutGrid size={16} /> Select Conversion Demo Site
                </button>
              )}
            </div>

            {/* Conversion Reference URL (manual override) */}
            <div>
              <label className="control-label">Conversion Reference URL <span className="text-muted-foreground font-normal">(manual override)</span></label>
              <input type="text" value={convRefUrl} onChange={e => { setConvRefUrl(e.target.value); setConvUrlError(''); }}
                placeholder="https://conversion-reference.com" className="control-input" />
              {convUrlError && <p className="text-xs text-destructive mt-1">{convUrlError}</p>}
            </div>
          </div>
        </div>

        {/* 2b. Reference Design Analysis */}
        <div className="panel-section">
          <h3 className="panel-section-title">Reference Design Analysis</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Analyze the reference URL, demo site, or screenshot to auto-generate Theme A and Theme B suggestions.
          </p>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            {analyzing ? <><Loader2 size={14} className="animate-spin" /> Analyzing…</> : <><Sparkles size={14} /> Analyze Reference Design</>}
          </button>
          {analyzeError && <p className="text-xs text-destructive mt-2">{analyzeError}</p>}

          {analysisResult && (
            <>
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="text-xs font-semibold text-foreground mb-2">Reference Design Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <SummaryItem label="Primary" swatch={analysisResult.analysis.primaryColor} value={analysisResult.analysis.primaryColor} />
                  <SummaryItem label="Secondary" swatch={analysisResult.analysis.secondaryColor} value={analysisResult.analysis.secondaryColor} />
                  <SummaryItem label="Font Direction" value={analysisResult.analysis.fontDirection} />
                  <SummaryItem label="Font Weight" value={analysisResult.analysis.fontWeight} />
                  <SummaryItem label="Design Style" value={analysisResult.analysis.designStyle} />
                  <SummaryItem label="Tone" value={analysisResult.analysis.tone} />
                  <SummaryItem label="Spacing" value={analysisResult.analysis.spacingStyle} />
                  <SummaryItem label="Card Style" value={analysisResult.analysis.cardStyle} />
                  <SummaryItem label="Button Style" value={analysisResult.analysis.buttonStyle} />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">Reference Analysis Confidence</span>
                  <span className="text-xs font-semibold text-foreground">{analysisResult.confidence}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${analysisResult.confidence}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Source: {analysisResult.analysis.sourceUsed === 'url' ? 'URL analyzed' : analysisResult.analysis.sourceUsed === 'screenshot' ? 'Screenshot only' : 'No usable reference'}
                </p>
              </div>
            </>
          )}
        </div>


        {/* 3. Package Tier */}
        <div className="panel-section">
          <h3 className="panel-section-title">Package Tier</h3>
          <div className="space-y-2">
            {[
              { value: '350' as const, label: '350 Structure', subA: 'Standard Layout Preview', subB: 'Conversion Style Layout Preview' },
              { value: '550' as const, label: '550 Structure', subA: 'Standard Layout Preview', subB: 'Conversion Style Layout Preview' },
            ].map(opt => (
              <label key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  packageTier === opt.value ? 'border-primary bg-accent' : 'border-border hover:bg-muted/50'
                }`}>
                <input type="radio" name="package" value={opt.value}
                  checked={packageTier === opt.value}
                  onChange={() => setPackageTier(opt.value)}
                  className="mt-0.5 accent-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Prompt A: {opt.subA} · Prompt B: {opt.subB}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 4A. Prompt A Brand & Theme Override */}
        {renderThemeSection(
          'a',
          'Prompt A Brand & Theme Override',
          'Controls theme overrides for Prompt A — Standard Layout',
          aPrimaryColor, setAPrimaryColor,
          aSecondaryColor, setASecondaryColor,
          aPrimaryFont, setAPrimaryFont,
          aFontWeight, setAFontWeight,
          aThemeMode, setAThemeMode,
        )}

        {/* 4A-2. Prompt A Layout Override */}
        <div className="panel-section">
          <h3 className="panel-section-title">Prompt A Layout Override</h3>
          <textarea value={promptALayoutOverride} onChange={e => setPromptALayoutOverride(e.target.value)}
            placeholder="Layout-specific instructions for Prompt A only (section order, hero style, nav variant, etc.)" rows={4} className="control-input resize-none" />
        </div>

        {/* 4B. Prompt B Brand & Theme Override */}
        {renderThemeSection(
          'b',
          'Prompt B Brand & Theme Override',
          'Controls theme overrides for Prompt B — Premium Conversion Layout',
          bPrimaryColor, setBPrimaryColor,
          bSecondaryColor, setBSecondaryColor,
          bPrimaryFont, setBPrimaryFont,
          bFontWeight, setBFontWeight,
          bThemeMode, setBThemeMode,
        )}

        {/* 4B-2. Prompt B Layout Override */}
        <div className="panel-section">
          <h3 className="panel-section-title">Prompt B Layout Override</h3>
          <textarea value={promptBLayoutOverride} onChange={e => setPromptBLayoutOverride(e.target.value)}
            placeholder="Layout-specific instructions for Prompt B only (conversion sticky CTA variant, hero form, section flow, etc.)" rows={4} className="control-input resize-none" />
        </div>

        {/* 5. Content Modules */}
        <div className="panel-section">
          <h3 className="panel-section-title">Content Modules</h3>
          <div className="space-y-1.5">
            {contentModules.map(m => (
              <label key={m.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                <input type="checkbox" checked={modules.includes(m.id)} onChange={() => toggleModule(m.id)} className="rounded accent-primary" />
                <span className="text-sm text-foreground">{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 6. Advanced Modules */}
        <div className="panel-section">
          <h3 className="panel-section-title">Advanced Modules</h3>
          <p className="text-xs text-muted-foreground mb-3">Add-on modules built on top of the $550 package.</p>
          <div className="space-y-1.5">
            {advancedModules.map(m => (
              <label key={m.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                <input type="checkbox" checked={advModules.includes(m.id)} onChange={() => toggleAdvModule(m.id)} className="rounded accent-primary" />
                <span className="text-sm text-foreground">{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 7. Global Project Instructions */}
        <div className="panel-section">
          <h3 className="panel-section-title">Global Project Instructions</h3>
          <textarea value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)}
            placeholder="Add global rules for this project, such as client requirements, forbidden styles, required language, CMS rules, form rules, footer rules, or deployment notes. Do not use this field for Prompt A / Prompt B layout override." rows={4} className="control-input resize-none" />
        </div>

        {/* 9. Generate Button + Sync Status */}
        <div className="pb-2 space-y-1.5">
          <button onClick={handleGenerate} disabled={generating || !sourceUrl}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm">
            <Sparkles size={16} />
            {generating ? 'Generating...' : 'Generate Prompts'}
          </button>
          {syncStatus === 'synced' && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
              <CheckCircle2 size={12} /> Prompts synced
            </div>
          )}
          {syncStatus === 'unsynced' && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600">
              <AlertTriangle size={12} /> {unsyncedPrompt ? `${unsyncedPrompt.replace('SwiftLift ', '').replace(' V1', '')} out of sync` : 'Prompts out of sync'}
            </div>
          )}
          {syncStatus === 'checking' && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 size={12} className="animate-spin" /> Checking sync...
            </div>
          )}
        </div>
      </div>

      {/* Brand Confirmation Popup */}
      {showBrandConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">Confirm Brand</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This prompt system is copyrighted by SwiftLift.<br />
              Are you generating this prompt under the correct brand?
            </p>
            <div className="mb-5">
              <label className="control-label">Brand</label>
              <select value={confirmBrand} onChange={e => setConfirmBrand(e.target.value)} className="control-input">
                {projectBrands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowBrandConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirmGenerate}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                Confirm & Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Style Reference Library Modal */}
      <ReferenceLibraryModal
        open={showStyleLibrary}
        onClose={() => setShowStyleLibrary(false)}
        onSelect={(ref) => setStyleRef({ reference_name: ref.site_name, live_url: ref.live_url })}
        roleFilter="style"
      />

      {/* Conversion Layout Reference Library Modal */}
      <ReferenceLibraryModal
        open={showConvLibrary}
        onClose={() => setShowConvLibrary(false)}
        onSelect={(ref) => setConvRef({ reference_name: ref.site_name, live_url: ref.live_url })}
        roleFilter="conversion_layout"
      />
    </>
  );
}
