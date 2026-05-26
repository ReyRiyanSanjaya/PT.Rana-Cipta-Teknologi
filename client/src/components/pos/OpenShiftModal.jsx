import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, DollarSign, ArrowRight } from 'lucide-react';

const OpenShiftModal = ({ isOpen, onConfirm, userName }) => {
    const [startCash, setStartCash] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const amount = parseFloat(startCash.replace(/[^0-9]/g, '')) || 0;
        onConfirm(amount);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl"
            >
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                        <Lock className="text-indigo-400" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Buka Shift Kasir</h2>
                    <p className="text-slate-400 text-sm mt-1">Halo, <span className="text-indigo-300 font-semibold">{userName}</span>. Silakan input kas awal.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                            Modal Kas Awal (IDR)
                        </label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                <DollarSign size={20} />
                            </div>
                            <input
                                type="number"
                                autoFocus
                                value={startCash}
                                onChange={(e) => setStartCash(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white text-lg font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!startCash}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span>Buka Shift</span>
                        <ArrowRight size={18} />
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default OpenShiftModal;
