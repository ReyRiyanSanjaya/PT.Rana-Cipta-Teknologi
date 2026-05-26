import React, { useState, useEffect } from 'react';
import { X, Banknote, QrCode, CreditCard, CheckCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PaymentModal = ({ isOpen, onClose, totalAmount, onConfirm }) => {
    const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, QRIS, TRANSFER
    const [cashReceived, setCashReceived] = useState('');
    const [change, setChange] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setPaymentMethod('CASH');
            setCashReceived('');
            setChange(0);
        }
    }, [isOpen]);

    // Change Calculation
    useEffect(() => {
        if (paymentMethod === 'CASH' && cashReceived) {
            const received = parseFloat(cashReceived) || 0;
            setChange(Math.max(0, received - totalAmount));
        } else {
            setChange(0);
        }
    }, [cashReceived, totalAmount, paymentMethod]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && !e.shiftKey) {
                // Check validity
                if (paymentMethod === 'CASH') {
                    const received = parseFloat(cashReceived) || 0;
                    if (received >= totalAmount) {
                        handleConfirm();
                    }
                } else {
                    handleConfirm();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, cashReceived, totalAmount, paymentMethod, change]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        // Validation for Cash
        if (paymentMethod === 'CASH') {
            const received = parseFloat(cashReceived) || 0;
            if (received < totalAmount) {
                alert('Uang yang diterima kurang!');
                return;
            }
        }

        onConfirm({
            paymentMethod,
            amountPaid: paymentMethod === 'CASH' ? parseFloat(cashReceived) : totalAmount,
            change: change
        });
    };

    const fmt = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

    const QuickMoneyBtn = ({ amount, label }) => (
        <button
            onClick={() => setCashReceived(amount.toString())}
            className="p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-xs font-semibold text-slate-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 group"
        >
            <span className="text-[10px] text-slate-500 group-hover:text-indigo-200 font-normal">{label || 'Uang Pas'}</span>
            <span className="tracking-tight">{fmt(amount)}</span>
        </button>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-800 bg-[#1e293b]/50">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                                        <Banknote size={16} className="text-indigo-400" />
                                    </div>
                                    Pembayaran
                                </h3>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Total Display */}
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Tagihan</p>
                                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 tracking-tight">{fmt(totalAmount)}</h2>
                            </div>

                            {/* Method Selection */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'CASH', icon: Banknote, label: 'Tunai' },
                                    { id: 'QRIS', icon: QrCode, label: 'QRIS' },
                                    { id: 'TRANSFER', icon: CreditCard, label: 'Transfer' }
                                ].map((method) => (
                                    <button
                                        key={method.id}
                                        onClick={() => setPaymentMethod(method.id)}
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200 ${
                                            paymentMethod === method.id
                                                ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300 shadow-sm'
                                                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800'
                                        }`}
                                    >
                                        <method.icon size={18} className="mb-1" />
                                        <span className="text-[10px] font-bold tracking-wide">{method.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Content based on Method */}
                            {paymentMethod === 'CASH' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    <div>
                                        <div className="relative group">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg">Rp</span>
                                            <input
                                                type="number"
                                                value={cashReceived}
                                                onChange={(e) => setCashReceived(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 bg-[#020617] border border-slate-700 rounded-xl text-xl font-bold text-white placeholder:text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all shadow-inner"
                                                placeholder="0"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {/* Quick Money Buttons */}
                                    <div className="grid grid-cols-4 gap-2">
                                        <QuickMoneyBtn amount={totalAmount} label="Pas" />
                                        <QuickMoneyBtn amount={10000} />
                                        <QuickMoneyBtn amount={20000} />
                                        <QuickMoneyBtn amount={50000} />
                                        <QuickMoneyBtn amount={100000} />
                                        <QuickMoneyBtn amount={totalAmount + 5000} />
                                        <QuickMoneyBtn amount={totalAmount + 10000} />
                                        <QuickMoneyBtn amount={Math.ceil(totalAmount / 50000) * 50000} />
                                    </div>

                                    {/* Change Display */}
                                    <div className={`flex justify-between items-center px-4 py-3 rounded-xl border transition-colors ${
                                        change > 0 
                                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                                        : 'bg-slate-900/30 border-slate-800 border-dashed'
                                    }`}>
                                        <span className={`text-xs font-bold ${change > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>Kembalian</span>
                                        <span className={`text-lg font-black tracking-tight ${change > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>{fmt(change)}</span>
                                    </div>
                                </motion.div>
                            )}

                            {paymentMethod !== 'CASH' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center justify-center p-4 bg-slate-900/50 rounded-xl border border-slate-800 text-center"
                                >
                                    {paymentMethod === 'QRIS' ? (
                                        <>
                                            <div className="bg-white p-3 rounded-lg shadow-sm mb-3">
                                                <QrCode size={100} className="text-slate-900" />
                                            </div>
                                            <p className="text-xs text-slate-400">Scan QRIS untuk membayar</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-3 text-blue-400 border border-blue-500/30">
                                                <CreditCard size={24} />
                                            </div>
                                            <div className="bg-[#020617] px-3 py-2 rounded-lg border border-slate-800 mb-2">
                                                <p className="text-sm font-mono tracking-wider text-indigo-300 font-bold">123 456 7890</p>
                                            </div>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">a.n. Rana Merchant</p>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 border-t border-slate-800 bg-[#1e293b]/30 flex gap-2 mt-auto">
                            <button
                                onClick={onClose}
                                className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all border border-transparent hover:border-slate-700"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={paymentMethod === 'CASH' && (parseFloat(cashReceived) || 0) < totalAmount}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:from-indigo-400 hover:to-violet-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                                <CheckCircle size={16} />
                                <span>Bayar (Enter)</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PaymentModal;
