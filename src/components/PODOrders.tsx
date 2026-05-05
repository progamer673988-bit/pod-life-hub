import { User } from "firebase/auth";
import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, deleteDoc, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Calculator, Sparkles, Loader2, Plus, Box, Banknote } from "lucide-react";
import { classNames } from "../lib/utils";
import { getOrderAdvice } from "../lib/gemini";
import { motion, AnimatePresence } from "motion/react";

interface Order {
  id: string;
  orderNumber: string;
  name: string;
  address: string;
  phone: string;
  status: "pending" | "fulfilled" | "shipped";
  createdAt: any;
}

export default function PODOrders({ user }: { user: User }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellingPrice, setSellingPrice] = useState(25);
  const [prodCost, setProdCost] = useState(12);
  const [platformFee, setPlatformFee] = useState(2.5);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newOrder, setNewOrder] = useState({ orderNumber: "", name: "", address: "", phone: "" });

  const [aiAdvice, setAiAdvice] = useState<Record<string, string>>({});
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Shared workspace query
    const q = query(collection(db, "orders"), where("workspaceId", "==", "POD_HUB"));
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded: Order[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        if (data.workspaceId === 'POD_HUB') {
          loaded.push({ id: d.id, ...data } as Order);
        }
      });
      // Sort client side by createdAt desc
      loaded.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setOrders(loaded);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "orders"));
    return () => unsub();
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.orderNumber || !newOrder.name || !newOrder.address) return;
    try {
      await addDoc(collection(db, "orders"), {
        ...newOrder,
        status: "pending",
        createdBy: user.uid,
        workspaceId: "POD_HUB",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewOrder({ orderNumber: "", name: "", address: "", phone: "" });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "orders");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, "orders", id), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await deleteDoc(doc(db, "orders", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `orders/${id}`);
    }
  };

  const requestAiAdvice = async (order: Order) => {
    setLoadingAi(prev => ({ ...prev, [order.id]: true }));
    const advice = await getOrderAdvice(order);
    setAiAdvice(prev => ({ ...prev, [order.id]: advice }));
    setLoadingAi(prev => ({ ...prev, [order.id]: false }));
  };

  const netProfit = sellingPrice - prodCost - platformFee;

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full">
      {/* Left Column: Calculator & New Order */}
      <div className="w-full xl:w-80 flex flex-col gap-6 shrink-0">
        
        {/* Calculator */}
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4 text-gold-500">
            <h3 className="text-xs uppercase tracking-widest font-bold">Profit Calculator</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="space-y-1">
              <label className="text-[9px] uppercase text-white/40 block mb-1">Sale Price ($)</label>
              <input type="number" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} className="w-full bg-black border border-white/10 rounded px-2 py-1 flex items-center text-sm text-gold-500 focus:border-gold-500 focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase text-white/40 block mb-1">Prod. Cost ($)</label>
              <input type="number" value={prodCost} onChange={e => setProdCost(Number(e.target.value))} className="w-full bg-black border border-white/10 rounded px-2 py-1 flex items-center text-sm font-mono focus:border-gold-500 focus:outline-none" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[9px] uppercase text-white/40 block mb-1">Platform Fee ($)</label>
              <input type="number" value={platformFee} onChange={e => setPlatformFee(Number(e.target.value))} className="w-full bg-black border border-white/10 rounded px-2 py-1 flex items-center text-sm font-mono focus:border-gold-500 focus:outline-none" />
            </div>
          </div>
          <div className="pt-2 border-t border-white/5 flex justify-between items-end">
            <div>
              <p className="text-[9px] uppercase text-white/40">Net Profit</p>
              <p className={classNames("text-2xl font-serif", netProfit >= 0 ? "text-gold-500" : "text-red-400")}>
                ${netProfit.toFixed(2)} <span className="text-[10px] font-sans opacity-50">per unit</span>
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={18} />
          New Order
        </button>

        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 overflow-hidden"
            >
              <h3 className="font-display font-bold mb-4">Add Order Details</h3>
              <form onSubmit={handleCreateOrder} className="flex flex-col gap-3">
                <input required type="text" placeholder="Order #" value={newOrder.orderNumber} onChange={e => setNewOrder({...newOrder, orderNumber: e.target.value})} className="bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-gold-500 focus:outline-none" />
                <input required type="text" placeholder="Customer Name" value={newOrder.name} onChange={e => setNewOrder({...newOrder, name: e.target.value})} className="bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-gold-500 focus:outline-none" />
                <input required type="text" placeholder="Address / Location" value={newOrder.address} onChange={e => setNewOrder({...newOrder, address: e.target.value})} className="bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-gold-500 focus:outline-none" />
                <input type="text" placeholder="Phone (Optional)" value={newOrder.phone} onChange={e => setNewOrder({...newOrder, phone: e.target.value})} className="bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-gold-500 focus:outline-none" />
                <button type="submit" className="bg-gold-500 text-black font-semibold rounded-lg py-2 mt-2 hover:bg-gold-400">Save Order</button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Column: Orders Feed */}
      <div className="flex-1 flex flex-col bg-gray-900 border border-white/5 rounded-2xl p-5 gap-4 overflow-hidden">
        <h2 className="text-xs uppercase tracking-widest text-gold-500 font-bold mb-4 flex items-center justify-between shrink-0">
          Real-time Orders
          <span className="text-[10px] font-normal text-white/40">Synced via Firebase</span>
        </h2>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="text-white/30 uppercase text-[9px] text-left border-b border-white/10">
              <tr>
                <th className="pb-2">Order ID</th>
                <th className="pb-2">Name</th>
                <th className="pb-2">Location</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">AI Insights & Actions</th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              {orders.map(order => (
                <tr key={order.id} className="border-b border-white/5">
                  <td className="py-3 font-mono">#{order.orderNumber}</td>
                  <td className="py-3">{order.name}</td>
                  <td className="py-3">{order.address}</td>
                  <td className="py-3">
                    <select 
                      value={order.status} 
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className={classNames(
                        "bg-black border border-white/10 rounded px-2 py-1 outline-none font-bold uppercase tracking-widest text-[9px]",
                        order.status === 'pending' ? 'text-red-400' : 
                        order.status === 'fulfilled' ? 'text-blue-400' :
                        'text-green-400'
                      )}
                    >
                      <option value="pending">Pending</option>
                      <option value="fulfilled">Fulfilled</option>
                      <option value="shipped">Shipped</option>
                    </select>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!aiAdvice[order.id] ? (
                        <button 
                          onClick={() => requestAiAdvice(order)}
                          disabled={loadingAi[order.id]}
                          className="bg-gold-500 text-black px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest disabled:opacity-50 inline-flex items-center gap-1 shrink-0"
                        >
                          {loadingAi[order.id] && <Loader2 size={10} className="animate-spin" />}
                          Optimize
                        </button>
                      ) : (
                        <div className="text-[9px] text-gray-300 italic max-w-[200px] whitespace-normal text-right">
                          {aiAdvice[order.id]}
                        </div>
                      )}
                      <button 
                        onClick={() => handleDeleteOrder(order.id)} 
                        className="text-white/30 hover:text-red-400 p-1.5 rounded transition-colors shrink-0" 
                        title="Delete Order"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-white/30 text-[10px] uppercase tracking-widest">
                    No orders synced yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
