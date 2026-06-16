import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Eye, EyeOff, Loader2, ShieldCheck, Check } from 'lucide-react';
import ranaLogo from '../assets/rana-logo.png';
import loginBg from '../assets/background.jpg';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/auth/login', { email, password });
            if (res.data.data.user.role !== 'SUPER_ADMIN') {
                setError("Access Denied: Not a Super Admin account");
                setLoading(false);
                return;
            }
            localStorage.setItem('adminToken', res.data.data.token);
            localStorage.setItem('adminUser', JSON.stringify(res.data.data.user));
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-white">
            {/* Left Panel — Login Form (solid, clean) */}
            <div className="w-full lg:w-[46%] xl:w-[42%] flex flex-col min-h-screen overflow-y-auto bg-white relative">
                {/* Soft brand accents */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                    <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-100/60 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -right-10 w-72 h-72 bg-green-100/50 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 flex flex-col flex-1 justify-center w-full max-w-md mx-auto px-6 sm:px-10 py-10">
                    {/* Logo */}
                    <div className="flex justify-center mb-5">
                        <img
                            src={ranaLogo}
                            alt="RANA Logo"
                            className="w-[180px] h-auto object-contain"
                        />
                    </div>

                    {/* Admin badge */}
                    <div className="flex justify-center mb-5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Admin Portal
                        </span>
                    </div>

                    {/* Heading */}
                    <h1 className="text-2xl font-bold text-slate-900 text-center tracking-tight">Selamat Datang Kembali</h1>
                    <p className="text-sm text-slate-500 text-center mt-1.5 mb-7">Masuk ke dashboard admin RANA Anda.</p>

                    {/* Error Alert */}
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 flex items-start mb-4">
                            <span className="font-medium mr-1">Error:</span> {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="Masukkan email Anda"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full h-11 rounded-xl border border-slate-300 px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 bg-white"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full h-11 rounded-xl border border-slate-300 px-4 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 bg-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Remember + Forgot */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
                                />
                                <label htmlFor="remember" className="ml-2 block text-sm text-slate-600">
                                    Ingat saya 30 hari
                                </label>
                            </div>
                            <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
                                Lupa password?
                            </a>
                        </div>

                        {/* Sign In Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-sm shadow-[0_10px_30px_rgba(31,95,191,0.3)] hover:shadow-[0_15px_40px_rgba(31,95,191,0.45)] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                'Masuk'
                            )}
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-slate-200"></div>
                            <span className="text-xs text-slate-400">atau</span>
                            <div className="flex-1 h-px bg-slate-200"></div>
                        </div>

                        {/* Demo Button */}
                        <button
                            type="button"
                            onClick={() => {
                                setEmail('super@rana.com');
                                setPassword('password123');
                            }}
                            className="w-full h-11 rounded-xl bg-white border-2 border-blue-200 text-blue-700 font-medium hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 text-sm"
                        >
                            Gunakan Akun Demo Admin
                        </button>
                    </form>

                    {/* Bottom Text */}
                    <p className="text-center text-sm text-slate-500 mt-6">
                        Butuh bantuan?{' '}
                        <a href="#" className="font-medium text-blue-600 hover:underline">Hubungi Support</a>
                    </p>
                </div>
            </div>

            {/* Right Panel — Brand Panel (visible on desktop) */}
            <div className="hidden lg:flex lg:w-[54%] xl:w-[58%] flex-col min-h-screen relative overflow-hidden">
                {/* Background Image */}
                <img
                    src={loginBg}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Brand gradient overlay for readability + on-brand tint */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628]/90 via-[#0A1628]/40 to-[#0A1628]/20"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628]/30 to-transparent"></div>

                {/* Content — bottom aligned */}
                <div className="relative z-10 flex flex-col justify-end flex-1 px-10 xl:px-16 pb-14">
                    {/* Brand wordmark */}
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl xl:text-4xl font-black tracking-tight">
                            <span className="text-white">RA</span><span className="text-green-400">NA</span>
                        </span>
                        <span className="h-6 w-px bg-white/30"></span>
                        <span className="text-white/70 text-xs xl:text-sm font-medium tracking-wide uppercase">Admin Portal</span>
                    </div>

                    {/* Tagline */}
                    <h3 className="text-2xl xl:text-3xl font-bold text-white leading-snug drop-shadow-md tracking-tight max-w-md">
                        Solusi POS Modern untuk Bisnis Anda
                    </h3>
                    <p className="text-white/80 text-sm xl:text-base mt-3 max-w-md leading-relaxed">
                        Kelola transaksi, inventori, dan laporan keuangan dalam satu platform yang mudah digunakan.
                    </p>

                    {/* Feature list */}
                    <div className="mt-6 space-y-2.5">
                        {['Kasir & Manajemen Transaksi', 'Inventori & Stok Real-time', 'Laporan Keuangan Otomatis', 'Manajemen Keuangan Terpadu'].map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-green-500/25 flex items-center justify-center flex-shrink-0">
                                    <Check className="w-3 h-3 text-green-300" />
                                </div>
                                <span className="text-white/90 text-sm">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
