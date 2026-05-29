import React, { useEffect, useState } from 'react';
import api from '../api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { Layout, Image, Type, Save, Globe, Users, Star, List, Percent, Wallet, RefreshCw, CheckCircle } from 'lucide-react';

const ContentManager = () => {
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState({
        CMS_LOGIN_BANNER: '',
        CMS_WELCOME_TEXT: '',
        CMS_HERO_TITLE: 'Elevate Your Business Beyond Limits',
        CMS_HERO_SUBTITLE: 'Experience the perfect fusion of aesthetic design and powerful technology.',
        CMS_ABOUT_US: '',
        CMS_CONTACT_EMAIL: '',
        CMS_CONTACT_PHONE: '',
        CMS_CORE_VALUES: '[]',
        CMS_FEATURES_LIST: '[]',
        CMS_TESTIMONIALS: '[]',
        CMS_CHATBOT_GREETING: '',
        CMS_CHATBOT_WHAT_IS: '',
        CMS_CHATBOT_PRICING: '',
        CMS_CHATBOT_FEATURES: '',
        CMS_CHATBOT_POS: '',
        CMS_CHATBOT_INVENTORY: '',
        CMS_CHATBOT_REPORTING: '',
        CMS_CHATBOT_CRM: '',
        CMS_CHATBOT_ONLINE_PAYMENT: '',
        CMS_CHATBOT_OFFLINE: '',
        CMS_CHATBOT_MULTI_BRANCH: '',
        CMS_CHATBOT_IMPLEMENTATION: '',
        CMS_CHATBOT_SECURITY: '',
        CMS_CHATBOT_SUPPORT: '',
        CMS_CHATBOT_GREETING_SUGGESTIONS: '[]',
        CMS_CHATBOT_WHAT_IS_SUGGESTIONS: '[]',
        CMS_CHATBOT_PRICING_SUGGESTIONS: '[]',
        CMS_CHATBOT_FEATURES_SUGGESTIONS: '[]',
        CMS_CHATBOT_POS_SUGGESTIONS: '[]',
        CMS_CHATBOT_INVENTORY_SUGGESTIONS: '[]',
        CMS_CHATBOT_REPORTING_SUGGESTIONS: '[]',
        CMS_CHATBOT_CRM_SUGGESTIONS: '[]',
        CMS_CHATBOT_ONLINE_PAYMENT_SUGGESTIONS: '[]',
        CMS_CHATBOT_OFFLINE_SUGGESTIONS: '[]',
        CMS_CHATBOT_MULTI_BRANCH_SUGGESTIONS: '[]',
        CMS_CHATBOT_IMPLEMENTATION_SUGGESTIONS: '[]',
        CMS_CHATBOT_SECURITY_SUGGESTIONS: '[]',
        CMS_CHATBOT_SUPPORT_SUGGESTIONS: '[]',
        CMS_CHATBOT_GREETING_ACTION: '',
        CMS_CHATBOT_WHAT_IS_ACTION: '',
        CMS_CHATBOT_PRICING_ACTION: '',
        CMS_CHATBOT_FEATURES_ACTION: '',
        CMS_CHATBOT_POS_ACTION: '',
        CMS_CHATBOT_INVENTORY_ACTION: '',
        CMS_CHATBOT_REPORTING_ACTION: '',
        CMS_CHATBOT_CRM_ACTION: '',
        CMS_CHATBOT_ONLINE_PAYMENT_ACTION: '',
        CMS_CHATBOT_OFFLINE_ACTION: '',
        CMS_CHATBOT_MULTI_BRANCH_ACTION: '',
        CMS_CHATBOT_IMPLEMENTATION_ACTION: '',
        CMS_CHATBOT_SECURITY_ACTION: '',
        CMS_CHATBOT_SUPPORT_ACTION: '',
        CMS_FOUNDER: 'null',
        CMS_TEAM: '[]',
        CMS_MILESTONES: '[]'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState('');
    const [flashSales, setFlashSales] = useState([]);
    const [preview, setPreview] = useState({
        buyerSubtotal: 0,
        wholesaleSubtotal: 0,
        withdrawalAmount: 0
    });
    const [coreValuesList, setCoreValuesList] = useState([]);
    const [featuresList, setFeaturesList] = useState([]);
    const [testimonialsList, setTestimonialsList] = useState([]);
    const [founderInfo, setFounderInfo] = useState({
        name: '', role: '', image: '', quote: '', description: '', linkedin: '', twitter: ''
    });
    const [teamList, setTeamList] = useState([]);
    const [milestonesList, setMilestonesList] = useState([]);
    const [publicCms, setPublicCms] = useState({});

    useEffect(() => {
        fetchSettings();
        fetchPublic();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/admin/settings');
            const payload = res?.data?.data;
            const settingsMap = Array.isArray(payload)
                ? payload.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {})
                : (typeof payload === 'object' && payload !== null ? payload : {});
            setSettings(prev => ({ ...prev, ...settingsMap }));
            try {
                const cv = settingsMap.CMS_CORE_VALUES ? JSON.parse(settingsMap.CMS_CORE_VALUES) : [];
                setCoreValuesList(Array.isArray(cv) ? cv : []);
            } catch {
                setCoreValuesList([]);
            }
            try {
                const fl = settingsMap.CMS_FEATURES_LIST ? JSON.parse(settingsMap.CMS_FEATURES_LIST) : [];
                setFeaturesList(Array.isArray(fl) ? fl : []);
            } catch {
                setFeaturesList([]);
            }
            try {
                const tl = settingsMap.CMS_TESTIMONIALS ? JSON.parse(settingsMap.CMS_TESTIMONIALS) : [];
                setTestimonialsList(Array.isArray(tl) ? tl : []);
            } catch {
                setTestimonialsList([]);
            }
            try {
                const founder = settingsMap.CMS_FOUNDER ? JSON.parse(settingsMap.CMS_FOUNDER) : null;
                if (founder) setFounderInfo(founder);
            } catch {
                // Keep default
            }
            try {
                const team = settingsMap.CMS_TEAM ? JSON.parse(settingsMap.CMS_TEAM) : [];
                setTeamList(Array.isArray(team) ? team : []);
            } catch {
                setTeamList([]);
            }
            try {
                const ms = settingsMap.CMS_MILESTONES ? JSON.parse(settingsMap.CMS_MILESTONES) : [];
                setMilestonesList(Array.isArray(ms) ? ms : []);
            } catch {
                setMilestonesList([]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    const fetchPublic = async () => {
        try {
            const res = await api.get('/system/cms-content');
            setPublicCms(res.data.data || {});
        } catch {
            setPublicCms({});
        }
    };

    const handleSave = async (key, value) => {
        setSaving(true);
        try {
            await api.post('/admin/settings', { key, value });
            setSaveSuccess(key);
            setTimeout(() => setSaveSuccess(''), 2000);
        } catch (error) {
            alert(error.response?.data?.message || "Failed to save content");
        } finally {
            setSaving(false);
        }
    };

    // Helper for JSON fields
    const handleJsonSave = (key, jsonString) => {
        try {
            JSON.parse(jsonString); // Validate
            handleSave(key, jsonString);
        } catch (e) {
            alert("Invalid JSON format");
        }
    };

    const handleOptionalJsonSave = (key, jsonString, validate) => {
        const raw = typeof jsonString === 'string' ? jsonString : '';
        if (!raw.trim()) {
            handleSave(key, '');
            return;
        }
        try {
            const parsed = JSON.parse(raw);
            if (typeof validate === 'function' && !validate(parsed)) {
                alert("Format JSON tidak sesuai");
                return;
            }
            handleSave(key, raw);
        } catch {
            alert("Invalid JSON format");
        }
    };

    const tabs = [
        { id: 'general', label: 'General & Hero', icon: <Layout size={18} /> },
        { id: 'company', label: 'Company Profile', icon: <Users size={18} /> },
        { id: 'founder_team', label: 'Founder, Team & Story', icon: <Users size={18} /> },
        { id: 'values', label: 'Core Values & Features', icon: <Star size={18} /> },
        { id: 'chatbot', label: 'Chatbot Knowledge', icon: <Type size={18} /> },
        { id: 'fees', label: 'Fee Settings', icon: <Percent size={18} /> },
    ];

    const chatbotFields = [
        { key: 'CMS_CHATBOT_GREETING', label: 'Greeting / Sapaan Awal' },
        { key: 'CMS_CHATBOT_WHAT_IS', label: 'Penjelasan Singkat “Apa itu RanaPOS”' },
        { key: 'CMS_CHATBOT_PRICING', label: 'Informasi Harga dan Paket' },
        { key: 'CMS_CHATBOT_FEATURES', label: 'Ringkasan Fitur Utama' },
        { key: 'CMS_CHATBOT_POS', label: 'Penjelasan Modul POS' },
        { key: 'CMS_CHATBOT_INVENTORY', label: 'Penjelasan Modul Inventory' },
        { key: 'CMS_CHATBOT_REPORTING', label: 'Penjelasan Laporan dan Analitik' },
        { key: 'CMS_CHATBOT_CRM', label: 'Penjelasan Modul CRM dan Membership' },
        { key: 'CMS_CHATBOT_ONLINE_PAYMENT', label: 'Penjelasan Pembayaran Online/QRIS' },
        { key: 'CMS_CHATBOT_OFFLINE', label: 'Kemampuan Offline Mode' },
        { key: 'CMS_CHATBOT_MULTI_BRANCH', label: 'Penjelasan Multi Cabang' },
        { key: 'CMS_CHATBOT_IMPLEMENTATION', label: 'Proses Implementasi dan Onboarding' },
        { key: 'CMS_CHATBOT_SECURITY', label: 'Keamanan Data dan Akses' },
        { key: 'CMS_CHATBOT_SUPPORT', label: 'Kontak dan Dukungan Support' }
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Content Manager</h1>
                    <p className="text-slate-500 mt-1">Manage website content, chatbot knowledge, and platform fee settings.</p>
                </div>
                <div className="flex items-center gap-2">
                    {saveSuccess && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 animate-in fade-in duration-200">
                            <CheckCircle size={14} />
                            Saved!
                        </span>
                    )}
                    <Button variant="outline" icon={RefreshCw} onClick={() => { fetchSettings(); fetchPublic(); }} isLoading={loading}>
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {!loading && (
            <>
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm">
                <div className="flex overflow-x-auto gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                                ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {activeTab === 'general' && (
                    <>
                        <Card className="p-6">
                            <h3 className="text-lg font-bold mb-4">Login Page</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Banner Image URL</label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={settings.CMS_LOGIN_BANNER}
                                            onChange={e => setSettings({ ...settings, CMS_LOGIN_BANNER: e.target.value })}
                                        />
                                        <Button onClick={() => handleSave('CMS_LOGIN_BANNER', settings.CMS_LOGIN_BANNER)}><Save size={16} /></Button>
                                    </div>
                                    {settings.CMS_LOGIN_BANNER && <img src={settings.CMS_LOGIN_BANNER} className="mt-2 h-20 rounded" />}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Welcome Text</label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={settings.CMS_WELCOME_TEXT}
                                            onChange={e => setSettings({ ...settings, CMS_WELCOME_TEXT: e.target.value })}
                                        />
                                        <Button onClick={() => handleSave('CMS_WELCOME_TEXT', settings.CMS_WELCOME_TEXT)}><Save size={16} /></Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-6">
                            <h3 className="text-lg font-bold mb-4">Landing Hero</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Hero Title</label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={settings.CMS_HERO_TITLE}
                                            onChange={e => setSettings({ ...settings, CMS_HERO_TITLE: e.target.value })}
                                        />
                                        <Button onClick={() => handleSave('CMS_HERO_TITLE', settings.CMS_HERO_TITLE)}><Save size={16} /></Button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Hero Subtitle</label>
                                    <div className="flex gap-2">
                                        <textarea
                                            className="w-full border rounded p-2"
                                            value={settings.CMS_HERO_SUBTITLE}
                                            onChange={e => setSettings({ ...settings, CMS_HERO_SUBTITLE: e.target.value })}
                                        />
                                        <Button onClick={() => handleSave('CMS_HERO_SUBTITLE', settings.CMS_HERO_SUBTITLE)}><Save size={16} /></Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </>
                )}

                {activeTab === 'company' && (
                    <Card className="p-6 col-span-2">
                        <h3 className="text-lg font-bold mb-4">Company Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">About Us (HTML/Markdown)</label>
                                <textarea
                                    className="w-full h-40 border rounded p-2 font-mono text-sm"
                                    value={settings.CMS_ABOUT_US}
                                    onChange={e => setSettings({ ...settings, CMS_ABOUT_US: e.target.value })}
                                    placeholder="<p>We are...</p>"
                                />
                                <div className="mt-2">
                                    <Button onClick={() => handleSave('CMS_ABOUT_US', settings.CMS_ABOUT_US)}>Save About Us</Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Contact Email</label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={settings.CMS_CONTACT_EMAIL}
                                            onChange={e => setSettings({ ...settings, CMS_CONTACT_EMAIL: e.target.value })}
                                        />
                                        <Button onClick={() => handleSave('CMS_CONTACT_EMAIL', settings.CMS_CONTACT_EMAIL)}><Save size={16} /></Button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Contact Phone</label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={settings.CMS_CONTACT_PHONE}
                                            onChange={e => setSettings({ ...settings, CMS_CONTACT_PHONE: e.target.value })}
                                        />
                                        <Button onClick={() => handleSave('CMS_CONTACT_PHONE', settings.CMS_CONTACT_PHONE)}><Save size={16} /></Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {activeTab === 'founder_team' && (
                    <Card className="p-6 col-span-2">
                        <h3 className="text-lg font-bold mb-4">Founder & Team</h3>
                        <div className="space-y-8">
                            {/* Founder Section */}
                            <div>
                                <h4 className="font-semibold text-indigo-600 mb-4 uppercase tracking-wider text-sm">Founder Profile</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Name</label>
                                            <Input 
                                                value={founderInfo.name} 
                                                onChange={e => setFounderInfo({...founderInfo, name: e.target.value})} 
                                                placeholder="e.g. Riyan"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Role</label>
                                            <Input 
                                                value={founderInfo.role} 
                                                onChange={e => setFounderInfo({...founderInfo, role: e.target.value})} 
                                                placeholder="e.g. Founder & CEO"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Image URL</label>
                                            <Input 
                                                value={founderInfo.image} 
                                                onChange={e => setFounderInfo({...founderInfo, image: e.target.value})} 
                                                placeholder="https://..."
                                            />
                                            {founderInfo.image && <img src={founderInfo.image} className="mt-2 h-20 w-20 object-cover rounded-lg" alt="Preview" />}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Quote</label>
                                            <textarea 
                                                className="w-full border rounded p-2 text-sm" 
                                                rows={2}
                                                value={founderInfo.quote} 
                                                onChange={e => setFounderInfo({...founderInfo, quote: e.target.value})} 
                                                placeholder="Short inspiring quote..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Description (Paragraphs)</label>
                                            <textarea 
                                                className="w-full border rounded p-2 text-sm" 
                                                rows={4}
                                                value={founderInfo.description} 
                                                onChange={e => setFounderInfo({...founderInfo, description: e.target.value})} 
                                                placeholder="Detailed description..."
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input 
                                                placeholder="LinkedIn URL"
                                                value={founderInfo.linkedin} 
                                                onChange={e => setFounderInfo({...founderInfo, linkedin: e.target.value})} 
                                            />
                                            <Input 
                                                placeholder="Twitter URL"
                                                value={founderInfo.twitter} 
                                                onChange={e => setFounderInfo({...founderInfo, twitter: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <Button onClick={() => handleJsonSave('CMS_FOUNDER', JSON.stringify(founderInfo))}>Save Founder Profile</Button>
                                </div>
                            </div>

                            <hr className="border-slate-200" />

                            {/* Team Section */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-semibold text-indigo-600 uppercase tracking-wider text-sm">Team Members</h4>
                                    <Button size="sm" onClick={() => setTeamList([...teamList, { name: '', role: '', image: '' }])}>Add Member</Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {teamList.map((member, idx) => (
                                        <div key={idx} className="border rounded-lg p-4 flex gap-4 items-start bg-slate-50">
                                            <div className="flex-1 space-y-2">
                                                <Input 
                                                    value={member.name} 
                                                    onChange={e => {
                                                        const arr = [...teamList]; arr[idx] = { ...arr[idx], name: e.target.value }; setTeamList(arr);
                                                    }} 
                                                    placeholder="Name" 
                                                />
                                                <Input 
                                                    value={member.role} 
                                                    onChange={e => {
                                                        const arr = [...teamList]; arr[idx] = { ...arr[idx], role: e.target.value }; setTeamList(arr);
                                                    }} 
                                                    placeholder="Role" 
                                                />
                                                <Input 
                                                    value={member.image} 
                                                    onChange={e => {
                                                        const arr = [...teamList]; arr[idx] = { ...arr[idx], image: e.target.value }; setTeamList(arr);
                                                    }} 
                                                    placeholder="Image URL" 
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2 items-center">
                                                {member.image && <img src={member.image} className="w-16 h-16 rounded object-cover bg-slate-200" />}
                                                <Button variant="destructive" size="sm" onClick={() => setTeamList(teamList.filter((_, i) => i !== idx))}>Remove</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4">
                                    <Button onClick={() => handleJsonSave('CMS_TEAM', JSON.stringify(teamList))}>Save Team List</Button>
                                </div>
                            </div>

                            <hr className="border-slate-200" />

                            {/* Milestones Section */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-semibold text-indigo-600 uppercase tracking-wider text-sm">Milestones / Company Journey</h4>
                                    <Button size="sm" onClick={() => setMilestonesList([...milestonesList, { year: '', title: '', description: '' }])}>Add Milestone</Button>
                                </div>
                                <div className="space-y-4">
                                    {milestonesList.map((ms, idx) => (
                                        <div key={idx} className="border rounded-lg p-4 bg-slate-50">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                                                <div className="md:col-span-1">
                                                    <Input 
                                                        value={ms.year} 
                                                        onChange={e => {
                                                            const arr = [...milestonesList]; arr[idx] = { ...arr[idx], year: e.target.value }; setMilestonesList(arr);
                                                        }} 
                                                        placeholder="Year (e.g. 2023)" 
                                                    />
                                                </div>
                                                <div className="md:col-span-3">
                                                    <Input 
                                                        value={ms.title} 
                                                        onChange={e => {
                                                            const arr = [...milestonesList]; arr[idx] = { ...arr[idx], title: e.target.value }; setMilestonesList(arr);
                                                        }} 
                                                        placeholder="Milestone Title" 
                                                    />
                                                </div>
                                            </div>
                                            <textarea 
                                                className="w-full border rounded p-2 text-sm"
                                                rows={2}
                                                value={ms.description} 
                                                onChange={e => {
                                                    const arr = [...milestonesList]; arr[idx] = { ...arr[idx], description: e.target.value }; setMilestonesList(arr);
                                                }} 
                                                placeholder="Description..." 
                                            />
                                            <div className="flex justify-end mt-2">
                                                <Button variant="destructive" size="sm" onClick={() => setMilestonesList(milestonesList.filter((_, i) => i !== idx))}>Remove</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4">
                                    <Button onClick={() => handleJsonSave('CMS_MILESTONES', JSON.stringify(milestonesList))}>Save Milestones</Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {activeTab === 'values' && (
                    <Card className="p-6 col-span-2">
                        <h3 className="text-lg font-bold mb-4">Core Values, Features & Testimonials</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium">Core Values</label>
                                    <Button size="sm" onClick={() => setCoreValuesList([...coreValuesList, { title: '', desc: '' }])}>Add</Button>
                                </div>
                                <div className="space-y-3">
                                    {coreValuesList.map((item, idx) => (
                                        <div key={idx} className="border rounded p-3 space-y-2">
                                            <Input value={item.title} onChange={e => {
                                                const arr = [...coreValuesList]; arr[idx] = { ...arr[idx], title: e.target.value }; setCoreValuesList(arr);
                                            }} placeholder="Title" />
                                            <Input value={item.desc} onChange={e => {
                                                const arr = [...coreValuesList]; arr[idx] = { ...arr[idx], desc: e.target.value }; setCoreValuesList(arr);
                                            }} placeholder="Description" />
                                            <div className="flex justify-end">
                                                <Button variant="destructive" size="sm" onClick={() => setCoreValuesList(coreValuesList.filter((_, i) => i !== idx))}>Remove</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3">
                                    <Button onClick={() => handleJsonSave('CMS_CORE_VALUES', JSON.stringify(coreValuesList))}>Save Core Values</Button>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium">Features</label>
                                    <Button size="sm" onClick={() => setFeaturesList([...featuresList, { title: '', desc: '' }])}>Add</Button>
                                </div>
                                <div className="space-y-3">
                                    {featuresList.map((item, idx) => (
                                        <div key={idx} className="border rounded p-3 space-y-2">
                                            <Input value={item.title} onChange={e => {
                                                const arr = [...featuresList]; arr[idx] = { ...arr[idx], title: e.target.value }; setFeaturesList(arr);
                                            }} placeholder="Title" />
                                            <Input value={item.desc} onChange={e => {
                                                const arr = [...featuresList]; arr[idx] = { ...arr[idx], desc: e.target.value }; setFeaturesList(arr);
                                            }} placeholder="Description" />
                                            <div className="flex justify-end">
                                                <Button variant="destructive" size="sm" onClick={() => setFeaturesList(featuresList.filter((_, i) => i !== idx))}>Remove</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3">
                                    <Button onClick={() => handleJsonSave('CMS_FEATURES_LIST', JSON.stringify(featuresList))}>Save Features</Button>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium">Testimonials (Landing)</label>
                                    <Button size="sm" onClick={() => setTestimonialsList([...testimonialsList, { name: '', role: '', quote: '' }])}>Add</Button>
                                </div>
                                <div className="space-y-3">
                                    {testimonialsList.map((item, idx) => (
                                        <div key={idx} className="border rounded p-3 space-y-2">
                                            <Input
                                                value={item.name}
                                                onChange={e => {
                                                    const arr = [...testimonialsList];
                                                    arr[idx] = { ...arr[idx], name: e.target.value };
                                                    setTestimonialsList(arr);
                                                }}
                                                placeholder="Nama merchant"
                                            />
                                            <Input
                                                value={item.role}
                                                onChange={e => {
                                                    const arr = [...testimonialsList];
                                                    arr[idx] = { ...arr[idx], role: e.target.value };
                                                    setTestimonialsList(arr);
                                                }}
                                                placeholder="Jenis usaha / peran"
                                            />
                                            <textarea
                                                className="w-full border rounded p-2 text-sm"
                                                rows={3}
                                                value={item.quote}
                                                onChange={e => {
                                                    const arr = [...testimonialsList];
                                                    arr[idx] = { ...arr[idx], quote: e.target.value };
                                                    setTestimonialsList(arr);
                                                }}
                                                placeholder="Isi testimoni"
                                            />
                                            <div className="flex justify-end">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => setTestimonialsList(testimonialsList.filter((_, i) => i !== idx))}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3">
                                    <Button onClick={() => handleJsonSave('CMS_TESTIMONIALS', JSON.stringify(testimonialsList))}>Save Testimonials</Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
                {activeTab === 'chatbot' && (
                    <Card className="p-6 col-span-2">
                        <h3 className="text-lg font-bold mb-2">Chatbot Knowledge Base</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Atur jawaban standar yang akan digunakan Rana AI ketika menjawab pertanyaan calon merchant di website.
                        </p>
                        <div className="grid grid-cols-1 gap-6">
                            {chatbotFields.map(field => (
                                <div key={field.key} className="border rounded-xl p-4 space-y-4 bg-white">
                                    <div className="font-semibold text-slate-900">{field.label}</div>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        <div className="space-y-2 lg:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700">Jawaban (HTML/Text)</label>
                                            <textarea
                                                className="w-full h-32 border rounded p-2 text-sm"
                                                value={settings[field.key] || ''}
                                                onChange={e => setSettings({ ...settings, [field.key]: e.target.value })}
                                            />
                                            <div>
                                                <Button onClick={() => handleSave(field.key, settings[field.key] || '')}>Save Jawaban</Button>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Suggestions (JSON Array)</label>
                                                <textarea
                                                    className="w-full h-20 border rounded p-2 text-sm font-mono"
                                                    value={settings[`${field.key}_SUGGESTIONS`] || ''}
                                                    onChange={e => setSettings({ ...settings, [`${field.key}_SUGGESTIONS`]: e.target.value })}
                                                    placeholder='["Contoh 1","Contoh 2"]'
                                                />
                                                <div>
                                                    <Button
                                                        onClick={() =>
                                                            handleOptionalJsonSave(
                                                                `${field.key}_SUGGESTIONS`,
                                                                settings[`${field.key}_SUGGESTIONS`] || '',
                                                                (v) => Array.isArray(v)
                                                            )
                                                        }
                                                    >
                                                        Save Suggestions
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Action (JSON Object)</label>
                                                <textarea
                                                    className="w-full h-20 border rounded p-2 text-sm font-mono"
                                                    value={settings[`${field.key}_ACTION`] || ''}
                                                    onChange={e => setSettings({ ...settings, [`${field.key}_ACTION`]: e.target.value })}
                                                    placeholder='{"type":"scroll","target":"pricing"}'
                                                />
                                                <div>
                                                    <Button
                                                        onClick={() =>
                                                            handleOptionalJsonSave(
                                                                `${field.key}_ACTION`,
                                                                settings[`${field.key}_ACTION`] || '',
                                                                (v) => v && typeof v === 'object' && typeof v.type === 'string' && typeof v.target === 'string'
                                                            )
                                                        }
                                                    >
                                                        Save Action
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
                {activeTab === 'general' && (
                <Card className="p-6 col-span-2">
                    <h3 className="text-lg font-bold mb-4">Public Preview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="border rounded p-4">
                            <div className="font-semibold mb-2">Hero Title</div>
                            <div className="text-slate-700">{publicCms.CMS_HERO_TITLE || settings.CMS_HERO_TITLE}</div>
                        </div>
                        <div className="border rounded p-4">
                            <div className="font-semibold mb-2">Hero Subtitle</div>
                            <div className="text-slate-700">{publicCms.CMS_HERO_SUBTITLE || settings.CMS_HERO_SUBTITLE}</div>
                        </div>
                        <div className="border rounded p-4">
                            <div className="font-semibold mb-2">Contact</div>
                            <div className="text-slate-700">{(publicCms.CMS_CONTACT_EMAIL || settings.CMS_CONTACT_EMAIL) + ' • ' + (publicCms.CMS_CONTACT_PHONE || settings.CMS_CONTACT_PHONE)}</div>
                        </div>
                    </div>
                </Card>
                )}
                {activeTab === 'fees' && (
                    <Card className="p-6 col-span-2">
                        <h3 className="text-lg font-bold mb-4">Fee Settings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-4">
                                <div className="font-semibold text-slate-900">Buyer Fee</div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Type</label>
                                    <select
                                        className="w-full border rounded p-2"
                                        value={settings.BUYER_SERVICE_FEE_TYPE || 'FLAT'}
                                        onChange={e => setSettings({ ...settings, BUYER_SERVICE_FEE_TYPE: e.target.value })}
                                    >
                                        <option value="FLAT">Flat</option>
                                        <option value="PERCENT">Percent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Value</label>
                                    <Input
                                        value={settings.BUYER_SERVICE_FEE || ''}
                                        onChange={e => setSettings({ ...settings, BUYER_SERVICE_FEE: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Min Cap</label>
                                        <Input
                                            value={settings.BUYER_FEE_CAP_MIN || ''}
                                            onChange={e => setSettings({ ...settings, BUYER_FEE_CAP_MIN: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Max Cap</label>
                                        <Input
                                            value={settings.BUYER_FEE_CAP_MAX || ''}
                                            onChange={e => setSettings({ ...settings, BUYER_FEE_CAP_MAX: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <Button onClick={async () => {
                                    await handleSave('BUYER_SERVICE_FEE_TYPE', settings.BUYER_SERVICE_FEE_TYPE || 'FLAT');
                                    await handleSave('BUYER_SERVICE_FEE', settings.BUYER_SERVICE_FEE || '0');
                                    await handleSave('BUYER_FEE_CAP_MIN', settings.BUYER_FEE_CAP_MIN || '');
                                    await handleSave('BUYER_FEE_CAP_MAX', settings.BUYER_FEE_CAP_MAX || '');
                                }}>Save Buyer Fee</Button>
                            </div>
                            <div className="space-y-4">
                                <div className="font-semibold text-slate-900">Merchant Payout Fee</div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Type</label>
                                    <select
                                        className="w-full border rounded p-2"
                                        value={settings.MERCHANT_SERVICE_FEE_TYPE || 'FLAT'}
                                        onChange={e => setSettings({ ...settings, MERCHANT_SERVICE_FEE_TYPE: e.target.value })}
                                    >
                                        <option value="FLAT">Flat</option>
                                        <option value="PERCENT">Percent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Value</label>
                                    <Input
                                        value={settings.MERCHANT_SERVICE_FEE || ''}
                                        onChange={e => setSettings({ ...settings, MERCHANT_SERVICE_FEE: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Min Cap</label>
                                        <Input
                                            value={settings.MERCHANT_FEE_CAP_MIN || ''}
                                            onChange={e => setSettings({ ...settings, MERCHANT_FEE_CAP_MIN: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Max Cap</label>
                                        <Input
                                            value={settings.MERCHANT_FEE_CAP_MAX || ''}
                                            onChange={e => setSettings({ ...settings, MERCHANT_FEE_CAP_MAX: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <Button onClick={async () => {
                                    await handleSave('MERCHANT_SERVICE_FEE_TYPE', settings.MERCHANT_SERVICE_FEE_TYPE || 'FLAT');
                                    await handleSave('MERCHANT_SERVICE_FEE', settings.MERCHANT_SERVICE_FEE || '0');
                                    await handleSave('MERCHANT_FEE_CAP_MIN', settings.MERCHANT_FEE_CAP_MIN || '');
                                    await handleSave('MERCHANT_FEE_CAP_MAX', settings.MERCHANT_FEE_CAP_MAX || '');
                                }}>Save Merchant Fee</Button>
                            </div>
                            <div className="space-y-4">
                                <div className="font-semibold text-slate-900">Wholesale Service Fee</div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Type</label>
                                    <select
                                        className="w-full border rounded p-2"
                                        value={settings.WHOLESALE_SERVICE_FEE_TYPE || 'FLAT'}
                                        onChange={e => setSettings({ ...settings, WHOLESALE_SERVICE_FEE_TYPE: e.target.value })}
                                    >
                                        <option value="FLAT">Flat</option>
                                        <option value="PERCENT">Percent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Value</label>
                                    <Input
                                        value={settings.WHOLESALE_SERVICE_FEE || ''}
                                        onChange={e => setSettings({ ...settings, WHOLESALE_SERVICE_FEE: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Min Cap</label>
                                        <Input
                                            value={settings.WHOLESALE_FEE_CAP_MIN || ''}
                                            onChange={e => setSettings({ ...settings, WHOLESALE_FEE_CAP_MIN: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Max Cap</label>
                                        <Input
                                            value={settings.WHOLESALE_FEE_CAP_MAX || ''}
                                            onChange={e => setSettings({ ...settings, WHOLESALE_FEE_CAP_MAX: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <Button onClick={async () => {
                                    await handleSave('WHOLESALE_SERVICE_FEE_TYPE', settings.WHOLESALE_SERVICE_FEE_TYPE || 'FLAT');
                                    await handleSave('WHOLESALE_SERVICE_FEE', settings.WHOLESALE_SERVICE_FEE || '0');
                                    await handleSave('WHOLESALE_FEE_CAP_MIN', settings.WHOLESALE_FEE_CAP_MIN || '');
                                    await handleSave('WHOLESALE_FEE_CAP_MAX', settings.WHOLESALE_FEE_CAP_MAX || '');
                                }}>Save Wholesale Fee</Button>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h4 className="text-md font-semibold mb-4 flex items-center gap-2"><Wallet size={18} /> Preview Impact</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Buyer Subtotal</label>
                                        <Input
                                            value={preview.buyerSubtotal}
                                            onChange={e => setPreview({ ...preview, buyerSubtotal: parseFloat(e.target.value || 0) })}
                                        />
                                    </div>
                                    <div className="text-sm text-slate-600">
                                        Buyer Fee: {(() => {
                                            const type = settings.BUYER_SERVICE_FEE_TYPE || 'FLAT';
                                            const val = parseFloat(settings.BUYER_SERVICE_FEE || 0);
                                            let fee = type === 'PERCENT' ? (preview.buyerSubtotal * val) / 100 : val;
                                            const minCap = parseFloat(settings.BUYER_FEE_CAP_MIN || NaN);
                                            const maxCap = parseFloat(settings.BUYER_FEE_CAP_MAX || NaN);
                                            if (!isNaN(minCap) && fee < minCap) fee = minCap;
                                            if (!isNaN(maxCap) && fee > maxCap) fee = maxCap;
                                            return `Rp ${Math.round(fee).toLocaleString()}`;
                                        })()}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Wholesale Subtotal</label>
                                        <Input
                                            value={preview.wholesaleSubtotal}
                                            onChange={e => setPreview({ ...preview, wholesaleSubtotal: parseFloat(e.target.value || 0) })}
                                        />
                                    </div>
                                    <div className="text-sm text-slate-600">
                                        Wholesale Fee: {(() => {
                                            const type = settings.WHOLESALE_SERVICE_FEE_TYPE || 'FLAT';
                                            const val = parseFloat(settings.WHOLESALE_SERVICE_FEE || 0);
                                            let fee = type === 'PERCENT' ? (preview.wholesaleSubtotal * val) / 100 : val;
                                            const minCap = parseFloat(settings.WHOLESALE_FEE_CAP_MIN || NaN);
                                            const maxCap = parseFloat(settings.WHOLESALE_FEE_CAP_MAX || NaN);
                                            if (!isNaN(minCap) && fee < minCap) fee = minCap;
                                            if (!isNaN(maxCap) && fee > maxCap) fee = maxCap;
                                            return `Rp ${Math.round(fee).toLocaleString()}`;
                                        })()}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Withdrawal Amount</label>
                                        <Input
                                            value={preview.withdrawalAmount}
                                            onChange={e => setPreview({ ...preview, withdrawalAmount: parseFloat(e.target.value || 0) })}
                                        />
                                    </div>
                                    <div className="text-sm text-slate-600">
                                        Merchant Fee: {(() => {
                                            const type = settings.MERCHANT_SERVICE_FEE_TYPE;
                                            const val = parseFloat(settings.MERCHANT_SERVICE_FEE || 0);
                                            let fee = 0;
                                            if (type === 'PERCENT') fee = (preview.withdrawalAmount * val) / 100;
                                            else if (type === 'FLAT') fee = val;
                                            else {
                                                const percentFallback = parseFloat(settings.PLATFORM_FEE_PERCENTAGE || 0);
                                                fee = (preview.withdrawalAmount * percentFallback) / 100;
                                            }
                                            const minCap = parseFloat(settings.MERCHANT_FEE_CAP_MIN || NaN);
                                            const maxCap = parseFloat(settings.MERCHANT_FEE_CAP_MAX || NaN);
                                            if (!isNaN(minCap) && fee < minCap) fee = minCap;
                                            if (!isNaN(maxCap) && fee > maxCap) fee = maxCap;
                                            const net = Math.max(0, preview.withdrawalAmount - fee);
                                            return `Rp ${Math.round(fee).toLocaleString()} | Net: Rp ${Math.round(net).toLocaleString()}`;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
            </>
            )}
        </div>
    );
};

export default ContentManager;
