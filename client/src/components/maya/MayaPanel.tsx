import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sendMayaMessageApi, fetchMayaTtsAudioApi, streamMayaTtsAudioApi } from '../../services/maya.service';
import type { MayaLanguage, MayaRecentMessage, MayaSource } from '../../services/maya.service';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
interface MayaPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
  sources?: MayaSource[];
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const GREETING_MESSAGE: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  content: "Hi, I'm Maya. I can help you explore polar and ocean science.",
};

const LOADING_MESSAGES = [
  'Maya is checking the science...',
  'Maya is connecting the polar dots...',
  'Maya is thinking through the research...',
  'Maya is looking into it...',
];

// ─────────────────────────────────────────────────────────────────
// SAFE MARKDOWN RENDERER
// Renders **bold**, *italic*, bullet lists, and ## headings
// into React elements. No dangerouslySetInnerHTML.
// User-supplied HTML tags are rendered as plain text naturally
// because React escapes strings inside JSX.
// ─────────────────────────────────────────────────────────────────
type InlinePart = React.ReactNode;

function renderInline(text: string, keyBase: string): InlinePart[] {
  const parts: InlinePart[] = [];
  // Combined regex for **bold** and *italic* (bold first — more specific)
  const inlinePattern = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = inlinePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[0].startsWith('**')) {
      // Bold
      parts.push(
        <strong key={`${keyBase}-b${idx}`} style={{ fontWeight: 600, color: '#111315' }}>
          {match[1]}
        </strong>
      );
    } else {
      // Italic
      parts.push(
        <em key={`${keyBase}-i${idx}`} style={{ fontStyle: 'italic', color: '#4F5B63' }}>
          {match[2]}
        </em>
      );
    }
    lastIndex = match.index + match[0].length;
    idx++;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      result.push(
        <ul
          key={`ul-${key++}`}
          style={{ paddingLeft: '1.1rem', margin: '0.25rem 0 0.25rem 0' }}
        >
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    // Heading: ## or ###
    if (/^#{2,3}\s+/.test(line)) {
      flushList();
      const headingText = line.replace(/^#{2,3}\s+/, '');
      result.push(
        <p
          key={`h-${key++}`}
          style={{
            fontSize: '10.5px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: '#627681',
            margin: '0.55rem 0 0.2rem 0',
          }}
        >
          {renderInline(headingText, `h-${key}`)}
        </p>
      );
    } else if (/^[-•*]\s+/.test(line)) {
      // Bullet
      const bulletContent = line.replace(/^[-•*]\s+/, '');
      listItems.push(
        <li
          key={`li-${key++}`}
          style={{
            fontSize: '13px',
            lineHeight: '1.55',
            color: '#111315',
            marginBottom: '2px',
          }}
        >
          {renderInline(bulletContent, `li-${key}`)}
        </li>
      );
    } else if (line.trim() === '') {
      flushList();
      result.push(<div key={`sp-${key++}`} style={{ height: '6px' }} />);
    } else {
      flushList();
      result.push(
        <p
          key={`p-${key++}`}
          style={{ fontSize: '13px', lineHeight: '1.55', color: '#111315', margin: '0 0 2px 0' }}
        >
          {renderInline(line, `p-${key}`)}
        </p>
      );
    }
  }

  flushList();
  return <>{result}</>;
}

// ─────────────────────────────────────────────────────────────────
// TEXT FORMATTING HELPERS
// ─────────────────────────────────────────────────────────────────

// Strip markdown symbols and URLs from text before sending to speech
function stripMarkdownAndUrls(text: string): string {
  return text
    // Strip source section if present
    .replace(/(?:^|\n)(?:###?\s*)?(?:POLARIS\s+Sources?|Web\s+Sources?|Sources?):[\s\S]*$/i, '')
    // Strip markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Strip URLs completely so they are never read aloud
    .replace(/https?:\/\/[^\s)]+/gi, '')
    .replace(/\b10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+\b/gi, '')
    // Strip inline code and code blocks
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    // Strip bold and italic markdown markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Strip header markers
    .replace(/^#{1,6}\s+/gm, '')
    // Strip bullet points and numbered list markers
    .replace(/^[-•*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Strip blockquotes
    .replace(/^>\s+/gm, '')
    // Replace multiple newlines or spaces with single space
    .replace(/\s+/g, ' ')
    .trim();
}

// Format text specifically for speech (POLARIS pronunciation and markdown/URL removal)
// Does NOT modify visible text
function formatTextForSpeech(text: string, lang: MayaLanguage): string {
  let clean = stripMarkdownAndUrls(text);

  if (lang === 'HI') {
    // 1. Remove parenthetical bilingual duplicates, e.g. "Albedo (अल्बीडो)" -> "अल्बीडो"
    clean = clean.replace(/[A-Za-z0-9\s-]+\s*\(\s*([\u0900-\u097F\s-]+)\s*\)/g, '$1');
    clean = clean.replace(/([\u0900-\u097F\s-]+)\s*\(\s*[A-Za-z0-9\s-]+\s*\)/g, '$1');

    // 2. Remove slash bilingual duplicates, e.g. "Albedo / अल्बीडो" -> "अल्बीडो"
    clean = clean.replace(/[A-Za-z0-9-]+\s*[/|\\]\s*([\u0900-\u097F]+)/g, '$1');
    clean = clean.replace(/([\u0900-\u097F]+)\s*[/|\\]\s*[A-Za-z0-9-]+/g, '$1');

    // 3. Remove consecutive English + Hindi pairs
    clean = clean.replace(/\bMaya\s+माया/gi, 'माया');
    clean = clean.replace(/माया\s+Maya\b/gi, 'माया');
    clean = clean.replace(/\bPOLARIS\s+पोलारिस/gi, 'पोलारिस');
    clean = clean.replace(/पोलारिस\s+POLARIS\b/gi, 'पोलारिस');
    clean = clean.replace(/\bAlbedo\s+अल्बीडो/gi, 'अल्बीडो');
    clean = clean.replace(/अल्बीडो\s+Albedo\b/gi, 'अल्बीडो');
    clean = clean.replace(/\bCryosphere\s+क्रायोस्फियर/gi, 'क्रायोस्फियर');
    clean = clean.replace(/क्रायोस्फियर\s+Cryosphere\b/gi, 'क्रायोस्फियर');
    clean = clean.replace(/\bSharks?\s+शार्क/gi, 'शार्क');
    clean = clean.replace(/शार्क\s+Sharks?\b/gi, 'शार्क');

    // 4. Map standalone Latin proper names & technical terms to Devanagari
    clean = clean.replace(/\bMaya\b/gi, 'माया');
    clean = clean.replace(/\bPOLARIS\b/gi, 'पोलारिस');
    clean = clean.replace(/\bNCPOR\b/gi, 'एनसीपीओआर');
    clean = clean.replace(/\bNPDC\b/gi, 'एनपीडीसी');
    clean = clean.replace(/\bMaitri\b/gi, 'मैत्री');
    clean = clean.replace(/\bBharati\b/gi, 'भारती');
    clean = clean.replace(/\bHimadri\b/gi, 'हिमाद्री');
    clean = clean.replace(/\bDakshin\s+Gangotri\b/gi, 'दक्षिण गंगोत्री');
    clean = clean.replace(/\bAntarctica\b/gi, 'अंटार्कटिका');
    clean = clean.replace(/\bArctic\b/gi, 'आर्कटिक');
    clean = clean.replace(/\bAlbedo\b/gi, 'अल्बीडो');
    clean = clean.replace(/\bCryosphere\b/gi, 'क्रायोस्फियर');
    clean = clean.replace(/\bSharks?\b/gi, 'शार्क');
    clean = clean.replace(/\bPlanktons?\b/gi, 'प्लवक');
    clean = clean.replace(/\bMarine\s+biology\b/gi, 'समुद्री जीवविज्ञान');
    clean = clean.replace(/\bOceanography\b/gi, 'समुद्र विज्ञान');

    // 5. Remove any leftover Latin words in Hindi speech to prevent speech synthesis glitching
    clean = clean.replace(/\b[A-Za-z]+\b/g, '');

    // 6. Deduplicate repeated Hindi terms
    clean = clean.replace(/माया\s+माया/g, 'माया');
    clean = clean.replace(/पोलारिस\s+पोलारिस/g, 'पोलारिस');
    clean = clean.replace(/अल्बीडो\s+अल्बीडो/g, 'अल्बीडो');
    clean = clean.replace(/शार्क\s+शार्क/g, 'शार्क');
  } else {
    // English mode:
    clean = clean.replace(/\bMaya\s+Maya\b/gi, 'Maya');
    clean = clean.replace(/\bPOLARIS\b/gi, 'Po la ris');
  }

  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

// ─────────────────────────────────────────────────────────────────
// MAYA PANEL
// ─────────────────────────────────────────────────────────────────
export const MayaPanel: React.FC<MayaPanelProps> = ({ isOpen, onClose }) => {
  const getInitialLanguage = (): MayaLanguage => {
    try {
      const stored = localStorage.getItem('polaris_lang');
      if (stored && stored.toLowerCase().startsWith('hi')) return 'HI';
    } catch {
      // ignore
    }
    return 'EN';
  };

  const [language, setLanguage] = useState<MayaLanguage>(getInitialLanguage);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  // ── Call mode state (Stage 4A & 4B Hands-Free) ───────────────────
  const [activeMode, setActiveMode] = useState<'text' | 'call'>('text');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [callStatus, setCallStatus] = useState<
    'ready' | 'listening' | 'processing' | 'speaking' | 'error'
  >('ready');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const finalTranscriptRef = useRef<string>('');
  const hasSentRef = useRef<boolean>(false);
  const callActiveRef = useRef<boolean>(false);
  const activeModeRef = useRef<'text' | 'call'>('text');
  const isOpenRef = useRef<boolean>(isOpen);
  const languageRef = useRef<MayaLanguage>(language);
  const isMutedRef = useRef<boolean>(false);
  const relistenTimerRef = useRef<any>(null);
  const noSpeechRetryRef = useRef<number>(0);

  const isSpeechRecognitionSupported =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Audio playback for ElevenLabs TTS
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const activeMediaSourceRef = useRef<MediaSource | null>(null);
  const activeTtsAbortControllerRef = useRef<AbortController | null>(null);
  const activeTtsPlayTokenRef = useRef<number>(0);

  const stopAudio = useCallback(() => {
    activeTtsPlayTokenRef.current += 1;
    if (activeTtsAbortControllerRef.current) {
      activeTtsAbortControllerRef.current.abort();
      activeTtsAbortControllerRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
      currentAudioRef.current.onplay = null;
      currentAudioRef.current.oncanplay = null;
      currentAudioRef.current.src = '';
      currentAudioRef.current = null;
    }
    if (activeMediaSourceRef.current) {
      try {
        if (activeMediaSourceRef.current.readyState === 'open') {
          activeMediaSourceRef.current.endOfStream();
        }
      } catch {}
      activeMediaSourceRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setSpeakingId(null);
  }, []);

  // Keep refs in sync with state for async callbacks
  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // ── Full-close = reset everything ──────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      callActiveRef.current = false;
      stopAudio();
      if (relistenTimerRef.current) {
        clearTimeout(relistenTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      setActiveMode('text');
      activeModeRef.current = 'text';
      setIsListening(false);
      isListeningRef.current = false;
      setInterimTranscript('');
      setCallStatus('ready');
      setSpeechError(null);
      setIsMuted(false);
      isMutedRef.current = false;
      noSpeechRetryRef.current = 0;
      setVoiceNotice(null);
      setMessages([GREETING_MESSAGE]);
      setInputValue('');
      setIsLoading(false);
      setSpeakingId(null);
      setLoadingTextIndex(0);
    }
  }, [isOpen]);

  // ── Focus input on open ────────────────────────────────────────
  useEffect(() => {
    if (isOpen && activeMode === 'text') {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, activeMode]);

  // ── Scroll to bottom ──────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen, isListening, interimTranscript, callStatus]);

  // ── Rotate loading messages ───────────────────────────────────
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingTextIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isLoading]);

  // ── Cleanup speech & recognition on unmount ───────────────────
  useEffect(() => {
    return () => {
      callActiveRef.current = false;
      stopAudio();
      if (relistenTimerRef.current) {
        clearTimeout(relistenTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [stopAudio]);

  // ── Maya Audio Streaming Player (MediaSource + SourceBuffer via ElevenLabs) ──
  const playMayaAudioStream = useCallback(
    async (
      speechText: string,
      msgId: string,
      options: {
        isCallMode: boolean;
        onFinish?: () => void;
      }
    ) => {
      // 1. Cancel previous audio and pending network streams
      stopAudio();

      const currentToken = activeTtsPlayTokenRef.current;
      const abortController = new AbortController();
      activeTtsAbortControllerRef.current = abortController;

      if (options.isCallMode) {
        setCallStatus('speaking');
      }
      setSpeakingId(msgId);

      let hasHandledEnd = false;
      const handleAudioEnd = () => {
        if (hasHandledEnd || currentToken !== activeTtsPlayTokenRef.current) return;
        hasHandledEnd = true;
        stopAudio();
        if (options.onFinish) {
          options.onFinish();
        }
      };

      const handleAudioError = () => {
        if (currentToken !== activeTtsPlayTokenRef.current) return;
        stopAudio();
        setVoiceNotice("Maya couldn't speak that reply. You can still read it.");
        if (options.isCallMode) {
          setCallStatus('ready');
        }
      };

      // Complete Blob fallback using ElevenLabs backend
      const playBlobFallback = async () => {
        try {
          const blob = await fetchMayaTtsAudioApi(speechText);
          if (currentToken !== activeTtsPlayTokenRef.current || !isOpenRef.current) {
            stopAudio();
            return;
          }
          if (options.isCallMode && (!callActiveRef.current || activeModeRef.current !== 'call')) {
            stopAudio();
            return;
          }

          const url = URL.createObjectURL(blob);
          audioUrlRef.current = url;
          const audio = new Audio(url);
          audio.playbackRate = 1;
          currentAudioRef.current = audio;

          audio.onended = handleAudioEnd;
          audio.onerror = handleAudioError;
          await audio.play();
        } catch {
          handleAudioError();
        }
      };

      // Feature-detect MediaSource and audio/mpeg support
      const isMediaSourceSupported =
        typeof window !== 'undefined' &&
        'MediaSource' in window &&
        typeof MediaSource.isTypeSupported === 'function' &&
        MediaSource.isTypeSupported('audio/mpeg');

      if (!isMediaSourceSupported) {
        await playBlobFallback();
        return;
      }

      try {
        const mediaSource = new MediaSource();
        activeMediaSourceRef.current = mediaSource;
        const objectUrl = URL.createObjectURL(mediaSource);
        audioUrlRef.current = objectUrl;

        const audio = new Audio();
        audio.src = objectUrl;
        audio.playbackRate = 1;
        currentAudioRef.current = audio;

        let hasStartedPlayback = false;

        audio.onended = handleAudioEnd;
        audio.onerror = () => {
          if (!hasStartedPlayback) {
            playBlobFallback();
          } else {
            handleAudioError();
          }
        };

        // Wait for MediaSource sourceopen event
        await new Promise<void>((resolve, reject) => {
          if (mediaSource.readyState === 'open') {
            resolve();
            return;
          }
          const onOpen = () => {
            mediaSource.removeEventListener('sourceopen', onOpen);
            resolve();
          };
          mediaSource.addEventListener('sourceopen', onOpen);
          setTimeout(() => {
            if (mediaSource.readyState !== 'open') {
              reject(new Error('MediaSource open timeout'));
            }
          }, 3000);
        });

        if (currentToken !== activeTtsPlayTokenRef.current || !isOpenRef.current) {
          stopAudio();
          return;
        }

        let sourceBuffer: SourceBuffer;
        try {
          sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        } catch {
          await playBlobFallback();
          return;
        }

        const chunkQueue: Uint8Array[] = [];
        let isStreamFinished = false;

        const pumpQueue = () => {
          if (currentToken !== activeTtsPlayTokenRef.current) return;
          if (sourceBuffer.updating) return;

          if (chunkQueue.length > 0) {
            const nextChunk = chunkQueue.shift()!;
            try {
              sourceBuffer.appendBuffer(nextChunk as unknown as BufferSource);
            } catch (appendErr) {
              console.warn('[Maya Audio] SourceBuffer append warning:', appendErr);
            }
          } else if (isStreamFinished && mediaSource.readyState === 'open') {
            try {
              mediaSource.endOfStream();
            } catch {}
          }
        };

        sourceBuffer.addEventListener('updateend', () => {
          if (!hasStartedPlayback && audio.buffered.length > 0) {
            hasStartedPlayback = true;
            audio.play().catch((playErr) => {
              console.warn('[Maya Audio] Playback prevented:', playErr);
            });
          }
          pumpQueue();
        });

        const response = await streamMayaTtsAudioApi(speechText, abortController.signal);
        if (!response.body) {
          throw new Error('No response body from TTS stream');
        }

        const reader = response.body.getReader();
        while (true) {
          if (currentToken !== activeTtsPlayTokenRef.current || abortController.signal.aborted) {
            reader.cancel().catch(() => {});
            break;
          }
          const { done, value } = await reader.read();
          if (done) {
            isStreamFinished = true;
            pumpQueue();
            break;
          }
          if (value && value.length > 0) {
            chunkQueue.push(value);
            pumpQueue();
          }
        }
      } catch (err: any) {
        if (abortController.signal.aborted || currentToken !== activeTtsPlayTokenRef.current) {
          return;
        }
        console.warn('[Maya Audio] Streaming failed, falling back to complete blob:', err?.message);
        await playBlobFallback();
      }
    },
    [stopAudio]
  );

  const autoSpeakCallReply = (msgId: string, text: string) => {
    // 1. Prevent feedback loop: abort recognition before speech starts
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    setIsListening(false);
    isListeningRef.current = false;
    stopAudio();

    // Check if user has muted
    if (isMutedRef.current) {
      setCallStatus('ready');
      if (relistenTimerRef.current) clearTimeout(relistenTimerRef.current);
      relistenTimerRef.current = setTimeout(() => {
        if (callActiveRef.current && activeModeRef.current === 'call' && isOpenRef.current) {
          startListening();
        }
      }, 600);
      return;
    }

    // Both English and Hindi use ElevenLabs streaming pipeline via backend
    const speechText = formatTextForSpeech(text, languageRef.current);

    playMayaAudioStream(speechText, msgId, {
      isCallMode: true,
      onFinish: () => {
        if (callActiveRef.current && activeModeRef.current === 'call' && isOpenRef.current) {
          if (relistenTimerRef.current) clearTimeout(relistenTimerRef.current);
          relistenTimerRef.current = setTimeout(() => {
            if (callActiveRef.current && activeModeRef.current === 'call' && isOpenRef.current) {
              startListening();
            } else {
              setCallStatus('ready');
            }
          }, 350);
        } else {
          setCallStatus('ready');
        }
      },
    });
  };

  // ── Speech Recognition Controls ───────────────────────────────
  const startListening = (targetLang?: MayaLanguage) => {
    if (isListening || isLoading || callStatus === 'speaking' || currentAudioRef.current !== null) return;
    setSpeechError(null);

    const SpeechRecClass =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecClass) {
      setSpeechError("Voice input isn't supported in this browser. You can still use Text mode.");
      setCallStatus('error');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      const activeLang = targetLang || languageRef.current;
      recognition.lang = activeLang === 'HI' ? 'hi-IN' : 'en-IN';

      finalTranscriptRef.current = '';
      hasSentRef.current = false;
      setInterimTranscript('');

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setCallStatus('listening');
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        noSpeechRetryRef.current = 0;
        let finalChunk = '';
        let interimChunk = '';

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalChunk += item[0]?.transcript || '';
          } else {
            interimChunk += item[0]?.transcript || '';
          }
        }

        if (finalChunk) {
          finalTranscriptRef.current = finalChunk;
        }
        setInterimTranscript(interimChunk || finalChunk);
      };

      recognition.onerror = (event: any) => {
        const err = event.error;
        if (err === 'aborted') {
          setIsListening(false);
          isListeningRef.current = false;
          return;
        }

        if (err === 'no-speech') {
          // If no speech detected in Call mode, retry listening once safely
          if (
            callActiveRef.current &&
            activeModeRef.current === 'call' &&
            noSpeechRetryRef.current < 1
          ) {
            noSpeechRetryRef.current += 1;
            if (relistenTimerRef.current) clearTimeout(relistenTimerRef.current);
            relistenTimerRef.current = setTimeout(() => {
              if (
                callActiveRef.current &&
                activeModeRef.current === 'call' &&
                isOpenRef.current
              ) {
                startListening();
              }
            }, 400);
            return;
          }
          noSpeechRetryRef.current = 0;
          setSpeechError('No speech was detected. Tap the microphone to speak.');
        } else if (err === 'not-allowed' || err === 'service-not-allowed') {
          setSpeechError('Microphone access is needed for Call mode.');
        } else if (err === 'audio-capture') {
          setSpeechError('No microphone detected. Please check your audio settings.');
        } else if (err === 'network') {
          setSpeechError('Network issue during speech recognition. Please try again.');
        } else {
          setSpeechError('Voice input error. Please try again.');
        }

        setIsListening(false);
        isListeningRef.current = false;
        setCallStatus('error');
      };

      recognition.onend = () => {
        setIsListening(false);
        isListeningRef.current = false;

        const recognizedText = finalTranscriptRef.current.trim();
        if (recognizedText && !hasSentRef.current && !isLoading) {
          hasSentRef.current = true;
          setInterimTranscript('');
          setCallStatus('processing');
          handleSendMessage(recognizedText);
        } else {
          if (callActiveRef.current && activeModeRef.current === 'call') {
            setCallStatus((prev) =>
              prev === 'error' ? 'error' : prev === 'speaking' ? 'speaking' : 'ready'
            );
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setSpeechError('Could not start microphone. Please try again.');
      setIsListening(false);
      isListeningRef.current = false;
      setCallStatus('error');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  };

  const handleMicToggle = () => {
    if (callStatus === 'speaking') {
      handleStopSpeaking();
    } else if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // User interrupt: stops Maya from speaking and immediately returns to listening
  const handleStopSpeaking = () => {
    stopAudio();
    setSpeakingId(null);
    if (relistenTimerRef.current) clearTimeout(relistenTimerRef.current);

    if (callActiveRef.current && activeModeRef.current === 'call' && isOpenRef.current) {
      relistenTimerRef.current = setTimeout(() => {
        if (callActiveRef.current && activeModeRef.current === 'call' && isOpenRef.current) {
          startListening();
        }
      }, 250);
    } else {
      setCallStatus('ready');
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      if (next && callStatus === 'speaking') {
        handleStopSpeaking();
      }
      return next;
    });
  };

  const handleEndCall = () => {
    callActiveRef.current = false;
    stopAudio();
    if (relistenTimerRef.current) {
      clearTimeout(relistenTimerRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    setSpeakingId(null);
    setIsListening(false);
    isListeningRef.current = false;
    setInterimTranscript('');
    setCallStatus('ready');
    setSpeechError(null);
    noSpeechRetryRef.current = 0;
    setActiveMode('text');
    activeModeRef.current = 'text';
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const handleSwitchMode = (mode: 'text' | 'call') => {
    if (mode === activeMode) return;
    if (relistenTimerRef.current) clearTimeout(relistenTimerRef.current);
    stopAudio();

    if (activeMode === 'call') {
      callActiveRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      setSpeakingId(null);
      setIsListening(false);
      isListeningRef.current = false;
      setInterimTranscript('');
      setSpeechError(null);
      noSpeechRetryRef.current = 0;
    }

    setActiveMode(mode);
    activeModeRef.current = mode;

    if (mode === 'text') {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      // Enter Call mode hands-free
      callActiveRef.current = true;
      setCallStatus('ready');
      if (!isSpeechRecognitionSupported) {
        setSpeechError("Voice input isn't supported in this browser. You can still use Text mode.");
        setCallStatus('error');
      } else {
        // Automatically start listening so user can immediately talk
        setTimeout(() => {
          if (callActiveRef.current) {
            startListening();
          }
        }, 150);
      }
    }
  };

  const handleLanguageChange = (lang: MayaLanguage) => {
    if (lang === language) return;
    if (relistenTimerRef.current) clearTimeout(relistenTimerRef.current);
    stopAudio();

    // Stop current recognition and speech safely
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    setSpeakingId(null);
    setIsListening(false);
    isListeningRef.current = false;
    setVoiceNotice(null);
    setLanguage(lang);
    languageRef.current = lang;

    // If active in Call mode, restart listening with the new language
    if (activeMode === 'call' && callActiveRef.current && isSpeechRecognitionSupported) {
      setTimeout(() => {
        if (callActiveRef.current && activeModeRef.current === 'call' && isOpenRef.current) {
          startListening(lang);
        }
      }, 300);
    }
  };

  // ── Handle Send (supports text input or completed voice speech) ─
  const handleSendMessage = async (textOrEvent?: string | React.FormEvent) => {
    if (textOrEvent && typeof textOrEvent !== 'string') {
      textOrEvent.preventDefault();
    }
    const rawText = typeof textOrEvent === 'string' ? textOrEvent : inputValue;
    let trimmed = rawText.trim();
    if (!trimmed || isLoading) return;

    if (trimmed.length > 2000) {
      trimmed = trimmed.substring(0, 2000);
    }

    // Stop any playing speech or audio
    stopAudio();
    setSpeakingId(null);

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = { id: userMsgId, role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (typeof textOrEvent !== 'string') {
      setInputValue('');
    }
    setIsLoading(true);
    setLoadingTextIndex(0);

    // Build recent context — exclude greeting and errors, max 8
    const recentMessages: MayaRecentMessage[] = updatedMessages
      .filter((m) => m.id !== 'greeting' && !m.isError)
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const result = await sendMayaMessageApi({ message: trimmed, language, recentMessages });

      if (result?.success && result.reply) {
        const newMsgId = `maya-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: newMsgId,
            role: 'assistant',
            content: result.reply,
            sources: result.sources?.length ? result.sources : undefined,
          },
        ]);

        // Auto-speak in Call mode (hands-free)
        if (callActiveRef.current && activeModeRef.current === 'call') {
          if (!isMutedRef.current) {
            autoSpeakCallReply(newMsgId, result.reply);
          } else {
            setCallStatus('processing');
            if (relistenTimerRef.current) clearTimeout(relistenTimerRef.current);
            relistenTimerRef.current = setTimeout(() => {
              if (callActiveRef.current && activeModeRef.current === 'call' && isOpenRef.current) {
                startListening();
              } else {
                setCallStatus('ready');
              }
            }, 600);
          }
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `maya-err-${Date.now()}`,
            role: 'assistant',
            content: result?.message || 'Maya hit a small snag. Try again.',
            isError: true,
          },
        ]);
        if (callActiveRef.current && activeModeRef.current === 'call') {
          setCallStatus('ready');
        }
      }
    } catch (err: any) {
      let friendlyError = 'Maya hit a small snag. Try again.';
      const status = err?.response?.status;
      if (status === 401) {
        friendlyError = 'Please log in to POLARIS to chat with Maya.';
      } else if (status === 429) {
        friendlyError = 'Maya has handled quite a few questions for now. Please try again later.';
      } else if (err?.response?.data?.message && typeof err.response.data.message === 'string') {
        friendlyError = err.response.data.message;
      }
      setMessages((prev) => [
        ...prev,
        { id: `maya-err-${Date.now()}`, role: 'assistant', content: friendlyError, isError: true },
      ]);
      if (callActiveRef.current && activeModeRef.current === 'call') {
        setCallStatus('ready');
      }
    } finally {
      setIsLoading(false);
      if (!callActiveRef.current || activeModeRef.current !== 'call') {
        setCallStatus('ready');
      }
    }
  };

  // ── Speaker Button Handler ─────────────────────────────────────
  const handleSpeak = useCallback(
    (msgId: string, text: string) => {
      if (speakingId === msgId) {
        // Same message — stop
        stopAudio();
        return;
      }

      // Different message or nothing playing — cancel active speech & audio first
      stopAudio();

      // Both English and Hindi use ElevenLabs streaming pipeline via backend
      const speechText = formatTextForSpeech(text, languageRef.current);
      playMayaAudioStream(speechText, msgId, {
        isCallMode: false,
      });
    },
    [speakingId, stopAudio, playMayaAudioStream]
  );

  // ── Crystal colour tokens ──────────────────────────────────────
  const c = {
    snow: '#F8FAFC',
    iceCrystal: '#E8EEF2',
    frostedMineral: '#CBD7DE',
    glacierStone: '#98AAB5',
    slateXtal: '#627681',
    obsidian: '#121619',
    primaryText: '#111315',
    secondaryText: '#4F5B63',
  } as const;

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Maya Scientific Assistant"
      className="maya-panel-container"
    >
      <style>{`
        .maya-panel-container {
          position: fixed;
          bottom: 76px;
          left: 12px;
          right: 12px;
          width: calc(100vw - 24px);
          max-width: calc(100vw - 24px);
          height: auto;
          max-height: 70vh;
          z-index: 50;
          display: flex;
          flex-direction: column;
          background: #F8FAFC;
          border: 1px solid #CBD7DE;
          border-radius: 18px;
          box-shadow: 0 8px 32px rgba(98, 118, 129, 0.16), 0 2px 8px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          box-sizing: border-box;
        }
        @media (min-width: 640px) {
          .maya-panel-container {
            left: auto;
            right: 24px;
            bottom: 84px;
            width: 380px;
            max-width: 380px;
            height: auto;
            max-height: 540px;
          }
        }
        @keyframes maya-pulse {
          0%, 100% { opacity: 0.35; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      {/* ── INNER GLASS SURFACE ─────────────────────────────── */}
      {/* Subtle crystal surface highlight at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '40%',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none',
          borderRadius: '18px 18px 0 0',
        }}
      />

      {/* ── HEADER ──────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: `1px solid ${c.frostedMineral}`,
          background: 'rgba(255,255,255,0.9)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Maya crystal badge */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${c.iceCrystal} 0%, ${c.frostedMineral} 100%)`,
              border: `1px solid ${c.frostedMineral}`,
              boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Georgia, serif',
              fontWeight: 700,
              fontSize: '14px',
              color: c.obsidian,
              flexShrink: 0,
            }}
          >
            M
          </div>
          <div>
            <h2
              style={{
                fontSize: '13.5px',
                fontWeight: 700,
                color: c.primaryText,
                margin: 0,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
              }}
            >
              Maya
            </h2>
            <span
              style={{
                fontSize: '10.5px',
                color: c.slateXtal,
                fontWeight: 500,
              }}
            >
              Polar & Ocean Science Assistant
            </span>
          </div>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Maya"
          style={{
            padding: '6px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: c.slateXtal,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = c.iceCrystal;
            (e.currentTarget as HTMLButtonElement).style.color = c.primaryText;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = c.slateXtal;
          }}
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── MODE & LANGUAGE BAR ──────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 12px',
          borderBottom: `1px solid ${c.frostedMineral}`,
          background: c.iceCrystal,
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Text / Call mode pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            background: 'rgba(255,255,255,0.6)',
            border: `1px solid ${c.frostedMineral}`,
            borderRadius: '8px',
            padding: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => handleSwitchMode('text')}
            style={{
              padding: '3px 9px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              background: activeMode === 'text' ? c.obsidian : 'transparent',
              color: activeMode === 'text' ? '#fff' : c.slateXtal,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Text
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('call')}
            style={{
              padding: '3px 9px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              background: activeMode === 'call' ? c.obsidian : 'transparent',
              color: activeMode === 'call' ? '#fff' : c.slateXtal,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s',
            }}
          >
            Call
          </button>
        </div>

        {/* Language switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            background: 'rgba(255,255,255,0.6)',
            border: `1px solid ${c.frostedMineral}`,
            borderRadius: '8px',
            padding: '2px',
          }}
        >
          {(['EN', 'HI'] as MayaLanguage[]).map((lang, i) => (
            <React.Fragment key={lang}>
              {i > 0 && (
                <span style={{ color: c.frostedMineral, fontSize: '12px', userSelect: 'none' }}>|</span>
              )}
              <button
                type="button"
                onClick={() => handleLanguageChange(lang)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: language === lang ? 600 : 500,
                  background: language === lang ? c.obsidian : 'transparent',
                  color: language === lang ? '#fff' : c.slateXtal,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {lang === 'EN' ? 'English' : 'हिंदी'}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── MESSAGES AREA ────────────────────────────────────── */}
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Voice notice (e.g. device has no Hindi voice) */}
        {voiceNotice && (
          <div
            role="status"
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              background: 'rgba(254, 243, 199, 0.95)',
              border: '1px solid #FDE68A',
              color: '#92400E',
              fontSize: '12px',
              lineHeight: 1.45,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <span>{voiceNotice}</span>
            <button
              type="button"
              onClick={() => setVoiceNotice(null)}
              aria-label="Dismiss notice"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#92400E',
                cursor: 'pointer',
                padding: '2px 6px',
                fontWeight: 700,
                fontSize: '14px',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        )}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              {/* Message bubble */}
              <div
                style={{
                  maxWidth: '88%',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '9px 12px',
                  background: isUser
                    ? c.obsidian
                    : msg.isError
                    ? '#FEF2F2'
                    : '#FFFFFF',
                  border: isUser
                    ? 'none'
                    : msg.isError
                    ? '1px solid #FECACA'
                    : `1px solid ${c.iceCrystal}`,
                  boxShadow: isUser
                    ? '0 1px 4px rgba(0,0,0,0.18)'
                    : '0 1px 3px rgba(98,118,129,0.08)',
                  color: isUser ? '#fff' : msg.isError ? '#991B1B' : c.primaryText,
                  position: 'relative',
                }}
              >
                {/* Content */}
                {isUser || msg.isError ? (
                  <p
                    style={{
                      fontSize: '13px',
                      lineHeight: 1.55,
                      margin: 0,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {msg.content}
                  </p>
                ) : (
                  /* Safe markdown render for Maya replies */
                  <div style={{ wordBreak: 'break-word' }}>{renderMarkdown(msg.content)}</div>
                )}

                {/* Speaker button — only on non-error Maya replies */}
                {!isUser && !msg.isError && (
                  <button
                    type="button"
                    onClick={() => handleSpeak(msg.id, msg.content)}
                    aria-label={
                      speakingId === msg.id ? 'Stop reading' : "Read Maya's reply aloud"
                    }
                    title={speakingId === msg.id ? 'Stop' : 'Read aloud'}
                    style={{
                      position: 'absolute',
                      bottom: '6px',
                      right: '8px',
                      padding: '2px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: speakingId === msg.id ? c.obsidian : c.glacierStone,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = c.primaryText;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        speakingId === msg.id ? c.obsidian : c.glacierStone;
                    }}
                  >
                    {speakingId === msg.id ? (
                      /* Stop / Square icon */
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="5" y="5" width="14" height="14" rx="2" />
                      </svg>
                    ) : (
                      /* Volume2 icon */
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </svg>
                    )}
                  </button>
                )}
              </div>

              {/* Source links — only on Maya replies with sources */}
              {!isUser && !msg.isError && msg.sources && msg.sources.length > 0 && (() => {
                const isWeb = msg.sources.some((s) => s.sourceType === 'WEB' || s.url);
                const sectionLabel = isWeb ? 'Sources' : 'POLARIS Sources';

                return (
                  <div
                    style={{
                      maxWidth: '88%',
                      marginTop: '5px',
                      padding: '6px 10px',
                      background: c.iceCrystal,
                      border: `1px solid ${c.frostedMineral}`,
                      borderRadius: '10px',
                      fontSize: '11px',
                      color: c.secondaryText,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: c.slateXtal,
                        }}
                      >
                        {sectionLabel}
                      </span>
                      {isWeb ? (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 500,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(14, 165, 233, 0.1)',
                            color: '#0284c7',
                          }}
                        >
                          Web
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 500,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(99, 102, 241, 0.08)',
                            color: '#4f46e5',
                          }}
                        >
                          POLARIS
                        </span>
                      )}
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                      {msg.sources.map((src, sIdx) => {
                        const targetUrl =
                          src.url || src.externalUrl || (src.id ? `/content/${src.id}` : undefined);
                        const isSafe =
                          targetUrl &&
                          (targetUrl.startsWith('https://') ||
                            targetUrl.startsWith('http://') ||
                            targetUrl.startsWith('/'));
                        const displayTitle = src.sourceName
                          ? `${src.sourceName} — ${src.title}`
                          : src.title;

                        return (
                          <li
                            key={src.id || src.url || `${sIdx}-${src.title}`}
                            style={{ marginBottom: '3px', lineHeight: 1.35 }}
                          >
                            <span style={{ color: c.slateXtal, marginRight: '4px' }}>•</span>
                            {isSafe && targetUrl ? (
                              <a
                                href={targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: c.obsidian,
                                  fontWeight: 500,
                                  textDecoration: 'none',
                                  borderBottom: `1px solid ${c.frostedMineral}`,
                                  wordBreak: 'break-word',
                                }}
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLAnchorElement).style.borderBottomColor =
                                    c.obsidian;
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLAnchorElement).style.borderBottomColor =
                                    c.frostedMineral;
                                }}
                              >
                                {displayTitle}
                              </a>
                            ) : (
                              <span
                                style={{
                                  color: c.primaryText,
                                  fontWeight: 500,
                                  wordBreak: 'break-word',
                                }}
                              >
                                {displayTitle}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}
            </div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div
              style={{
                padding: '9px 12px',
                borderRadius: '16px 16px 16px 4px',
                background: '#FFFFFF',
                border: `1px solid ${c.iceCrystal}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
                color: c.slateXtal,
              }}
            >
              {/* Pulse dot */}
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: c.glacierStone,
                  display: 'inline-block',
                  animation: 'maya-pulse 1.4s ease-in-out infinite',
                }}
              />
              <span>{LOADING_MESSAGES[loadingTextIndex]}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT FORM (TEXT MODE) ──────────────────────────── */}
      {activeMode === 'text' && (
        <form
          onSubmit={handleSendMessage}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            borderTop: `1px solid ${c.frostedMineral}`,
            background: 'rgba(255,255,255,0.8)',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              language === 'HI'
                ? 'ध्रुवीय या समुद्री विज्ञान पर प्रश्न पूछें...'
                : 'Ask about polar or ocean science...'
            }
            maxLength={2000}
            disabled={isLoading}
            aria-label="Message Maya"
            style={{
              flex: 1,
              background: '#FFFFFF',
              border: `1px solid ${c.frostedMineral}`,
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '13px',
              color: c.primaryText,
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor = c.glacierStone;
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor = c.frostedMineral;
            }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            aria-label="Send message"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: 'none',
              background: inputValue.trim() && !isLoading ? c.obsidian : c.iceCrystal,
              color: inputValue.trim() && !isLoading ? '#FFFFFF' : c.glacierStone,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              viewBox="0 0 24 24"
              style={{ transform: 'translateX(1px)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      )}

      {/* ── CALL MODE CONTROLS ───────────────────────────────── */}
      {activeMode === 'call' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 14px',
            borderTop: `1px solid ${c.frostedMineral}`,
            background: 'rgba(255,255,255,0.85)',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Interim transcript preview */}
          {interimTranscript && (
            <div
              style={{
                fontSize: '12px',
                fontStyle: 'italic',
                color: c.obsidian,
                maxWidth: '90%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                padding: '3px 9px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '6px',
              }}
            >
              "{interimTranscript}"
            </div>
          )}

          {/* Status text: Listening... / Thinking... / Speaking... / Ready to listen */}
          <div
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: speechError
                ? '#DC2626'
                : voiceNotice
                ? '#B45309'
                : callStatus === 'speaking'
                ? '#059669'
                : isListening || callStatus === 'listening'
                ? '#0284C7'
                : isLoading || callStatus === 'processing'
                ? c.obsidian
                : c.slateXtal,
              textAlign: 'center',
              minHeight: '18px',
              padding: '0 8px',
              lineHeight: 1.4,
            }}
          >
            {speechError
              ? speechError
              : voiceNotice
              ? voiceNotice
              : callStatus === 'speaking'
              ? 'Speaking...'
              : isLoading || callStatus === 'processing'
              ? 'Thinking...'
              : isListening || callStatus === 'listening'
              ? 'Listening...'
              : 'Ready to listen'}
          </div>

          {/* Buttons row: Mute | Mic/Stop | End Call */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              width: '100%',
              marginTop: '2px',
            }}
          >
            {/* Mute / Unmute Button */}
            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={isMuted ? 'Unmute Maya voice' : 'Mute Maya voice'}
              title={isMuted ? 'Unmute voice' : 'Mute voice'}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: `1px solid ${isMuted ? '#FECACA' : c.frostedMineral}`,
                background: isMuted ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.7)',
                color: isMuted ? '#DC2626' : c.slateXtal,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {isMuted ? (
                /* Muted speaker icon with slash */
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="17" y1="9" x2="23" y2="15" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                /* Unmuted speaker icon */
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>

            {/* Central Action Button: Stop Speaking OR Mic Toggle */}
            {callStatus === 'speaking' ? (
              /* User Interrupt: Stop button during speaking */
              <button
                type="button"
                onClick={handleStopSpeaking}
                aria-label="Stop Maya speaking"
                title="Stop speaking"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  border: '2px solid #DC2626',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 0 14px rgba(220, 38, 38, 0.4)',
                  transition: 'all 0.2s ease',
                }}
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1.5" />
                </svg>
              </button>
            ) : (
              /* Microphone button */
              <button
                type="button"
                onClick={handleMicToggle}
                disabled={isLoading || !isSpeechRecognitionSupported}
                aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                title={isListening ? 'Stop listening' : 'Start speaking'}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  border: isListening ? '2px solid #0284C7' : `1px solid ${c.frostedMineral}`,
                  background: isListening
                    ? '#0284C7'
                    : isLoading
                    ? c.iceCrystal
                    : c.obsidian,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isLoading || !isSpeechRecognitionSupported ? 'not-allowed' : 'pointer',
                  boxShadow: isListening
                    ? '0 0 14px rgba(2, 132, 199, 0.45)'
                    : '0 2px 6px rgba(0,0,0,0.12)',
                  transition: 'all 0.2s ease',
                }}
              >
                {isListening ? (
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h12v12H6z" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 10v2a7 7 0 0 1-14 0v-2"
                    />
                    <line
                      x1="12"
                      y1="19"
                      x2="12"
                      y2="23"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <line
                      x1="8"
                      y1="23"
                      x2="16"
                      y2="23"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            )}

            {/* End call button */}
            <button
              type="button"
              onClick={handleEndCall}
              aria-label="End Maya call"
              title="End call"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#DC2626',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(239, 68, 68, 0.16)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(239, 68, 68, 0.08)';
              }}
            >
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.22 4.684A1 1 0 008.28 4H5z"
                />
              </svg>
              <span>End Call</span>
            </button>
          </div>
        </div>
      )}

    </aside>
  );
};

export default MayaPanel;
