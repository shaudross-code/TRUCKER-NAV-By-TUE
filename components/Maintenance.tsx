import React from 'react';
import { Wrench, Droplets, Gauge, AlertCircle, CheckCircle2, Truck } from 'lucide-react';

const StatusItem: React.FC<{ label: string, value: string, percentage: number, color: string, icon: any }> = ({ label, value, percentage, color, icon: Icon }) => (
  <div className="bg-[#0a0a0a] border border-zinc-900 p-6 rounded-[2rem] hover:border-[#D4AF37]/30 transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl bg-zinc-900 text-[#D4AF37] border border-zinc-800 group-hover:border-[#D4AF37]/30 transition-all`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">{label}</div>
          <div className="text-xl font-black text-white">{value}</div>
        </div>
      </div>
      {percentage < 20 && (
        <div className="flex items-center gap-1 text-[10px] font-black text-rose-500 uppercase bg-rose-500/10 px-2 py-1 rounded-full animate-pulse">
          <AlertCircle className="w-3 h-3" />
          Attention
        </div>
      )}
    </div>
    <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden shadow-inner">
      <div 
        className={`h-full ${color} rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(212,175,55,0.4)]`} 
        style={{ width: `${percentage}%` }} 
      />
    </div>
  </div>
);

const Maintenance: React.FC = () => {
  return (
    <div className="p-10 max-w-7xl mx-auto bg-[#050505]">
      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2 uppercase italic tracking-tighter text-white">Maintenance</h1>
          <p className="text-zinc-500 font-medium uppercase tracking-widest italic opacity-50 text-sm">Fleet Health: 2025 Peterbilt 589 Performance Platinum</p>
        </div>
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-6 py-4 rounded-3xl flex items-center gap-4 shadow-[0_0_30px_rgba(212,175,55,0.1)]">
          <div className="bg-[#D4AF37] p-2 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.4)]">
            <CheckCircle2 className="w-5 h-5 text-black" strokeWidth={3} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest italic">Health Score</div>
            <div className="text-2xl font-black text-white">98/100</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <StatusItem label="Oil Life" value="82%" percentage={82} color="bg-[#D4AF37]" icon={Droplets} />
        <StatusItem label="DEF Level" value="45%" percentage={45} color="bg-[#B8860B]" icon={Droplets} />
        <StatusItem label="Tire Pressure" value="105 PSI" percentage={95} color="bg-[#D4AF37]" icon={Gauge} />
        <StatusItem label="Brake Wear" value="15% Left" percentage={15} color="bg-rose-500" icon={Gauge} />
        <StatusItem label="Engine Temp" value="195°F" percentage={60} color="bg-[#D4AF37]" icon={Gauge} />
        <StatusItem label="Coolant Level" value="Full" percentage={100} color="bg-[#D4AF37]" icon={Droplets} />
      </div>

      <div className="bg-[#0a0a0a] border border-zinc-900 rounded-[2.5rem] p-8 shadow-lg">
        <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-white italic uppercase tracking-tighter">
          <AlertCircle className="w-6 h-6 text-[#D4AF37]" />
          Service Alerts
        </h2>
        <div className="space-y-4">
          {[
            { title: 'Brake Pad Replacement Required', urgency: 'High', date: 'Within 500 mi', type: 'Repair' },
            { title: 'Routine 50k mi Inspection', urgency: 'Medium', date: 'Jan 25, 2025', type: 'Scheduled' },
            { title: 'Tire Rotation', urgency: 'Low', date: 'Feb 10, 2025', type: 'Maintenance' },
          ].map((alert, i) => (
            <div key={i} className="flex items-center justify-between p-6 bg-zinc-900/30 rounded-2xl border border-zinc-800 hover:border-[#D4AF37]/40 transition-all group">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${alert.urgency === 'High' ? 'bg-rose-500 animate-pulse' : 'bg-[#D4AF37]'}`} />
                <div>
                  <div className="text-sm font-bold text-zinc-100 group-hover:text-[#D4AF37] transition-colors">{alert.title}</div>
                  <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest italic">{alert.type} • {alert.date}</div>
                </div>
              </div>
              <button className="px-6 py-2.5 bg-zinc-900 hover:bg-[#D4AF37] border border-zinc-800 hover:border-[#D4AF37] text-[10px] font-black uppercase tracking-widest rounded-xl transition-all text-zinc-500 hover:text-black shadow-lg">
                Schedule
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Maintenance;