
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/layout/DashboardLayout';
import api, { fetchProductLogs, adjustStock, fetchInventoryIntelligence, createProduct, updateProduct, deleteProduct, fetchProducts } from '../services/api';
import { Package, Plus, Minus, AlertTriangle, Search, TrendingUp, Edit, Trash2, X, Filter, ChevronDown, Archive, ChevronLeft, ChevronRight, History, Upload, Image as ImageIcon } from 'lucide-react';
import { io } from 'socket.io-client';
import RealtimeBadge from '../components/RealtimeBadge';

const Inventory = () => {
    const [activeTab, setActiveTab] = useState('stock'); // 'stock', 'intelligence'
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);
    const [products, setProducts] = useState([]);
    const [intelligence, setIntelligence] = useState({ slowMoving: [], topProducts: [] });
    const [loading, setLoading] = useState(true);
    const socketRef = useRef(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [productsPerPage, setProductsPerPage] = useState(10);

    // Modal States
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [logs, setLogs] = useState([]);

    // Adjustment Form
    const [adjustType, setAdjustType] = useState('IN');
    const [adjustQty, setAdjustQty] = useState(0);
    const [adjustReason, setAdjustReason] = useState('');

    // Product Form (Add/Edit)
    const [productForm, setProductForm] = useState({
        name: '', sku: '', basePrice: 0, sellingPrice: 0, stock: 0, minStock: 5, category: '', description: '', imageBase64: ''
    });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        loadData();

        const token = localStorage.getItem('token');
        if (!token) return;

        const baseUrl = api?.defaults?.baseURL || '';
        const socketUrl = baseUrl ? baseUrl.replace(/\/api\/?$/, '') : 'http://localhost:4000';

        socketRef.current = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        const refresh = () => loadData();
        socketRef.current.on('inventory:changed', refresh);
        socketRef.current.on('products:changed', refresh);
        socketRef.current.on('transactions:created', refresh);

        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            const [intelResult, productsResult] = await Promise.allSettled([
                fetchInventoryIntelligence(),
                fetchProducts()
            ]);

            if (productsResult.status === 'fulfilled' && Array.isArray(productsResult.value)) {
                const items = productsResult.value;
                setProducts(items.map(i => ({
                    ...i,
                    stock: i.stock || 0,
                    minStock: i.minStock || 5
                })));
            } else {
                console.error("Failed to load products for inventory", productsResult.reason);
                setProducts([]);
            }

            const nextIntel = { slowMoving: [], topProducts: [] };

            if (intelResult.status === 'fulfilled' && intelResult.value) {
                nextIntel.slowMoving = intelResult.value.slowMoving || [];
                nextIntel.topProducts = intelResult.value.topProducts || [];
            } else if (intelResult.status === 'rejected') {
                console.error("Failed to load inventory intelligence", intelResult.reason);
            }

            setIntelligence(nextIntel);
        } catch (error) {
            console.error("Unexpected error in loadData Inventory", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Product CRUD Handlers ---

    const handleOpenAddProduct = () => {
        setProductForm({ name: '', sku: '', basePrice: 0, sellingPrice: 0, stock: 0, minStock: 5, category: '', description: '', imageBase64: '' });
        setIsEditing(false);
        setShowProductModal(true);
    };

    const handleOpenEditProduct = (product) => {
        setProductForm({
            name: product.name,
            sku: product.sku || '',
            basePrice: product.basePrice || 0,
            sellingPrice: product.sellingPrice || product.price || 0, // Fallback for old seed data
            stock: product.stock,
            minStock: product.minStock || 5,
            category: product.category?.name || '',
            description: product.description || '',
            imageBase64: ''
        });
        setSelectedProduct(product);
        setIsEditing(true);
        setShowProductModal(true);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProductForm({ ...productForm, imageBase64: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
        try {
            await deleteProduct(id);
            loadData();
            alert('Produk berhasil dihapus');
        } catch (error) {
            alert('Gagal menghapus produk');
        }
    };

    const submitProductForm = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await updateProduct(selectedProduct.id, productForm);
                alert('Produk berhasil diperbarui');
            } else {
                await createProduct(productForm);
                alert('Produk berhasil dibuat');
            }
            setShowProductModal(false);
            loadData();
        } catch (error) {
            console.error(error);
            alert('Gagal menyimpan produk');
        }
    };

    const handleViewLogs = async (product) => {
        setSelectedProduct(product);
        setLogs([]);
        setShowLogsModal(true);
        try {
            const res = await fetchProductLogs(product.id);
            if (Array.isArray(res)) {
                setLogs(res);
            }
        } catch (error) {
            console.error("Failed to fetch logs", error);
        }
    };

    // Derived State
    const categories = [...new Set(products.map(p => p.category?.name).filter(Boolean))].sort();

    // --- Existing Handlers ---

    const handleOpenAdjust = (product) => {
        setSelectedProduct(product);
        setAdjustType('IN');
        setAdjustQty(0);
        setAdjustReason('');
        setShowAdjustModal(true);
    };

    const submitAdjustment = async (e) => {
        e.preventDefault();
        try {
            let type = adjustType;
            let qty = parseInt(adjustQty);
            let reason = adjustReason;

            if (adjustType === 'OPNAME') {
                const currentStock = selectedProduct.stock || 0;
                const diff = qty - currentStock;

                if (diff === 0) {
                    alert('Stok sudah sesuai dengan catatan sistem.');
                    return;
                }

                if (diff > 0) {
                    type = 'IN';
                    qty = diff;
                } else {
                    type = 'OUT';
                    qty = Math.abs(diff);
                }
                if (!reason) reason = 'Stock Opname';
            }

            await adjustStock({
                productId: selectedProduct.id,
                quantity: qty,
                type: type,
                reason: reason
            });
            setShowAdjustModal(false);
            loadData(); // Refresh all
            alert('Stok berhasil disesuaikan');
        } catch (error) {
            console.error(error);
            alert('Gagal menyesuaikan stok');
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

    const totalProducts = products.length;
    const lowStockCount = products.filter(p => (p.stock || 0) <= (p.minStock || 0)).length;

    const filteredProducts = products.filter(p => {
        const term = searchTerm.toLowerCase();
        const matchName = p.name.toLowerCase().includes(term);
        const matchSku = p.sku && p.sku.toLowerCase().includes(term);
        const matchCategory = p.category?.name && p.category.name.toLowerCase().includes(term);
        const matchSearch = !term || matchName || matchSku || matchCategory;
        const isLowStock = (p.stock || 0) <= (p.minStock || 0);
        if (showOnlyLowStock && !isLowStock) return false;
        return matchSearch;
    });

    // Pagination Logic
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Manajemen Inventaris</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                            <Package size={16} />
                            <span>Pantau stok, cegah kehabisan, dan baca tren produk dengan cepat</span>
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs font-medium border border-indigo-100 dark:border-indigo-800">
                                <Package size={14} />
                                <span>{totalProducts || 0} produk aktif</span>
                            </div>
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                                lowStockCount > 0
                                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900/30'
                                    : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/30'
                            }`}>
                                <AlertTriangle size={14} />
                                <span>
                                    {lowStockCount > 0 ? `${lowStockCount} stok menipis` : 'Semua stok aman'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <RealtimeBadge />
                        <button 
                            onClick={handleOpenAddProduct}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 transition-all active:scale-95"
                        >
                            <Plus size={18} />
                            Tambah Produk
                        </button>
                    </div>
                </div>

                {/* Tabs & Search */}
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md py-4 -my-4 px-1">
                    <div className="flex p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        {['stock', 'intelligence'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`relative px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
                                    activeTab === tab ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                {activeTab === tab && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10 capitalize">{tab === 'stock' ? 'Kontrol Stok' : 'Analisis'}</span>
                            </button>
                        ))}
                    </div>

                    {activeTab === 'stock' && (
                        <div className="flex w-full lg:w-auto items-center gap-3">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Cari nama, SKU, atau kategori..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition-all shadow-sm text-slate-900 dark:text-white placeholder-slate-400"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowOnlyLowStock(prev => !prev)}
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                                    showOnlyLowStock
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 shadow-sm'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                <AlertTriangle size={14} className={showOnlyLowStock ? 'text-red-600 dark:text-red-400' : 'text-slate-400'} />
                                <span>Stok menipis saja</span>
                            </button>
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-20 gap-4"
                        >
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                            <p className="text-slate-500">Memuat data inventaris...</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTab === 'intelligence' ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                        <div className="flex items-center gap-4 mb-6 relative z-10">
                                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                                <TrendingUp size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Produk Unggulan</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Kontributor pendapatan tertinggi</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3 relative z-10">
                                            {intelligence.topProducts.length > 0 ? (
                                                intelligence.topProducts.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-700 font-bold text-slate-400 dark:text-slate-300 text-xs shadow-sm">#{idx + 1}</span>
                                                            <span className="font-semibold text-slate-700 dark:text-slate-200">{item.product.name}</span>
                                                        </div>
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.revenue)}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10">
                                                    <div className="inline-flex p-4 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400 mb-3">
                                                        <TrendingUp size={24} />
                                                    </div>
                                                    <p className="text-slate-600 dark:text-slate-300 font-medium">Belum ada produk unggulan</p>
                                                    <p className="text-slate-400 dark:text-slate-500 text-sm">Lakukan transaksi di POS untuk melihat peringkat produk di sini.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 dark:bg-orange-900/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                        <div className="flex items-center gap-4 mb-6 relative z-10">
                                            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl">
                                                <Archive size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Stok Lambat (Slow Moving)</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada penjualan &gt;30 hari</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3 relative z-10">
                                            {intelligence.slowMoving.length > 0 ? intelligence.slowMoving.map((item) => (
                                                <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
                                                    <div>
                                                        <p className="font-semibold text-slate-700 dark:text-slate-200">{item.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">SKU: {item.sku}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold text-orange-600 dark:text-orange-400">{item.daysInactive} Hari</div>
                                                        <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tidak Aktif</div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="text-center py-10">
                                                    <div className="inline-flex p-4 rounded-full bg-green-50 dark:bg-green-900/20 text-green-500 dark:text-green-400 mb-3">
                                                        <TrendingUp size={24} />
                                                    </div>
                                                    <p className="text-slate-600 dark:text-slate-300 font-medium">Arus Inventaris Sehat</p>
                                                    <p className="text-slate-400 dark:text-slate-500 text-sm">Tidak ada barang slow moving terdeteksi.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    <th className="px-6 py-4">Produk</th>
                                                    <th className="px-6 py-4">SKU</th>
                                                    <th className="px-6 py-4">Harga</th>
                                                    <th className="px-6 py-4 text-center">Stok</th>
                                                    <th className="px-6 py-4 text-right">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {filteredProducts.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="p-12 text-center text-slate-500 dark:text-slate-400">
                                                            <div className="flex flex-col items-center gap-3">
                                                                <Package size={48} className="text-slate-200 dark:text-slate-700" />
                                                                <p>Tidak ditemukan produk yang cocok dengan "{searchTerm}"</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : currentProducts.map((product) => (
                                                    <tr key={product.id} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden">
                                                                    {product.image ? (
                                                                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                                            <Package size={20} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-slate-900 dark:text-white">{product.name}</div>
                                                                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{product.category?.name || 'Tanpa Kategori'}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm font-mono">{product.sku || '-'}</td>
                                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">
                                                            {formatCurrency(product.sellingPrice || product.price || 0)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span
                                                                title={`Stok saat ini: ${product.stock ?? 0}`}
                                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                                                    product.stock === 0
                                                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                                                        : (product.stock || 0) <= (product.minStock || 0)
                                                                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                                                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                                                }`}
                                                            >
                                                                <span>{product.stock ?? 0}</span>
                                                                <span className="text-[10px] uppercase tracking-wide">
                                                                    {product.stock === 0
                                                                        ? 'Habis'
                                                                        : (product.stock || 0) <= (product.minStock || 0)
                                                                            ? 'Menipis'
                                                                            : 'Aman'}
                                                                </span>
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleOpenEditProduct(product); }}
                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                                    title="Edit Produk"
                                                                >
                                                                    <Edit size={16} />
                                                                    <span className="hidden sm:inline">Edit</span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleOpenAdjust(product); }}
                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                                                    title="Sesuaikan Stok"
                                                                >
                                                                    <Filter size={16} />
                                                                    <span className="hidden sm:inline">Stok</span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleViewLogs(product); }}
                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                                    title="Riwayat Stok"
                                                                >
                                                                    <History size={16} />
                                                                    <span className="hidden sm:inline">Riwayat</span>
                                                                </button>
                                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}
                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                    title="Hapus Produk"
                                                                >
                                                                    <Trash2 size={16} />
                                                                    <span className="hidden sm:inline">Hapus</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Pagination Controls */}
                                    {filteredProducts.length > productsPerPage && (
                                        <div className="flex justify-center p-4 border-t border-slate-100 dark:border-slate-800">
                                            <nav className="inline-flex rounded-md shadow-sm">
                                                <button
                                                    onClick={() => paginate(currentPage - 1)}
                                                    disabled={currentPage === 1}
                                                    className="px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-l-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <ChevronLeft size={16} />
                                                </button>
                                                {Array.from({ length: Math.ceil(filteredProducts.length / productsPerPage) }).map((_, index) => (
                                                    <button
                                                        key={index + 1}
                                                        onClick={() => paginate(index + 1)}
                                                        className={`px-3 py-2 text-sm font-medium border-t border-b border-r border-slate-200 dark:border-slate-700 ${
                                                            currentPage === index + 1
                                                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 z-10'
                                                                : 'text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                        } transition-colors`}
                                                    >
                                                        {index + 1}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => paginate(currentPage + 1)}
                                                    disabled={currentPage === Math.ceil(filteredProducts.length / productsPerPage)}
                                                    className="px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-r-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </nav>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Adjust Modal */}
                {showAdjustModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800"
                        >
                            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Sesuaikan Stok: <span className="text-indigo-600 dark:text-indigo-400">{selectedProduct?.name}</span></h3>
                            <form onSubmit={submitAdjustment} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Jenis Penyesuaian</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setAdjustType('IN')}
                                            className={`py-3 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${adjustType === 'IN'
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 dark:border-emerald-500 text-emerald-700 dark:text-emerald-400'
                                                : 'border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-emerald-200 dark:hover:border-emerald-800 hover:text-emerald-600 dark:hover:text-emerald-400'
                                                }`}
                                        >
                                            <Plus size={16} />
                                            Masuk
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAdjustType('OUT')}
                                            className={`py-3 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${adjustType === 'OUT'
                                                ? 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-500 text-red-700 dark:text-red-400'
                                                : 'border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-red-200 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400'
                                                }`}
                                        >
                                            <Minus size={16} />
                                            Keluar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAdjustType('OPNAME')}
                                            className={`py-3 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${adjustType === 'OPNAME'
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-500 text-blue-700 dark:text-blue-400'
                                                : 'border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-600 dark:hover:text-blue-400'
                                                }`}
                                        >
                                            <Filter size={16} />
                                            Opname
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                                        {adjustType === 'OPNAME' ? 'Stok Akhir (Fisik)' : 'Jumlah'}
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={adjustQty}
                                        onChange={e => setAdjustQty(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Alasan</label>
                                    <input
                                        type="text"
                                        placeholder="contoh: Rusak, Kadaluarsa, Stock Opname"
                                        required
                                        value={adjustReason}
                                        onChange={e => setAdjustReason(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowAdjustModal(false)}
                                        className="px-5 py-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                                    >
                                        Simpan
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Product Form Modal (Add/Edit) */}
                {showProductModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 overflow-y-auto max-h-[90vh]"
                        >
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{isEditing ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
                                <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>
                            
                            <form onSubmit={submitProductForm} className="space-y-6">
                                {/* Image Upload */}
                                <div className="flex justify-center mb-6">
                                    <div className="relative w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800 hover:border-indigo-500 transition-colors cursor-pointer group">
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        />
                                        {(productForm.imageBase64 || (isEditing && selectedProduct?.image)) ? (
                                            <div className="relative w-full h-full">
                                                <img 
                                                    src={productForm.imageBase64 || selectedProduct.image} 
                                                    alt="Product" 
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ImageIcon className="text-white" size={20} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                                                <Upload size={24} />
                                                <span className="text-xs mt-1 font-medium">Upload Foto</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Nama Produk</label>
                                        <input
                                            type="text"
                                            required
                                            value={productForm.name}
                                            onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="contoh: Biji Kopi Premium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">SKU</label>
                                        <input
                                            type="text"
                                            required
                                            value={productForm.sku}
                                            onChange={e => setProductForm({ ...productForm, sku: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono"
                                            placeholder="contoh: COF-001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Kategori</label>
                                        <input
                                            type="text"
                                            list="category-list"
                                            value={productForm.category}
                                            onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="Pilih atau ketik kategori baru..."
                                        />
                                        <datalist id="category-list">
                                            {categories.map((cat, idx) => (
                                                <option key={idx} value={cat} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Harga Modal (HPP)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">Rp</span>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                value={productForm.basePrice}
                                                onChange={e => setProductForm({ ...productForm, basePrice: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Harga Jual</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">Rp</span>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                value={productForm.sellingPrice}
                                                onChange={e => setProductForm({ ...productForm, sellingPrice: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Stok Awal</label>
                                        <input
                                            type="number"
                                            min="0"
                                            disabled={isEditing}
                                            value={productForm.stock}
                                            onChange={e => setProductForm({ ...productForm, stock: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800"
                                        />
                                        {isEditing && <p className="text-xs text-slate-400 mt-1">Gunakan "Sesuaikan Stok" untuk mengubah jumlah</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Peringatan Stok Menipis</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={productForm.minStock}
                                            onChange={e => setProductForm({ ...productForm, minStock: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Deskripsi</label>
                                        <textarea
                                            rows="3"
                                            value={productForm.description}
                                            onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="Detail produk..."
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowProductModal(false)}
                                        className="px-5 py-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                                    >
                                        {isEditing ? 'Simpan Perubahan' : 'Buat Produk'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )} 

                {/* Logs Modal */}
                {showLogsModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[80vh] flex flex-col"
                        >
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Riwayat Stok</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{selectedProduct?.name}</p>
                                </div>
                                <button onClick={() => setShowLogsModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                                        <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            <th className="px-4 py-3">Tanggal</th>
                                            <th className="px-4 py-3">Tipe</th>
                                            <th className="px-4 py-3">Jumlah</th>
                                            <th className="px-4 py-3">Alasan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {logs.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="p-8 text-center text-slate-500 dark:text-slate-400">
                                                    Belum ada riwayat stok
                                                </td>
                                            </tr>
                                        ) : logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                                    {new Date(log.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                                        log.type === 'IN' 
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}>
                                                        {log.type === 'IN' ? 'MASUK' : 'KELUAR'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-sm text-slate-700 dark:text-slate-200">
                                                    {log.type === 'IN' ? '+' : '-'}{Math.abs(log.quantity)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                                                    {log.reason || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                )}


            </div>
        </DashboardLayout>
    );
};

export default Inventory;
