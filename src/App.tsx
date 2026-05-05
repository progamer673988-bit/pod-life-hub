import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, signInWithGoogle, logout } from "./lib/firebase";
import { LogIn } from "lucide-react";
import Dashboard from "./components/Dashboard";
import { motion } from "motion/react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[#111111] border border-white/5 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-tr from-gold-500 to-gold-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(212,175,55,0.3)]">
            <span className="text-black font-black text-3xl">P</span>
          </div>
          <h1 className="text-3xl font-serif italic tracking-wider text-gold-500 mb-2">POD LUXE</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/50 mb-8">Executive Workspace</p>

          <button
            onClick={signInWithGoogle}
            className="w-full bg-gold-500 hover:bg-gold-400 text-black font-bold uppercase tracking-widest text-[10px] py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(212,175,55,0.1)] hover:shadow-[0_0_30px_rgba(212,175,55,0.2)]"
          >
            <LogIn size={16} />
            Secure Authentication
          </button>
        </motion.div>
      </div>
    );
  }

  return <Dashboard user={user} />;
}
