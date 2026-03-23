import React, { useState, useEffect } from 'react';
import { Droplets, Gauge, AlertCircle, CheckCircle2, History } from 'lucide-react';
import { useFirebase } from './FirebaseProvider';
import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { MaintenanceRecord } from '../types';

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
  const { user } = useFirebase();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const maintenanceRef = collection(db, 'users', user.uid, 'maintenance');
    const q = query(maintenanceRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newRecords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MaintenanceRecord[];
      setRecords(newRecords);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/maintenance`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const alerts = records.filter(r => r.status !== 'Completed');
  const history = records.filter(r => r.status === 'Completed');

  const handleSchedule = async (id: string) => {
    if (!user) return;
    const recordRef = doc(db, 'users', user.uid, 'maintenance', id);
    try {
      await updateDoc(recordRef, {
        status: 'Scheduled',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/maintenance/${id}`);
    }
  };

  const handleComplete = async (id: string) => {
    if (!user) return;
    const recordRef = doc(db, 'users', user.uid, 'maintenance', id);
    try {
      await updateDoc(recordRef, {
        status: 'Completed',
        cost: `$${(Math.random() * 500 + 100).toFixed(2)}`
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/maintenance/${id}`);
    }
  };

  // Initial data seeding if empty
  useEffect(() => {
    if (!user || loading || records.length > 0) return;

    const seedData = async () => {
      const maintenanceRef = collection(db, 'users', user.uid, 'maintenance');
      const initialAlerts = [
        { title: 'Brake Pad Replacement Required', urgency: 'High', date: 'Within 500 mi', type: 'Repair', status: 'Active' },
        { title: 'Routine 50k mi Inspection', urgency: 'Medium', date: '2025-01-25', type: 'Scheduled', status: 'Scheduled' },
        { title: 'Tire Rotation', urgency: 'Low', date: '2025-02-10', type: 'Maintenance', status: 'Active' },
      ];

      for (const alert of initialAlerts) {
        await addDoc(maintenanceRef, alert);
      }
    };

    seedData();
  }, [user, loading, records.length]);

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
            <div className="text-2xl font-black text-white">{alerts.length > 0 ? 98 - (alerts.length * 2) : 100}/100</div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0a0a0a] border border-zinc-900 rounded-[2.5rem] p-8 shadow-lg">
          <h2 className="text-xl font-bold mb-8 flex items-center justify-between text-white italic uppercase tracking-tighter">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-[#D4AF37]" />
              Service Alerts
            </div>
            <span className="text-xs font-black text-zinc-600">{alerts.length} Active</span>
          </h2>
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="p-10 text-center border border-dashed border-zinc-800 rounded-2xl">
                <CheckCircle2 className="w-10 h-10 text-[#D4AF37] mx-auto mb-3 opacity-20" />
                <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest">All systems operational</p>
              </div>
            ) : alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-6 bg-zinc-900/30 rounded-2xl border border-zinc-800 hover:border-[#D4AF37]/40 transition-all group">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${alert.urgency === 'High' ? 'bg-rose-500 animate-pulse' : 'bg-[#D4AF37]'}`} />
                  <div>
                    <div className="text-sm font-bold text-zinc-100 group-hover:text-[#D4AF37] transition-colors">{alert.title}</div>
                    <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest italic">{alert.type} • {alert.date}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {alert.status === 'Active' ? (
                    <button 
                      onClick={() => handleSchedule(alert.id)}
                      className="px-6 py-2.5 bg-zinc-900 hover:bg-[#D4AF37] border border-zinc-800 hover:border-[#D4AF37] text-[10px] font-black uppercase tracking-widest rounded-xl transition-all text-zinc-500 hover:text-black shadow-lg"
                    >
                      Schedule
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleComplete(alert.id)}
                      className="px-6 py-2.5 bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 hover:border-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all text-emerald-500 hover:text-black shadow-lg"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-zinc-900 rounded-[2.5rem] p-8 shadow-lg">
          <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-white italic uppercase tracking-tighter">
            <History className="w-6 h-6 text-[#D4AF37]" />
            Service History
          </h2>
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="p-10 text-center border border-dashed border-zinc-800 rounded-2xl">
                <History className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                <p className="text-zinc-600 font-bold uppercase text-xs tracking-widest">No service history yet</p>
              </div>
            ) : history.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-5 bg-zinc-900/10 rounded-2xl border border-zinc-900">
                <div className="flex items-center gap-4">
                  <div className="text-zinc-600 font-mono text-[10px] uppercase">{item.date}</div>
                  <div>
                    <div className="text-sm font-bold text-zinc-300">{item.service || item.title}</div>
                    <div className={`text-[9px] font-black uppercase tracking-widest ${item.status === 'Completed' ? 'text-emerald-500' : 'text-[#D4AF37]'}`}>{item.status}</div>
                  </div>
                </div>
                <div className="text-sm font-black text-white italic">{item.cost}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
