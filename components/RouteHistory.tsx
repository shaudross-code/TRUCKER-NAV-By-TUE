import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  History, 
  Calendar, 
  ChevronRight, 
  Trash2, 
  Search,
  ArrowRight,
  Download
} from 'lucide-react';
import { RouteHistoryItem } from '../types';
import { useFirebase } from './FirebaseProvider';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

const RouteHistory: React.FC = () => {
  const { user } = useFirebase();
  const [history, setHistory] = useState<RouteHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');

  useEffect(() => {
    if (!user) return;
    const historyRef = collection(db, 'users', user.uid, 'history');
    const q = query(historyRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RouteHistoryItem[];
      setHistory(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/history`);
    });

    return () => unsubscribe();
  }, [user]);

  const deleteItem = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'history', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/history/${id}`);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    if (window.confirm('Are you sure you want to clear all route history?')) {
      try {
        const historyRef = collection(db, 'users', user.uid, 'history');
        const snapshot = await getDocs(historyRef);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/history`);
      }
    }
  };

  const filteredHistory = history.filter(item => {
    const matchesSearch = 
      item.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'ALL' || item.status === filter;
    return matchesSearch && matchesFilter;
  });

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen bg-[#050505]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-[#D4AF37]">
            <History className="w-6 h-6" />
            <span className="text-xs font-black uppercase tracking-[0.3em]">Logistics Archive</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic">
            Route <span className="text-[#D4AF37]">History</span>
          </h1>
          <p className="text-zinc-500 font-medium max-w-xl">
            Review and analyze your completed hauls, deadhead legs, and navigation history for compliance and performance tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={clearHistory}
            className="px-6 py-3 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Purge Logs
          </button>
          <button className="px-6 py-3 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Controls Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="relative group md:col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-[#D4AF37] transition-colors" />
          <input 
            type="text"
            placeholder="Search by origin or destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50 focus:bg-white/10 transition-all font-medium"
          />
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-1">
          {(['ALL', 'COMPLETED', 'CANCELLED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f 
                  ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]' 
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* History List */}
      <div className="space-y-4">
        {filteredHistory.length > 0 ? (
          filteredHistory.map((item, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={item.id}
              className="group relative bg-zinc-900/50 border border-white/5 rounded-3xl p-6 hover:border-[#D4AF37]/30 transition-all hover:bg-zinc-900/80"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      item.status === 'COMPLETED' ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {item.status}
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.date)}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Origin</span>
                      <span className="text-lg font-bold text-white truncate max-w-[250px]">{item.origin}</span>
                    </div>
                    <ArrowRight className="hidden md:block w-6 h-6 text-[#D4AF37] shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Destination</span>
                      <span className="text-lg font-bold text-white truncate max-w-[250px]">{item.destination}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 md:gap-12 shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Distance</span>
                    <span className="text-2xl font-black text-white italic">
                      {item.distance.toFixed(1)}
                      <span className="text-xs text-[#D4AF37] ml-1 not-italic">MI</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Duration</span>
                    <span className="text-2xl font-black text-white italic">
                      {formatDuration(item.duration)}
                    </span>
                  </div>
                  <button 
                    onClick={() => deleteItem(item.id)}
                    className="p-3 rounded-xl bg-white/5 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="w-6 h-6 text-[#D4AF37]/50" />
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
            <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5">
              <History className="w-10 h-10 text-zinc-700" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">No route history found</h3>
              <p className="text-zinc-500 max-w-xs mx-auto">
                Your completed navigation logs will appear here automatically after you reach your destinations.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {history.length > 0 && (
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 p-8 bg-[#D4AF37]/5 rounded-[2.5rem] border border-[#D4AF37]/10">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-[#D4AF37]/60 uppercase tracking-[0.2em]">Total Distance</span>
            <p className="text-3xl font-black text-white italic">
              {history.reduce((acc, curr) => acc + curr.distance, 0).toLocaleString()}
              <span className="text-sm ml-1 not-italic">MI</span>
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black text-[#D4AF37]/60 uppercase tracking-[0.2em]">Total Time</span>
            <p className="text-3xl font-black text-white italic">
              {Math.floor(history.reduce((acc, curr) => acc + curr.duration, 0) / 3600)}
              <span className="text-sm ml-1 not-italic">HRS</span>
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black text-[#D4AF37]/60 uppercase tracking-[0.2em]">Completed</span>
            <p className="text-3xl font-black text-white italic">
              {history.filter(i => i.status === 'COMPLETED').length}
              <span className="text-sm ml-1 not-italic">HAULS</span>
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black text-[#D4AF37]/60 uppercase tracking-[0.2em]">Avg Distance</span>
            <p className="text-3xl font-black text-white italic">
              {(history.reduce((acc, curr) => acc + curr.distance, 0) / history.length).toFixed(0)}
              <span className="text-sm ml-1 not-italic">MI</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteHistory;
