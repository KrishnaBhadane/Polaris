import { config } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Creates a natural, concise spoken summary of a long response.
 * Preserves the introduction, key takeaways of each main point, and the conclusion,
 * while staying well within ElevenLabs payload limits in ONE single synthesis request.
 * Works seamlessly with both English and Hindi (. ! ? ।).
 */
export function createConciseSpokenVersion(text: string, maxChars: number = 1350): string {
  if (text.length <= maxChars) {
    return text;
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const bulletLines: string[] = [];
  const introLines: string[] = [];
  const conclusionLines: string[] = [];
  let foundBullets = false;

  for (const line of lines) {
    if (/^[-*•]|\d+\.\s+/.test(line)) {
      foundBullets = true;
      bulletLines.push(line);
    } else if (!foundBullets) {
      introLines.push(line);
    } else {
      conclusionLines.push(line);
    }
  }

  const getFirstSentences = (t: string, count: number = 1): string => {
    const sentences = t.match(/[^.!?।]+[.!?।]+/g) || [t];
    return sentences.slice(0, count).map((s) => s.trim()).join(' ');
  };

  const getLastSentence = (t: string): string => {
    const sentences = t.match(/[^.!?।]+[.!?।]+/g) || [t];
    return sentences[sentences.length - 1]?.trim() || t;
  };

  const spokenParts: string[] = [];

  if (bulletLines.length > 0) {
    // 1. Introduction: first 1-2 sentences
    const introCombined = introLines.join(' ');
    if (introCombined) {
      spokenParts.push(getFirstSentences(introCombined, 2));
    }

    // 2. Key takeaways: first sentence of each key point (up to 4)
    const bulletSummaries: string[] = [];
    const maxBullets = Math.min(bulletLines.length, 4);
    for (let i = 0; i < maxBullets; i++) {
      const cleanBullet = bulletLines[i].replace(/^[-*•]|\d+\.\s+/, '').trim();
      const firstSent = getFirstSentences(cleanBullet, 1);
      if (firstSent) {
        bulletSummaries.push(firstSent);
      }
    }
    if (bulletSummaries.length > 0) {
      spokenParts.push(bulletSummaries.join(' '));
    }

    // 3. Conclusion: last sentence
    const conclusionCombined = conclusionLines.join(' ');
    if (conclusionCombined) {
      spokenParts.push(getLastSentence(conclusionCombined));
    } else if (introLines.length > 0) {
      const lastIntro = getLastSentence(introCombined);
      if (!spokenParts[0]?.includes(lastIntro)) {
        spokenParts.push(lastIntro);
      }
    }
  } else {
    // Multi-paragraph text
    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (paragraphs.length > 1) {
      spokenParts.push(getFirstSentences(paragraphs[0], 2));
      for (let i = 1; i < paragraphs.length - 1; i++) {
        spokenParts.push(getFirstSentences(paragraphs[i], 1));
      }
      spokenParts.push(getLastSentence(paragraphs[paragraphs.length - 1]));
    } else {
      const sentences = text.match(/[^.!?।]+[.!?।]+/g) || [text];
      let accumulated = '';
      for (const sent of sentences) {
        if ((accumulated + ' ' + sent).trim().length <= maxChars) {
          accumulated = (accumulated + ' ' + sent).trim();
        } else {
          break;
        }
      }
      return accumulated || text.slice(0, maxChars);
    }
  }

  let result = spokenParts.join(' ').replace(/\s+/g, ' ').trim();

  if (result.length > maxChars) {
    const boundary = result.slice(0, maxChars).search(/[.!?।][^.!?।]*$/);
    if (boundary > 300) {
      result = result.slice(0, boundary + 1).trim();
    } else {
      result = result.slice(0, maxChars).trim();
    }
  }

  return result;
}

/**
 * Strips markdown symbols, URLs, and source sections before sending to ElevenLabs TTS.
 * For long answers, creates a natural concise spoken summary to ensure
 * ONE single ElevenLabs synthesis request with consistent prosody.
 * Handles both Hindi and English text cleanly.
 */
export function cleanTextForElevenlabsTts(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. Remove source sections if appended to the text (e.g. "Sources:", "POLARIS Sources:", "Web Sources:")
  text = text.replace(/(?:^|\n)(?:###?\s*)?(?:POLARIS\s+Sources?|Web\s+Sources?|Sources?):[\s\S]*$/i, '');

  // 2. Strip markdown links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

  // 3. Strip raw URLs and DOI links
  text = text.replace(/https?:\/\/[^\s)]+/gi, '');
  text = text.replace(/\b10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+\b/gi, '');

  // 4. Strip code blocks and inline code
  text = text.replace(/`{1,3}[^`]*`{1,3}/g, '');

  // 5. If text is long (> 1200 chars), create a concise cohesive spoken version
  if (text.length > 1200) {
    text = createConciseSpokenVersion(text, 1350);
  }

  // 6. Strip bold and italic markdown
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');

  // 7. Strip header markers
  text = text.replace(/^#{1,6}\s+/gm, '');

  // 8. Strip bullet points and list numbers
  text = text.replace(/^[-•*]\s+/gm, '');
  text = text.replace(/^\d+\.\s+/gm, '');

  // 9. Strip blockquotes
  text = text.replace(/^>\s+/gm, '');

  // Detect Hindi content (Devanagari characters)
  const isHindi = /[\u0900-\u097F]/.test(text);

  if (isHindi) {
    // 1. Remove parenthetical bilingual duplicates, e.g. "Albedo (अल्बीडो)" -> "अल्बीडो"
    text = text.replace(/[A-Za-z0-9\s-]+\s*\(\s*([\u0900-\u097F\s-]+)\s*\)/g, '$1');
    text = text.replace(/([\u0900-\u097F\s-]+)\s*\(\s*[A-Za-z0-9\s-]+\s*\)/g, '$1');

    // 2. Remove slash bilingual duplicates, e.g. "Albedo / अल्बीडो" -> "अल्बीडो"
    text = text.replace(/[A-Za-z0-9-]+\s*[/|\\]\s*([\u0900-\u097F]+)/g, '$1');
    text = text.replace(/([\u0900-\u097F]+)\s*[/|\\]\s*[A-Za-z0-9-]+/g, '$1');

    // 3. Remove consecutive English + Hindi pairs
    text = text.replace(/\bMaya\s+माया/gi, 'माया');
    text = text.replace(/माया\s+Maya\b/gi, 'माया');
    text = text.replace(/\bPOLARIS\s+पोलारिस/gi, 'पोलारिस');
    text = text.replace(/पोलारिस\s+POLARIS\b/gi, 'पोलारिस');
    text = text.replace(/\bAlbedo\s+अल्बीडो/gi, 'अल्बीडो');
    text = text.replace(/अल्बीडो\s+Albedo\b/gi, 'अल्बीडो');
    text = text.replace(/\bCryosphere\s+क्रायोस्फियर/gi, 'क्रायोस्फियर');
    text = text.replace(/क्रायोस्फियर\s+Cryosphere\b/gi, 'क्रायोस्फियर');
    text = text.replace(/\bSharks?\s+शार्क/gi, 'शार्क');
    text = text.replace(/शार्क\s+Sharks?\b/gi, 'शार्क');

    // 4. Map standalone Latin proper names & technical terms to Devanagari
    text = text.replace(/\bMaya\b/gi, 'माया');
    text = text.replace(/\bPOLARIS\b/gi, 'पोलारिस');
    text = text.replace(/\bNCPOR\b/gi, 'एनसीपीओआर');
    text = text.replace(/\bNPDC\b/gi, 'एनपीडीसी');
    text = text.replace(/\bMaitri\b/gi, 'मैत्री');
    text = text.replace(/\bBharati\b/gi, 'भारती');
    text = text.replace(/\bHimadri\b/gi, 'हिमाद्री');
    text = text.replace(/\bDakshin\s+Gangotri\b/gi, 'दक्षिण गंगोत्री');
    text = text.replace(/\bAntarctica\b/gi, 'अंटार्कटिका');
    text = text.replace(/\bArctic\b/gi, 'आर्कटिक');
    text = text.replace(/\bAlbedo\b/gi, 'अल्बीडो');
    text = text.replace(/\bCryosphere\b/gi, 'क्रायोस्फियर');
    text = text.replace(/\bSharks?\b/gi, 'शार्क');
    text = text.replace(/\bPlanktons?\b/gi, 'प्लवक');
    text = text.replace(/\bMarine\s+biology\b/gi, 'समुद्री जीवविज्ञान');
    text = text.replace(/\bOceanography\b/gi, 'समुद्र विज्ञान');

    // 5. Remove any leftover isolated Latin words in Hindi speech to prevent speech synthesis glitching
    text = text.replace(/\b[A-Za-z]+\b/g, '');

    // 6. Deduplicate repeated Hindi terms
    text = text.replace(/माया\s+माया/g, 'माया');
    text = text.replace(/पोलारिस\s+पोलारिस/g, 'पोलारिस');
    text = text.replace(/अल्बीडो\s+अल्बीडो/g, 'अल्बीडो');
    text = text.replace(/शार्क\s+शार्क/g, 'शार्क');
  } else {
    // English mode:
    text = text.replace(/\bMaya\s+Maya\b/gi, 'Maya');
    text = text.replace(/\bPOLARIS\b/gi, 'Po la ris');
  }

  // Normalize whitespace and newlines
  text = text.replace(/\s+/g, ' ').trim();

  // Enforce safe ceiling for ElevenLabs API
  if (text.length > 1800) {
    const lastSentence = text.slice(0, 1800).search(/[.!?।][^.!?।]*$/);
    if (lastSentence > 800) {
      text = text.slice(0, lastSentence + 1).trim();
    } else {
      text = text.slice(0, 1800).trim();
    }
  }

  return text;
}

export interface ElevenlabsTtsResult {
  audioBuffer: Buffer;
  contentType: string;
}

export interface ElevenlabsTtsStreamResult {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
}

/**
 * Initiates streaming REST Text-to-Speech from ElevenLabs.
 * Returns the incoming ReadableStream immediately without buffering the entire file into memory.
 */
export async function streamElevenlabsSpeech(
  rawText: string,
  signal?: AbortSignal
): Promise<ElevenlabsTtsStreamResult> {
  const apiKey = config.elevenLabsApiKey;
  const voiceId = config.elevenLabsVoiceId;
  const modelId = config.elevenLabsTtsModel || 'eleven_flash_v2_5';

  if (!apiKey || !voiceId) {
    throw new Error('TTS service unavailable');
  }

  const cleanText = cleanTextForElevenlabsTts(rawText);
  if (!cleanText) {
    throw new Error('Speech text cannot be empty');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`;

  const startTime = Date.now();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: cleanText,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: 1.0,
      },
    }),
    signal,
  });

  const durationMs = Date.now() - startTime;

  if (!response.ok || !response.body) {
    // Sanitized log without exposing API key or credentials
    logger.warn(`[Maya TTS] ElevenLabs responded with status ${response.status} in ${durationMs}ms`);
    throw new Error('TTS synthesis failed');
  }

  const contentType = response.headers.get('content-type') || 'audio/mpeg';
  logger.info(`[Maya TTS] ElevenLabs stream connected in ${durationMs}ms`);

  return {
    stream: response.body,
    contentType,
  };
}

/**
 * Calls ElevenLabs REST Text-to-Speech API to convert text into complete audio buffer.
 * Preserved for full-buffer fallback if required.
 */
export async function generateElevenlabsSpeech(rawText: string): Promise<ElevenlabsTtsResult> {
  const apiKey = config.elevenLabsApiKey;
  const voiceId = config.elevenLabsVoiceId;
  const modelId = config.elevenLabsTtsModel || 'eleven_flash_v2_5';

  if (!apiKey || !voiceId) {
    throw new Error('TTS service unavailable');
  }

  const cleanText = cleanTextForElevenlabsTts(rawText);
  if (!cleanText) {
    throw new Error('Speech text cannot be empty');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`;

  const startTime = Date.now();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: cleanText,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: 1.0,
      },
    }),
  });

  const durationMs = Date.now() - startTime;

  if (!response.ok) {
    // Sanitized log without exposing API key or response body
    logger.warn(`[Maya TTS] ElevenLabs responded with status ${response.status} in ${durationMs}ms`);
    throw new Error('TTS synthesis failed');
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get('content-type') || 'audio/mpeg';

  logger.info(`[Maya TTS] ElevenLabs request completed in ${durationMs}ms (${audioBuffer.length} bytes)`);

  return {
    audioBuffer,
    contentType,
  };
}
