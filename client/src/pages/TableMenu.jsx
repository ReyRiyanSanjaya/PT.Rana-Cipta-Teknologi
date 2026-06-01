import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const TableMenu = () => {
    const { qrCode } = useParams();
    const [tableData, setTableData] = useState(null);
    const [menu, setMenu] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cart, setCart] = useState({});
    const [ordering, setOrdering] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [activeCategory, setActiveCategory] = useState('Semua');
    const [paymentInfo, setPaymentInfo] = useState(null);
    const [showPayment, setShowPayment] = useState(false);

    useEffect(() => {
        loadTable();
        loadPaymentInfo();
    }, [qrCode]);

    const loadTable = async () => {
        try {
            const res = await api.get(`/table/qr/${qrCode}`);
            if (res.data.status === 'success') {
                setTableData(res.data.data);
                setMenu(res.data.data.menu || []);
            } else {
                setError(res.data.message || 'Meja tidak ditemukan');
            }
        } catch (e) {
            setError('Gagal memuat menu. Pastikan QR code valid.');
        } finally {
            setLoading(false);
        }
    };

    const loadPaymentInfo = async () => {
        try {
            const res = await api.get('/market/config/payment');
            if (res.data.status === 'success') setPaymentInfo(res.data.data);
        } catch (_) {}
    };

    const categories = useMemo(() => {
        const cats = new Set(['Semua']);
        menu.forEach(item => {
            const cat = item.category?.name || 'Menu';
            cats.add(cat);
        });
        return Array.from(cats);
    }, [menu]);

    const filteredMenu = useMemo(() => {
        if (activeCategory === 'Semua') return menu;
        return menu.filter(item => (item.category?.name || 'Menu') === activeCategory);
    }, [menu, activeCategory]);

    const addToCart = (product) => {
        setCart(prev => ({
            ...prev,
            [product.id]: {
                product,
                quantity: (prev[product.id]?.quantity || 0) + 1,
            }
        }));
    };

    const removeFromCart = (productId) => {
        setCart(prev => {
            const current = prev[productId];
            if (!current || current.quantity <= 1) {
                const { [productId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [productId]: { ...current, quantity: current.quantity - 1 } };
        });
    };

    const totalItems = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = Object.values(cart).reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);

    const submitOrder = async () => {
        if (totalItems === 0) return;
        setOrdering(true);
        try {
            const items = Object.values(cart).map(item => ({
                productId: item.product.id,
                productName: item.product.name,
                quantity: item.quantity,
                price: item.product.sellingPrice,
            }));

            const res = await api.post(`/table/qr/${qrCode}/order`, { items, guestName: guestName || undefined });
            if (res.data.status === 'success') {
                setCart({});
                setOrderSuccess(true);
            } else {
                alert(res.data.message || 'Gagal memesan');
            }
        } catch (e) {
            alert('Gagal mengirim pesanan');
        } finally {
            setOrdering(false);
        }
    };

    const requestBill = async () => {
        try {
            await api.post(`/table/qr/${qrCode}/bill`);
            alert('Bill diminta. Pelayan akan segera datang.');
        } catch (e) {
            alert('Gagal meminta bill');
        }
    };

    const payWithQRIS = async () => {
        try {
            await api.post(`/table/qr/${qrCode}/pay`, { paymentMethod: 'QRIS' });
            alert('Pembayaran QRIS sedang diverifikasi. Mohon tunggu konfirmasi dari kasir.');
        } catch (e) {
            alert('Gagal memproses pembayaran');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-500">Memuat menu...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white p-6">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Oops!</h2>
                    <p className="text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    if (orderSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-6">
                <div className="text-center max-w-sm">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Pesanan Terkirim! 🎉</h2>
                    <p className="text-gray-500 mb-6">Pesanan Anda sedang disiapkan.<br/>Mohon tunggu di meja Anda.</p>
                    <div className="space-y-3">
                        <button onClick={() => setOrderSuccess(false)} className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition">
                            Pesan Lagi
                        </button>
                        <button onClick={() => setShowPayment(true)} className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition">
                            Bayar Sekarang
                        </button>
                        <button onClick={requestBill} className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition">
                            Bayar di Kasir (Cash)
                        </button>
                    </div>

                    {/* Payment Modal */}
                    {showPayment && paymentInfo && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-xl border space-y-4">
                            <h3 className="font-bold text-gray-800">Pilih Metode Pembayaran</h3>
                            
                            {/* QRIS */}
                            {paymentInfo.qrisUrl && (
                                <div className="bg-white p-4 rounded-lg border text-center">
                                    <p className="text-sm font-semibold text-gray-700 mb-2">Scan QRIS</p>
                                    <img src={paymentInfo.qrisUrl} alt="QRIS" className="mx-auto max-h-48 rounded" />
                                    <button onClick={payWithQRIS} className="mt-3 w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600">
                                        Saya Sudah Bayar via QRIS
                                    </button>
                                </div>
                            )}

                            {/* Bank Transfer */}
                            {paymentInfo.bankName && (
                                <div className="bg-white p-4 rounded-lg border">
                                    <p className="text-sm font-semibold text-gray-700 mb-2">Transfer Bank</p>
                                    <div className="space-y-1 text-sm">
                                        <p><span className="text-gray-500">Bank:</span> <span className="font-medium">{paymentInfo.bankName}</span></p>
                                        <p><span className="text-gray-500">No. Rek:</span> <span className="font-mono font-medium">{paymentInfo.accountNumber}</span></p>
                                        <p><span className="text-gray-500">Atas Nama:</span> <span className="font-medium">{paymentInfo.accountName}</span></p>
                                    </div>
                                    <button onClick={() => { payWithQRIS(); }} className="mt-3 w-full py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600">
                                        Saya Sudah Transfer
                                    </button>
                                </div>
                            )}

                            <button onClick={() => setShowPayment(false)} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700">
                                Tutup
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const store = tableData?.store;
    const table = tableData?.table;

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            {/* Header */}
            <div className="bg-white sticky top-0 z-20 shadow-sm">
                <div className="max-w-lg mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-bold text-gray-800">{store?.name || 'Restoran'}</h1>
                            <p className="text-sm text-gray-500">Meja {table?.number}{table?.name ? ` • ${table.name}` : ''}</p>
                        </div>
                        <button onClick={requestBill} className="px-3 py-1.5 text-sm border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 transition font-medium">
                            Minta Bill
                        </button>
                    </div>

                    {/* Guest name input */}
                    <input
                        type="text"
                        placeholder="Nama Anda (opsional)"
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        className="mt-3 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />

                    {/* Category tabs */}
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap font-medium transition ${
                                    activeCategory === cat
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Menu Grid */}
            <div className="max-w-lg mx-auto px-4 py-4">
                <div className="space-y-3">
                    {filteredMenu.map(product => {
                        const inCart = cart[product.id]?.quantity || 0;
                        const imageUrl = product.imageUrl
                            ? (product.imageUrl.startsWith('http') ? product.imageUrl : `${api.defaults.baseURL?.replace('/api', '')}${product.imageUrl}`)
                            : null;

                        return (
                            <div key={product.id} className={`bg-white rounded-2xl p-3 flex gap-3 transition ${inCart > 0 ? 'ring-2 ring-orange-300' : ''}`}>
                                {/* Image */}
                                <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                                    {imageUrl ? (
                                        <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-800 text-sm truncate">{product.name}</h3>
                                    {product.description && <p className="text-xs text-gray-400 truncate mt-0.5">{product.description}</p>}
                                    <p className="text-orange-600 font-bold mt-1">Rp{product.sellingPrice?.toLocaleString('id-ID')}</p>
                                </div>

                                {/* Quantity */}
                                <div className="flex items-center gap-2">
                                    {inCart > 0 ? (
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => removeFromCart(product.id)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200">−</button>
                                            <span className="font-bold text-sm w-4 text-center">{inCart}</span>
                                            <button onClick={() => addToCart(product)} className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 hover:bg-orange-200">+</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => addToCart(product)} className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white hover:bg-orange-600 transition">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Cart Bar */}
            {totalItems > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl z-30">
                    <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">{totalItems} item</p>
                            <p className="text-lg font-bold text-orange-600">Rp{totalPrice.toLocaleString('id-ID')}</p>
                        </div>
                        <button
                            onClick={submitOrder}
                            disabled={ordering}
                            className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {ordering ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            )}
                            Pesan Sekarang
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TableMenu;
