import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Sun, Moon, Boxes, Truck, LineChart } from 'lucide-react';
import { motion } from 'framer-motion';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';

const Login = () => {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const { theme, toggleTheme } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            await client.post('/auth/forgot-password', { email });
            setSuccess('Jika email terdaftar, instruksi reset password telah dikirim.');
        } catch (err: any) {
            console.error('Forgot password error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Gagal memproses permintaan.';
            if (err.response?.status === 404) {
                setError('Layanan reset password belum tersedia (404 Not Found). Hubungi admin.');
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await client.post('/auth/login', { email, password });
            const { user, token } = res.data.data;

            if (user.role !== 'DISTRIBUTOR' && user.role !== 'SUPER_ADMIN') {
                setError('Access Denied: Not a distributor account');
                setLoading(false);
                return;
            }

            login(user, token);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { icon: Boxes, title: 'Kelola Inventaris', desc: 'Stok wholesale & harga bertingkat dalam satu tempat.' },
        { icon: Truck, title: 'Proses Pengiriman', desc: 'Lacak status kurir dan pesanan merchant real-time.' },
        { icon: LineChart, title: 'Analisa & Tumbuh', desc: 'Insight penjualan untuk keputusan yang lebih cepat.' },
    ];

    return (
        <div className="relative flex min-h-screen w-full bg-white dark:bg-[#070B14] font-sans transition-colors duration-300 overflow-hidden">
            {/* Theme toggle */}
            <button
                onClick={toggleTheme}
                className="fixed top-5 right-5 z-30 p-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 backdrop-blur-md transition-colors shadow-sm"
                title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
                aria-label="Ganti tema"
            >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* LEFT — Brand panel with diagonal edge */}
            <div className="hidden lg:block lg:w-[52%] relative">
                <div
                    className="absolute inset-0 bg-gradient-to-br from-[#0F2347] via-[#1B4D9B] to-[#0A1628]"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 86% 100%, 0% 100%)' }}
                >
                    {/* Dot pattern */}
                    <div
                        className="absolute inset-0 opacity-[0.12]"
                        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
                        aria-hidden="true"
                    />
                    <motion.div
                        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.12, 1] }}
                        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute -top-16 -left-10 w-96 h-96 rounded-full bg-blue-400/20 blur-[120px]"
                    />
                    <motion.div
                        animate={{ opacity: [0.25, 0.5, 0.25], scale: [1, 1.15, 1] }}
                        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute bottom-0 left-1/4 w-[26rem] h-[26rem] rounded-full bg-green-400/15 blur-[130px]"
                    />
                </div>

                {/* Content over the clipped panel */}
                <div className="relative z-10 flex flex-col justify-between h-full pl-12 xl:pl-16 pr-24 py-14">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-black tracking-tight">
                            <span className="text-white">RA</span><span className="text-green-400">NA</span>
                        </span>
                        <span className="h-5 w-px bg-white/30"></span>
                        <span className="text-white/70 text-[11px] font-semibold tracking-widest uppercase">Portal Distributor</span>
                    </div>

                    <div className="max-w-md">
                        <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.15] tracking-tight">
                            Distribusi cerdas, <br /><span className="text-green-400">tanpa ribet</span>
                        </h2>
                        <p className="text-blue-100/80 text-base mt-5 leading-relaxed">
                            Semua yang Anda butuhkan untuk menjalankan bisnis distribusi modern — dalam satu portal.
                        </p>

                        {/* Vertical numbered steps */}
                        <div className="mt-10 space-y-5">
                            {steps.map((s, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.2 + i * 0.12 }}
                                    className="flex items-start gap-4"
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white backdrop-blur-md">
                                            <s.icon size={20} />
                                        </div>
                                    </div>
                                    <div className="pt-0.5">
                                        <div className="text-white font-semibold">{s.title}</div>
                                        <div className="text-blue-100/70 text-sm mt-0.5 leading-relaxed">{s.desc}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div>
                            <div className="text-xl font-bold text-white">10.000+</div>
                            <div className="text-[11px] text-blue-200/70">Merchant</div>
                        </div>
                        <div className="h-8 w-px bg-white/15"></div>
                        <div>
                            <div className="text-xl font-bold text-white">150+</div>
                            <div className="text-[11px] text-blue-200/70">Kota</div>
                        </div>
                        <div className="h-8 w-px bg-white/15"></div>
                        <div>
                            <div className="text-xl font-bold text-white">99.9%</div>
                            <div className="text-[11px] text-blue-200/70">Uptime</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT — Form */}
            <div className="w-full lg:w-[48%] flex items-center justify-center min-h-screen px-5 sm:px-8 py-10 relative">
                {/* Mobile soft accents */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden lg:hidden" aria-hidden="true">
                    <div className="absolute -top-20 -right-16 w-64 h-64 bg-blue-100 dark:bg-blue-600/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 -left-16 w-64 h-64 bg-green-100 dark:bg-green-500/15 rounded-full blur-3xl" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10 w-full max-w-md lg:-ml-8 xl:-ml-12"
                >
                    {/* Logo */}
                    <div className="flex justify-center mb-7">
                        <img src="/rana-logo.png" alt="RANA" className="w-[170px] h-auto object-contain dark:hidden" />
                        <span className="hidden dark:flex items-center gap-2.5 text-3xl font-black tracking-tight">
                            <span className="text-white">RA</span><span className="text-green-400">NA</span>
                        </span>
                    </div>

                    {isForgotPassword ? (
                        <>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center tracking-tight">Lupa Kata Sandi?</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-1.5 mb-7">Masukkan email Anda untuk menerima instruksi reset.</p>

                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                {error && <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300 rounded-xl text-sm border border-red-100 dark:border-red-500/30">{error}</div>}
                                {success && <div className="p-3 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 rounded-xl text-sm border border-green-100 dark:border-green-500/30">{success}</div>}

                                <Field label="Email">
                                    <InputGroup icon={<Mail size={18} />} type="email" placeholder="nama@perusahaan.com" value={email} onChange={(e: any) => setEmail(e.target.value)} />
                                </Field>

                                <button
                                    type="submit"
                                    disabled={loading || !!success}
                                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 text-white font-semibold text-sm rounded-xl shadow-[0_10px_30px_rgba(31,95,191,0.35)] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Mengirim...' : 'Kirim Link Reset'}
                                    {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setIsForgotPassword(false); setError(null); setSuccess(null); }}
                                    className="w-full h-11 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-medium text-sm rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-200"
                                >
                                    Kembali ke Login
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center tracking-tight">Selamat Datang Kembali</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-1.5 mb-7">Masuk untuk mengelola portal distribusi Anda.</p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300 rounded-xl text-sm border border-red-100 dark:border-red-500/30">{error}</div>}

                                <Field label="Email">
                                    <InputGroup icon={<Mail size={18} />} type="email" placeholder="nama@perusahaan.com" value={email} onChange={(e: any) => setEmail(e.target.value)} />
                                </Field>

                                <Field label="Kata Sandi">
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"><Lock size={18} /></div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full h-11 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl pl-11 pr-11 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-500/50 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </Field>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setIsForgotPassword(true)}
                                        className="text-sm text-blue-600 dark:text-blue-300 font-medium hover:text-blue-800 dark:hover:text-blue-200 bg-transparent border-none cursor-pointer transition-colors"
                                    >
                                        Lupa Kata Sandi?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-400 dark:hover:to-blue-500 text-white font-semibold text-sm rounded-xl shadow-[0_10px_30px_rgba(31,95,191,0.35)] hover:shadow-[0_15px_40px_rgba(31,95,191,0.5)] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Masuk...' : 'Masuk ke Dashboard'}
                                    {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                                </button>

                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-px bg-slate-200 dark:bg-white/10"></div>
                                    <span className="text-xs text-slate-400 dark:text-slate-500">atau</span>
                                    <div className="flex-1 h-px bg-slate-200 dark:bg-white/10"></div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => { setEmail('super@rana.com'); setPassword('password123'); }}
                                    className="w-full h-11 bg-white dark:bg-white/5 border-2 border-blue-200 dark:border-blue-400/30 text-blue-700 dark:text-blue-200 font-medium text-sm rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-400 dark:hover:border-blue-400/50 transition-all duration-200"
                                >
                                    Isi Otomatis Akun Demo (Super Admin)
                                </button>

                                <p className="text-center text-slate-500 dark:text-slate-400 text-sm mt-2">
                                    Belum punya akun distributor? <Link to="/register" className="text-blue-600 dark:text-blue-300 font-medium hover:underline">Daftar</Link>
                                </p>
                            </form>
                        </>
                    )}

                    <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-7">© {new Date().getFullYear()} RANA · Ruang Akses Niaga Anda</p>
                </motion.div>
            </div>
        </div>
    );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
        {children}
    </div>
);

const InputGroup = ({ icon, ...props }: any) => (
    <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            {icon}
        </div>
        <input
            {...props}
            className="w-full h-11 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl pl-11 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-500/50 transition-all"
            required
        />
    </div>
);

export default Login;
