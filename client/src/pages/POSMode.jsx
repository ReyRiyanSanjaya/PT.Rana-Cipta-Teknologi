import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Wifi, WifiOff, Search, Grid, List, Trash, Plus, Minus, User, RefreshCw, LogOut, Package, Maximize2, Minimize2, LayoutDashboard, Keyboard, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/layout/DashboardLayout';
import RanaDB from '../services/db';
import api, { fetchProducts, createTransaction } from '../services/api';
import PaymentModal from '../components/pos/PaymentModal';
import OpenShiftModal from '../components/pos/OpenShiftModal';
import CloseShiftModal from '../components/pos/CloseShiftModal';
import { playBeep, playSuccess, playError } from '../utils/sound';

const POSMode = () => {
    const { user, refreshUser, checkSubscriptionStatus } = useAuth();
    const navigate = useNavigate();
    
    // Subscription Check
    useEffect(() => {
        if (checkSubscriptionStatus && !checkSubscriptionStatus()) {
            navigate('/dashboard');
        }
    }, [user, checkSubscriptionStatus, navigate]);

    const searchInputRef = React.useRef(null);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Semua');
    const [viewMode, setViewMode] = useState('grid'); // grid | list

    // Cart State
    const [cart, setCart] = useState([]);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [serverConnected, setServerConnected] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Ensure User Data is Fresh (StoreId etc)
    useEffect(() => {
        if (user && !user.storeId && !isOffline) {
            refreshUser();
        }
    }, [user, isOffline]);

    // UI State
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Shift State
    const [currentShift, setCurrentShift] = useState(null);
    const [showOpenShift, setShowOpenShift] = useState(false);
    const [showCloseShift, setShowCloseShift] = useState(false);
    const [shiftSummary, setShiftSummary] = useState(null);

    // Check Shift Status
    useEffect(() => {
        const checkShift = async () => {
            try {
                const shift = await RanaDB.getOpenShift();
                if (shift) {
                    setCurrentShift(shift);
                } else {
                    setShowOpenShift(true);
                }
            } catch (e) {
                console.error("Error checking shift:", e);
            }
        };
        checkShift();
    }, []);

    const handleOpenShift = async (startCash) => {
        try {
            const shiftData = {
                offlineId: crypto.randomUUID(),
                cashierId: user?.id || 'unknown',
                openedAt: new Date().toISOString(),
                startCash: startCash,
            };
            await RanaDB.openShift(shiftData);
            setCurrentShift(shiftData);
            setShowOpenShift(false);
            playSuccess();
        } catch (e) {
            console.error("Failed to open shift", e);
            playError();
        }
    };

    const prepareCloseShift = async () => {
        if (!currentShift) return;
        try {
            const summary = await RanaDB.getShiftSummary(currentShift.offlineId);
            setShiftSummary(summary);
            setShowCloseShift(true);
        } catch (e) {
            console.error("Failed to get shift summary", e);
        }
    };

    const handleCloseShift = async (actualEndCash) => {
        try {
            const summary = shiftSummary; // from state
            const expectedEndCash = summary.startCash + summary.cashSales + summary.cashIn - summary.cashOut;
            const difference = actualEndCash - expectedEndCash;

            await RanaDB.closeShift(currentShift.offlineId, {
                closedAt: new Date().toISOString(),
                actualEndCash,
                expectedEndCash,
                difference
            });

            setShowCloseShift(false);
            setCurrentShift(null);
            setShiftSummary(null);
            playSuccess();
            navigate('/dashboard');
        } catch (e) {
            console.error("Failed to close shift", e);
            playError();
        }
    };

    // Initial Load & Socket
    useEffect(() => {
        loadProducts();

        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Socket Connection
        const token = localStorage.getItem('token');
        let socket = null;
        if (token) {
             const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
             const SOCKET_URL = API_URL.replace('/api', '');
             
             socket = io(SOCKET_URL, {
                auth: { token },
                transports: ['websocket', 'polling']
             });

             socket.on('connect', () => {
                console.log('POS Connected to Server');
                setServerConnected(true);
             });

             socket.on('disconnect', () => {
                setServerConnected(false);
             });
             
             socket.on('products:changed', () => {
                 loadProducts(true);
                 playBeep(2000, 0.05);
             });
             socket.on('inventory:changed', () => loadProducts(true));
             socket.on('transactions:created', () => loadProducts(true));
        }

        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            if (socket) socket.disconnect();
        };
    }, []);

    // Keyboard Shortcuts Handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Search: Ctrl+K
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            // Checkout: Ctrl+Enter or F4
            if ((e.ctrlKey && e.key === 'Enter') || e.key === 'F4') {
                 e.preventDefault();
                 if (cart.length > 0) setShowPaymentModal(true);
            }
            // Clear Cart: Ctrl+Delete
             if (e.ctrlKey && e.key === 'Delete') {
                 e.preventDefault();
                 if (cart.length > 0 && window.confirm('Kosongkan keranjang?')) {
                     setCart([]);
                 }
            }
            // Shortcuts Info: F1
            if (e.key === 'F1') {
                e.preventDefault();
                setShowShortcuts(prev => !prev);
            }
            // Esc: Blur search, Close Modal, or Clear Search
            if (e.key === 'Escape') {
                if (showShortcuts) {
                    setShowShortcuts(false);
                } else if (showPaymentModal) {
                    setShowPaymentModal(false);
                } else if (document.activeElement === searchInputRef.current) {
                    searchInputRef.current.blur();
                } else if (searchTerm) {
                    setSearchTerm('');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart, showPaymentModal, showShortcuts, searchTerm]);

    const toggleFullscreen = () => {
        try {
            if (!document.fullscreenElement) {
                const el = document.documentElement;
                if (el.requestFullscreen) {
                    el.requestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        } catch (e) {
            console.error('Gagal mengubah mode layar penuh', e);
        }
    };

    const loadProducts = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            // Try fetch from API, fallback to offline DB? 
            // For now direct API. In strict offline app we might load from IDB.
            const data = await fetchProducts();
            if (data) {
                setProducts(data);
            }
        } catch (error) {
            console.error("Gagal memuat produk", error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleManualSync = async () => {
        if (loading) return;
        
        // 1. Refresh Products
        loadProducts(false);
    };

    // Derived State
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category?.name || 'Tanpa Kategori'));
        return ['Semua', ...Array.from(cats)];
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCat = selectedCategory === 'Semua' || (p.category?.name || 'Tanpa Kategori') === selectedCategory;
            return matchSearch && matchCat;
        });
    }, [products, searchTerm, selectedCategory]);

    const cartTotal = useMemo(() => {
        return cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    }, [cart]);

    const [taxOption, setTaxOption] = useState('PPN11'); // 'NONE' | 'PPN11'

    const taxRate = useMemo(() => (taxOption === 'PPN11' ? 0.11 : 0), [taxOption]);
    const taxAmount = useMemo(() => cartTotal * taxRate, [cartTotal, taxRate]);
    const grandTotal = useMemo(() => cartTotal + taxAmount, [cartTotal, taxAmount]);

    // Actions
    const addToCart = (product) => {
        playBeep();
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, qty: item.qty + 1 }
                        : item
                );
            }
            return [...prev, { ...product, qty: 1, price: product.sellingPrice }];
        });
    };

    const updateQty = (id, delta) => {
        playBeep(1000, 0.05); // Higher pitch for modification
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.qty + delta);
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const setQtyManual = (id, value) => {
        const num = parseInt(value, 10);
        const safe = isNaN(num) ? 1 : Math.max(1, num);
        playBeep(800, 0.05);
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const capped = item.stock ? Math.min(safe, item.stock) : safe;
                return { ...item, qty: capped };
            }
            return item;
        }));
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const handleCheckout = async (paymentData) => {
        if (cart.length === 0) return;

        if (!user?.storeId) {
            await refreshUser();
        }

        if (isOffline) {
            playError();
            alert("Tidak dapat memproses transaksi. Pastikan perangkat terhubung ke internet.");
            return;
        }

        const subtotal = cartTotal;
        const tax = taxAmount;
        const finalTotal = grandTotal;

        const transaction = {
            offlineId: crypto.randomUUID(),
            tenantId: user?.tenantId || null,
            storeId: user?.storeId || user?.store?.id || null,
            cashierId: user?.id || null,
            occurredAt: new Date().toISOString(),
            totalAmount: finalTotal,
            subtotal: subtotal,
            tax: tax,
            paymentMethod: paymentData.paymentMethod,
            amountPaid: paymentData.amountPaid,
            change: paymentData.change,
            items: cart.map(item => ({
                productId: item.id,
                quantity: Number(item.qty),
                price: Number(item.price || item.sellingPrice || 0),
                productName: item.name || null,
                productSku: item.sku || null,
                productImage: item.imageUrl || item.image || null,
                basePrice: item.basePrice != null ? Number(item.basePrice) : null
            }))
        };

        try {
            await createTransaction(transaction);
            await RanaDB.saveSyncedTransaction(transaction);

            setProducts(prev => prev.map(p => {
                const item = cart.find(c => c.id === p.id);
                if (item) {
                    return { ...p, stock: Math.max(0, p.stock - item.qty) };
                }
                return p;
            }));

            playSuccess();
            setShowPaymentModal(false);
            setCart([]);
            alert(`Transaksi Berhasil! Kembalian: ${fmt(paymentData.change)}`);
        } catch (error) {
            console.error('Checkout Error:', {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message
            });
            playError();
            const status = error?.response?.status;
            const data = error?.response?.data;
            if (status === 400 && data?.error?.code === 'PRODUCT_MISMATCH') {
                alert('Produk tidak sinkron. Silakan klik sinkronisasi produk, lalu coba lagi.');
                loadProducts(true);
            } else if (status === 402) {
                alert('Langganan/trial kedaluwarsa. Aktifkan paket untuk melakukan transaksi.');
            } else if (status === 404) {
                alert('Endpoint transaksi tidak ditemukan. Pastikan server berjalan dengan benar.');
            } else if (status === 401) {
                alert('Tidak terautentikasi. Silakan login ulang.');
                navigate('/login');
            } else if (!navigator.onLine || error?.code === 'ERR_NETWORK') {
                alert("Tidak dapat memproses transaksi. Pastikan perangkat online dan terhubung ke server.");
            } else {
                const serverMsg = data?.message || data?.error?.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
                alert(serverMsg || "Gagal menyimpan transaksi. Silakan coba lagi.");
            }
        }
    };

    const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

    return (
        <div className="flex h-screen bg-[#0a0b0f] overflow-hidden text-slate-100">
            {/* LEFT: Product Catalog */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="bg-[#020617]/95 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between shadow-lg shadow-black/40 z-10 sticky top-0 backdrop-blur-xl">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-1.5 rounded-lg text-white shadow-lg shadow-indigo-500/40">
                                <ShoppingCart size={16} />
                            </div>
                            <div>
                                <h1 className="text-base font-extrabold tracking-tight text-slate-50">Rana POS</h1>
                                <div className={`flex items-center space-x-1.5 text-[9px] font-bold uppercase tracking-[0.15em] ${isOffline ? 'text-rose-400' : (!serverConnected ? 'text-amber-400' : 'text-emerald-400')}`}>
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${isOffline ? 'bg-rose-400 animate-ping' : (!serverConnected ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-ping')}`} />
                                        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${isOffline ? 'bg-rose-500' : (!serverConnected ? 'bg-amber-500' : 'bg-emerald-500')}`} />
                                    </span>
                                    {isOffline ? <WifiOff size={9} /> : <Wifi size={9} />}
                                    <span>{isOffline ? 'Offline' : (!serverConnected ? 'Menghubungkan...' : 'Online')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-lg mx-6 relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <Search className="group-focus-within:text-indigo-400 transition-colors" size={16} />
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Cari produk (Nama atau SKU)..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-[#020617]/80 border border-slate-700/70 focus:bg-[#020617] focus:border-indigo-500/80 rounded-xl focus:ring-0 outline-none text-xs text-slate-100 placeholder:text-slate-500 transition-all duration-300 shadow-inner focus:shadow-[0_0_0_1px_rgba(129,140,248,0.7)]"
                        />
                        <div className="absolute inset-y-0 right-2 flex items-center">
                             <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-semibold text-slate-300 bg-slate-800/80 border border-slate-700 rounded">CTRL+K</kbd>
                        </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                        <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowShortcuts(true)}
                            className="p-2 hover:bg-slate-800/80 rounded-lg text-slate-300 transition-colors border border-slate-700/60 bg-[#020617]/80" 
                            title="Pintasan Keyboard (F1)"
                        >
                            <Keyboard size={16} />
                        </motion.button>
                        <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleManualSync} 
                                className="p-2 hover:bg-slate-800/80 rounded-lg text-slate-300 transition-colors border border-slate-700/60 bg-[#020617]/80" 
                                title="Sinkronkan Data & Produk"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={toggleFullscreen}
                            className="p-2 hover:bg-slate-800/80 rounded-lg text-slate-300 transition-colors border border-slate-700/60 bg-[#020617]/80"
                            title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh'}
                        >
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </motion.button>
                        <div className="h-6 w-px bg-slate-800 mx-1"></div>
                        {currentShift && (
                            <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={prepareCloseShift}
                                className="px-3 py-2 hover:bg-slate-800/80 rounded-lg text-rose-400 transition-colors border border-rose-900/30 bg-[#020617]/80 flex items-center gap-2" 
                                title="Tutup Shift"
                            >
                                <LayoutDashboard size={16} className="rotate-180" />
                                <span className="text-xs font-semibold">Tutup Shift</span>
                            </motion.button>
                        )}
                        <div className="h-6 w-px bg-slate-800 mx-1"></div>
                        <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                if(window.confirm('Keluar dari POS?')) {
                                    navigate('/dashboard');
                                }
                            }}
                            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg transition-colors border border-slate-700 shadow-sm flex items-center gap-1.5" 
                            title="Keluar POS"
                        >
                            <LogOut size={16} />
                        </motion.button>
                    </div>
                </div>

                <div className="bg-[#020617]/95 border-b border-slate-800 px-4 py-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <div className="flex space-x-2">
                        {categories.map(cat => (
                            <motion.button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                whileHover={{ y: -1 }}
                                whileTap={{ y: 0 }}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-300 border ${selectedCategory === cat
                                    ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-indigo-400 shadow-md shadow-indigo-500/30'
                                    : 'bg-[#020617] text-slate-300 border-slate-700 hover:border-slate-500 hover:bg-slate-900'
                                    }`}
                            >
                                {cat}
                            </motion.button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-[#020617]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3"></div>
                            <p className="text-xs">Memuat produk...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <div className="bg-slate-900 p-4 rounded-full mb-3 border border-slate-800">
                                <Search size={32} className="opacity-30 text-slate-500" />
                            </div>
                            <p className="text-sm font-medium text-slate-200">Tidak ada produk ditemukan</p>
                            <p className="text-xs text-slate-400">Coba kata kunci lain atau ubah kategori</p>
                        </div>
                    ) : (
                        <motion.div 
                            layout
                            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 pb-20"
                        >
                            <AnimatePresence>
                                {filteredProducts.map((product, index) => (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.2, delay: index * 0.03 }}
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        whileHover={{ y: -3, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" }}
                                        whileTap={{ scale: 0.95 }}
                                        className="bg-[#020617] rounded-lg shadow-sm border border-slate-800 overflow-hidden cursor-pointer group flex flex-col h-full"
                                    >
                                        <div className="aspect-[3/2] max-h-[100px] bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 relative flex items-center justify-center overflow-hidden p-1">
                                        {/* Image Placeholder or Real Image */}
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <Package size={24} className="text-slate-500 group-hover:text-indigo-400 transition-colors duration-300" />
                                        )}
                                        
                                        {/* Stock Badge */}
                                        <div className="absolute top-1 right-1">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-md border shadow-sm ${
                                                    product.stock <= 5 
                                                    ? 'bg-rose-500/90 text-white border-rose-400'
                                                    : 'bg-slate-900/80 text-slate-100 border-slate-700/80'
                                                }`}>
                                                    {product.stock} tersisa
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="p-2.5 flex-1 flex flex-col">
                                            <h3 className="font-semibold text-slate-100 line-clamp-2 text-[11px] leading-snug mb-1 flex-1">
                                                {product.name}
                                            </h3>
                                            <div className="flex items-end justify-between mt-1">
                                                <p className="text-indigo-300 font-semibold text-xs">
                                                    {fmt(product.sellingPrice)}
                                                </p>
                                                <div className="w-5 h-5 rounded-full bg-slate-900 text-slate-400 flex items-center justify-center group-hover:bg-gradient-to-tr group-hover:from-indigo-500 group-hover:to-violet-500 group-hover:text-white transition-colors duration-300">
                                                    <Plus size={12} />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </div>
            </div>

            <div className="w-[340px] bg-[#020617]/95 border-l border-slate-800 flex flex-col shadow-[0_0_40px_rgba(15,23,42,0.8)] z-20 backdrop-blur-xl">
                <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between bg-[#020617]">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-indigo-500/20 text-[11px] font-semibold text-indigo-200">
                            {cart.reduce((a, b) => a + b.qty, 0) || 0}
                        </span>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-semibold text-slate-100 leading-tight">
                                Transaksi
                            </span>
                            <span className="text-[10px] text-slate-500">
                                ID #{Math.floor(Math.random() * 10000)}
                            </span>
                        </div>
                    </div>
                    <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-700 bg-slate-900/60 text-[10px] text-slate-300 hover:bg-slate-800 hover:text-indigo-200 transition-colors">
                        <User size={12} />
                        <span>Pelanggan Umum</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 bg-[#020617]">
                    <AnimatePresence>
                        {cart.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3"
                            >
                                <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-2 border border-slate-800">
                                    <ShoppingCart size={40} className="opacity-30 text-slate-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-medium text-slate-200">Keranjang Kosong</p>
                                    <p className="text-sm max-w-[220px] mx-auto mt-1 text-slate-400">Pilih produk di sebelah kiri untuk memulai transaksi</p>
                                </div>
                            </motion.div>
                        ) : (
                            cart.map(item => (
                                <motion.div 
                                    layout
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20, height: 0 }}
                                    key={item.id} 
                                    className="bg-[#020617] px-3 py-2 rounded-lg shadow-sm border border-slate-800 flex flex-row items-center gap-3 group hover:border-indigo-500/40 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="text-xs font-semibold text-slate-50 leading-tight truncate">
                                                {item.name}
                                            </h4>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="text-slate-400 hover:text-red-500 transition p-1 shrink-0"
                                            >
                                                <Trash size={14} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <p className="text-[11px] text-slate-400">
                                                {fmt(item.price)} / unit
                                            </p>
                                            <div className="text-xs font-semibold text-indigo-300">
                                                {fmt(item.price * item.qty)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center bg-slate-900 rounded-md px-1 py-0.5 border border-slate-800 shrink-0">
                                        <button
                                            onClick={() => updateQty(item.id, -1)}
                                            className="w-7 h-7 flex items-center justify-center bg-slate-950 rounded-md text-slate-300 hover:text-rose-400 disabled:opacity-40 transition-all active:scale-95"
                                            disabled={item.qty <= 1}
                                        >
                                            <Minus size={12} />
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.qty}
                                            onChange={(e) => setQtyManual(item.id, e.target.value)}
                                            onBlur={(e) => setQtyManual(item.id, e.target.value)}
                                            className="w-10 text-[11px] font-bold text-center bg-transparent outline-none text-slate-100"
                                        />
                                        <button
                                            onClick={() => updateQty(item.id, 1)}
                                            className="w-7 h-7 flex items-center justify-center bg-slate-950 rounded-md text-slate-300 hover:text-emerald-400 transition-all active:scale-95"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>

                <div className="px-2.5 py-1.5 bg-[#020617] border-t border-slate-800 z-30">
                    <div className="space-y-0.5 mb-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-medium text-slate-500">Pengaturan Pajak</span>
                            <div className="inline-flex rounded-full bg-slate-900 px-1 py-0 border border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setTaxOption('NONE')}
                                    className={`px-1.5 py-0 text-[9px] rounded-full transition ${
                                        taxOption === 'NONE'
                                            ? 'bg-slate-50 text-slate-900 font-semibold'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    Tanpa Pajak
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTaxOption('PPN11')}
                                    className={`px-1.5 py-0 text-[9px] rounded-full transition ${
                                        taxOption === 'PPN11'
                                            ? 'bg-indigo-500 text-white font-semibold'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    PPN 11%
                                </button>
                            </div>
                        </div>
                    <div className="flex justify-between text-[9px] text-slate-400">
                        <span>Subtotal</span>
                        <span className="font-medium">{fmt(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400">
                        <span>{taxOption === 'PPN11' ? 'Pajak (PPN 11%)' : 'Pajak'}</span>
                        <span className="font-medium">{fmt(taxAmount)}</span>
                    </div>
                    <div className="border-t border-dashed border-slate-700 my-0.5 pt-1 flex justify-between items-end">
                        <span className="font-semibold text-[11px] text-slate-100">Total</span>
                        <span className="font-extrabold text-lg text-indigo-300 tracking-tight">{fmt(grandTotal)}</span>
                    </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setShowPaymentModal(true)}
                        disabled={cart.length === 0}
                        className="w-full py-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-[11px] text-white font-semibold rounded shadow-md shadow-indigo-500/30 hover:from-indigo-400 hover:to-violet-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 relative overflow-hidden group"
                    >
                        <span className="relative z-10 flex items-center gap-1.5">
                            Bayar Sekarang <span className="bg-white/15 px-1 py-0.5 rounded text-[8px] ml-1">F4</span>
                        </span>
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </motion.button>
                </div>
            </div>

            {/* Modal */}
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    totalAmount={grandTotal}
                    onConfirm={handleCheckout}
                />
                
                <OpenShiftModal
                    isOpen={showOpenShift}
                    onConfirm={handleOpenShift}
                    userName={user?.name || 'Kasir'}
                />

                <CloseShiftModal
                    isOpen={showCloseShift}
                    onClose={() => setShowCloseShift(false)}
                    onConfirm={handleCloseShift}
                    summary={shiftSummary}
                />

                {/* Shortcuts Modal */}
                <AnimatePresence>
                    {showShortcuts && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                            onClick={() => setShowShortcuts(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={e => e.stopPropagation()}
                                className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                            >
                                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#1e293b]/50">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Keyboard size={20} className="text-indigo-400" />
                                        Pintasan Keyboard
                                    </h2>
                                    <button 
                                        onClick={() => setShowShortcuts(false)}
                                        className="text-slate-400 hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Navigasi</div>
                                            <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-800">
                                                <span className="text-sm text-slate-200">Cari Produk</span>
                                                <kbd className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs font-bold border border-slate-700">Ctrl + K</kbd>
                                            </div>
                                            <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-800">
                                                <span className="text-sm text-slate-200">Bantuan</span>
                                                <kbd className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs font-bold border border-slate-700">F1</kbd>
                                            </div>
                                            <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-800">
                                                <span className="text-sm text-slate-200">Layar Penuh</span>
                                                <kbd className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs font-bold border border-slate-700">F11</kbd>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Transaksi</div>
                                            <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-800">
                                                <span className="text-sm text-slate-200">Bayar</span>
                                                <kbd className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs font-bold border border-slate-700">F4</kbd>
                                            </div>
                                            <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-800">
                                                <span className="text-sm text-slate-200">Hapus Keranjang</span>
                                                <kbd className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs font-bold border border-slate-700">Ctrl + Del</kbd>
                                            </div>
                                            <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-800">
                                                <span className="text-sm text-slate-200">Tutup / Batal</span>
                                                <kbd className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs font-bold border border-slate-700">Esc</kbd>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-800 text-center">
                                    <p className="text-xs text-slate-500">Tekan <span className="text-indigo-400 font-bold">Esc</span> untuk menutup jendela ini</p>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
        </div>
    );
};

export default POSMode;
