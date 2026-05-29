import React, { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Building2, Mail, Lock, Phone, MapPin, ArrowRight, CheckCircle, User, Tag, Gift, Upload, Crosshair } from 'lucide-react';
import { motion } from 'framer-motion';
import Modern3DBackground from '../components/ui/Modern3DBackground';


const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        businessName: '',
        ownerName: '',
        email: '',
        password: '',
        confirmPassword: '',
        waNumber: '',
        category: '',
        referralCode: '',
        address: '',
        latitude: -6.200000,
        longitude: 106.816666,
        storeImageBase64: null
    });
    
    const [loading, setLoading] = useState(false);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCategoryChange = (e) => {
        setFormData({ ...formData, category: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, storeImageBase64: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            const confirmLocation = window.confirm("Pastikan Anda berada di lokasi toko saat ini untuk menjamin akurasi titik lokasi. Lanjutkan?");
            if (!confirmLocation) return;

            setLoadingLocation(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setFormData(prev => ({
                        ...prev,
                        latitude,
                        longitude
                    }));
                    setLoadingLocation(false);
                    alert("Lokasi berhasil diambil!");
                },
                (error) => {
                    console.error(error);
                    setError("Gagal mengambil lokasi saat ini. Pastikan GPS aktif dan izin lokasi diberikan.");
                    setLoadingLocation(false);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            setError("Browser tidak mendukung geolocation.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (formData.password !== formData.confirmPassword) {
            setError("Password tidak cocok");
            setLoading(false);
            return;
        }

        if (!formData.latitude || !formData.longitude) {
            setError("Silakan pilih lokasi toko di peta");
            setLoading(false);
            return;
        }

        try {
            // Prepare payload to match mobile app structure
            const payload = {
                businessName: formData.businessName,
                ownerName: formData.ownerName,
                email: formData.email,
                password: formData.password,
                waNumber: formData.waNumber,
                category: formData.category,
                storeImageBase64: formData.storeImageBase64,
                latitude: formData.latitude,
                longitude: formData.longitude,
                address: formData.address,
                referralCode: formData.referralCode || null
            };

            await api.post('/auth/register', payload);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Pendaftaran gagal. Silakan coba lagi.');
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
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-6 shadow-lg shadow-teal-500/20">R</div>
                        <h1 className="text-4xl font-bold mb-4 text-white">Gabung Sekarang</h1>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            Kelola bisnis Anda dengan teknologi modern. Daftar hari ini dan transformasikan operasional Anda.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <CheckCircle className="text-teal-400" size={24} />
                            <span className="text-slate-300 font-medium">Gratis 14 hari</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <CheckCircle className="text-teal-400" size={24} />
                            <span className="text-slate-300 font-medium">Tanpa kartu kredit</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <CheckCircle className="text-teal-400" size={24} />
                            <span className="text-slate-300 font-medium">Setup instan</span>
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
                            <InputGroup icon={<Building2 size={20} />} name="businessName" placeholder="Nama Bisnis" value={formData.businessName} onChange={handleChange} />
                            <InputGroup icon={<User size={20} />} name="ownerName" placeholder="Nama Pemilik" value={formData.ownerName} onChange={handleChange} />
                            
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Tag size={20} />
                                </div>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleCategoryChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all font-medium appearance-none hover:bg-white/10"
                                    required
                                >
                                    <option value="" className="bg-slate-900 text-slate-400">Pilih Kategori</option>
                                    <option value="Outlet Ponsel" className="bg-slate-900 text-white">Outlet Ponsel / Pulsa</option>
                                    <option value="Toko Baju" className="bg-slate-900 text-white">Toko Baju / Fashion</option>
                                    <option value="Kelontong" className="bg-slate-900 text-white">Toko Kelontong / Sembako</option>
                                    <option value="Lainnya" className="bg-slate-900 text-white">Lainnya</option>
                                </select>
                            </div>

                            <InputGroup icon={<Phone size={20} />} name="waNumber" placeholder="Nomor WhatsApp Owner" value={formData.waNumber} onChange={handleChange} />
                            
                            <InputGroup icon={<Mail size={20} />} name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} />
                            <InputGroup icon={<Gift size={20} />} name="referralCode" placeholder="Kode Referral (Opsional)" value={formData.referralCode} onChange={handleChange} required={false} />
                            
                            <InputGroup icon={<Lock size={20} />} name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} />
                            <InputGroup icon={<Lock size={20} />} name="confirmPassword" type="password" placeholder="Ulangi Password" value={formData.confirmPassword} onChange={handleChange} />
                        </div>

                        {/* Store Image Upload */}
                        <div 
                            className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-teal-500/30 transition-colors group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            {formData.storeImageBase64 ? (
                                <img src={formData.storeImageBase64} alt="Preview" className="h-32 object-cover rounded-lg shadow-lg" />
                            ) : (
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 group-hover:bg-teal-500/10 transition-colors">
                                        <Upload className="text-slate-400 group-hover:text-teal-400 transition-colors" size={24} />
                                    </div>
                                    <span className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">Upload Foto Toko (Opsional)</span>
                                </div>
                            )}
                        </div>

                        {/* Location Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <MapPin size={20} className="text-teal-400" />
                                Lokasi Toko
                            </h3>
                            
                            <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4">
                                <div className="text-slate-300 text-sm mb-2">
                                    Klik tombol di bawah ini saat Anda berada di toko untuk mengambil titik lokasi akurat.
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCurrentLocation}
                                    disabled={loadingLocation}
                                    className="w-full py-3 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-teal-500/5"
                                >
                                    <Crosshair size={20} className={loadingLocation ? "animate-spin" : ""} />
                                    {loadingLocation ? 'Sedang Mengambil Lokasi...' : 'Ambil Koordinat Lokasi Saat Ini'}
                                </button>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                        <label className="text-xs text-slate-500 block mb-1">Latitude</label>
                                        <div className="text-white font-mono text-sm">{formData.latitude || '-'}</div>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                        <label className="text-xs text-slate-500 block mb-1">Longitude</label>
                                        <div className="text-white font-mono text-sm">{formData.longitude || '-'}</div>
                                    </div>
                                </div>
                            </div>

                            <InputGroup icon={<MapPin size={20} />} name="address" placeholder="Alamat Lengkap" value={formData.address} onChange={handleChange} />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold rounded-2xl shadow-[0_10px_30px_rgba(20,184,166,0.35)] hover:shadow-[0_15px_40px_rgba(6,182,212,0.45)] transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-70 mt-8"
                        >
                            {loading ? 'Membuat Akun...' : 'Buat Akun'}
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
};

const InputGroup = ({ icon, required = true, ...props }) => (
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

export default Register;
