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
  const response = await fetch('/api/route', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: safeStringify({
      origin,
      destination,
      via,
      truckProfile,
      avoidTolls,
      avoidFerries,
      avoidUnpaved
    }),
    signal
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch route');
  }
  return response.json();
};
