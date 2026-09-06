import { api } from './api';
import type {
  ScientistStatusResponse,
  ApplyScientistPayload,
  IdProofUploadResponse,
  ScientistApplicationData,
} from '../types/scientist.types';

export const uploadScientistIdProof = async (file: File): Promise<IdProofUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<IdProofUploadResponse>('/scientist/id-proof', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const applyScientist = async (
  payload: ApplyScientistPayload
): Promise<{ success: boolean; message: string; application: ScientistApplicationData }> => {
  const response = await api.post<{
    success: boolean;
    message: string;
    application: ScientistApplicationData;
  }>('/scientist/apply', payload);

  return response.data;
};

export const getScientistStatus = async (): Promise<ScientistStatusResponse> => {
  const response = await api.get<ScientistStatusResponse>('/scientist/status');
  return response.data;
};

export const getScientistIdProofUrl = async (
  applicationId: string
): Promise<{ success: boolean; signedUrl: string }> => {
  const response = await api.get<{ success: boolean; signedUrl: string }>(
    `/scientist/id-proof/${applicationId}`
  );
  return response.data;
};
