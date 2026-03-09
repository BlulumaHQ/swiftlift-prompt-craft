import { getPromptBlock } from './promptLibraryStore';

interface PromptConfig {
  sourceUrl: string;
  referenceLayout: string;
  referenceUrl: string;
  packageTier: '350' | '550';
  modules: string[];
  primaryColor: string;
  secondaryColor: string;
  primaryFont: string;
  specialInstructions: string;
}

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

  // Load prompt blocks from library
  const baseEngine = getPromptBlock('base_core_engine')?.content || '[BASE ENGINE NOT FOUND]';
  const packagePrompt = getPromptBlock(isHighTier ? 'pkg_550_standard' : 'pkg_350_standard')?.content || '[PACKAGE NOT FOUND]';
  const conversionUpgrade = getPromptBlock('fake_conversion_layout_upgrade')?.content || '[UPGRADE NOT FOUND]';
  const referenceRulesBlock = getPromptBlock('reference_rules')?.content || '';
  const brandOverridesBlock = getPromptBlock('brand_overrides')?.content || '';

  // Build module section from library
  const moduleBlocks = config.modules.map(m => {
    const block = getPromptBlock(`mod_${m}`);
    return block ? block.content : `Include ${m} section.`;
  });
  const modulesSection = moduleBlocks.length > 0
    ? `\n\n${'═'.repeat(40)}\nCONTENT MODULES\n${'═'.repeat(40)}\n\n${moduleBlocks.join('\n\n')}`
    : '';

  // Reference rules
  const referenceRules = `\n\n${'═'.repeat(40)}\nREFERENCE DESIGN\n${'═'.repeat(40)}\n\nReference: ${ref}\n\n${referenceRulesBlock}`;

  // Brand overrides
  const brandOverride = (config.primaryColor || config.secondaryColor || config.primaryFont)
    ? `\n\n${'═'.repeat(40)}\nBRAND OVERRIDE\n${'═'.repeat(40)}\n\n${brandOverridesBlock}\n\nApplied Values:\n${config.primaryColor ? `Primary Color: ${config.primaryColor}\n` : ''}${config.secondaryColor ? `Secondary Color: ${config.secondaryColor}\n` : ''}${config.primaryFont ? `Primary Font: ${config.primaryFont}` : ''}`
    : '';

  // Simulated scraped content
  const scrapedData = `\n\n${'═'.repeat(40)}\nSCRAPED CONTENT DATABASE\n${'═'.repeat(40)}\n\nSource: ${config.sourceUrl}\nDomain: ${domain}\n\n[Content extracted from ${domain}]\n- Company name and profile detected\n- Page structure mapped\n- Navigation hierarchy extracted\n- Hero content captured\n- Service descriptions collected\n- Contact information preserved\n- Image URLs catalogued\n- URL structure preserved`;

  // Special instructions
  const specialInstructions = config.specialInstructions
    ? `\n\n${'═'.repeat(40)}\nSPECIAL INSTRUCTIONS\n${'═'.repeat(40)}\n\n${config.specialInstructions}`
    : '';

  // PROMPT A: base + package + modules + reference + brand + scraped + special
  const promptA = `SWIFTLIFT BUILD PROMPT — ${tierA}
Project: ${domain}
Source: ${config.sourceUrl}
Reference: ${ref}
Package: ${tierA}

${'═'.repeat(40)}
BASE ENGINE
${'═'.repeat(40)}

${baseEngine}

${'═'.repeat(40)}
PACKAGE
${'═'.repeat(40)}

${packagePrompt}${modulesSection}${referenceRules}${brandOverride}${scrapedData}${specialInstructions}

${'─'.repeat(40)}
END OF PROMPT A — ${tierA}`;

  // PROMPT B: base + package + conversion upgrade + modules + reference + brand + scraped + special
  const promptB = `SWIFTLIFT BUILD PROMPT — ${tierB}
Project: ${domain}
Source: ${config.sourceUrl}
Reference: ${ref}
Package: ${tierB}

${'═'.repeat(40)}
BASE ENGINE
${'═'.repeat(40)}

${baseEngine}

${'═'.repeat(40)}
PACKAGE
${'═'.repeat(40)}

${packagePrompt}

${'═'.repeat(40)}
CONVERSION LAYOUT UPGRADE
${'═'.repeat(40)}

${conversionUpgrade}${modulesSection}${referenceRules}${brandOverride}${scrapedData}${specialInstructions}

${'─'.repeat(40)}
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
