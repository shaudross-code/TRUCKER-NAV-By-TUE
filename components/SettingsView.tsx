import React, { useState, useContext } from 'react';
import { 
  Map, 
  Shield, 
  Volume2, 
  Database, 
  User, 
  Smartphone,
  Truck,
  ArrowUpCircle,
  Scale,
  RotateCcw,
  Download,
  CheckCircle2,
  Gauge,
  Ruler
} from 'lucide-react';
import { AppContext } from '../types';
import { offlineMapsData } from '../src/constants/offlineMaps';

const MapFolder: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bg-[#0a0a0a] border border-zinc-900 rounded-2xl p-4 mb-3">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full text-white font-bold text-[15px]">
        {title}
        <span>{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && <div className="mt-4 space-y-2">{children}</div>}
    </div>
  );
};

interface ToggleProps {
  label: string;
  description: string;
  initialValue?: boolean;
  onChange?: (val: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ label, description, initialValue = false, onChange }) => {
  const [enabled, setEnabled] = useState(initialValue);
  
  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    if (onChange) onChange(next);
  };
  
  return (
    <div className="bg-[#0a0a0a] border border-zinc-900 p-5 rounded-2xl flex items-center justify-between group transition-all hover:border-[#D4AF37]/30">
      <div className="flex-1">
        <h4 className="text-[15px] font-bold text-white mb-0.5 group-hover:text-[#D4AF37] transition-colors">{label}</h4>
        <p className="text-[12px] text-zinc-500 font-medium">{description}</p>
      </div>
      <button 
        onClick={handleToggle}
        className={`w-11 h-6 rounded-full transition-all duration-300 relative ${
          enabled ? 'bg-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-zinc-800'
        }`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
          enabled ? 'left-6' : 'left-1'
        }`} />
      </button>
    </div>
  );
};

const ProfileField: React.FC<{ label: string, value: string, icon: any, onEdit?: () => void }> = ({ label, value, icon: Icon, onEdit }) => (
  <div className="bg-[#0a0a0a] border border-zinc-900 p-5 rounded-2xl flex items-center justify-between group transition-all hover:border-[#D4AF37]/30">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800/50 group-hover:bg-[#D4AF37]/10 group-hover:border-[#D4AF37]/30 transition-all">
        <Icon className="w-5 h-5 text-[#D4AF37]" />
      </div>
      <div>
        <h4 className="text-[15px] font-bold text-white mb-0.5 group-hover:text-[#D4AF37] transition-colors">{label}</h4>
        <p className="text-[12px] text-zinc-500 font-medium italic">{value}</p>
      </div>
    </div>
    <button onClick={onEdit} className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest hover:underline px-3 py-1 italic">Edit</button>
  </div>
);

const MapDownloadItem: React.FC<{ region: string, size: string, isDownloaded: boolean, onDownload: () => void }> = ({ region, size, isDownloaded, onDownload }) => {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownload = () => {
    if (isDownloaded || downloading) return;
    setDownloading(true);
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress >= 100) {
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => {
          setDownloading(false);
          onDownload();
        }, 500);
      } else {
        setProgress(currentProgress);
      }
    }, 200);
  };

  return (
    <div className="bg-[#0a0a0a] border border-zinc-900 p-4 rounded-2xl flex items-center justify-between group transition-all hover:border-[#D4AF37]/30 relative overflow-hidden">
      {downloading && (
        <div 
          className="absolute left-0 top-0 bottom-0 bg-[#D4AF37]/10 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      )}
      <div className="flex items-center gap-4 relative z-10">
        <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800/50 group-hover:bg-[#D4AF37]/10 transition-all">
          <Map className="w-5 h-5 text-[#D4AF37]" />
        </div>
        <div>
          <h4 className="text-[15px] font-bold text-white mb-0.5 group-hover:text-[#D4AF37] transition-colors">{region}</h4>
          <p className="text-[12px] text-zinc-500 font-medium italic">{size}</p>
        </div>
      </div>
      <div className="relative z-10">
        {isDownloaded ? (
          <div className="flex items-center gap-2 text-[#D4AF37]">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-[11px] font-black uppercase tracking-widest italic hidden sm:inline">Downloaded</span>
          </div>
        ) : downloading ? (
          <div className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest italic">
            {Math.round(progress)}%
          </div>
        ) : (
          <button 
            onClick={handleDownload}
            className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-[#D4AF37] hover:text-black text-zinc-400 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

const SettingsView: React.FC = () => {
  const context = useContext(AppContext);
  const [downloadedMaps, setDownloadedMaps] = useState<string[]>(['California']);

  if (!context) return null;

  const { truckProfile, setTruckProfile, unitSystem, setUnitSystem } = context;

  const handleEdit = (field: keyof typeof truckProfile) => {
    const current = truckProfile[field];
    let promptMsg = `Enter new ${field}:`;
    
    if (field === 'hazmatClasses') promptMsg = "Enter Hazmat Classes (comma separated, e.g. explosive,gas,flammable):";
    if (field === 'tunnelCategory') promptMsg = "Enter Tunnel Category (A, B, C, D, E, or NONE):";

    const newValue = prompt(promptMsg, Array.isArray(current) ? current.join(',') : current.toString());
    
    if (newValue !== null) {
      if (field === 'hazmat') {
        setTruckProfile(prev => ({ ...prev, [field]: newValue.toLowerCase() === 'true' }));
      } else if (field === 'hazmatClasses') {
        const classes = newValue.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
        setTruckProfile(prev => ({ ...prev, [field]: classes }));
      } else if (field === 'tunnelCategory') {
        const cat = newValue.toUpperCase().trim();
        setTruckProfile(prev => ({ ...prev, [field]: cat }));
      } else if (typeof current === 'number') {
        const num = parseFloat(newValue);
        if (!isNaN(num)) {
          setTruckProfile(prev => ({ ...prev, [field]: num }));
        }
      } else {
        setTruckProfile(prev => ({ ...prev, [field]: newValue }));
      }
    }
  };

  return (
    <div className="p-10 max-w-[1400px] mx-auto bg-[#050505] min-h-screen pb-24">
      <div className="mb-12">
        <h1 className="text-[32px] font-bold tracking-tight text-white mb-2 uppercase italic tracking-tighter">System Configuration</h1>
        <p className="text-zinc-500 font-medium text-lg uppercase tracking-widest italic opacity-50">Manage application preferences and professional routing parameters.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-12">
        {/* Professional Routing Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Map className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">Professional Routing</h2>
          </div>
          <div className="space-y-3">
            <Toggle label="Avoid Low Bridges" description="Exclude bridges below your truck's current height profile" initialValue={true} />
            <Toggle label="Avoid U-Turns" description="Only suggest turns safe for semi-truck dimensions" initialValue={true} />
            <Toggle label="Weight Limit Compliance" description="Route away from roads with strict weight restrictions" initialValue={true} />
            <Toggle label="Strict Truck Routing" description="Enforce STAA and designated truck route adherence" initialValue={true} />
            <Toggle 
              label="Hazmat Routing" 
              description="Enforce hazardous material restrictions based on load" 
              initialValue={truckProfile.hazmat} 
              onChange={(val) => setTruckProfile(prev => ({ ...prev, hazmat: val }))}
            />
            <Toggle label="Avoid Tolls" description="Prefer free routes when available" />
            <Toggle label="Avoid Ferries" description="Exclude water crossings from route" initialValue={true} />
            <Toggle 
              label="Auto-Recalculate Route" 
              description="Automatically reroute when off-track" 
              initialValue={context.autoReroute} 
              onChange={context.setAutoReroute}
            />
          </div>
        </section>

        {/* Units & Display Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Ruler className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">Units & Display</h2>
          </div>
          <div className="space-y-4">
            {/* Speed Units */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-800 rounded-xl">
                    <Gauge className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold uppercase tracking-wider italic">Speed</p>
                    <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Speedometer display unit</p>
                  </div>
                </div>
                <div data-testid="speed-unit-toggle" className="flex bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700">
                  <button
                    data-testid="speed-mph-btn"
                    onClick={() => setUnitSystem('imperial')}
                    className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${unitSystem === 'imperial' ? 'bg-[#D4AF37] text-black' : 'text-zinc-400 hover:text-white'}`}
                  >
                    MPH
                  </button>
                  <button
                    data-testid="speed-kmh-btn"
                    onClick={() => setUnitSystem('metric')}
                    className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${unitSystem === 'metric' ? 'bg-[#D4AF37] text-black' : 'text-zinc-400 hover:text-white'}`}
                  >
                    KM/H
                  </button>
                </div>
              </div>
            </div>
            {/* Distance Units */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-800 rounded-xl">
                    <Ruler className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold uppercase tracking-wider italic">Distance</p>
                    <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
                      {unitSystem === 'imperial' ? 'Miles & Feet' : 'Kilometers & Meters'}
                    </p>
                  </div>
                </div>
                <div data-testid="distance-unit-display" className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${unitSystem === 'imperial' ? 'text-[#D4AF37]' : 'text-zinc-500'}`}>MI</span>
                  <div className="w-px h-4 bg-zinc-700" />
                  <span className={`text-xs font-bold uppercase tracking-wider ${unitSystem === 'metric' ? 'text-[#D4AF37]' : 'text-zinc-500'}`}>KM</span>
                </div>
              </div>
              <p className="text-zinc-600 text-[10px] mt-3 pl-11 uppercase tracking-wider">
                Linked to speed setting — changes distance across navigation, routes, and dashboard
              </p>
            </div>
          </div>
        </section>

        {/* Truck Profile Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Truck className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">Truck Specifications</h2>
          </div>
          <div className="space-y-3">
            <ProfileField 
              label="Current Height" 
              value={unitSystem === 'imperial' ? `${truckProfile.height}' (Truck Height)` : `${(truckProfile.height * 0.3048).toFixed(1)} m (Truck Height)`}
              icon={ArrowUpCircle} 
              onEdit={() => handleEdit('height')}
            />
            <ProfileField 
              label="Gross Weight" 
              value={unitSystem === 'imperial' ? `${truckProfile.weight.toLocaleString()} lbs (GVW)` : `${Math.round(truckProfile.weight * 0.453592).toLocaleString()} kg (GVW)`}
              icon={Scale} 
              onEdit={() => handleEdit('weight')}
            />
            <ProfileField 
              label="Trailer Length" 
              value={unitSystem === 'imperial' ? `${truckProfile.length}' (Trailer Length)` : `${(truckProfile.length * 0.3048).toFixed(1)} m (Trailer Length)`}
              icon={RotateCcw} 
              onEdit={() => handleEdit('length')}
            />
            <ProfileField 
              label="Truck Width" 
              value={unitSystem === 'imperial' ? `${truckProfile.width}' (Width)` : `${(truckProfile.width * 0.3048).toFixed(1)} m (Width)`}
              icon={ArrowUpCircle} 
              onEdit={() => handleEdit('width')}
            />
            <ProfileField 
              label="Axle Count" 
              value={`${truckProfile.axleCount} Axles`} 
              icon={Scale} 
              onEdit={() => handleEdit('axleCount')}
            />
            <ProfileField 
              label="Axle Weight" 
              value={unitSystem === 'imperial' ? `${truckProfile.axleWeight.toLocaleString()} lbs (Per Axle)` : `${Math.round(truckProfile.axleWeight * 0.453592).toLocaleString()} kg (Per Axle)`}
              icon={Scale} 
              onEdit={() => handleEdit('axleWeight')}
            />
            <ProfileField 
              label="Trailer Count" 
              value={`${truckProfile.trailerCount} Units`} 
              icon={Truck} 
              onEdit={() => handleEdit('trailerCount')}
            />
            <ProfileField 
              label="Tunnel Category" 
              value={`${truckProfile.tunnelCategory} (ADR)`} 
              icon={Shield} 
              onEdit={() => handleEdit('tunnelCategory')}
            />
            {truckProfile.hazmat && (
              <ProfileField 
                label="Hazmat Classes" 
                value={truckProfile.hazmatClasses.length > 0 ? truckProfile.hazmatClasses.join(', ') : 'All Classes'} 
                icon={Shield} 
                onEdit={() => handleEdit('hazmatClasses')}
              />
            )}
            <div className="mt-6 p-4 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl">
              <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                <Shield className="w-3 h-3" />
                Safety Confirmation
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                Routing algorithm is currently synchronized with the dimensions above. Ensure these match your actual load for legal compliance.
              </p>
            </div>
          </div>
        </section>

        {/* Safety Protocols */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">Safety Protocols</h2>
          </div>
          <div className="space-y-3">
            <Toggle label="Traffic Alerts" description="Real-time congestion and accident notifications" initialValue={true} />
            <Toggle label="Weather Warnings" description="Severe weather and high-wind alerts" initialValue={true} />
            <Toggle label="Speed Limit Monitor" description="Audible alert when exceeding limit" initialValue={true} />
          </div>
        </section>

        {/* Interface & Audio */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Volume2 className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">Interface & Audio</h2>
          </div>
          <div className="space-y-3">
            <Toggle label="Voice Guidance" description="Turn-by-turn spoken instructions" initialValue={true} />
            <Toggle label="Auto Night Mode" description="Adjust display brightness based on local sunset" initialValue={true} />
          </div>
        </section>

        {/* Map Downloads */}
        <section className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <Download className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">Offline Maps</h2>
          </div>
          <div className="space-y-4">
            {offlineMapsData.map(continent => (
              <MapFolder key={continent.name} title={continent.name}>
                {continent.countries.map(country => (
                  <div key={country.name} className="ml-4">
                    <MapDownloadItem 
                      region={country.name}
                      size={country.size}
                      isDownloaded={downloadedMaps.includes(country.name)}
                      onDownload={() => setDownloadedMaps(prev => [...prev, country.name])}
                    />
                    {country.states && (
                      <div className="ml-8 mt-2 space-y-2">
                        {country.states.map(state => (
                          <MapDownloadItem 
                            key={state.name}
                            region={state.name}
                            size={state.size}
                            isDownloaded={downloadedMaps.includes(state.name)}
                            onDownload={() => setDownloadedMaps(prev => [...prev, state.name])}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </MapFolder>
            ))}
          </div>
        </section>

        {/* System & Data */}
        <section className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">System & Data</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Toggle label="Data Saver" description="Reduce map detail" />
            <div className="bg-[#0a0a0a] border border-zinc-900 p-5 rounded-2xl flex items-center justify-between group transition-all hover:border-[#D4AF37]/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800/50 group-hover:bg-[#D4AF37]/10 transition-all">
                  <User className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-white group-hover:text-[#D4AF37] transition-colors">Driver Account</h4>
                  <p className="text-[12px] text-zinc-500 font-medium italic">TUE-8842-X • Elite Pro</p>
                </div>
              </div>
            </div>
            <div className="bg-[#0a0a0a] border border-zinc-900 p-5 rounded-2xl flex items-center justify-between group transition-all hover:border-[#D4AF37]/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800/50 group-hover:bg-[#D4AF37]/10 transition-all">
                  <Smartphone className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-white group-hover:text-[#D4AF37] transition-colors">System v2.5</h4>
                  <p className="text-[12px] text-zinc-500 font-medium italic">GOLD Build 1002</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;