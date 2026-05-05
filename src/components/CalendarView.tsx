import { User } from "firebase/auth";
import React, { useState, useEffect } from "react";
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, parseISO } from "date-fns";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { classNames } from "../lib/utils";
import { Plus, X, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  type: "school" | "pod" | "personal";
}

export default function CalendarView({ user }: { user: User }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [newEvent, setNewEvent] = useState({ title: "", type: "school" as const });

  useEffect(() => {
    const q = query(collection(db, "events"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded: ScheduleEvent[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        loaded.push({
          id: doc.id,
          title: data.title,
          date: data.date,
          type: data.type
        });
      });
      setEvents(loaded);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "events"));

    return () => unsub();
  }, [user.uid]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title) return;
    try {
      await addDoc(collection(db, "events"), {
        title: newEvent.title,
        date: format(selectedDate, "yyyy-MM-dd"),
        type: newEvent.type,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewEvent({ title: "", type: "school" });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "events");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "events", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `events/${id}`);
    }
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = "";

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      const dayEvents = events.filter(e => e.date === format(cloneDay, "yyyy-MM-dd"));
      
      days.push(
        <div
          key={day.toString()}
          onClick={() => { setSelectedDate(cloneDay); setIsAdding(true); }}
          className={classNames(
            "min-h-[100px] border border-gray-800 p-2 cursor-pointer transition-colors relative group",
            !isSameMonth(day, monthStart) ? "text-gray-600 bg-gray-900/50" : "bg-black hover:bg-gray-900",
            isSameDay(day, new Date()) ? "ring-1 ring-gold-500 inset-0 z-10" : ""
          )}
        >
          <span className="text-sm font-medium">
            {formattedDate}
          </span>
          <div className="mt-1 flex flex-col gap-1">
            {dayEvents.map(e => (
              <div 
                key={e.id}
                className={classNames(
                  "text-xs px-1.5 py-1 rounded flex justify-between items-center group/event",
                  e.type === "school" ? "bg-blue-900/30 text-blue-400" :
                  e.type === "pod" ? "bg-gold-500/20 text-gold-500" : "bg-purple-900/30 text-purple-400"
                )}
                onClick={(ev) => { ev.stopPropagation(); }}
              >
                <span className="truncate">{e.title}</span>
                <button onClick={() => handleDelete(e.id)} className="opacity-0 group-hover/event:opacity-100 p-1 hover:text-white transition-opacity">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>);
    days = [];
  }

  return (
    <div className="flex flex-col xl:flex-row gap-4 h-full">
      <div className="flex-1 flex flex-col bg-gray-900 rounded-2xl border border-white/5 overflow-hidden p-5">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className="text-xs uppercase tracking-widest text-gold-500 font-bold">Daily Agenda — {format(currentDate, "MMMM yyyy")}</h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="px-2 border border-white/10 hover:bg-white/5 text-[9px] uppercase rounded text-white/50">&larr; Prev</button>
            <button onClick={nextMonth} className="px-2 border border-white/10 hover:bg-white/5 text-[9px] uppercase rounded text-white/50">Next &rarr;</button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-white/5 pb-2 mb-2 shrink-0">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="text-center text-[9px] font-bold text-white/30 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {rows}
        </div>
      </div>

      <div className="w-full xl:w-80 flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar">
        {/* L-mudaraja Quick Add Event */}
        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gray-900 rounded-2xl border border-white/5 p-5 relative overflow-hidden shrink-0"
            >
              <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
                <X size={14} />
              </button>
              <h3 className="text-xs uppercase tracking-widest text-gold-500 font-bold mb-4">Add Event ({format(selectedDate, "MMM d")})</h3>
              <form onSubmit={handleCreate} className="flex flex-col gap-3">
                <input
                  autoFocus
                  type="text"
                  placeholder="Event title..."
                  className="bg-black border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                />
                <select
                  className="bg-black border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
                  value={newEvent.type}
                  onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}
                >
                  <option value="school">L-mdrassa / Lydex</option>
                  <option value="pod">POD Khidma</option>
                  <option value="personal">Personal</option>
                </select>
                <button type="submit" className="bg-gold-500 text-black text-[10px] uppercase tracking-widest font-bold rounded py-2 mt-2">
                  Add to Calendar
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
