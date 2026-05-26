import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Calculator } from 'lucide-react';

const CloseShiftModal = ({ isOpen, onClose, onConfirm, summary }) => {
    const [actualCash, setActualCash] = useState('');
    
    if (!isOpen || !summary) return null;

    const { startCash, cashSales, cashIn, cashOut } = summary;
    const expectedCash = startCash + cashSales + cashIn - cashOut;
    
    const actual = parseFloat(actualCash.replace(/[^0-9]/g, '')) || 0;
    const difference = actual - expectedCash;

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(actual);
    };

    const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Calculator size={20} className="text-indigo-400" />
                        Tutup Shift Kasir
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-2 gap-6">
                    {/* Summary Section */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ringkasan Shift</h3>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Modal Awal</span>
                            <span className="text-slate-200">{fmt(startCash)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Penjualan Tunai</span>
                            <span className="text-green-400">+ {fmt(cashSales)}</span>
                        </div>
                        {cashIn > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Kas Masuk</span>
                                <span className="text-green-400">+ {fmt(cashIn)}</span>
                            </div>
                        )}
                        {cashOut > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Kas Keluar</span>
                                <span className="text-red-400">- {fmt(cashOut)}</span>
                            </div>
                        )}
                        <div className="pt-2 mt-2 border-t border-slate-700 flex justify-between font-bold">
                            <span className="text-slate-200">Total Diharapkan</span>
                            <span className="text-indigo-300">{fmt(expectedCash)}</span>
                        </div>
                    </div>

                    {/* Input Section */}
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                            Uang Tunai di Laci
                        </label>
                        <input
                            type="number"
                            autoFocus
                            value={actualCash}
                            onChange={(e) => setActualCash(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white font-semibold focus:outline-none focus:border-indigo-500 mb-4"
                            placeholder="0"
                        />

                        <div className={`p-3 rounded-lg border ${difference === 0 ? 'bg-green-500/10 border-green-500/20' : difference < 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                            <div className="text-xs text-slate-400 mb-1">Selisih</div>
                            <div className={`text-lg font-bold ${difference === 0 ? 'text-green-400' : difference < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                                {difference > 0 ? '+' : ''}{fmt(difference)}
                            </div>
                            <div className="text-[10px] mt-1 opacity-70">
                                {difference === 0 ? 'Sempurna, tidak ada selisih.' : difference < 0 ? 'Uang kurang dari sistem.' : 'Uang lebih dari sistem.'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-0">
                    <button
                        onClick={handleSubmit}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={18} />
                        <span>Konfirmasi Tutup Shift</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default CloseShiftModal;
