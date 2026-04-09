
import React, { useEffect, useRef, useContext } from 'react';
import { createHereMap, disposeHereMap } from '../utils/hereMapUtils';
import { AppContext, LocationContext } from '../types';

interface HereNavigationViewProps {
  userLocation: [number, number] | null;
}

export const HereNavigationView: React.FC<HereNavigationViewProps & { mapInstanceRef: React.MutableRefObject<any>, setIsMapReady: (ready: boolean) => void, mapRef: React.RefObject<HTMLDivElement> }> = ({ userLocation, mapInstanceRef, setIsMapReady, mapRef }) => {
  const locationContext = useContext(LocationContext);
  const userLoc = userLocation || locationContext?.userLocation || [39.0119, -98.4842];

  useEffect(() => {
    console.log("HereNavigationView (root): useEffect running, mapRef.current:", !!mapRef.current);
    if (!mapRef.current) return;

    const { map } = createHereMap(mapRef.current, { lat: userLoc[0], lng: userLoc[1] }, 13);
    console.log("HereNavigationView (root): map created:", !!map);
    mapInstanceRef.current = map;
    setIsMapReady(true);

    return () => {
      console.log("HereNavigationView (root): cleaning up");
      disposeHereMap(mapInstanceRef.current);
      setIsMapReady(false);
    };
  }, []);

  return <div ref={mapRef} className="h-full w-full" />;
};
