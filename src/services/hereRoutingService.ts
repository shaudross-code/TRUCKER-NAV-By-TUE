import { fetchTruckRoute } from './hereService';

export async function getRoute(
  origin: string, 
  destination: string, 
  truckProfile: any,
  via?: string[],
  avoidTolls?: boolean,
  avoidFerries?: boolean,
  avoidUnpaved?: boolean
) {
  return fetchTruckRoute(origin, destination, truckProfile, via, avoidTolls, avoidFerries, avoidUnpaved);
}
