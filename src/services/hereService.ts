import { safeStringify } from '../../utils';

export const fetchTruckRoute = async (
  origin: string, 
  destination: string, 
  truckProfile: any,
  via?: string[],
  avoidTolls?: boolean,
  avoidFerries?: boolean,
  avoidUnpaved?: boolean,
  signal?: AbortSignal
) => {
  const maxRetries = 2;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s
        await new Promise(r => setTimeout(r, attempt * 1000));
        console.log(`[Route] Retry attempt ${attempt}/${maxRetries}...`);
      }
      
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify({
          origin, destination, via, truckProfile,
          avoidTolls, avoidFerries, avoidUnpaved
        }),
        signal
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `Route fetch failed (${response.status})`);
      }
      
      return response.json();
    } catch (err: any) {
      lastError = err;
      // Don't retry on abort or user cancellation
      if (err.name === 'AbortError' || signal?.aborted) throw err;
      if (attempt === maxRetries) throw err;
    }
  }
  
  throw lastError || new Error('Route fetch failed after retries');
};
