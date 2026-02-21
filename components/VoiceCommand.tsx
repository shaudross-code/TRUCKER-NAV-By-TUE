import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Send, Volume2, AudioLines } from 'lucide-react';
import { processVoiceCommand, textToSpeech } from '../services/geminiService';

interface VoiceCommandProps {
  onClose: () => void;
}

const VoiceCommand: React.FC<VoiceCommandProps> = ({ onClose }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string, isSpeaking?: boolean}[]>([
    { role: 'ai', text: 'TRUCKERS NAV System Online. How can I assist your route today?' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isProcessing) return;
    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsProcessing(true);
    try {
      const response = await processVoiceCommand(userText);
      const aiResponse = response || 'I missed that. Come again?';
      setMessages(prev => [...prev, { role: 'ai', text: aiResponse, isSpeaking: true }]);
      await textToSpeech(aiResponse);
      setMessages(prev => prev.map(m => m.text === aiResponse ? { ...m, isSpeaking: false } : m));
    } catch (error) {
      console.error("Voice command error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: 'Connection lost. Check signal.' }]);
    } finally { setIsProcessing(false); }
  };

  const toggleListen = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      // Automatically submit after a short delay to feel natural
      setTimeout(() => {
        if (transcript) {
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
          handleSubmit(fakeEvent);
        }
      }, 500);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a0a] border border-[#D4AF37]/20 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(212,175,55,0.15)] flex flex-col h-[600px]">
        <div className="p-6 border-b border-zinc-900 flex justify-between items-center bg-black/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D4AF37] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.4)] animate-pulse">
                <Mic className="w-5 h-5 text-black" />
            </div>
            <div>
                <h3 className="font-bold text-sm uppercase tracking-widest text-white">Voice Command</h3>
                <p className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-tighter italic">Active Co-Pilot</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar bg-gradient-to-b from-transparent to-[#D4AF37]/5">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm relative shadow-lg ${
                m.role === 'user' 
                  ? 'bg-[#D4AF37] text-black font-black rounded-tr-none' 
                  : 'bg-zinc-900 text-zinc-100 font-medium rounded-tl-none border border-zinc-800'
              }`}>
                {m.role === 'ai' && (
                  <div className="flex items-center gap-2 mb-1 opacity-50">
                    <Volume2 className="w-3 h-3 text-[#D4AF37]" />
                    <span className="text-[9px] font-black uppercase tracking-widest">TRUCKERS NAV</span>
                    {m.isSpeaking && <AudioLines className="w-3 h-3 text-[#D4AF37] animate-pulse" />}
                  </div>
                )}
                {m.text}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
               <div className="bg-zinc-900 text-zinc-100 px-5 py-3 rounded-2xl rounded-tl-none flex gap-1 border border-zinc-800">
                 <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                 <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                 <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
               </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-black/50 border-t border-zinc-900">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <button type="button" onClick={toggleListen} className={`p-4 rounded-2xl transition-all shadow-lg ${isListening ? 'bg-[#D4AF37] text-black animate-pulse shadow-[#D4AF37]/40' : 'bg-zinc-900 text-zinc-400 hover:text-[#D4AF37] border border-zinc-800'}`}>
              <Mic className="w-6 h-6" />
            </button>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Speak or type a command..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none placeholder:text-zinc-700 font-medium text-white transition-all" />
            <button type="submit" disabled={!input.trim() || isProcessing} className="p-4 bg-[#D4AF37] hover:bg-[#FFD700] disabled:opacity-30 text-black rounded-2xl transition-all shadow-lg shadow-[#D4AF37]/20">
              <Send className="w-6 h-6" />
            </button>
          </form>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {['Nearest Fuel', 'Rest Stop', 'Traffic Report', 'Weather'].map(tag => (
              <button key={tag} onClick={() => setInput(tag)} className="whitespace-nowrap px-4 py-1.5 bg-zinc-900 hover:bg-[#D4AF37]/10 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-[#D4AF37] rounded-full border border-zinc-800 hover:border-[#D4AF37]/40 transition-colors">
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceCommand;