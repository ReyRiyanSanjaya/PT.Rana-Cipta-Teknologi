import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useAuthStore } from '../store/authStore';
import client from '../api/client';
import {
  Loader2,
  Save,
  Building,
  FileText,
  User,
  Lock,
  Warehouse,
  Shield,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  MapPin,
  Phone,
  Mail,
  LogOut
} from 'lucide-react';

interface WarehouseData {
  id: string;
  name: string;
  address: string;
  isPrimary: boolean;
}

interface ProfileData {
  id: string;
  companyName: string;
  npwp: string;
  approvalStatus: string;
  balance: number;
  createdAt: string;
  warehouses: WarehouseData[];
  user: { name: string; email: string };
}

export default function Settings() {
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'warehouse'>('profile');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile state
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    companyName: '',
    npwp: ''
  });

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  // Auto-clear messages
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await client.get('/distributor/profile');
      const data = res.data.data;
      setProfile(data);
      setFormData({
        companyName: data.companyName || '',
        npwp: data.npwp || ''
      });
    } catch (e) {
      console.error("Failed to fetch profile", e);
      setErrorMsg('Gagal memuat profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!formData.companyName.trim()) {
      setErrorMsg('Nama perusahaan tidak boleh kosong');
      return;
    }
    try {
      setSaving(true);
      setErrorMsg(null);
      await client.put('/distributor/profile', formData);
      setSuccessMsg('Profil berhasil diperbarui');
      fetchProfile();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setErrorMsg('Semua field password wajib diisi');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setErrorMsg('Password baru minimal 8 karakter');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok');
      return;
    }

    try {
      setChangingPassword(true);
      await client.put('/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setSuccessMsg('Password berhasil diubah');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Gagal mengubah password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Yakin ingin keluar?')) {
      logout();
      window.location.href = '/login';
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Pengaturan</h1>
          <p className="text-slate-500 dark:text-slate-400">Kelola akun, profil perusahaan, dan keamanan</p>
        </div>
      </div>

      {/* Toast Messages */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300 animate-in fade-in">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 animate-in fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-6">
          {[
            { id: 'profile' as const, label: 'Profil', icon: Building },
            { id: 'security' as const, label: 'Keamanan', icon: Shield },
            { id: 'warehouse' as const, label: 'Gudang', icon: Warehouse },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Profile Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-teal-500/20">
                  {(profile?.companyName || 'D').substring(0, 2).toUpperCase()}
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{profile?.companyName}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{profile?.user?.email}</p>
                <div className="mt-3">
                  <Badge variant={profile?.approvalStatus === 'APPROVED' ? 'success' : profile?.approvalStatus === 'PENDING' ? 'warning' : 'destructive'}>
                    {profile?.approvalStatus === 'APPROVED' ? 'Terverifikasi' : profile?.approvalStatus === 'PENDING' ? 'Menunggu Verifikasi' : 'Ditolak'}
                  </Badge>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 text-left">
                  <div className="flex items-center gap-3 text-sm">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-300">{profile?.user?.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-300 truncate">{profile?.user?.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-300">{profile?.npwp || 'NPWP belum diisi'}</span>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">Saldo Akun</p>
                  <p className="text-xl font-bold text-teal-700 dark:text-teal-300 mt-1">
                    {formatCurrency(profile?.balance || 0)}
                  </p>
                </div>
                <p className="text-xs text-slate-400 mt-4">
                  Bergabung sejak {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right: Edit Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building className="h-5 w-5 text-teal-600" />
                  Profil Perusahaan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nama Perusahaan</label>
                    <Input
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="PT Nama Perusahaan"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">NPWP</label>
                    <Input
                      value={formData.npwp}
                      onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                      placeholder="XX.XXX.XXX.X-XXX.XXX"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveProfile} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
                    {saving ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
                    ) : (
                      <><Save className="mr-2 h-4 w-4" /> Simpan Perubahan</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-5 w-5 text-teal-600" />
                  Informasi Akun
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nama Pengguna</label>
                    <Input value={profile?.user?.name || ''} disabled className="bg-slate-50 dark:bg-slate-900 cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Alamat Email</label>
                    <Input value={profile?.user?.email || ''} disabled className="bg-slate-50 dark:bg-slate-900 cursor-not-allowed" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  Untuk mengubah nama atau email, hubungi tim support.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-5 w-5 text-teal-600" />
                Ubah Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password Saat Ini</label>
                  <div className="relative">
                    <Input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Masukkan password saat ini"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password Baru</label>
                  <div className="relative">
                    <Input
                      type={showNewPass ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Minimal 8 karakter"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordForm.newPassword && passwordForm.newPassword.length < 8 && (
                    <p className="text-xs text-amber-600">Password minimal 8 karakter</p>
                  )}
                  {passwordForm.newPassword && passwordForm.newPassword.length >= 8 && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Password cukup kuat
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Konfirmasi Password Baru</label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Ulangi password baru"
                  />
                  {passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword && (
                    <p className="text-xs text-red-500">Password tidak cocok</p>
                  )}
                  {passwordForm.confirmPassword && passwordForm.confirmPassword === passwordForm.newPassword && passwordForm.newPassword.length >= 8 && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Password cocok
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {changingPassword ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengubah...</>
                    ) : (
                      <><Lock className="mr-2 h-4 w-4" /> Ubah Password</>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-red-100 dark:border-red-900/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
                <LogOut className="h-5 w-5" />
                Sesi & Logout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Keluar dari akun distributor di perangkat ini. Anda perlu login kembali untuk mengakses dashboard.
              </p>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout dari Akun
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Warehouse Tab */}
      {activeTab === 'warehouse' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Warehouse className="h-5 w-5 text-teal-600" />
                Daftar Gudang
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile?.warehouses && profile.warehouses.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {profile.warehouses.map((wh) => (
                    <div
                      key={wh.id}
                      className="relative p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-800 transition-colors bg-white dark:bg-slate-900/50"
                    >
                      {wh.isPrimary && (
                        <div className="absolute top-3 right-3">
                          <Badge variant="success" className="text-[10px]">Utama</Badge>
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                          <Warehouse className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{wh.name}</h4>
                          <div className="flex items-start gap-1.5 mt-2 text-sm text-slate-500 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span>{wh.address}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Warehouse className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">Belum ada gudang terdaftar</p>
                  <p className="text-xs text-slate-400 mt-1">Gudang akan ditambahkan oleh admin setelah verifikasi</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-teal-600" />
                Dokumen KYC
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center">
                <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Dokumen Legal & KYC</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">SIUP, TDP, Akta Perusahaan, dan dokumen lainnya</p>
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Upload Dokumen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
