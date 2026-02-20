import React, { useState, useEffect, createContext } from 'react';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import PredictiveParking from './components/PredictiveParking.tsx';
import LoadBoard from './components/LoadBoard.tsx';
import Maintenance from './components/Maintenance.tsx';
import NavigationView from './components/NavigationView.tsx';
import VoiceCommand from './components/VoiceCommand.tsx';
import SettingsView from './components/SettingsView.tsx';
import TruckProfile from './components/TruckProfile.tsx';
import { ViewType } from './types.ts';

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
      case ViewType.TRUCK_PROFILE:
        return <TruckProfile />;
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
        
        <main className="flex-1 relative overflow-y-auto custom-scrollbar bg-[#050505]">
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