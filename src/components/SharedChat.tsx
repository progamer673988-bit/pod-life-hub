import { User } from "firebase/auth";
import React, { useState, useEffect, useRef } from "react";
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, limit, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Send, Upload, Sparkles, Loader2, ImagePlus } from "lucide-react";
import { critiqueDesign } from "../lib/gemini";
import { classNames } from "../lib/utils";

interface ChatMessage {
  id: string;
  text: string;
  creatorName: string;
  createdBy: string;
  createdAt: any;
}

export default function SharedChat({ user }: { user: User }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ critique?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Shared workspace chat query
    const q = query(collection(db, "chatMessages"), where("workspaceId", "==", "POD_HUB"), limit(50));
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded: ChatMessage[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        if (data.workspaceId === 'POD_HUB') {
          loaded.push({ id: d.id, ...data } as ChatMessage);
        }
      });
      // Sort client side by createdAt asc since we removed orderBy
      loaded.sort((a,b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      setMessages(loaded);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "chatMessages"));
    return () => unsub();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    try {
      await addDoc(collection(db, "chatMessages"), {
        text: newMsg,
        creatorName: user.displayName || 'Unknown',
        createdBy: user.uid,
        workspaceId: "POD_HUB",
        createdAt: serverTimestamp(),
      });
      setNewMsg("");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "chatMessages");
    }
  };

  const handleImageCritique = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setAiLoading(true);
      const critique = await critiqueDesign(dataUrl);
      setAiResult({ critique });
      setAiLoading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-120px)] md:h-[calc(100vh-64px)] overflow-hidden pb-4">
      
      {/* Left Column: Chat */}
      <div className="flex-1 flex flex-col bg-gray-900 border border-white/5 rounded-2xl overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-white/5 bg-black">
          <h2 className="text-[10px] uppercase tracking-widest text-gold-500 font-bold mb-1">Shared Workspace</h2>
          <p className="text-xs text-white/50">Live sync for new designs and ideas</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
          {messages.map(msg => {
            const isMe = msg.createdBy === user.uid;
            return (
              <div key={msg.id} className={classNames("flex flex-col max-w-[80%]", isMe ? "self-end items-end" : "self-start items-start")}>
                <span className="text-[9px] uppercase tracking-widest text-white/40 mb-1 px-1">{isMe ? "You" : msg.creatorName}</span>
                <div className={classNames(
                  "px-4 py-2 rounded-2xl text-xs leading-relaxed", 
                  isMe ? "bg-gold-500 text-black rounded-tr-none font-medium" : "bg-white/5 text-white rounded-tl-none border border-white/10"
                )}>
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSend} className="p-3 bg-black border-t border-white/5 flex gap-2">
          <input 
            type="text" 
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            placeholder="Type a message..." 
            className="flex-1 bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gold-500 transition-colors"
          />
          <button type="submit" disabled={!newMsg.trim()} className="bg-gold-500 text-black p-3 rounded-xl disabled:opacity-50 hover:bg-gold-400 transition-colors flex items-center justify-center">
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* Right Column: AI Lab */}
      <div className="w-full xl:w-[400px] flex flex-col shrink-0 gap-4 overflow-y-auto custom-scrollbar">
        <h2 className="text-xs uppercase tracking-widest text-gold-500 font-bold flex items-center gap-2">
          <Sparkles size={14} className="text-gold-500" />
          AI Studio
        </h2>

        {/* AI Critic */}
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
          <h3 className="text-xs uppercase tracking-widest text-gold-500 font-bold mb-2">Design Critic</h3>
          <p className="text-[10px] text-white/50 mb-4 leading-relaxed">Upload a design to get feedback tailored to the USA market.</p>
          <input 
            type="file" 
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleImageCritique}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={aiLoading}
            className="w-full bg-black border border-white/10 hover:bg-white/5 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-xs"
          >
            {aiLoading && fileInputRef.current?.value ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
            Upload Image for Critique
          </button>
        </div>

        {/* Output */}
        {aiResult && (
          <div className="bg-gray-900 border border-gold-500/30 rounded-2xl p-5 flex flex-col gap-4">
            {aiResult.critique && (
              <div className="pt-0 border-t-0 border-white/5">
                <span className="text-[9px] text-gold-500 font-bold uppercase tracking-widest block mb-2">USA Market Critique</span>
                <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{aiResult.critique}</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
