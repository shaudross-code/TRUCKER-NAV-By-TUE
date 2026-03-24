// Real truck-specific POI categories for HERE Maps API
// These categories are specifically for professional truck drivers
export const TRUCK_POI_CATEGORIES = [
  '700-7600-0116', // Truck Stop
  '700-7600-0117', // Rest Area
  '700-7600-0322', // Weigh Station
  '700-7000-0000', // Gas Station (with truck lanes)
  '800-8500-0000', // Truck Parking
  '600-6300-0066', // Truck Repair & Service
  '700-7850-0000', // Truck Wash
];

// Professional truck stop chains to prioritize
export const MAJOR_TRUCK_STOPS = [
  "Pilot",
  "Flying J",
  "Love's",
  "TA",
  "Petro",
  "Speedway",
  "Ambest",
  "Road Ranger",
  "Roady's",
  "TravelCenters of America"
];

// Empty static POIs - all POIs will be fetched from HERE Maps API
export const STATIC_POIS: any[] = [];
