
import React, { useState, useEffect, createContext } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PredictiveParking from './components/PredictiveParking';
import LoadBoard from './components/LoadBoard';
import Maintenance from './components/Maintenance';
import NavigationView from './components/NavigationView';
import VoiceCommand from './components/VoiceCommand';
import SettingsView from './components/SettingsView';

import { ViewType } from './types';

interface AppContextType {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  userLocation: [number, number] | null;
  navTarget: string | null;
  setNavTarget: (target: string | null) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.DASHBOARD);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [navTarget, setNavTarget] = useState<string | null>(null);

  // Global High-Accuracy Geolocation Tracking
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setUserLocation([41.8781, -87.6298]); // Fallback to Chicago
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        console.warn("GPS Signal Issue:", error.message);
        if (!userLocation) setUserLocation([41.8781, -87.6298]);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 
      }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const renderContent = () => {
    switch (activeView) {
      case ViewType.DASHBOARD:
        return <Dashboard />;
      case ViewType.TRUCK_STOPS:
        return <PredictiveParking />;
      case ViewType.LOAD_BOARD:
        return <LoadBoard />;
      case ViewType.MAINTENANCE:
        return <Maintenance />;
      case ViewType.NAVIGATION:
        return <NavigationView initialTarget={navTarget} />;

      case ViewType.SETTINGS:
        return <SettingsView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppContext.Provider value={{ 
      activeView, 
      setActiveView, 
      userLocation, 
      navTarget, 
      setNavTarget 
    }}>
      <div className="flex h-screen w-screen bg-[#050505] text-white overflow-hidden">
        <Sidebar activeView={activeView} onViewChange={setActiveView} onVoiceToggle={() => setIsVoiceOpen(true)} />
        
        <main className="flex-1 relative overflow-y-auto custom-scrollbar bg-[#050505] pb-20 lg:pb-0">
          {renderContent()}
        </main>

        {isVoiceOpen && (
          <VoiceCommand onClose={() => setIsVoiceOpen(false)} />
        )}
      </div>
    </AppContext.Provider>
  );
};

export default App;