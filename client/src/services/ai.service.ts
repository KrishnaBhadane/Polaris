import { api } from './api';

export type SummaryMode = 'QUICK' | 'STUDENT' | 'TECHNICAL';

export type OutreachFormat = 'LINKEDIN' | 'INSTAGRAM';

export type AILanguage = 'EN' | 'HI';

export interface AISummaryResponse {
  success: boolean;
  mode: SummaryMode;
  language?: AILanguage;
  source?: 'PDF' | 'METADATA' | 'METADATA_FALLBACK' | string;
  summary: string;
  cached?: boolean;
}

export interface AIOutreachResponse {
  success: boolean;
  format: OutreachFormat;
  language?: AILanguage;
  source?: 'PDF' | 'METADATA' | 'METADATA_FALLBACK' | string;
  draft: string;
  cached?: boolean;
}

export const generateAISummary = async (
  contentId: string,
  mode: SummaryMode = 'QUICK',
  language: AILanguage = 'EN',
  regenerate: boolean = false
): Promise<AISummaryResponse> => {
  const response = await api.post<AISummaryResponse>(`/ai/summary/${contentId}`, {
    mode,
    language,
    regenerate,
  });
  return response.data;
};

export const generateAIOutreach = async (
  contentId: string,
  format: OutreachFormat = 'LINKEDIN',
  language: AILanguage = 'EN',
  regenerate: boolean = false
): Promise<AIOutreachResponse> => {
  const response = await api.post<AIOutreachResponse>(`/ai/outreach/${contentId}`, {
    format,
    language,
    regenerate,
  });
  return response.data;
};

export interface WorkspaceSummaryPayload {
  inputType: 'PDF' | 'IMAGE' | 'VIDEO' | 'LINK';
  mode: SummaryMode;
  language: AILanguage;
  url?: string;
  file?: File;
}

export interface WorkspaceSummaryResponse {
  success: boolean;
  inputType: 'PDF' | 'IMAGE' | 'VIDEO' | 'LINK';
  mode: SummaryMode;
  language: AILanguage;
  source: 'UPLOAD' | 'URL';
  summary: string;
}

export const generateWorkspaceSummaryApi = async (
  payload: WorkspaceSummaryPayload
): Promise<WorkspaceSummaryResponse> => {
  if (payload.inputType === 'LINK') {
    const response = await api.post<WorkspaceSummaryResponse>('/ai/workspace-summary', {
      inputType: 'LINK',
      url: payload.url,
      mode: payload.mode,
      language: payload.language,
    });
    return response.data;
  }

  const formData = new FormData();
  formData.append('inputType', payload.inputType);
  formData.append('mode', payload.mode);
  formData.append('language', payload.language);
  if (payload.file) {
    formData.append('file', payload.file);
  }

  const response = await api.post<WorkspaceSummaryResponse>('/ai/workspace-summary', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

