import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import Modern3DBackground from '../../components/ui/Modern3DBackground';

const Login = () => {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 font-sans text-slate-200 overflow-hidden">
            <Modern3DBackground />
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 bg-slate-900/40 border border-white/10 p-8 md:p-12 rounded-[2rem] max-w-6xl w-full flex flex-col lg:flex-row gap-12 items-start backdrop-blur-xl shadow-2xl"
            >

                {/* Left Side: Hero/Info */}
                <div className="w-full lg:w-1/3 space-y-8 sticky top-8">
                    <div>
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-6 shadow-lg shadow-teal-500/20">D</div>
                        <h1 className="text-4xl font-bold mb-4 text-white">Portal Distributor</h1>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            Masuk untuk mengelola inventaris, pesanan merchant, dan pengiriman.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <CheckCircle className="text-teal-400" size={24} />
                            <span className="text-slate-300 font-medium">Manajemen Stok Real-time</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <CheckCircle className="text-teal-400" size={24} />
                            <span className="text-slate-300 font-medium">Tracking Pengiriman</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <CheckCircle className="text-teal-400" size={24} />
                            <span className="text-slate-300 font-medium">Laporan Penjualan</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="w-full lg:w-2/3">
                    {isForgotPassword ? (
                        <form onSubmit={handleForgotPassword} className="space-y-6">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-white mb-2">Lupa Kata Sandi?</h2>
                                <p className="text-slate-400">Masukkan email Anda untuk menerima instruksi reset password.</p>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 text-red-300 rounded-xl text-sm border border-red-500/30">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="p-4 bg-green-500/10 text-green-300 rounded-xl text-sm border border-green-500/30">
                                    {success}
                                </div>
                            )}

                            <div className="space-y-6">
                                <InputGroup
                                    icon={<Mail size={20} />}
                                    type="email"
                                    placeholder="Alamat Email"
                                    value={email}
                                    onChange={(e: any) => setEmail(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !!success}
                                className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold rounded-2xl shadow-[0_10px_30px_rgba(20,184,166,0.35)] hover:shadow-[0_15px_40px_rgba(6,182,212,0.45)] transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-70"
                            >
                                {loading ? 'Mengirim...' : 'Kirim Link Reset'}
                                {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsForgotPassword(false);
                                    setError(null);
                                    setSuccess(null);
                                }}
                                className="w-full py-4 bg-white/5 text-slate-300 font-bold rounded-2xl hover:bg-white/10 transition-all duration-300"
                            >
                                Kembali ke Login
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-4 bg-red-500/10 text-red-300 rounded-xl text-sm border border-red-500/30">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-6">
                                <InputGroup
                                    icon={<Mail size={20} />}
                                    type="email"
                                    placeholder="Alamat Email"
                                    value={email}
                                    onChange={(e: any) => setEmail(e.target.value)}
                                />

                                <InputGroup
                                    icon={<Lock size={20} />}
                                    type="password"
                                    placeholder="Kata Sandi"
                                    value={password}
                                    onChange={(e: any) => setPassword(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsForgotPassword(true)}
                                    className="text-sm text-teal-400 font-bold hover:underline bg-transparent border-none cursor-pointer"
                                >
                                    Lupa Kata Sandi?
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold rounded-2xl shadow-[0_10px_30px_rgba(20,184,166,0.35)] hover:shadow-[0_15px_40px_rgba(6,182,212,0.45)] transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-70"
                            >
                                {loading ? 'Masuk...' : 'Masuk'}
                                {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setEmail('super@rana.com');
                                    setPassword('password123');
                                }}
                                className="w-full py-3 bg-teal-500/20 text-teal-400 font-bold rounded-2xl border border-teal-500/30 hover:bg-teal-500/30 transition-all duration-300"
                            >
                                Isi Otomatis Akun Demo (Super Admin)
                            </button>

                            <p className="text-center text-slate-400 text-sm">
                                Belum punya akun distributor? <Link to="/register" className="text-teal-400 font-bold hover:underline">Daftar</Link>
                            </p>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

const InputGroup = ({ icon, ...props }: any) => (
    <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
        </div>
        <input
            {...props}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all font-medium hover:bg-white/10"
            required
        />
    </div>
);

export default Login;
