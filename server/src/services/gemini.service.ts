import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env';
import cloudinary from '../config/cloudinary';
import { IContentDocument } from '../models/content.model';
import { ContentType } from '../types/content.types';
import { logger } from '../utils/logger';

export enum SummaryMode {
  QUICK = 'QUICK',
  STUDENT = 'STUDENT',
  TECHNICAL = 'TECHNICAL',
}

export enum OutreachFormat {
  WEBSITE = 'WEBSITE',
  LINKEDIN = 'LINKEDIN',
  X = 'X',
  INSTAGRAM = 'INSTAGRAM',
  STUDENT = 'STUDENT',
}

export enum SummarySource {
  PDF = 'PDF',
  METADATA = 'METADATA',
  METADATA_FALLBACK = 'METADATA_FALLBACK',
}

export type AILanguage = 'EN' | 'HI';

export interface SummaryResult {
  summary: string;
  source: SummarySource;
}

export interface OutreachResult {
  draft: string;
  source: SummarySource;
}

const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

let genAIClient: GoogleGenAI | null = null;

function getGenAIClient(): GoogleGenAI {
  if (!genAIClient) {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables.');
    }
    genAIClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return genAIClient;
}

/**
 * Returns the ordered list of Gemini model candidates for a given tier.
 *
 * - 'fast': Flash-Lite first, then strong as fallback (quota overflow).
 * - 'strong': Strong model first, then Flash-Lite as last-resort fallback.
 *
 * Models are read from env vars at call time so restarts pick up changes.
 */
function getModelCandidates(tier: 'fast' | 'strong'): string[] {
  const fast = config.geminiFastModel;
  const strong = config.geminiStrongModel;
  if (tier === 'fast') {
    return [fast, strong];
  }
  return [strong, fast];
}

/**
 * Executes a Gemini request with automatic failover through the supplied model list.
 * Only quota / availability errors trigger fallover; other errors are re-thrown immediately.
 */
async function executeWithModelFallback<T>(
  requestFn: (model: string) => Promise<T>,
  candidates: string[]
): Promise<T> {
  let lastError: any = null;
  for (const model of candidates) {
    try {
      return await requestFn(model);
    } catch (error: any) {
      lastError = error;
      const isQuotaOrRateLimit =
        error?.status === 429 ||
        error?.status === 503 ||
        error?.message?.includes('RESOURCE_EXHAUSTED') ||
        error?.message?.includes('quota') ||
        error?.message?.includes('429') ||
        error?.message?.includes('503') ||
        error?.message?.includes('UNAVAILABLE');

      if (isQuotaOrRateLimit) {
        logger.warn(
          `Model ${model} rate/quota limit or temporary outage encountered. Falling over to next candidate model...`
        );
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/** Logs a timing measurement only in development mode. */
function devLog(label: string, startMs: number): void {
  if (config.nodeEnv === 'development') {
    logger.info(`[AI Timing] ${label}: ${Date.now() - startMs}ms`);
  }
}

function formatMetadataText(content: IContentDocument): string {
  return `
RESEARCH METADATA:
- Title: ${content.title || 'Not provided'}
- Description: ${content.description || 'Not provided'}
- Research Type: ${content.type || 'Not provided'}
- Principal Scientist / Author: ${content.scientistName || 'Not provided'}
- Institution: ${content.institution || 'Not provided'}
- Geographic Region: ${content.region || 'Not provided'}
- Expedition / Mission: ${content.expedition || 'Not provided'}
- Expedition Year: ${content.year || 'Not provided'}
- Research Domain / Topic: ${content.researchTopic || 'Not provided'}
- Keywords: ${content.keywords && content.keywords.length > 0 ? content.keywords.join(', ') : 'Not provided'}
- External Reference: ${content.externalUrl || 'Not provided'}
- Associated File URL: ${content.fileUrl || 'Not provided'}
`.trim();
}

/**
 * Formats research information specifically for social media outreach prompts.
 * Deliberately excludes raw media/file URLs and avoids outputting 'Not provided' filler lines.
 */
function formatOutreachSourceMetadata(content: IContentDocument): string {
  const lines: string[] = ['RESEARCH INFORMATION:'];
  if (content.title?.trim()) {
    lines.push(`- Title: ${content.title.trim()}`);
  }
  if (content.description?.trim()) {
    lines.push(`- Description: ${content.description.trim()}`);
  }
  if (content.type?.trim()) {
    lines.push(`- Content Type: ${content.type.trim()}`);
  }
  if (content.scientistName?.trim()) {
    lines.push(`- Contributor / Scientist: ${content.scientistName.trim()}`);
  }
  if (content.institution?.trim()) {
    lines.push(`- Institution: ${content.institution.trim()}`);
  }
  if (content.region?.trim()) {
    lines.push(`- Geographic Region: ${content.region.trim()}`);
  }
  if (content.expedition?.trim()) {
    lines.push(`- Expedition / Mission: ${content.expedition.trim()}`);
  }
  if (content.year) {
    lines.push(`- Year: ${content.year}`);
  }
  if (content.researchTopic?.trim()) {
    lines.push(`- Topic: ${content.researchTopic.trim()}`);
  }
  if (content.keywords && content.keywords.length > 0) {
    const valid = content.keywords.filter((k) => k?.trim());
    if (valid.length > 0) {
      lines.push(`- Keywords: ${valid.join(', ')}`);
    }
  }
  return lines.join('\n');
}

/**
 * Quality guard for social media outreach drafts:
 * - Removes any raw media / Cloudinary / file URLs
 * - Removes any metadata headers or bullet list labels (e.g. 'Research Context:')
 * - Removes any missing-value filler lines (e.g. 'Not available', 'N/A')
 * - Removes generic corporate / AI boilerplate openers
 * - Cleans and deduplicates hashtags to fit platform standards
 */
export function cleanOutreachDraft(
  rawText: string,
  format: OutreachFormat,
  _language: AILanguage = 'EN'
): string {
  if (!rawText) return '';
  let text = rawText.trim();

  // 1. Strip raw Cloudinary or other file URLs
  text = text.replace(/https?:\/\/[^\s)]+\.(pdf|png|jpg|jpeg|webp|mp4|mov|csv|xlsx|zip)[^\s)]*/gi, '');
  text = text.replace(/https?:\/\/res\.cloudinary\.com[^\s)]*/gi, '');
  text = text.replace(/https?:\/\/(?:www\.)?polaris\.ncpor\.res\.in[^\s)]*/gi, '');

  // 2. Strip metadata bullet dumps and label lines
  text = text.replace(
    /(?:^|\n)\s*(?:[-*•]\s*)?(?:###?\s*)?(?:Research Context|Research Information|Research Type|Content Type|Geographic Region|Expedition|Expedition \/ Mission|Research Domain|External Reference|Associated File URL|Principal Scientist|Contributor \/ Scientist|Author|Institution|Expedition Year|Focus Topic|Topic|Keywords)\s*:\s*[^\n]*/gi,
    ''
  );

  // 3. Strip missing-value label artifacts like "External Reference: Not available", "DOI: N/A"
  text = text.replace(/(?:^|\n)[^\n]*(?:not available|not provided|n\/a|unavailable)[^\n]*/gi, '');

  // 4. Strip generic corporate AI openers if present at start
  text = text.replace(/^POLARIS is pleased to (?:highlight|announce|present)[^\n.!?]*[.!?]?\s*/i, '');
  text = text.replace(/^We are delighted to (?:announce|share|highlight)[^\n.!?]*[.!?]?\s*/i, '');
  text = text.replace(/^We invite researchers to[^\n.!?]*[.!?]?\s*/i, '');
  text = text.replace(/^In today's rapidly changing world[^\n.!?]*[.!?]?\s*/i, '');

  // 5. Deduplicate and clean hashtags
  const hashtagRegex = /#([A-Za-z0-9_\u0900-\u097F]+)/g;
  const foundHashtags: string[] = [];
  let match;
  while ((match = hashtagRegex.exec(text)) !== null) {
    foundHashtags.push(match[0]);
  }

  // Remove hashtags from text body to place cleanly at the end
  text = text.replace(/#([A-Za-z0-9_\u0900-\u097F]+)/g, '').trim();

  // Deduplicate preserving order
  const uniqueHashtags: string[] = [];
  const seenLower = new Set<string>();
  for (const tag of foundHashtags) {
    const lower = tag.toLowerCase();
    if (!seenLower.has(lower)) {
      seenLower.add(lower);
      uniqueHashtags.push(tag);
    }
  }

  // Limit hashtags based on platform:
  // LinkedIn: 3–5
  // Instagram: 4–7
  const maxTags = format === OutreachFormat.LINKEDIN ? 5 : 7;
  const selectedTags = uniqueHashtags.slice(0, maxTags);

  if (selectedTags.length > 0) {
    text = `${text}\n\n${selectedTags.join(' ')}`;
  }

  // 6. Clean up excessive whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

function buildLanguageInstructions(language: AILanguage): string {
  if (language === 'HI') {
    return `
MANDATORY LANGUAGE INSTRUCTION (HINDI - हिंदी):
1. Generate this entire summary/draft in natural, fluent, and scientifically grounded Hindi (Devanagari script).
2. DO NOT produce awkward literal word-for-word translation; generate authentic, clear Hindi science communication.
3. Preserve scientific terminology accurately. When translating a technical term, you may optionally include the standard English scientific term in parentheses alongside it where helpful (e.g. "ग्लेशियोलॉजी (Glaciology)", "एरोसोल (Aerosols)").
4. Preserve author/scientist names, institution names, official expedition names, and polar research station names (Maitri, Bharati, Himadri) in their standard authoritative forms.
5. If data or information is missing, explicitly state in Hindi: "प्रदान किए गए शोध मेटाडेटा या दस्तावेज़ में उपलब्ध नहीं है।"
`.trim();
  }
  return `
MANDATORY LANGUAGE INSTRUCTION (ENGLISH):
1. Output in fluent, grammatically flawless, standard scientific English.
2. If data or information is missing, explicitly state: "Not available in the provided research metadata or document."
`.trim();
}

function buildVariationInstructions(variantIndex: number = 1, isOutreach: boolean = false): string {
  if (variantIndex <= 1) return '';
  if (isOutreach) {
    return `
VARIATION GUIDELINE (Alternative Angle / Version ${variantIndex} of 5):
1. Present a creative, fresh communication hook and distinct presentation angle tailored to this medium.
2. Structure sentences and wording differently from previous drafts.
3. SCIENTIFIC FACTS, numerical data, findings, and researcher details MUST REMAIN 100% ACCURATE AND IDENTICAL to the source. Do NOT invent facts.
`.trim();
  }
  return `
VARIATION GUIDELINE (Alternative Perspective / Version ${variantIndex} of 5):
1. Present a fresh stylistic perspective, varied sentence structure, and distinct phrasing from standard versions.
2. You may adjust the order of points, use different descriptive verbs, or structure explanations with alternative emphasis.
3. SCIENTIFIC FACTS, measurements, numbers, researchers, stations, and findings MUST REMAIN 100% ACCURATE AND IDENTICAL to the source. Do NOT invent, assume, or extrapolate facts.
`.trim();
}

function buildMetadataPrompt(
  content: IContentDocument,
  mode: SummaryMode,
  language: AILanguage = 'EN',
  variantIndex: number = 1
): string {
  const metadataText = formatMetadataText(content);
  const langInstructions = buildLanguageInstructions(language);
  const variationInstructions = buildVariationInstructions(variantIndex, false);

  const baseInstructions = `
CRITICAL INSTRUCTIONS & SOURCE GROUNDING:
1. Base your summary STRICTLY on the provided research metadata above.
2. DO NOT hallucinate, invent, or extrapolate facts, measurements, or findings not present in the supplied metadata.
3. If specific information, methodologies, or data are missing or omitted from the metadata, explicitly state that it is not available.
4. Do not include markdown meta-chatter (e.g. "Here is the summary"). Output the structured summary directly.
${langInstructions}
${variationInstructions ? '\n' + variationInstructions : ''}
`.trim();

  if (mode === SummaryMode.QUICK) {
    return `
You are an expert polar science AI assistant for the POLARIS research platform.
Generate a concise, high-impact 5-7 point bulleted summary of this scientific research record based ONLY on the metadata below.

${metadataText}

${baseInstructions}

FORMAT:
Provide exactly 5 to 7 bullet points capturing the core theme, researcher, region, mission context, and subject domain in ${language === 'HI' ? 'Hindi (हिंदी)' : 'English'}.
`.trim();
  }

  if (mode === SummaryMode.STUDENT) {
    const headings =
      language === 'HI'
        ? `STRUCTURE YOUR OUTPUT WITH EXACTLY THESE HEADINGS:
### क्या अध्ययन किया जा रहा है? (What is being studied?)
(विषय को सरल और स्पष्ट भाषा में समझाएं)

### यह महत्वपूर्ण क्यों है? (Why does it matter?)
(इस ध्रुवीय अनुसंधान के महत्व को सरल शब्दों में समझाएं)

### मुख्य विचार और निष्कर्ष (Main idea & findings)
(शोध में दिए गए प्राथमिक विचारों और संदर्भ का सारांश दें)

### महत्वपूर्ण वैज्ञानिक शब्द सरल भाषा में (Important scientific terms explained simply)
(मेटाडेटा में मिले किसी भी तकनीकी शब्द या अवधारणा को सरल शब्दों में परिभाषित करें)`
        : `STRUCTURE YOUR OUTPUT WITH EXACTLY THESE HEADINGS:
### What is being studied?
(Explain the topic simply and clearly)

### Why does it matter?
(Explain the significance of this polar research in plain terms)

### Main idea & findings
(Summarize the primary ideas and context provided in the record)

### Important scientific terms explained simply
(Define any technical concepts or terms found in the metadata in everyday words)`;

    return `
You are an engaging science communicator and educator for the POLARIS polar research platform.
Explain this research in clear, accessible, and simple language suitable for a student or general public reader based ONLY on the metadata below.

${metadataText}

${baseInstructions}

${headings}
`.trim();
  }

  // SummaryMode.TECHNICAL
  const headings =
    language === 'HI'
      ? `STRUCTURE YOUR OUTPUT WITH EXACTLY THESE HEADINGS:
### उद्देश्य (Objective)
(प्राथमिक वैज्ञानिक लक्ष्य बताएं)

### अध्ययन संदर्भ (Study Context)
(भौगोलिक क्षेत्र, अभियान, संस्थान और समय-सीमा का विवरण दें)

### कार्यप्रणाली / डेटा (Methodology / Data)
(डेटा स्रोतों और कार्यप्रणाली का विवरण केवल तभी दें जब मेटाडेटा में निर्दिष्ट हो; अन्यथा लिखें: "प्रदान किए गए शोध मेटाडेटा में उपलब्ध नहीं है।")

### मुख्य निष्कर्ष (Key Findings)
(विवरण से प्राथमिक शोध अंतर्दृष्टि का सारांश दें)

### वैज्ञानिक महत्व (Scientific Significance)
(विषय के आधार पर क्रायोस्फेरिक, महासागरीय, वायुमंडलीय या ग्रहीय प्रभाव का विवरण दें)

### सीमाएँ / अनुपलब्ध जानकारी (Limitations / Missing Information)
(प्रदान किए गए मेटाडेटा में अनुपलब्ध किसी भी डेटा या प्रक्रियात्मक विवरण को स्पष्ट रूप से नोट करें)`
      : `STRUCTURE YOUR OUTPUT WITH EXACTLY THESE HEADINGS:
### Objective
(State the primary scientific goal)

### Study Context
(Detail the geographic region, expedition, institution, and timeframe)

### Methodology / Data
(Detail data sources and methodologies only if specified in the metadata; if not available, write: "Not available in the provided research metadata.")

### Key Findings
(Summarize the primary research insights from the description)

### Scientific Significance
(Detail cryospheric, oceanic, atmospheric, or planetary impact based on the topic)

### Limitations / Missing Information
(Explicitly note any data or procedural details not available in the provided metadata)`;

  return `
You are a senior scientific analyst for the POLARIS polar scientific repository.
Generate a rigorous, structured technical summary of this research record based ONLY on the metadata below.

${metadataText}

${baseInstructions}

${headings}
`.trim();
}

function buildPdfPrompt(
  content: IContentDocument,
  mode: SummaryMode,
  language: AILanguage = 'EN',
  variantIndex: number = 1
): string {
  const metadataText = formatMetadataText(content);
  const langInstructions = buildLanguageInstructions(language);
  const variationInstructions = buildVariationInstructions(variantIndex, false);

  const baseInstructions = `
CRITICAL INSTRUCTIONS & SOURCE GROUNDING:
1. Base your summary STRICTLY on the attached scientific PDF document and the provided research metadata above.
2. DO NOT invent, assume, or hallucinate facts, data, statistics, sample counts, or findings not present in the document or metadata.
3. If specific information, methodologies, or data are missing or unavailable in the PDF or metadata, explicitly state that it is not available.
4. Do not include markdown meta-chatter (e.g. "Here is the summary"). Output the structured summary directly.
${langInstructions}
${variationInstructions ? '\n' + variationInstructions : ''}
`.trim();

  if (mode === SummaryMode.QUICK) {
    return `
You are an expert polar science AI assistant for the POLARIS research platform.
Generate a concise, high-impact 5-7 point bulleted summary of this research record and its attached PDF document based ONLY on the provided PDF content and metadata.

${metadataText}

${baseInstructions}

FORMAT:
Provide exactly 5 to 7 bullet points capturing key findings, methodology, geographic context, and scientific significance from the PDF document in ${language === 'HI' ? 'Hindi (हिंदी)' : 'English'}.
`.trim();
  }

  if (mode === SummaryMode.STUDENT) {
    const headings =
      language === 'HI'
        ? `STRUCTURE YOUR OUTPUT WITH EXACTLY THESE HEADINGS:
### क्या अध्ययन किया जा रहा है? (What is being studied?)
(दस्तावेज़ के आधार पर शोध विषय और फोकस को सरल और स्पष्ट भाषा में समझाएं)

### यह महत्वपूर्ण क्यों है? (Why does it matter?)
(इसके महत्व और वास्तविक दुनिया में उपयोगिता को सरल शब्दों में समझाएं)

### मुख्य विचार और निष्कर्ष (Main idea & findings)
(पीडीएफ में वर्णित प्राथमिक निष्कर्षों, खोजों या डेटा का सारांश दें)

### महत्वपूर्ण वैज्ञानिक शब्द सरल भाषा में (Important scientific terms explained simply)
(शोध में प्रयुक्त मुख्य तकनीकी अवधारणाओं या शब्दावली को रोज़मर्रा के शब्दों में परिभाषित करें)`
        : `STRUCTURE YOUR OUTPUT WITH EXACTLY THESE HEADINGS:
### What is being studied?
(Explain the research topic and focus simply and clearly based on the document)

### Why does it matter?
(Explain the significance and real-world importance in plain terms)

### Main idea & findings
(Summarize the primary conclusions, discoveries, or data described in the PDF)

### Important scientific terms explained simply
(Define key technical concepts or terminology used in the research in everyday words)`;

    return `
You are an engaging science communicator and educator for the POLARIS polar research platform.
Explain this research and its attached PDF document in clear, accessible, and simple language suitable for a student or general public reader based ONLY on the provided PDF content and metadata.

${metadataText}

${baseInstructions}

${headings}
`.trim();
  }

  // SummaryMode.TECHNICAL
  const headings =
    language === 'HI'
      ? `STRUCTURE YOUR OUTPUT WITH EXACTLY THESE HEADINGS:
### उद्देश्य (Objective)
(प्राथमिक वैज्ञानिक उद्देश्य और परिकल्पनाएं बताएं)

### अध्ययन संदर्भ (Study Context)
(भौगोलिक निर्देशांक/क्षेत्र, अभियान, संस्थान और अवलोकन समय-सीमा का विवरण दें)

### कार्यप्रणाली / डेटा (Methodology / Data)
(पीडीएफ से अवलोकन विधियों, उपकरणों, डेटा संग्रह और मॉडलों का विवरण दें; यदि निर्दिष्ट नहीं है, तो लिखें: "प्रदान किए गए शोध मेटाडेटा या दस्तावेज़ में उपलब्ध नहीं है।")

### मुख्य निष्कर्ष (Key Findings)
(पीडीएफ से गहन वैज्ञानिक निष्कर्ष, मात्रात्मक परिणाम और देखे गए रुझान प्रदान करें)

### वैज्ञानिक महत्व (Scientific Significance)
(क्रायोस्फेरिक, महासागरीय, वायुमंडलीय या ग्रहीय प्रभावों का विवरण दें)

### सीमाएँ / अनुपलब्ध जानकारी (Limitations / Missing Information)
(अध्ययन की सीमाओं, अनमापे चरों या अनुपलब्ध जानकारी का स्पष्ट रूप से विवरण दें)`
      : `STRUCTURE YOUR OUTPUT WITH EXACTLY THESE HEADINGS:
### Objective
(State the primary scientific objective and hypotheses)

### Study Context
(Detail the geographic coordinates/region, expedition, institution, and observation timeframe)

### Methodology / Data
(Detail observational methods, instrumentation, data collection, and models used from the PDF; if not specified, write: "Not available in the provided research metadata or document.")

### Key Findings
(Provide in-depth scientific findings, quantitative results, and observed trends from the PDF)

### Scientific Significance
(Detail cryospheric, oceanic, atmospheric, or planetary implications)

### Limitations / Missing Information
(Explicitly detail study limitations, unmeasured variables, or missing information)`;

  return `
You are a senior scientific analyst for the POLARIS polar scientific repository.
Generate a rigorous, structured technical summary of this research record and attached PDF document based ONLY on the provided PDF content and metadata.

${metadataText}

${baseInstructions}

${headings}
`.trim();
}

function buildOutreachPrompt(
  content: IContentDocument,
  format: OutreachFormat,
  hasPdf: boolean,
  language: AILanguage = 'EN',
  variantIndex: number = 1
): string {
  const metadataText = formatOutreachSourceMetadata(content);
  const sourceContext = hasPdf
    ? 'the attached scientific PDF document and the research information below'
    : 'the research information below';
  const variationInstructions = buildVariationInstructions(variantIndex, true);

  const langInstruction =
    language === 'HI'
      ? `
LANGUAGE (HINDI - हिंदी):
- Write in authentic, natural, and fluent Devanagari Hindi (हिंदी) science communication.
- DO NOT produce awkward literal word-for-word translation.
- If any detail is not mentioned, simply omit it. NEVER write meta-notes like "उपलब्ध नहीं है" or "विवरण उपलब्ध नहीं है".
`.trim()
      : `
LANGUAGE (ENGLISH):
- Write in clear, natural, human, grammatically flawless English.
- If any detail is missing from the source, simply omit it. NEVER write "N/A", "Not available", "Not provided", or mention missing fields.
`.trim();

  const coreRules = `
CRITICAL SOCIAL COPYWRITING RULES:
1. Base your post STRICTLY on ${sourceContext}.
2. NEVER invent breakthroughs, discoveries, statistics, numbers, trends, environmental impacts, or conclusions not in the source. If the research is simple field photography, observation, or dataset with modest metadata, keep the description modest and truthful (e.g. "This visual documentation captures...", "These field observations contribute to recording polar conditions...").
3. NEVER output metadata headers, section titles, or bullet lists (e.g. NEVER write "Research Context:", "Research Type:", "Expedition:", "Geographic Region:", "External Reference:"). Write in natural, flowing prose paragraphs only.
4. NEVER output raw file URLs, Cloudinary links, or website URLs in the text. Media is attached separately by the application.
5. NEVER use generic AI or corporate filler phrases (e.g. NEVER use "POLARIS is pleased to highlight", "We are delighted to announce", "We invite researchers to engage", "In today's rapidly changing world", "This groundbreaking effort").
6. Omit missing information completely. Never write "Not available", "N/A", or "Not provided".
${langInstruction}
${variationInstructions ? '\n' + variationInstructions : ''}
`.trim();

  switch (format) {
    case OutreachFormat.LINKEDIN:
      return `
You are writing a professional, human LinkedIn post about polar and marine research for the POLARIS scientific community.

${coreRules}

${metadataText}

LENGTH & TONE:
- Target length: roughly 100 to 180 words.
- Tone: professional, scientific, accessible, human, and concise.
- Avoid clickbait, fake excitement, excessive emojis, and report formatting.

STRUCTURE:
1. Strong, factual opening hook (engaging, thoughtful, and grounded in the subject).
2. 2 to 3 short paragraphs naturally explaining what was studied or documented, weaving in the author, institution, or expedition context where relevant.
3. Why this research or documentation matters to polar and marine science, long-term monitoring, or environmental understanding.
4. Exactly 3 to 5 relevant, clean scientific hashtags at the very end.

OUTPUT ONLY the final LinkedIn post copy ready to publish. Do not include markdown headers or meta-notes.
`.trim();

    case OutreachFormat.INSTAGRAM:
      return `
You are writing a warm, engaging, and accessible Instagram caption about polar and marine research for the POLARIS community.

${coreRules}

${metadataText}

LENGTH & TONE:
- Target length: roughly 60 to 120 words (distinctly shorter, warmer, and more conversational than LinkedIn).
- Tone: accessible, curious, visual, human. NOT academic or report-like.
- Use at most 0 to 2 tasteful emojis (e.g. ❄️, 🌊, 🧭, 🔬).

STRUCTURE:
1. Short, captivating hook.
2. 1 to 2 simple, conversational sentences explaining what this observation, photo, or research captures.
3. Why it matters to polar environments, ocean ecosystems, or our planet.
4. Exactly 4 to 7 clean, relevant hashtags at the end.

OUTPUT ONLY the final Instagram caption copy ready to publish. Do not include markdown headers or meta-notes.
`.trim();

    default:
      return `
You are a science communicator for POLARIS.
${coreRules}

${metadataText}
Write a concise post draft about this research.
`.trim();
  }
}



/**
 * Resolves a download URL, signing with Cloudinary API credentials if hosted on Cloudinary.
 */
function resolveDownloadUrl(fileUrl: string): string {
  if (fileUrl.includes('cloudinary.com')) {
    const match = fileUrl.match(/\/upload\/(?:s--[^/]+--\/)?(?:v\d+\/)?(.+?)(\.[^./?#]+)?(?:[?#].*)?$/);
    if (match) {
      const publicId = match[1];
      const format = match[2] ? match[2].replace('.', '') : 'pdf';
      try {
        return cloudinary.utils.private_download_url(publicId, format, {
          resource_type: 'image',
          type: 'upload',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        });
      } catch (err) {
        logger.warn(`Could not generate signed Cloudinary download URL: ${err}`);
      }
    }
  }
  return fileUrl;
}

/**
 * Downloads a PDF buffer securely from the given URL.
 */
async function fetchPdfBuffer(fileUrl: string): Promise<Buffer> {
  const targetUrl = resolveDownloadUrl(fileUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20-second timeout

  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'POLARIS-AISummaryService/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download PDF: HTTP ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_PDF_SIZE_BYTES) {
      throw new Error(`PDF size exceeds maximum limit of 20MB (${contentLength} bytes)`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_PDF_SIZE_BYTES) {
      throw new Error(`PDF size exceeds maximum limit of 20MB (${buffer.length} bytes)`);
    }

    // Basic PDF header verification
    if (buffer.length < 4 || buffer.subarray(0, 4).toString() !== '%PDF') {
      throw new Error('Downloaded file does not have a valid PDF header (%PDF).');
    }

    return buffer;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generates a metadata-only AI summary.
 * Uses FAST model for QUICK/STUDENT, STRONG model for TECHNICAL.
 */
async function generateMetadataSummary(
  content: IContentDocument,
  mode: SummaryMode,
  language: AILanguage = 'EN',
  variantIndex: number = 1
): Promise<string> {
  const ai = getGenAIClient();
  const prompt = buildMetadataPrompt(content, mode, language, variantIndex);
  const tier = mode === SummaryMode.TECHNICAL ? 'strong' : 'fast';
  const candidates = getModelCandidates(tier);

  const t0 = Date.now();
  const response = await executeWithModelFallback(
    (model) => ai.models.generateContent({ model, contents: prompt }),
    candidates
  );
  devLog(`generateMetadataSummary [${mode}/${language}](v${variantIndex}) (${tier})`, t0);

  const text = response.text;
  if (!text || text.trim().length === 0) {
    throw new Error('Unable to synthesize content summary.');
  }

  return text.trim();
}

/**
 * Generates a metadata-only AI outreach draft.
 * Always uses FAST model (social/website outreach is a low-complexity task).
 */
async function generateMetadataOutreach(
  content: IContentDocument,
  format: OutreachFormat,
  language: AILanguage = 'EN',
  variantIndex: number = 1
): Promise<string> {
  const ai = getGenAIClient();
  const prompt = buildOutreachPrompt(content, format, false, language, variantIndex);
  const candidates = getModelCandidates('fast');

  const t0 = Date.now();
  const response = await executeWithModelFallback(
    (model) => ai.models.generateContent({ model, contents: prompt }),
    candidates
  );
  devLog(`generateMetadataOutreach [${format}/${language}](v${variantIndex})`, t0);

  let text = response.text?.trim() || '';
  if (!text) {
    throw new Error('Unable to synthesize outreach draft.');
  }

  text = cleanOutreachDraft(text, format, language);

  return text;
}

/**
 * Generates an AI summary for a published content record.
 * For REPORT and PUBLICATION with a valid fileUrl, analyzes the actual PDF with metadata.
 * If PDF processing fails, falls back gracefully to metadata-only summary.
 *
 * Model routing:
 * - PDF analysis: always STRONG (complexity requires full model capability).
 * - Metadata-only TECHNICAL: STRONG.
 * - Metadata-only QUICK/STUDENT: FAST.
 */
export async function generateContentSummary(
  content: IContentDocument,
  mode: SummaryMode = SummaryMode.QUICK,
  language: AILanguage = 'EN',
  variantIndex: number = 1
): Promise<SummaryResult> {
  const isPdfEligible =
    (content.type === ContentType.REPORT || content.type === ContentType.PUBLICATION) &&
    typeof content.fileUrl === 'string' &&
    content.fileUrl.trim().length > 0;

  if (isPdfEligible) {
    try {
      const pdfT0 = Date.now();
      const pdfBuffer = await fetchPdfBuffer(content.fileUrl!.trim());
      devLog(`fetchPdfBuffer [${content._id}]`, pdfT0);

      const base64Pdf = pdfBuffer.toString('base64');
      const ai = getGenAIClient();
      const prompt = buildPdfPrompt(content, mode, language, variantIndex);
      // PDF analysis always uses strong model; fallback to fast if quota-exhausted
      const candidates = getModelCandidates('strong');

      const t0 = Date.now();
      const response = await executeWithModelFallback(
        (model) =>
          ai.models.generateContent({
            model,
            contents: [
              { inlineData: { data: base64Pdf, mimeType: 'application/pdf' } },
              prompt,
            ],
          }),
        candidates
      );
      devLog(`generateContentSummary PDF [${mode}/${language}](v${variantIndex}) (strong)`, t0);

      const text = response.text;
      if (!text || text.trim().length === 0) {
        throw new Error('Unable to synthesize PDF content.');
      }

      return {
        summary: text.trim(),
        source: SummarySource.PDF,
      };
    } catch (pdfError: any) {
      logger.warn(
        `PDF analysis failed for content ${content._id} (${content.fileUrl}): ${pdfError?.message}. Falling back to metadata summary.`
      );
      const metadataSummary = await generateMetadataSummary(content, mode, language, variantIndex);
      return {
        summary: metadataSummary,
        source: SummarySource.METADATA_FALLBACK,
      };
    }
  }

  // Non-PDF types (DATASET, IMAGE, VIDEO, ACTIVITY) or content without fileUrl
  const metadataSummary = await generateMetadataSummary(content, mode, language, variantIndex);
  return {
    summary: metadataSummary,
    source: SummarySource.METADATA,
  };
}

/**
 * Generates an outreach draft for a published content record.
 * Supports WEBSITE, LINKEDIN, X, INSTAGRAM, STUDENT formats.
 *
 * Model routing: all outreach formats use FAST model (social/website copywriting
 * is a low-complexity task). PDF analysis uses STRONG; fallback to fast on quota.
 */
export async function generateContentOutreach(
  content: IContentDocument,
  format: OutreachFormat = OutreachFormat.LINKEDIN,
  language: AILanguage = 'EN',
  variantIndex: number = 1
): Promise<OutreachResult> {
  const isPdfEligible =
    (content.type === ContentType.REPORT || content.type === ContentType.PUBLICATION) &&
    typeof content.fileUrl === 'string' &&
    content.fileUrl.trim().length > 0;

  if (isPdfEligible) {
    try {
      const pdfT0 = Date.now();
      const pdfBuffer = await fetchPdfBuffer(content.fileUrl!.trim());
      devLog(`fetchPdfBuffer [outreach/${content._id}]`, pdfT0);

      const base64Pdf = pdfBuffer.toString('base64');
      const ai = getGenAIClient();
      const prompt = buildOutreachPrompt(content, format, true, language, variantIndex);
      // PDF outreach uses strong model for quality; fallback to fast on quota
      const candidates = getModelCandidates('strong');

      const t0 = Date.now();
      const response = await executeWithModelFallback(
        (model) =>
          ai.models.generateContent({
            model,
            contents: [
              { inlineData: { data: base64Pdf, mimeType: 'application/pdf' } },
              prompt,
            ],
          }),
        candidates
      );
      devLog(`generateContentOutreach PDF [${format}/${language}](v${variantIndex}) (strong)`, t0);

      let text = response.text?.trim() || '';
      if (!text) {
        throw new Error('Unable to synthesize PDF outreach draft.');
      }

      text = cleanOutreachDraft(text, format, language);

      return {
        draft: text,
        source: SummarySource.PDF,
      };
    } catch (pdfError: any) {
      logger.warn(
        `PDF outreach generation failed for content ${content._id} (${content.fileUrl}): ${pdfError?.message}. Falling back to metadata outreach.`
      );
      const metadataDraft = await generateMetadataOutreach(content, format, language, variantIndex);
      return {
        draft: metadataDraft,
        source: SummarySource.METADATA_FALLBACK,
      };
    }
  }

  // Non-PDF types (DATASET, IMAGE, VIDEO, ACTIVITY) or content without fileUrl
  const metadataDraft = await generateMetadataOutreach(content, format, language, variantIndex);
  return {
    draft: metadataDraft,
    source: SummarySource.METADATA,
  };
}

export interface WorkspaceSummaryInput {
  inputType: 'PDF' | 'IMAGE' | 'VIDEO' | 'LINK';
  buffer?: Buffer;
  mimeType?: string;
  text?: string;
  url?: string;
  filename?: string;
}

export interface WorkspaceSummaryResult {
  summary: string;
  inputType: 'PDF' | 'IMAGE' | 'VIDEO' | 'LINK';
  mode: SummaryMode;
  language: AILanguage;
  source: 'UPLOAD' | 'URL';
}

function buildWorkspaceTextPrompt(
  text: string,
  mode: SummaryMode,
  language: AILanguage,
  sourceLabel: string
): string {
  const langInstructions = buildLanguageInstructions(language);
  const baseInstructions = `
CRITICAL INSTRUCTIONS & SOURCE GROUNDING:
1. Base your summary STRICTLY on the provided ${sourceLabel} content below.
2. DO NOT invent, assume, or hallucinate facts, measurements, or findings not present in the content.
3. If specific information, methodologies, or data are missing or omitted, explicitly state that they are not available.
4. Do not include markdown meta-chatter (e.g. "Here is the summary"). Output the structured summary directly.
${langInstructions}
`.trim();

  if (mode === SummaryMode.QUICK) {
    return `
You are an expert polar science AI assistant for the POLARIS research platform.
Generate a concise, high-impact 5-7 point bulleted summary of this content based ONLY on the text below.

${baseInstructions}

CONTENT:
${text}

FORMAT:
Provide exactly 5 to 7 bullet points capturing key takeaways, primary observations, and scientific significance in ${
      language === 'HI' ? 'Hindi (हिंदी)' : 'English'
    }.
`.trim();
  }

  if (mode === SummaryMode.STUDENT) {
    const headings =
      language === 'HI'
        ? `STRUCTURE YOUR OUTPUT WITH EXACTLY THESE HEADINGS:
### क्या अध्ययन किया जा रहा है? (What is being studied?)
(विषय और संदर्भ को सरल और स्पष्ट भाषा में समझाएं)

### यह महत्वपूर्ण क्यों है? (Why does it matter?)
(इसके महत्व और वास्तविक दुनिया में उपयोगिता को सरल शब्दों में समझाएं)

### मुख्य विचार और निष्कर्ष (Main idea & findings)
(दस्तावेज़ में वर्णित प्राथमिक विचारों और निष्कर्षों का सारांश दें)

### महत्वपूर्ण वैज्ञानिक शब्द सरल भाषा में (Important scientific terms explained simply)
(सामग्री में प्रयुक्त तकनीकी शब्दों को सरल और रोज़मर्रा की भाषा में परिभाषित करें)`
        : `STRUCTURE YOUR OUTPUT WITH EXACTLY THESE HEADINGS:
### What is being studied?
(Explain the subject and context simply and clearly)

### Why does it matter?
(Explain the significance and real-world importance in plain terms)

### Main idea & findings
(Summarize the primary takeaways, discoveries, or data described)

### Important scientific terms explained simply
(Define technical concepts or terminology used in the text in everyday words)`;

    return `
You are an engaging science communicator and educator for the POLARIS polar research platform.
Explain this content in clear, accessible, and simple language suitable for a student or general reader based ONLY on the provided text below.

${baseInstructions}

CONTENT:
${text}

${headings}
`.trim();
  }

  // SummaryMode.TECHNICAL
  const headings =
    language === 'HI'
      ? `STRUCTURE YOUR OUTPUT WITH EXACTLY THESE HEADINGS:
### उद्देश्य / विषय (Objective / Topic)
(प्राथमिक वैज्ञानिक उद्देश्य या केंद्रीय विषय बताएं)

### अध्ययन संदर्भ (Study Context)
(भौगोलिक क्षेत्र, अभियान, संस्थान, डेटा स्रोत या समय-सीमा का विवरण दें; यदि अनुपलब्ध है तो स्पष्ट रूप से लिखें)

### कार्यप्रणाली / साक्ष्य (Methodology / Evidence)
(प्रयुक्त विधियों, डेटा संग्रह और साक्ष्यों का विवरण दें; यदि अनुपलब्ध है तो लिखें: "प्रदान की गई सामग्री में उपलब्ध नहीं है।")

### मुख्य निष्कर्ष (Key Findings)
(दस्तावेज़ से प्राथमिक अंतर्दृष्टि, मात्रात्मक परिणाम और टिप्पणियां प्रदान करें)

### वैज्ञानिक महत्व (Scientific Significance)
(क्रायोस्फेरिक, महासागरीय, वायुमंडलीय या वैज्ञानिक प्रभावों का विवरण दें)

### सीमाएँ / अनुपलब्ध जानकारी (Limitations / Missing Information)
(सामग्री में अनुपलब्ध किसी भी डेटा, प्रक्रियात्मक विवरण या अस्पष्टता को स्पष्ट रूप से नोट करें)`
      : `STRUCTURE YOUR OUTPUT WITH EXACTLY THESE HEADINGS:
### Objective / Topic
(State the primary scientific goal or core subject)

### Study Context
(Detail the geographic region, expedition, institution, data sources, or timeframe; if not provided, state clearly)

### Methodology / Evidence
(Detail observational methods, data collection, or evidence described; if not available, write: "Not available in the provided content.")

### Key Findings
(Summarize primary research insights, quantitative results, and findings)

### Scientific Significance
(Detail cryospheric, oceanic, atmospheric, or scientific implications)

### Limitations / Missing Information
(Explicitly note any data or procedural details not available in the provided content)`;

  return `
You are a senior scientific analyst for the POLARIS polar scientific platform.
Generate a rigorous, structured technical summary of this content based ONLY on the provided text below.

${baseInstructions}

CONTENT:
${text}

${headings}
`.trim();
}

function buildWorkspaceMediaPrompt(
  mediaType: 'image' | 'video' | 'pdf',
  mode: SummaryMode,
  language: AILanguage
): string {
  const langInstructions = buildLanguageInstructions(language);

  const mediaGrounding =
    mediaType === 'image'
      ? `CRITICAL IMAGE GROUNDING & ANTI-HALLUCINATION RULES:
1. Base your summary STRICTLY on what is visibly present in the attached image.
2. DO NOT invent, assume, or guess scientist names, institutions, expedition numbers, exact dates, or specific unverified coordinates unless clearly inscribed and legible in the image.
3. If the geographic location, expedition, or context cannot be determined from visual cues alone, explicitly state: "${
          language === 'HI'
            ? 'चित्र के दृश्य साक्ष्यों से सटीक स्थान या अभियान संदर्भ निर्धारित नहीं किया जा सकता।'
            : 'Exact location or expedition context cannot be determined from visual evidence alone.'
        }"
4. Describe visible polar features (e.g. ice structures, moraines, crevasses, wildlife, instruments, weather conditions, research installations) accurately and objectively.`
      : mediaType === 'video'
      ? `CRITICAL VIDEO GROUNDING & ANTI-HALLUCINATION RULES:
1. Base your summary STRICTLY on the footage, visual elements, and audio present in the attached video.
2. DO NOT hallucinate unobservable events, dates, or scientist details.
3. State observable field operations, environmental conditions, or experimental activities clearly.`
      : `CRITICAL DOCUMENT GROUNDING RULES:
1. Base your summary STRICTLY on the attached scientific PDF document.
2. DO NOT invent or assume facts, sample sizes, or findings not present in the PDF.
3. If specific details are missing, explicitly state they are not available.`;

  const baseInstructions = `
${mediaGrounding}
4. Do not include extraneous conversational opening or closing chatter. Output the structured summary directly.
${langInstructions}
`.trim();

  if (mode === SummaryMode.QUICK) {
    return `
You are an expert polar science AI assistant for the POLARIS research platform.
Analyze the attached ${mediaType} and provide a concise, high-impact 5-7 point bulleted summary of the observed scientific content.

${baseInstructions}

FORMAT:
Provide exactly 5 to 7 bullet points capturing key visual/scientific observations, equipment/features, and significance in ${
      language === 'HI' ? 'Hindi (हिंदी)' : 'English'
    }.
`.trim();
  }

  if (mode === SummaryMode.STUDENT) {
    const headings =
      language === 'HI'
        ? `STRUCTURE YOUR OUTPUT WITH EXACTLY THESE HEADINGS:
### यह क्या दर्शाता है? (What does this show?)
(इस ${mediaType} में दिखाई देने वाले मुख्य विषय और दृश्यों को सरल और स्पष्ट भाषा में समझाएं)

### यह महत्वपूर्ण क्यों है? (Why does it matter?)
(ध्रुवीय विज्ञान और पर्यावरण के दृष्टिकोण से इसका महत्व सरल शब्दों में समझाएं)

### मुख्य अवलोकन और सीख (Key observations & takeaways)
(इस ${mediaType} से प्राप्त मुख्य वैज्ञानिक सीखों का सारांश दें)

### महत्वपूर्ण वैज्ञानिक शब्द सरल भाषा में (Important scientific terms explained simply)
(दृश्य में पहचानी गई भूवैज्ञानिक, क्रायोस्फेरिक या जैविक विशेषताओं को सरल शब्दों में परिभाषित करें)`
        : `STRUCTURE YOUR OUTPUT WITH EXACTLY THESE HEADINGS:
### What does this show?
(Explain what is visible in this ${mediaType} simply and clearly)

### Why does it matter?
(Explain the significance to polar science and our planet in plain terms)

### Key observations & takeaways
(Summarize the primary takeaways from this ${mediaType})

### Important scientific terms explained simply
(Define any cryospheric, geological, or atmospheric features observed in everyday words)`;

    return `
You are an engaging science communicator and educator for the POLARIS polar research platform.
Explain what is observed in this ${mediaType} in clear, accessible language suitable for a student or general reader.

${baseInstructions}

${headings}
`.trim();
  }

  // SummaryMode.TECHNICAL
  const headings =
    language === 'HI'
      ? `STRUCTURE YOUR OUTPUT WITH EXACTLY THESE HEADINGS:
### दृश्य अवलोकन एवं संदर्भ (Visual Observations & Context)
(पहचानी गई विशेषताओं, उपकरणों, इलाके, हिमनद संरचनाओं या वायुमंडलीय स्थितियों का सटीक विवरण दें)

### वैज्ञानिक विवरण / साक्ष्य (Scientific Details / Evidence)
(दृश्य में दिखाई देने वाले साक्ष्यों, हिमनदीय प्रक्रियाओं, तकनीकी उपकरणों या पर्यावरणीय संकेतकों का विश्लेषण करें)

### वैज्ञानिक महत्व (Scientific Significance)
(क्रायोस्फेरिक, महासागरीय, वायुमंडलीय या ग्रहीय विज्ञान के संदर्भ में महत्व का विवरण दें)

### सीमाएँ / अनिश्चितताएँ (Limitations & Uncertainties)
(दृश्य साक्ष्यों से जो निर्धारित नहीं किया जा सकता—जैसे सटीक स्थान, समय-सीमा, या अज्ञात चर—उसे स्पष्ट रूप से दर्ज करें)`
      : `STRUCTURE YOUR OUTPUT WITH EXACTLY THESE HEADINGS:
### Visual Observations & Context
(Provide a rigorous description of observed features, instrumentation, terrain, ice structures, or environmental conditions)

### Scientific Details & Evidence
(Analyze the visible evidence, glaciological processes, technical apparatus, or environmental indicators)

### Scientific Significance
(Detail relevance to cryospheric, oceanic, atmospheric, or planetary science)

### Limitations & Uncertainties
(Explicitly detail limitations of visual analysis, including unidentifiable variables, context, or unverified locations)`;

  return `
You are a senior scientific analyst for the POLARIS polar scientific repository.
Generate a rigorous, structured technical analysis of this ${mediaType}.

${baseInstructions}

${headings}
`.trim();
}

/**
 * Generates an AI summary for user-provided temporary workspace content (PDF, Image, Video, or Link).
 * Processed in-memory and discarded immediately after generation without persisting to DB or Cloudinary.
 *
 * Model routing:
 * - PDF (all modes): STRONG model (document analysis benefits from full capability).
 * - IMAGE/VIDEO: FAST model (visual description is low-complexity).
 * - LINK → PDF buffer: STRONG model.
 * - LINK → image buffer: FAST model.
 * - LINK → text article: FAST for QUICK/STUDENT, STRONG for TECHNICAL.
 */
export async function generateWorkspaceSummary(
  input: WorkspaceSummaryInput,
  mode: SummaryMode = SummaryMode.QUICK,
  language: AILanguage = 'EN'
): Promise<WorkspaceSummaryResult> {
  const ai = getGenAIClient();
  const source = input.inputType === 'LINK' ? 'URL' : 'UPLOAD';

  // 1. PDF File Input — strong model for accurate document analysis
  if (input.inputType === 'PDF') {
    if (!input.buffer || input.buffer.length === 0) {
      throw new Error('PDF file buffer is empty or missing.');
    }

    const base64Pdf = input.buffer.toString('base64');
    const prompt = buildWorkspaceMediaPrompt('pdf', mode, language);
    const candidates = getModelCandidates('strong');

    const t0 = Date.now();
    const response = await executeWithModelFallback(
      (model) =>
        ai.models.generateContent({
          model,
          contents: [{ inlineData: { data: base64Pdf, mimeType: 'application/pdf' } }, prompt],
        }),
      candidates
    );
    devLog(`generateWorkspaceSummary PDF [${mode}/${language}] (strong)`, t0);

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Unable to synthesize document analysis.');
    }

    return { summary: text, inputType: 'PDF', mode, language, source: 'UPLOAD' };
  }

  // 2. IMAGE File Input — fast model (visual observation is low-complexity)
  if (input.inputType === 'IMAGE') {
    if (!input.buffer || input.buffer.length === 0) {
      throw new Error('Image file buffer is empty or missing.');
    }

    const mimeType = input.mimeType || 'image/jpeg';
    const base64Image = input.buffer.toString('base64');
    const prompt = buildWorkspaceMediaPrompt('image', mode, language);
    const candidates = getModelCandidates('fast');

    const t0 = Date.now();
    const response = await executeWithModelFallback(
      (model) =>
        ai.models.generateContent({
          model,
          contents: [{ inlineData: { data: base64Image, mimeType } }, prompt],
        }),
      candidates
    );
    devLog(`generateWorkspaceSummary IMAGE [${mode}/${language}] (fast)`, t0);

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Unable to synthesize image analysis.');
    }

    return { summary: text, inputType: 'IMAGE', mode, language, source: 'UPLOAD' };
  }

  // 3. VIDEO File Input — fast model (multimodal description is low-complexity)
  if (input.inputType === 'VIDEO') {
    if (!input.buffer || input.buffer.length === 0) {
      throw new Error('Video file buffer is empty or missing.');
    }

    const mimeType = input.mimeType || 'video/mp4';
    const base64Video = input.buffer.toString('base64');
    const prompt = buildWorkspaceMediaPrompt('video', mode, language);
    const candidates = getModelCandidates('fast');

    try {
      const t0 = Date.now();
      const response = await executeWithModelFallback(
        (model) =>
          ai.models.generateContent({
            model,
            contents: [{ inlineData: { data: base64Video, mimeType } }, prompt],
          }),
        candidates
      );
      devLog(`generateWorkspaceSummary VIDEO [${mode}/${language}] (fast)`, t0);

      const text = response.text?.trim();
      if (!text) {
        throw new Error('Unable to synthesize video analysis.');
      }

      return { summary: text, inputType: 'VIDEO', mode, language, source: 'UPLOAD' };
    } catch (videoError: any) {
      logger.warn(`Direct multimodal video processing failed: ${videoError?.message}`);
      throw new Error(
        `Video analysis could not be completed: ${videoError?.message || 'Unsupported format or size limit exceeded'}. Please ensure the video is under 25MB (MP4/WEBM).`
      );
    }
  }

  // 4. LINK Input (or pre-extracted text / media from URL)
  if (input.inputType === 'LINK') {
    // If link resolved to a direct PDF buffer — strong model
    if (input.buffer && input.mimeType?.includes('application/pdf')) {
      const base64Pdf = input.buffer.toString('base64');
      const prompt = buildWorkspaceMediaPrompt('pdf', mode, language);
      const candidates = getModelCandidates('strong');

      const t0 = Date.now();
      const response = await executeWithModelFallback(
        (model) =>
          ai.models.generateContent({
            model,
            contents: [
              { inlineData: { data: base64Pdf, mimeType: 'application/pdf' } },
              prompt,
            ],
          }),
        candidates
      );
      devLog(`generateWorkspaceSummary LINK/PDF [${mode}/${language}] (strong)`, t0);

      const text = response.text?.trim();
      if (!text) {
        throw new Error('Unable to synthesize URL document analysis.');
      }

      return { summary: text, inputType: 'LINK', mode, language, source: 'URL' };
    }

    // If link resolved to a direct image buffer — fast model
    if (input.buffer && input.mimeType?.startsWith('image/')) {
      const base64Image = input.buffer.toString('base64');
      const prompt = buildWorkspaceMediaPrompt('image', mode, language);
      const candidates = getModelCandidates('fast');

      const t0 = Date.now();
      const response = await executeWithModelFallback(
        (model) =>
          ai.models.generateContent({
            model,
            contents: [{ inlineData: { data: base64Image, mimeType: input.mimeType || 'image/jpeg' } }, prompt],
          }),
        candidates
      );
      devLog(`generateWorkspaceSummary LINK/IMAGE [${mode}/${language}] (fast)`, t0);

      const text = response.text?.trim();
      if (!text) {
        throw new Error('Unable to synthesize URL image analysis.');
      }

      return { summary: text, inputType: 'LINK', mode, language, source: 'URL' };
    }

    // Link resolved to text / HTML web article
    const textContent = input.text?.trim() || '';
    if (!textContent) {
      throw new Error('No readable text or media found at the provided URL.');
    }

    const prompt = buildWorkspaceTextPrompt(
      textContent,
      mode,
      language,
      input.url ? `web article at (${input.url})` : 'web article'
    );
    // Text articles: TECHNICAL uses strong, QUICK/STUDENT use fast
    const tier = mode === SummaryMode.TECHNICAL ? 'strong' : 'fast';
    const candidates = getModelCandidates(tier);

    const t0 = Date.now();
    const response = await executeWithModelFallback(
      (model) => ai.models.generateContent({ model, contents: prompt }),
      candidates
    );
    devLog(`generateWorkspaceSummary LINK/text [${mode}/${language}] (${tier})`, t0);

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Unable to synthesize web article analysis.');
    }

    return { summary: text, inputType: 'LINK', mode, language, source: 'URL' };
  }

  throw new Error(`Unsupported input type: ${input.inputType}`);
}

