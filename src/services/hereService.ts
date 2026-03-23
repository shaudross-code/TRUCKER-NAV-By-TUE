export const fetchTruckRoute = async (
  origin: string, 
  destination: string, 
  truckProfile: any,
  via?: string[],
  avoidTolls?: boolean,
  avoidFerries?: boolean,
  avoidUnpaved?: boolean
) => {
  const response = await fetch('/api/route', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      origin,
      destination,
      via,
      truckProfile,
      avoidTolls,
      avoidFerries,
      avoidUnpaved
    }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch route');
  }
  return response.json();
};
