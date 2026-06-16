import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, X, Send, Sparkles, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import useCms from '../hooks/useCms';
import { useAuth } from '../context/AuthContext';

const intents = [
    {
        id: 'greeting',
        keywords: ['halo', 'hai', 'hi', 'assalamualaikum', 'pagi', 'siang', 'malam'],
        cmsKey: 'CMS_CHATBOT_GREETING',
        fallback: 'Halo! Saya Rana AI. Saya bisa bantu jelaskan fitur, harga, cara implementasi, dan hal lain tentang RanaPOS. Apa yang ingin Anda ketahui lebih dulu?',
        suggestions: ['Apa itu RanaPOS?', 'Berapa harganya?', 'Apa saja fiturnya?']
    },
    {
        id: 'what_is',
        keywords: ['apa itu rana', 'rana pos apa', 'rana itu apa', 'rana pos itu apa'],
        cmsKey: 'CMS_CHATBOT_WHAT_IS',
        fallback: 'RanaPOS adalah sistem kasir dan manajemen toko berbasis cloud untuk UMKM di Indonesia. Semua transaksi, stok, dan laporan keuangan terhubung dalam satu platform yang bisa diakses dari mana saja.',
        suggestions: ['Lihat Fitur Utama', 'Cek Harga', 'Cara Mulai']
    },
    {
        id: 'pricing',
        keywords: ['harga', 'biaya', 'paket', 'bayar', 'langganan', 'subscription'],
        cmsKey: 'CMS_CHATBOT_PRICING',
        fallback: 'RanaPOS menyediakan beberapa paket berlangganan yang bisa disesuaikan dengan skala usaha, dari outlet kecil hingga jaringan multi-cabang. Untuk rincian harga terbaru dan promo, biasanya tim kami akan menjelaskan melalui demo atau konsultasi. Anda bisa isi form di halaman Contact atau hubungi kami via WhatsApp untuk penawaran yang paling pas.',
        action: { type: 'scroll', target: 'pricing' },
        suggestions: ['Hubungi Sales via WA', 'Lihat Paket']
    },
    {
        id: 'features',
        keywords: ['fitur', 'bisa apa', 'kegunaan', 'fungsi'],
        cmsKey: 'CMS_CHATBOT_FEATURES',
        fallback: 'Secara garis besar RanaPOS punya fitur: POS kasir modern, manajemen stok real-time, laporan keuangan otomatis, CRM dan promo, multi-payment (termasuk QRIS dan e-wallet), serta dashboard analitik. Kalau mau, sebut saja jenis bisnis Anda, dan saya bisa jelaskan fitur mana yang paling relevan.',
        action: { type: 'scroll', target: 'features' },
        suggestions: ['Fitur Kasir', 'Fitur Stok', 'Fitur Laporan']
    },
    {
        id: 'pos',
        keywords: ['kasir', 'pos', 'transaksi', 'struk', 'receipt'],
        cmsKey: 'CMS_CHATBOT_POS',
        fallback: 'Modul POS Rana dirancang untuk kasir yang cepat dan mudah dipakai. Mendukung berbagai metode pembayaran, pencetakan struk atau e-receipt, pengelolaan diskon dan promo, hingga pencatatan shift kasir.',
        suggestions: ['Bisa offline?', 'Cara setting struk']
    },
    {
        id: 'inventory',
        keywords: ['stok', 'inventory', 'gudang', 'barang', 'produk'],
        cmsKey: 'CMS_CHATBOT_INVENTORY',
        fallback: 'Modul inventory di RanaPOS memantau stok secara real-time setiap kali ada transaksi. Anda bisa melihat stok per cabang, mendapatkan notifikasi stok menipis, memantau produk terlaris dan slow moving, serta menyiapkan purchase order ke supplier.',
        suggestions: ['Cara opname stok', 'Multi gudang?']
    },
    {
        id: 'reporting',
        keywords: ['laporan', 'report', 'keuangan', 'profit', 'rugi laba', 'p&l'],
        cmsKey: 'CMS_CHATBOT_REPORTING',
        fallback: 'RanaPOS menyusun laporan otomatis seperti laporan penjualan harian, profit & loss, performa cabang, hingga produk terlaris. Laporan bisa dijadikan bahan meeting manajemen dan diekspor bila diperlukan.',
        suggestions: ['Contoh laporan', 'Export Excel?']
    },
    {
        id: 'crm',
        keywords: ['pelanggan', 'customer', 'crm', 'membership', 'loyalty', 'member'],
        cmsKey: 'CMS_CHATBOT_CRM',
        fallback: 'Dengan modul CRM, RanaPOS mencatat data pelanggan, riwayat belanja, dan bisa menjalankan program membership atau loyalty point. Ini membantu Anda menjalankan promo yang lebih tepat sasaran.',
        suggestions: ['Cara setting member', 'Promo ulang tahun']
    },
    {
        id: 'online_payment',
        keywords: ['qris', 'payment', 'pembayaran', 'e-wallet', 'ovo', 'gopay', 'shopeepay', 'kartu'],
        cmsKey: 'CMS_CHATBOT_ONLINE_PAYMENT',
        fallback: 'RanaPOS mendukung berbagai metode pembayaran modern seperti QRIS dan dompet digital, di samping pembayaran tunai maupun kartu. Tujuannya supaya kasir tetap cepat dan pelanggan punya banyak pilihan cara bayar.',
        suggestions: ['Biaya QRIS?', 'Cara daftar QRIS']
    },
    {
        id: 'offline',
        keywords: ['offline', 'tanpa internet', 'internet mati', 'putus koneksi'],
        cmsKey: 'CMS_CHATBOT_OFFLINE',
        fallback: 'RanaPOS bisa tetap dipakai saat internet sedang bermasalah. Transaksi dicatat secara offline dan akan tersinkron otomatis ke server ketika koneksi kembali normal, sehingga data tetap aman dan rapi.',
        suggestions: ['Berapa lama offline?', 'Data aman?']
    },
    {
        id: 'multi_branch',
        keywords: ['cabang', 'multi cabang', 'banyak toko', 'franchise'],
        cmsKey: 'CMS_CHATBOT_MULTI_BRANCH',
        fallback: 'RanaPOS dirancang untuk skala satu hingga banyak cabang. Anda bisa memantau performa tiap cabang, membedakan stok per lokasi, dan melihat laporan gabungan untuk seluruh jaringan toko.',
        suggestions: ['Harga tambah cabang', 'Transfer stok antar cabang']
    },
    {
        id: 'implementation',
        keywords: ['implementasi', 'pasang', 'setup', 'onboarding', 'training', 'pelatihan', 'mulai'],
        cmsKey: 'CMS_CHATBOT_IMPLEMENTATION',
        fallback: 'Biasanya proses implementasi dimulai dari analisis kebutuhan, setup data produk dan harga, lalu pelatihan singkat untuk kasir dan manajemen. Tim Rana bisa membantu migrasi data awal dan mendampingi sampai toko benarbenar siap go-live.',
        suggestions: ['Berapa lama setup?', 'Biaya training']
    },
    {
        id: 'security',
        keywords: ['aman', 'keamanan', 'security', 'privacy', 'data'],
        cmsKey: 'CMS_CHATBOT_SECURITY',
        fallback: 'Keamanan data menjadi fokus utama. Akses diatur dengan role-based access control, ada pemisahan hak akses antara owner, manajer, dan kasir. Data juga tersimpan di infrastruktur cloud yang diawasi dan dibackup secara berkala.',
        suggestions: ['Siapa yang bisa akses?', 'Backup data']
    },
    {
        id: 'support',
        keywords: ['support', 'bantuan', 'cs', 'customer service', 'kontak', 'hubungi'],
        cmsKey: 'CMS_CHATBOT_SUPPORT',
        fallback: 'Jika butuh bantuan teknis atau konsultasi setup, Anda bisa menghubungi tim Rana melalui halaman Contact di website atau email ke support@rana.id. Biasanya tim akan merespons dan menawarkan sesi demo atau konsultasi singkat.',
        action: { type: 'link', target: 'https://wa.me/6281234567890' }, // Dummy WA
        suggestions: ['Chat WhatsApp', 'Email Support']
    }
];

const stripHtml = (value) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const normalizeText = (text) => text.toLowerCase().replace(/\s+/g, ' ').trim();

const getCmsString = (cmsContent, key) => {
    const value = cmsContent?.[key];
    return typeof value === 'string' ? value : '';
};

const normalizeSuggestions = (value) => {
    if (!Array.isArray(value)) return null;
    const cleaned = value
        .filter(item => typeof item === 'string')
        .map(item => item.trim())
        .filter(Boolean);
    return cleaned.length > 0 ? cleaned.slice(0, 8) : [];
};

const getSuggestionsFromCms = (cmsContent, cmsKey, fallbackSuggestions) => {
    if (!cmsKey) return fallbackSuggestions;
    const raw = getCmsString(cmsContent, `${cmsKey}_SUGGESTIONS`).trim();
    if (!raw) return fallbackSuggestions;
    try {
        const parsed = JSON.parse(raw);
        const normalized = normalizeSuggestions(parsed);
        return normalized === null ? fallbackSuggestions : normalized;
    } catch {
        return fallbackSuggestions;
    }
};

const normalizeAction = (value) => {
    if (!value || typeof value !== 'object') return null;
    const type = value.type;
    const target = value.target;
    if (type !== 'scroll' && type !== 'link') return null;
    if (typeof target !== 'string' || !target.trim()) return null;
    if (type === 'scroll') return { type: 'scroll', target: target.trim() };
    const url = target.trim();
    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) return null;
    return { type: 'link', target: url };
};

const getActionFromCms = (cmsContent, cmsKey, fallbackAction) => {
    if (!cmsKey) return fallbackAction;
    const raw = getCmsString(cmsContent, `${cmsKey}_ACTION`).trim();
    if (!raw) return fallbackAction;
    try {
        const parsed = JSON.parse(raw);
        const normalized = normalizeAction(parsed);
        return normalized ?? fallbackAction;
    } catch {
        return fallbackAction;
    }
};

const pickIntent = (text) => {
    const normalized = normalizeText(text);
    for (const intent of intents) {
        if (intent.keywords.some(keyword => normalized.includes(keyword))) {
            return intent;
        }
    }
    return null;
};

const generateResponse = (text, cmsContent) => {
    const intent = pickIntent(text);
    if (intent) {
        const { cmsKey, fallback, suggestions, action } = intent;
        const raw = getCmsString(cmsContent, cmsKey);
        const cleaned = raw ? stripHtml(raw) : '';
        const resolvedSuggestions = getSuggestionsFromCms(cmsContent, cmsKey, suggestions);
        const resolvedAction = getActionFromCms(cmsContent, cmsKey, action);
        return {
            text: cleaned || fallback,
            suggestions: resolvedSuggestions,
            action: resolvedAction
        };
    }
    const normalized = normalizeText(text);
    if (normalized.length <= 4) {
        return {
            text: 'Boleh dijelaskan sedikit lebih detail apa yang ingin Anda tanyakan tentang RanaPOS? Misalnya: “fitur untuk restoran” atau “cara laporan keuangan”.',
            suggestions: ['Fitur Restoran', 'Laporan Keuangan', 'Cara Langganan']
        };
    }
    return {
        text: 'Terima kasih untuk pertanyaannya. Saya bisa bantu jelaskan seputar fitur, harga, implementasi, keamanan data, maupun cara RanaPOS membantu bisnis Anda. Coba tulis lagi dengan menyebut topik yang paling ingin Anda pahami.',
        suggestions: ['Harga Paket', 'Fitur Utama', 'Kontak Sales']
    };
};

const AIAssistant = ({ bottomOffset = 24 }) => {
    const auth = useAuth();
    const user = auth?.user;
    const cms = useCms();
    const cmsContent = cms?.cmsContent || {};
    
    const location = useLocation();
    const pathname = location?.pathname || '';
    const isPOSPage = pathname.startsWith('/pos');
    const isDashboardPage = pathname.startsWith('/dashboard');

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    useEffect(() => {
        const baseGreeting = 'Halo! Saya Rana AI. Saya bisa bantu jelaskan fitur, harga, dan cara pakai RanaPOS. Apa yang ingin Anda tanyakan?';
        const rawGreeting = getCmsString(cmsContent, 'CMS_CHATBOT_GREETING');
        const greeting = rawGreeting && stripHtml(rawGreeting) ? stripHtml(rawGreeting) : baseGreeting;
        const greetingSuggestions = getSuggestionsFromCms(
            cmsContent,
            'CMS_CHATBOT_GREETING',
            ['Apa itu RanaPOS?', 'Harga & Paket', 'Fitur Utama']
        );
        setMessages(prev => {
            if (prev.length > 0) return prev;
            return [{ 
                type: 'bot', 
                text: greeting,
                suggestions: greetingSuggestions
            }];
        });
    }, [cmsContent.CMS_CHATBOT_GREETING, cmsContent.CMS_CHATBOT_GREETING_SUGGESTIONS]);

    const handleSend = async (overrideInput = null) => {
        const userMessage = overrideInput || input;
        if (!userMessage.trim()) return;

        setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
        setInput('');
        setIsTyping(true);

        setTimeout(() => {
            const response = generateResponse(userMessage, cmsContent);
            setMessages(prev => [...prev, { 
                type: 'bot', 
                text: response.text,
                suggestions: response.suggestions,
                action: response.action
            }]);
            setIsTyping(false);

            if (response.action) {
                if (response.action.type === 'scroll') {
                    const el = document.getElementById(response.action.target);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                } else if (response.action.type === 'link') {
                    window.open(response.action.target, '_blank');
                }
            }
        }, 800);
    };

    const containerStyle = useMemo(
        () => ({ bottom: `calc(${Math.max(0, bottomOffset)}px + env(safe-area-inset-bottom, 0px))` }),
        [bottomOffset]
    );

    // Hide on POS or Dashboard
    if (isPOSPage || isDashboardPage) {
        return null;
    }

    // Hide if user is logged in, UNLESS it's the landing page
    if (user && pathname !== '/') {
        return null;
    }

    return (
        <div
            className="fixed right-6 z-[60] flex flex-col items-end pointer-events-none"
            style={containerStyle}
        >
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-[350px] md:w-[400px] max-h-[calc(100vh-7rem)] flex flex-col overflow-hidden mb-4"
                    >
                        {/* Header */}
                        <div className="shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-lg">
                                    <Bot size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">Asisten AI Rana</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                        <span className="text-xs text-blue-100">Online & Siap</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'} gap-2`}
                                >
                                    <div
                                        className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                                            msg.type === 'user'
                                                ? 'bg-blue-600 text-white rounded-br-none'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        {msg.text}
                                    </div>
                                    {msg.type === 'bot' && msg.suggestions && msg.suggestions.length > 0 && (
                                        <div className="flex flex-wrap gap-2 max-w-[90%]">
                                            {msg.suggestions.map((suggestion, sIdx) => (
                                                <button
                                                    key={sIdx}
                                                    onClick={() => handleSend(suggestion)}
                                                    className="text-xs bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 px-3 py-1.5 rounded-full transition-colors text-left"
                                                >
                                                    {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700 flex gap-1">
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="shrink-0 p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                            <form 
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex gap-2"
                            >
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Tanya tentang perkembangan bisnis..."
                                    className="flex-1 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isTyping}
                                    className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="pointer-events-auto group relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full shadow-lg hover:shadow-blue-500/30 transition-all duration-300"
            >
                {/* Glow Effect */}
                <div className="absolute inset-0 rounded-full bg-blue-400 opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-300" />
                
                {isOpen ? (
                    <X className="text-white" size={24} />
                ) : (
                    <Sparkles className="text-white animate-pulse" size={24} />
                )}
            </motion.button>
        </div>
    );
};

export default AIAssistant;
