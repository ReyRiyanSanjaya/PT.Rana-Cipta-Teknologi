import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import client from '../api/client';
import { Loader2, Save, Building, FileText, User } from 'lucide-react';

export default function Settings() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    npwp: ''
  });
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await client.get('/distributor/profile');
      const data = res.data.data;
      
      setFormData({
        companyName: data.companyName || '',
        npwp: data.npwp || ''
      });
      
      if (data.user) {
        setUserInfo({
          name: data.user.name,
          email: data.user.email
        });
      }
    } catch (e) {
      console.error("Failed to fetch profile", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await client.put('/distributor/profile', formData);
      // Optional: Show toast notification
      alert('Profile updated successfully');
    } catch (e) {
      console.error("Failed to update profile", e);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
           <p className="text-muted-foreground text-slate-500 dark:text-slate-400">Manage your account and company profile</p>
        </div>
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-teal-600" />
                Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 dark:text-slate-200">User Name</label>
                <Input value={userInfo.name} disabled className="bg-slate-50 dark:bg-slate-900" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 dark:text-slate-200">Email Address</label>
                <Input value={userInfo.email} disabled className="bg-slate-50 dark:bg-slate-900" />
              </div>
            </div>
            <p className="text-xs text-slate-500">To change account details, please contact support.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-teal-600" />
                Company Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 dark:text-slate-200">Company Name</label>
                <Input 
                    value={formData.companyName} 
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    placeholder="Enter company name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 dark:text-slate-200">NPWP</label>
                <Input 
                    value={formData.npwp} 
                    onChange={(e) => setFormData({...formData, npwp: e.target.value})}
                    placeholder="Enter NPWP number"
                />
              </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
                    {saving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">KYC Documents and Legal Papers.</p>
             <Button variant="outline" className="w-full sm:w-auto">Manage Documents</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
