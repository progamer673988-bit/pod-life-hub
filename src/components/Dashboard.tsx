import { User } from "firebase/auth";
import { useState } from "react";
import { logout } from "../lib/firebase";
import CalendarView from "./CalendarView";
import PODOrders from "./PODOrders";
import SharedChat from "./SharedChat";
import { classNames } from "../lib/utils";

export default function Dashboard({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<"calendar" | "pod" | "chat">("pod");

  const views = {
    calendar: <CalendarView user={user} />,
    pod: <PODOrders user={user} />,
    chat: <SharedChat user={user} />
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col text-white font-sans overflow-hidden relative">
      {/* Header Section */}
      <header className="flex justify-between items-center p-6 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-gold-500 to-gold-400 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <span className="text-black font-black text-xl">P</span>
          </div>
          <h1 className="text-2xl font-serif italic tracking-wider text-gold-500 hidden sm:block">
            POD LUXE
            <span className="text-[10px] uppercase font-sans tracking-[0.3em] font-bold ml-2 text-white/50 hidden md:inline-block">
              Executive Workspace
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            <TabButton active={activeTab === "calendar"} onClick={() => setActiveTab("calendar")} label="L-mudaraja" />
            <TabButton active={activeTab === "pod"} onClick={() => setActiveTab("pod")} label="L-i7tirafiya" />
            <TabButton active={activeTab === "chat"} onClick={() => setActiveTab("chat")} label="Shared Workspace" />
          </div>
          <div className="hidden lg:flex items-center gap-4 pl-6 border-l border-white/10">
            <div className="w-8 h-8 border border-white/10 rounded-full overflow-hidden bg-gray-900 flex items-center justify-center">
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <button onClick={logout} className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors">
               Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-4 md:p-6 max-w-[1400px] w-full mx-auto relative custom-scrollbar flex flex-col">
        {views[activeTab]}
        
        {/* Footer Bar */}
        <footer className="mt-auto pt-6 border-t border-white/5 flex justify-between text-[10px] text-white/30 uppercase tracking-[0.2em] w-full mt-8">
          <div>User Identity: {user.displayName} (Verified via Google)</div>
          <div>Hada huwa l-birat dialk l-shakhsi © 2026</div>
        </footer>
      </main>

    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        "px-2 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] uppercase tracking-widest font-bold transition-all",
        active 
          ? "bg-gold-500 text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]" 
          : "border border-gold-500/40 text-gold-500 hover:bg-gold-500/10"
      )}
    >
      {label}
    </button>
  );
}
