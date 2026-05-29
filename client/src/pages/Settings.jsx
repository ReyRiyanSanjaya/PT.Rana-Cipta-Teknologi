import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { User, Store, Globe, Shield, Save, Loader, Edit2, Mail, Phone, MapPin, Calendar, CreditCard, Zap, CheckCircle, AlertCircle, Camera, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import { motion } from 'framer-motion';

const Settings = () => {
    const { user, refreshUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    // Password state
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    // Photo state
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        setIsEditing(false);
        setEditForm({});
    }, [activeTab]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/auth/me');
            setProfile(res.data.data);
        } catch (error) {
            console.error("Failed to load profile", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        if (activeTab === 'profile') {
            setEditForm({ name: profile?.name || '' });
        } else if (activeTab === 'store') {
            setEditForm({
                businessName: profile?.tenant?.name || '',
                address: profile?.store?.location || '',
                waNumber: profile?.store?.waNumber || '',
            });
        }
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditForm({});
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (activeTab === 'profile') {
                await api.put('/auth/me', { name: editForm.name });
            } else if (activeTab === 'store') {
                await api.put('/auth/store', editForm);
            }
            await loadData();
            await refreshUser();
            setIsEditing(false);
            showToast('Perubahan berhasil disimpan');
        } catch (error) {
            const msg = error?.response?.data?.message || 'Gagal menyimpan perubahan';
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!passwordForm.currentPassword || !passwordForm.newPassword) {
            showToast('Semua field password wajib diisi', 'error');
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showToast('Password baru tidak cocok', 'error');
            return;
        }
        if (passwordForm.newPassword.length < 8) {
            showToast('Password minimal 8 karakter', 'error');
            return;
        }
        setChangingPassword(true);
        try {
            await api.put('/auth/password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            showToast('Password berhasil diubah');
        } catch (error) {
            const msg = error?.response?.data?.message || 'Gagal mengubah password';
            showToast(msg, 'error');
        } finally {
            setChangingPassword(false);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            showToast('Ukuran foto maksimal 2MB', 'error');
            return;
        }

        if (!file.type.startsWith('image/')) {
            showToast('File harus berupa gambar', 'error');
            return;
        }

        setUploadingPhoto(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    await api.put('/auth/photo', { photoBase64: reader.result });
                    await loadData();
                    await refreshUser();
                    showToast('Foto profil berhasil diperbarui');
                } catch (error) {
                    const msg = error?.response?.data?.message || 'Gagal mengupload foto';
                    showToast(msg, 'error');
                } finally {
                    setUploadingPhoto(false);
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            showToast('Gagal membaca file', 'error');
            setUploadingPhoto(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profil Saya', icon: User, desc: 'Informasi akun' },
        { id: 'store', label: 'Toko & Bisnis', icon: Store, desc: 'Detail usaha' },
        { id: 'security', label: 'Keamanan', icon: Shield, desc: 'Password' },
        { id: 'preferences', label: 'Preferensi', icon: Globe, desc: 'Tampilan & bahasa' },
    ];

    const roleLabelMap = {
        SUPER_ADMIN: 'Super Admin',
        OWNER: 'Pemilik Usaha',
        STORE_MANAGER: 'Manajer Toko',
        ADMIN: 'Administrator',
        CASHIER: 'Kasir'
    };

    const subscriptionStatusMap = {
        ACTIVE: { label: 'Aktif', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
        TRIAL: { label: 'Masa Percobaan', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
        EXPIRED: { label: 'Kedaluwarsa', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' },
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="flex flex-col items-center gap-3">
                        <Loader className="animate-spin text-indigo-600 dark:text-indigo-400" size={32} />
                        <p className="text-sm text-slate-500 dark:text-slate-400">Memuat pengaturan...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const initials = profile?.name
        ?.split(' ')
        .filter(p => p.length > 0)
        .map(p => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'U';

    return (
        <DashboardLayout>
            {/* Toast */}
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border backdrop-blur-md ${
                        toast.type === 'success'
                            ? 'bg-emerald-50/90 dark:bg-emerald-900/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                            : 'bg-rose-50/90 dark:bg-rose-900/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                    }`}
                >
                    {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span className="text-sm font-medium">{toast.message}</span>
                </motion.div>
            )}

            <div className="max-w-5xl mx-auto space-y-8">
                {/* Page Header */}
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Pengaturan</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola informasi akun, toko, dan preferensi aplikasi Anda</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar */}
                    <div className="w-full lg:w-72 shrink-0">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 sticky top-24">
                            {/* User Card */}
                            <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10 border border-indigo-100 dark:border-indigo-500/20">
                                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/20">
                                    {initials}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{profile?.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{roleLabelMap[profile?.role] || profile?.role}</p>
                                </div>
                            </div>

                            {/* Nav */}
                            <nav className="space-y-1">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                                            activeTab === tab.id
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/30 font-semibold'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
                                        }`}
                                    >
                                        <tab.icon size={18} />
                                        <div className="text-left">
                                            <span className="block">{tab.label}</span>
                                            {activeTab !== tab.id && (
                                                <span className="block text-[11px] opacity-60">{tab.desc}</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
                        >
                            {/* Profile Tab */}
                            {activeTab === 'profile' && (
                                <div>
                                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Profil Pengguna</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Informasi pribadi dan akun Anda</p>
                                        </div>
                                        {!isEditing && (
                                            <button onClick={handleEdit} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors">
                                                <Edit2 size={16} />
                                                Edit
                                            </button>
                                        )}
                                    </div>

                                    <div className="p-6 space-y-6">
                                        {/* Avatar Section */}
                                        <div className="flex items-center gap-5">
                                            <div className="relative group">
                                                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-2xl font-bold shadow-xl shadow-indigo-500/20 ring-4 ring-white dark:ring-slate-900 overflow-hidden">
                                                    {profile?.avatarUrl ? (
                                                        <img src={profile.avatarUrl.startsWith('http') ? profile.avatarUrl : `${api.defaults.baseURL?.replace('/api', '')}${profile.avatarUrl}`} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        initials
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={uploadingPhoto}
                                                    className="absolute -bottom-1 -right-1 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                                >
                                                    {uploadingPhoto ? <Loader size={14} className="animate-spin" /> : <Camera size={14} />}
                                                </button>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handlePhotoUpload}
                                                    className="hidden"
                                                />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold text-slate-900 dark:text-white">{profile?.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                                                        {roleLabelMap[profile?.role] || profile?.role}
                                                    </span>
                                                    {profile?.tenant?.name && (
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">• {profile.tenant.name}</span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-2 hover:underline"
                                                >
                                                    {uploadingPhoto ? 'Mengupload...' : 'Ubah Foto'}
                                                </button>
                                            </div>
                                        </div>

                                        {isEditing ? (
                                            <div className="space-y-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nama Lengkap</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.name}
                                                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email</label>
                                                    <input
                                                        type="email"
                                                        value={profile?.email || ''}
                                                        disabled
                                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-500 cursor-not-allowed"
                                                    />
                                                    <p className="text-xs text-slate-400 mt-1.5">Email tidak dapat diubah</p>
                                                </div>
                                                <div className="flex justify-end gap-3 pt-4">
                                                    <button onClick={handleCancel} className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                                        Batal
                                                    </button>
                                                    <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-70 flex items-center gap-2">
                                                        {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                                                        Simpan
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-0 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <InfoRow icon={Mail} label="Email" value={profile?.email} />
                                                <InfoRow icon={User} label="ID Pengguna" value={profile?.id?.slice(0, 8) + '...'} mono />
                                                <InfoRow icon={Calendar} label="Bergabung Sejak" value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Store Tab */}
                            {activeTab === 'store' && (
                                <div>
                                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Informasi Toko</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Detail bisnis, lokasi, dan langganan</p>
                                        </div>
                                        {!isEditing && (
                                            <button onClick={handleEdit} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors">
                                                <Edit2 size={16} />
                                                Edit
                                            </button>
                                        )}
                                    </div>

                                    <div className="p-6 space-y-6">
                                        {isEditing ? (
                                            <div className="space-y-5">
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nama Bisnis</label>
                                                    <input type="text" value={editForm.businessName} onChange={(e) => setEditForm({...editForm, businessName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Alamat</label>
                                                    <input type="text" value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nomor WhatsApp</label>
                                                    <input type="tel" value={editForm.waNumber} onChange={(e) => setEditForm({...editForm, waNumber: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="08xxxxxxxxxx" />
                                                </div>
                                                <div className="flex justify-end gap-3 pt-4">
                                                    <button onClick={handleCancel} className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                                        Batal
                                                    </button>
                                                    <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-70 flex items-center gap-2">
                                                        {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                                                        Simpan
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-0">
                                                    <InfoRow icon={Store} label="Nama Bisnis" value={profile?.tenant?.name} />
                                                    <InfoRow icon={MapPin} label="Alamat" value={profile?.store?.location} />
                                                    <InfoRow icon={Phone} label="WhatsApp" value={profile?.store?.waNumber} />
                                                </div>

                                                {/* Subscription Card */}
                                                <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-slate-50 to-indigo-50/50 dark:from-slate-800/50 dark:to-indigo-900/10 border border-slate-200 dark:border-slate-700">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                                                            <Zap size={18} />
                                                        </div>
                                                        <h4 className="font-bold text-slate-900 dark:text-white">Langganan</h4>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                        <div>
                                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Paket</p>
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{profile?.tenant?.plan || 'Free'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status</p>
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${subscriptionStatusMap[profile?.tenant?.subscriptionStatus]?.color || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                                {subscriptionStatusMap[profile?.tenant?.subscriptionStatus]?.label || profile?.tenant?.subscriptionStatus || '-'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Berlaku Hingga</p>
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                                {profile?.tenant?.subscriptionEndsAt
                                                                    ? new Date(profile.tenant.subscriptionEndsAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                                                    : profile?.tenant?.trialEndsAt
                                                                    ? new Date(profile.tenant.trialEndsAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                                                    : '-'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Security Tab */}
                            {activeTab === 'security' && (
                                <div>
                                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Keamanan Akun</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Ubah password untuk menjaga keamanan akun Anda</p>
                                    </div>

                                    <div className="p-6 space-y-6">
                                        <div className="space-y-5">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Password Saat Ini</label>
                                                <div className="relative">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                        <Lock size={16} />
                                                    </div>
                                                    <input
                                                        type={showCurrentPass ? 'text' : 'password'}
                                                        value={passwordForm.currentPassword}
                                                        onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                                                        className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                                        placeholder="Masukkan password lama"
                                                    />
                                                    <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                                        {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Password Baru</label>
                                                <div className="relative">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                        <Lock size={16} />
                                                    </div>
                                                    <input
                                                        type={showNewPass ? 'text' : 'password'}
                                                        value={passwordForm.newPassword}
                                                        onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                                                        className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                                        placeholder="Minimal 8 karakter, huruf besar, kecil, angka"
                                                    />
                                                    <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Konfirmasi Password Baru</label>
                                                <div className="relative">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                        <Lock size={16} />
                                                    </div>
                                                    <input
                                                        type="password"
                                                        value={passwordForm.confirmPassword}
                                                        onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                                        placeholder="Ulangi password baru"
                                                    />
                                                </div>
                                                {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                                                    <p className="text-xs text-rose-500 mt-1.5">Password tidak cocok</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <button
                                                onClick={handleChangePassword}
                                                disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                                                className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                {changingPassword ? <Loader size={16} className="animate-spin" /> : <Shield size={16} />}
                                                Ubah Password
                                            </button>
                                        </div>

                                        {/* Password Requirements */}
                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Persyaratan Password:</p>
                                            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                                <li className="flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${passwordForm.newPassword.length >= 8 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                                    Minimal 8 karakter
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(passwordForm.newPassword) ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                                    Mengandung huruf besar (A-Z)
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(passwordForm.newPassword) ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                                    Mengandung huruf kecil (a-z)
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(passwordForm.newPassword) ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                                    Mengandung angka (0-9)
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Preferences Tab */}
                            {activeTab === 'preferences' && (
                                <div>
                                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Preferensi Aplikasi</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Sesuaikan tampilan dan perilaku aplikasi</p>
                                    </div>

                                    <div className="p-6 space-y-0">
                                        <div className="flex items-center justify-between py-5 border-b border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                    <Globe size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white text-sm">Tema Tampilan</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Mode gelap atau terang</p>
                                                </div>
                                            </div>
                                            <ThemeToggle />
                                        </div>

                                        <div className="flex items-center justify-between py-5 border-b border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                    <Globe size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white text-sm">Bahasa</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Bahasa antarmuka aplikasi</p>
                                                </div>
                                            </div>
                                            <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300">
                                                Indonesia
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                    <CreditCard size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white text-sm">Mata Uang</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Format mata uang default</p>
                                                </div>
                                            </div>
                                            <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300">
                                                IDR (Rp)
                                            </span>
                                        </div>

                                        {/* Security Info */}
                                        <div className="mt-6 p-5 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                                            <div className="flex gap-3">
                                                <Shield className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
                                                <div>
                                                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">Keamanan Akun</h5>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                                        Untuk mengubah kata sandi atau pengaturan keamanan lainnya, silakan hubungi administrator atau gunakan fitur "Lupa Kata Sandi" di halaman login.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

const InfoRow = ({ icon: Icon, label, value, mono }) => (
    <div className="flex items-center justify-between py-4 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
        <div className="flex items-center gap-3">
            {Icon && <Icon size={16} className="text-slate-400 dark:text-slate-500" />}
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
        </div>
        <span className={`text-sm font-semibold text-slate-900 dark:text-slate-200 ${mono ? 'font-mono text-xs' : ''}`}>
            {value || '-'}
        </span>
    </div>
);

export default Settings;
