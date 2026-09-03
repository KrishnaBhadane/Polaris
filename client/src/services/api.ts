import type { HealthResponse } from '../types';

export async function fetchHealth(): Promise<HealthResponse> {
  // Try relative proxy endpoint first (/api/health)
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to direct backend URLs
  }

  // Fallback to explicit localhost ports (5000 and 5001)
  const fallbackUrls = ['http://localhost:5000/api/health', 'http://localhost:5001/api/health'];
  for (const url of fallbackUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Continue trying
    }
  }

  throw new Error('Unable to connect to POLARIS API at port 5000 or 5001');
}
