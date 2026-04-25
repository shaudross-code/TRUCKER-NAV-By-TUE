import React, { useState, useContext, useRef, useEffect } from 'react';
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
  Ruler,
  X,
  ChevronDown,
  GraduationCap,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  Hash,
  Moon,
  Key
} from 'lucide-react';
import { AppContext } from '../types';
import { offlineMapsData } from '../src/constants/offlineMaps';
import DriverProfileModal from './DriverProfileModal';
import TruckProfileModal from './TruckProfileModal';

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

const FIELD_CONFIG: Record<string, { label: string; unit?: string; hint?: string; type: 'number' | 'select' | 'tags'; options?: string[] }> = {
  height: { label: 'Truck Height', unit: 'feet', type: 'number' },
  weight: { label: 'Gross Vehicle Weight', unit: 'lbs', type: 'number' },
  length: { label: 'Trailer Length', unit: 'feet', type: 'number' },
  width: { label: 'Truck Width', unit: 'feet', type: 'number' },
  axleCount: { label: 'Axle Count', type: 'number' },
  axleWeight: { label: 'Per-Axle Weight', unit: 'lbs', type: 'number' },
  trailerCount: { label: 'Trailer Count', type: 'number' },
  tunnelCategory: { label: 'Tunnel Category (ADR)', type: 'select', options: ['NONE', 'A', 'B', 'C', 'D', 'E'] },
  hazmatClasses: { label: 'Hazmat Classes', type: 'tags', hint: 'Comma-separated: explosive, gas, flammable, etc.' },
};

const EditModal: React.FC<{
  field: string;
  currentValue: string;
  onSave: (val: string) => void;
  onClose: () => void;
}> = ({ field, currentValue, onSave, onClose }) => {
  const [value, setValue] = useState(currentValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const config = FIELD_CONFIG[field];
  const isSelect = config?.type === 'select';
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (inputRef.current && !isSelect) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isSelect]);

  const handleSave = () => {
    if (config?.type === 'number') {
      const n = parseFloat(value);
      if (isNaN(n) || n < 0) return;
    }
    onSave(value);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        data-testid="truck-profile-edit-modal"
        className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl w-full max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">{config?.label || field}</h3>
          <button data-testid="edit-modal-close" onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {isSelect ? (
            <div className="relative">
              <button
                data-testid="edit-modal-select"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-base font-bold focus:border-[#D4AF37] transition-colors"
              >
                <span>{value || 'Select...'}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden z-10 shadow-xl">
                  {config.options?.map(opt => (
                    <button
                      key={opt}
                      data-testid={`edit-option-${opt}`}
                      onClick={() => { setValue(opt); setDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${value === opt ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'text-zinc-300 hover:bg-zinc-800'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <input
              ref={inputRef}
              data-testid="edit-modal-input"
              type={config?.type === 'number' ? 'number' : 'text'}
              min={config?.type === 'number' ? 0 : undefined}
              step={config?.type === 'number' ? 'any' : undefined}
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-base font-bold outline-none focus:border-[#D4AF37] transition-colors placeholder:text-zinc-600"
              placeholder={config?.hint || `Enter ${config?.label || field}`}
            />
          )}
          {config?.unit && (
            <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mt-2 ml-1">Unit: {config.unit}</p>
          )}
          {config?.hint && config.type === 'tags' && (
            <p className="text-[11px] text-zinc-500 mt-2 ml-1">{config.hint}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-zinc-800/60">
          <button data-testid="edit-modal-cancel" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors">
            Cancel
          </button>
          <button data-testid="edit-modal-save" onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] text-black text-xs font-black uppercase tracking-widest hover:bg-[#C4A030] transition-colors shadow-[0_4px_20px_rgba(212,175,55,0.3)]">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingsView: React.FC<{ onReplayTutorial?: () => void }> = ({ onReplayTutorial }) => {
  const context = useContext(AppContext);
  const [downloadedMaps, setDownloadedMaps] = useState<string[]>(['California']);
  const [editField, setEditField] = useState<string | null>(null);
  const [editInitialValue, setEditInitialValue] = useState('');
  
  // Driver Profile state — persisted in localStorage
  const [driverProfile, setDriverProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('trucker_driver_profile');
      return saved ? JSON.parse(saved) : { firstName: '', lastName: '', phone: '', email: '', licenseNumber: '', licenseExpiry: '', licensePlate: '' };
    } catch { return { firstName: '', lastName: '', phone: '', email: '', licenseNumber: '', licenseExpiry: '', licensePlate: '' }; }
  });
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showTruckModal, setShowTruckModal] = useState(false);

  const saveDriverProfile = (profile: typeof driverProfile) => {
    setDriverProfile(profile);
    localStorage.setItem('trucker_driver_profile', JSON.stringify(profile));
  };

  if (!context) return null;

  const { truckProfile, setTruckProfile, unitSystem, setUnitSystem, dataSaver, setDataSaver } = context;

  const handleEdit = (field: keyof typeof truckProfile) => {
    const current = truckProfile[field];
    setEditField(field);
    setEditInitialValue(Array.isArray(current) ? current.join(', ') : current.toString());
  };

  const handleSave = (newValue: string) => {
    if (!editField) return;
    const field = editField as keyof typeof truckProfile;
    const current = truckProfile[field];

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
      if (!isNaN(num) && num >= 0) {
        setTruckProfile(prev => ({ ...prev, [field]: num }));
      }
    } else {
      setTruckProfile(prev => ({ ...prev, [field]: newValue }));
    }
    setEditField(null);
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

        {/* Night Mode & Integrations Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Moon className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">Display & Integrations</h2>
          </div>
          <div className="space-y-4">
            {/* Night Mode Auto-Dimming */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-800 rounded-xl">
                    <Moon className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold uppercase tracking-wider italic">Night Mode</p>
                    <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Auto-dim map based on time of day</p>
                  </div>
                </div>
                <button
                  data-testid="night-mode-setting-toggle"
                  onClick={() => {
                    const key = `trucker_nav_night_mode`;
                    const current = localStorage.getItem(key) !== 'false';
                    localStorage.setItem(key, String(!current));
                    window.location.reload();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    localStorage.getItem('trucker_nav_night_mode') !== 'false'
                      ? 'bg-[#D4AF37] text-black' 
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {localStorage.getItem('trucker_nav_night_mode') !== 'false' ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* PC*MILER Integration */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-zinc-800 rounded-xl">
                  <Key className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-white text-sm font-bold uppercase tracking-wider italic">PC*MILER</p>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Trimble Maps truck mileage data</p>
                </div>
              </div>
              <p className="text-zinc-500 text-[10px] pl-11 mb-2">
                Add your Trimble Maps API key to enable PC*MILER practical miles, state mileage breakdown, and toll costs.
                Get a key at <span className="text-[#D4AF37]">developer.trimblemaps.com</span>
              </p>
              <div className="pl-11">
                <input
                  data-testid="pcmiler-api-key-input"
                  type="password"
                  placeholder="Enter Trimble Maps API key..."
                  defaultValue={localStorage.getItem('pcmiler_api_key') || ''}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val) {
                      localStorage.setItem('pcmiler_api_key', val);
                    } else {
                      localStorage.removeItem('pcmiler_api_key');
                    }
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/50 focus:outline-none"
                />
              </div>
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
              label="Truck #" 
              value={truckProfile.truckNumber || 'Not Set'} 
              icon={Hash} 
              onEdit={() => setShowTruckModal(true)}
            />
            <ProfileField 
              label="Trailer #" 
              value={truckProfile.trailerNumber || 'Not Set'} 
              icon={Hash} 
              onEdit={() => setShowTruckModal(true)}
            />
            <ProfileField 
              label="Truck Plate" 
              value={truckProfile.truckPlate || 'Not Set'} 
              icon={Hash} 
              onEdit={() => setShowTruckModal(true)}
            />
            <ProfileField 
              label="Trailer Plate" 
              value={truckProfile.trailerPlate || 'Not Set'} 
              icon={Hash} 
              onEdit={() => setShowTruckModal(true)}
            />
            <ProfileField 
              label="Current Height" 
              value={unitSystem === 'imperial' ? `${truckProfile.height}' (Truck Height)` : `${(truckProfile.height * 0.3048).toFixed(1)} m (Truck Height)`}
              icon={ArrowUpCircle} 
              onEdit={() => setShowTruckModal(true)}
            />
            <ProfileField 
              label="Gross Weight" 
              value={unitSystem === 'imperial' ? `${truckProfile.weight.toLocaleString()} lbs (GVW)` : `${Math.round(truckProfile.weight * 0.453592).toLocaleString()} kg (GVW)`}
              icon={Scale} 
              onEdit={() => setShowTruckModal(true)}
            />
            <ProfileField 
              label="Trailer Length" 
              value={unitSystem === 'imperial' ? `${truckProfile.length}' (Trailer Length)` : `${(truckProfile.length * 0.3048).toFixed(1)} m (Trailer Length)`}
              icon={RotateCcw} 
              onEdit={() => setShowTruckModal(true)}
            />
            <ProfileField 
              label="Truck Width" 
              value={unitSystem === 'imperial' ? `${truckProfile.width}' (Width)` : `${(truckProfile.width * 0.3048).toFixed(1)} m (Width)`}
              icon={ArrowUpCircle} 
              onEdit={() => setShowTruckModal(true)}
            />
            <ProfileField 
              label="Axle Count" 
              value={`${truckProfile.axleCount} Axles`} 
              icon={Scale} 
              onEdit={() => setShowTruckModal(true)}
            />
            <ProfileField 
              label="Axle Weight" 
              value={unitSystem === 'imperial' ? `${truckProfile.axleWeight.toLocaleString()} lbs (Per Axle)` : `${Math.round(truckProfile.axleWeight * 0.453592).toLocaleString()} kg (Per Axle)`}
              icon={Scale} 
              onEdit={() => setShowTruckModal(true)}
            />
            <ProfileField 
              label="Trailer Count" 
              value={`${truckProfile.trailerCount} Units`} 
              icon={Truck} 
              onEdit={() => setShowTruckModal(true)}
            />
            <ProfileField 
              label="Tunnel Category" 
              value={`${truckProfile.tunnelCategory} (ADR)`} 
              icon={Shield} 
              onEdit={() => setShowTruckModal(true)}
            />
            {truckProfile.hazmat && (
              <ProfileField 
                label="Hazmat Classes" 
                value={truckProfile.hazmatClasses.length > 0 ? truckProfile.hazmatClasses.join(', ') : 'All Classes'} 
                icon={Shield} 
                onEdit={() => setShowTruckModal(true)}
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
            <button 
              data-testid="edit-truck-profile-btn"
              onClick={() => setShowTruckModal(true)}
              className="w-full py-3 mt-4 rounded-xl font-bold text-black uppercase tracking-widest text-xs bg-[#D4AF37] hover:bg-[#b5952f] transition-colors shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              Edit Truck Profile
            </button>
          </div>
        </section>

        {/* Driver Profile Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <User className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">Driver Profile</h2>
          </div>
          <div className="space-y-3">
            <ProfileField 
              label="Name" 
              value={driverProfile.firstName && driverProfile.lastName ? `${driverProfile.firstName} ${driverProfile.lastName}` : 'Not Set'} 
              icon={User} 
              onEdit={() => setShowDriverModal(true)}
            />
            <ProfileField 
              label="Phone" 
              value={driverProfile.phone || 'Not Set'} 
              icon={Phone} 
              onEdit={() => setShowDriverModal(true)}
            />
            <ProfileField 
              label="Email" 
              value={driverProfile.email || 'Not Set'} 
              icon={Mail} 
              onEdit={() => setShowDriverModal(true)}
            />
            <ProfileField 
              label="CDL Number" 
              value={driverProfile.licenseNumber || 'Not Set'} 
              icon={CreditCard} 
              onEdit={() => setShowDriverModal(true)}
            />
            <ProfileField 
              label="License Expires" 
              value={driverProfile.licenseExpiry ? new Date(driverProfile.licenseExpiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not Set'} 
              icon={Calendar} 
              onEdit={() => setShowDriverModal(true)}
            />
            <ProfileField 
              label="License Plate" 
              value={driverProfile.licensePlate || 'Not Set'} 
              icon={Hash} 
              onEdit={() => setShowDriverModal(true)}
            />
            <button 
              data-testid="edit-driver-profile-btn"
              onClick={() => setShowDriverModal(true)}
              className="w-full py-3 mt-2 rounded-xl font-bold text-black uppercase tracking-widest text-xs bg-[#D4AF37] hover:bg-[#b5952f] transition-colors"
            >
              Edit Driver Profile
            </button>
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
            <Toggle label="Data Saver" description="Reduce map detail &amp; POI fetching" initialValue={dataSaver} onChange={(val) => setDataSaver(val)} />
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

        {/* Tutorial Replay */}
        {onReplayTutorial && (
          <section className="bg-[#0a0a0a] border border-zinc-900 rounded-2xl p-6">
            <h2 className="text-white text-[18px] font-bold mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#D4AF37]" /> Tutorial
            </h2>
            <p className="text-zinc-500 text-sm mb-4">Review the app's key features with an interactive walkthrough.</p>
            <button
              data-testid="replay-tutorial-btn"
              onClick={onReplayTutorial}
              className="flex items-center gap-2 px-5 py-3 bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#c9a432] transition-colors shadow-[0_0_15px_rgba(212,175,55,0.2)]"
            >
              <GraduationCap className="w-4 h-4" /> Replay Tutorial
            </button>
          </section>
        )}
      </div>

      {/* Truck Profile Edit Modal */}
      {editField && (
        <EditModal
          field={editField}
          currentValue={editInitialValue}
          onSave={handleSave}
          onClose={() => setEditField(null)}
        />
      )}
      
      {/* Driver Profile Modal */}
      <DriverProfileModal
        isOpen={showDriverModal}
        onClose={() => setShowDriverModal(false)}
        profile={driverProfile}
        onSave={saveDriverProfile}
      />
      
      {/* Truck Profile Modal */}
      <TruckProfileModal
        isOpen={showTruckModal}
        onClose={() => setShowTruckModal(false)}
        profile={truckProfile}
        onSave={(p: any) => { setTruckProfile(p); }}
      />
    </div>
  );
};

export default SettingsView;