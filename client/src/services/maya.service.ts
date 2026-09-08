import { api } from './api';

export type MayaLanguage = 'EN' | 'HI';

export interface MayaRecentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MayaSource {
  title: string;
  id?: string;
  url?: string;
  externalUrl?: string;
  sourceType?: 'POLARIS' | 'WEB';
  sourceName?: string;
}

export interface MayaChatPayload {
  message: string;
  language: MayaLanguage;
  recentMessages?: MayaRecentMessage[];
}

export interface MayaChatResponse {
  success: boolean;
  reply: string;
  sources?: MayaSource[];
  message?: string;
}

export const sendMayaMessageApi = async (
  payload: MayaChatPayload
): Promise<MayaChatResponse> => {
  const response = await api.post<MayaChatResponse>('/maya/chat', payload);
  return response.data;
};

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * Initiates a streaming HTTP POST request to the Maya TTS endpoint.
 * Returns the raw Fetch Response so chunks can be read incrementally from response.body.
 */
export const streamMayaTtsAudioApi = async (
  text: string,
  signal?: AbortSignal
): Promise<Response> => {
  const url = `${BASE_URL.replace(/\/+$/, '')}/maya/tts`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    throw new Error(`TTS HTTP ${response.status}`);
  }

  return response;
};

export const fetchMayaTtsAudioApi = async (text: string): Promise<Blob> => {
  const response = await api.post('/maya/tts', { text }, { responseType: 'blob' });
  return response.data;
};

