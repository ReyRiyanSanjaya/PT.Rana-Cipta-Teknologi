import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, User, Mail, Lock, Phone, MapPin, ArrowRight, CheckCircle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import client from '../../api/client';
import Modern3DBackground from '../../components/ui/Modern3DBackground';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: '',
    ownerName: '',
    email: '',
    password: '',
    phone: '',
    npwp: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await client.post('/auth/register-distributor', formData);
      alert('Pendaftaran berhasil! Silakan masuk.');
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registrasi gagal');
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
                    <h1 className="text-4xl font-bold mb-4 text-white">Gabung Mitra Distributor</h1>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        Perluas jangkauan distribusi Anda dan kelola jaringan merchant dengan teknologi terkini.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <CheckCircle className="text-teal-400" size={24} />
                        <span className="text-slate-300 font-medium">Jaringan Merchant Luas</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <CheckCircle className="text-teal-400" size={24} />
                        <span className="text-slate-300 font-medium">Sistem Terintegrasi</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <CheckCircle className="text-teal-400" size={24} />
                        <span className="text-slate-300 font-medium">Dukungan Prioritas</span>
                    </div>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="w-full lg:w-2/3">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-500/10 text-red-300 rounded-xl text-sm border border-red-500/30">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup 
                            icon={<Building2 size={20} />} 
                            name="companyName" 
                            placeholder="Nama Perusahaan" 
                            value={formData.companyName} 
                            onChange={handleChange} 
                        />
                        <InputGroup 
                            icon={<User size={20} />} 
                            name="ownerName" 
                            placeholder="Nama Pemilik" 
                            value={formData.ownerName} 
                            onChange={handleChange} 
                        />
                        
                        <InputGroup 
                            icon={<Mail size={20} />} 
                            name="email" 
                            type="email" 
                            placeholder="Email Perusahaan" 
                            value={formData.email} 
                            onChange={handleChange} 
                        />
                        <InputGroup 
                            icon={<Phone size={20} />} 
                            name="phone" 
                            placeholder="Nomor Telepon" 
                            value={formData.phone} 
                            onChange={handleChange} 
                        />

                        <InputGroup 
                            icon={<Lock size={20} />} 
                            name="password" 
                            type="password" 
                            placeholder="Password" 
                            value={formData.password} 
                            onChange={handleChange} 
                        />
                        <InputGroup 
                            icon={<FileText size={20} />} 
                            name="npwp" 
                            placeholder="NPWP (Opsional)" 
                            value={formData.npwp} 
                            onChange={handleChange} 
                            required={false}
                        />

                        <div className="md:col-span-2">
                             <InputGroup 
                                icon={<MapPin size={20} />} 
                                name="address" 
                                placeholder="Alamat Gudang / Kantor" 
                                value={formData.address} 
                                onChange={handleChange} 
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold rounded-2xl shadow-[0_10px_30px_rgba(20,184,166,0.35)] hover:shadow-[0_15px_40px_rgba(6,182,212,0.45)] transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-70 mt-4"
                    >
                        {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
                        {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                    </button>

                    <p className="text-center text-slate-400 text-sm">
                        Sudah punya akun? <Link to="/login" className="text-teal-400 font-bold hover:underline">Masuk</Link>
                    </p>
                </form>
            </div>
        </motion.div>
    </div>
  );
}

const InputGroup = ({ icon, required = true, ...props }: any) => (
    <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
        </div>
        <input
            {...props}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all font-medium hover:bg-white/10"
            required={required}
        />
    </div>
);
