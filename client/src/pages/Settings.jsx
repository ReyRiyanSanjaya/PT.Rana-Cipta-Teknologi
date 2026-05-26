import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { User, Store, Bell, Shield, Smartphone, Globe, Moon, Sun, ChevronRight, Save, Loader, Edit2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchProfile, updateUserProfile, updateStoreProfile } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

const Settings = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile'); // profile, store, preferences
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        setIsEditing(false);
        setEditForm({});
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchProfile();
            setProfile(data);
        } catch (error) {
            console.error("Failed to load profile", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        if (activeTab === 'profile') {
            setEditForm({
                name: profile?.name || '',
            });
        } else if (activeTab === 'store') {
            setEditForm({
                name: profile?.tenant?.name || '',
                address: profile?.store?.location || '',
                phone: profile?.store?.waNumber || '',
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
                await updateUserProfile({ name: editForm.name });
            } else if (activeTab === 'store') {
                await updateStoreProfile({
                    businessName: editForm.name,
                    address: editForm.address,
                    waNumber: editForm.phone
                });
            }
            await loadData();
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save settings", error);
            // Ideally show toast/notification here
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profil Saya', icon: User },
        { id: 'store', label: 'Informasi Toko', icon: Store },
        { id: 'preferences', label: 'Preferensi', icon: Globe },
    ];

    const SectionTitle = ({ title, description, onEdit }) => (
        <div className="mb-6 flex items-start justify-between">
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
            </div>
            {onEdit && !isEditing && (
                <button 
                    onClick={onEdit}
                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <Edit2 size={18} />
                </button>
            )}
        </div>
    );

    const InfoRow = ({ label, value }) => (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 sm:mb-0">{label}</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">{value || '-'}</span>
        </div>
    );

    const FormInput = ({ label, value, onChange, type = "text", disabled = false }) => (
        <div className="flex flex-col gap-1.5 py-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50"
            />
        </div>
    );

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader className="animate-spin text-indigo-600 dark:text-indigo-400" size={32} />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengaturan</h1>
                    <p className="text-slate-500 dark:text-slate-400">Kelola akun dan preferensi aplikasi Anda</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                    {/* Sidebar Tabs */}
                    <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-800 p-4">
                        <div className="space-y-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/20'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <tab.icon size={18} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-6 md:p-8">
                        {activeTab === 'profile' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <SectionTitle 
                                    title="Profil Pengguna" 
                                    description="Informasi pribadi dan akun Anda" 
                                    onEdit={handleEdit}
                                />
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                                        <div className="h-16 w-16 rounded-full bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg">
                                            {profile?.name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">{profile?.name}</h4>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                                                {profile?.role || 'User'}
                                            </span>
                                        </div>
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-4">
                                            <FormInput 
                                                label="Nama Lengkap" 
                                                value={editForm.name} 
                                                onChange={(val) => setEditForm({...editForm, name: val})} 
                                            />
                                            <FormInput 
                                                label="Email" 
                                                value={profile?.email} 
                                                disabled={true}
                                            />
                                            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <button
                                                    onClick={handleCancel}
                                                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                >
                                                    Batal
                                                </button>
                                                <button
                                                    onClick={handleSave}
                                                    disabled={saving}
                                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 dark:shadow-indigo-900/20 transition-all disabled:opacity-70 flex items-center gap-2"
                                                >
                                                    {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                                                    Simpan Perubahan
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <InfoRow label="Email" value={profile?.email} />
                                            <InfoRow label="ID Pengguna" value={profile?.id} />
                                            <InfoRow label="Tanggal Bergabung" value={new Date(profile?.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'store' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <SectionTitle 
                                    title="Informasi Toko" 
                                    description="Detail bisnis dan lokasi Anda"
                                    onEdit={handleEdit}
                                />
                                
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <FormInput 
                                            label="Nama Bisnis" 
                                            value={editForm.name} 
                                            onChange={(val) => setEditForm({...editForm, name: val})} 
                                        />
                                        <FormInput 
                                            label="Alamat" 
                                            value={editForm.address} 
                                            onChange={(val) => setEditForm({...editForm, address: val})} 
                                        />
                                        <FormInput 
                                            label="Nomor Telepon" 
                                            value={editForm.phone} 
                                            onChange={(val) => setEditForm({...editForm, phone: val})} 
                                        />
                                        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <button
                                                onClick={handleCancel}
                                                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 dark:shadow-indigo-900/20 transition-all disabled:opacity-70 flex items-center gap-2"
                                            >
                                                {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                                                Simpan Perubahan
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                         <InfoRow label="Nama Bisnis" value={profile?.tenant?.name} />
                                         <InfoRow label="Alamat" value={profile?.store?.location} />
                                         <InfoRow label="Nomor Telepon" value={profile?.store?.waNumber} />
                                         <InfoRow label="Paket Langganan" value={profile?.tenant?.plan} />
                                         <InfoRow label="Status" value={profile?.tenant?.subscriptionStatus === 'ACTIVE' ? 'Aktif' : profile?.tenant?.subscriptionStatus} />
                                         <InfoRow label="Berlaku Hingga" value={profile?.tenant?.subscriptionEndsAt ? new Date(profile?.tenant?.subscriptionEndsAt).toLocaleDateString('id-ID') : '-'} />
                                     </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'preferences' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <SectionTitle 
                                    title="Preferensi Aplikasi" 
                                    description="Sesuaikan tampilan dan perilaku aplikasi" 
                                />
                                
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800">
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-white">Tema Tampilan</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Sesuaikan mode gelap atau terang</p>
                                        </div>
                                        <ThemeToggle />
                                    </div>

                                    <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800">
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-white">Bahasa</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Bahasa antarmuka aplikasi</p>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300">
                                            <Globe size={16} />
                                            <span>Bahasa Indonesia</span>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <div className="flex gap-3">
                                            <Shield className="text-indigo-600 dark:text-indigo-400 mt-0.5" size={20} />
                                            <div>
                                                <h5 className="font-bold text-slate-900 dark:text-white text-sm">Keamanan Akun</h5>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    Untuk mengubah kata sandi atau pengaturan sensitif lainnya, silakan hubungi administrator atau gunakan menu Lupa Kata Sandi di halaman login.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Settings;
