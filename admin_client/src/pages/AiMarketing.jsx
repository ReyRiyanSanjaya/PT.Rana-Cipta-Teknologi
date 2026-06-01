import React, { useEffect, useState } from 'react';
import api from '../api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import {
    Sparkles, Zap, Mail, BarChart3, RefreshCw, Play, Eye,
    Target, Palette, Send, Clock, CheckCircle, TrendingUp
} from 'lucide-react';

const AiMarketing = () => {
    const [dashboard, setDashboard] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState({});
    const [activeTab, setActiveTab] = useState('overview');
    const [previewCampaign, setPreviewCampaign] = useState(null);
    const [targetCategory, setTargetCategory] = useState('ALL');

    const fetchDashboard = async () => {
        try { const res = await api.get('/admin/ai-marketing/dashboard'); setDashboard(res.data.data); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    };
    const fetchCampaigns = async () => {
        try { const res = await api.get('/admin/ai-marketing/campaigns'); setCampaigns(res.data.data || []); }
        catch (e) { console.error(e); }
    };

    useEffect(() => { fetchDashboard(); fetchCampaigns(); }, []);

    const toggleAi = async (enabled) => {
        try { await api.put('/admin/ai-marketing/config', { isEnabled: enabled }); fetchDashboard(); }
        catch (e) { alert('Failed'); }
    };
    const runAction = async (action, label) => {
        setRunning(p => ({ ...p, [action]: true }));
        try {
            await api.post(`/admin/ai-marketing/${action}`);
            fetchDashboard(); fetchCampaigns();
            alert(`${label} completed!`);
        } catch (e) { alert(`${label} failed`); }
        finally { setRunning(p => ({ ...p, [action]: false })); }
    };

    const config = dashboard?.config;
    const metrics = dashboard?.metrics;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
                        <Sparkles size={24} className="text-primary-500" /> AI Marketing Automation
                    </h1>
                    <p className="text-slate-500 mt-1">Automated branding, campaigns, and email marketing powered by AI.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${config?.isEnabled ? 'bg-primary-50 border-primary-200' : 'bg-slate-50 border-slate-200'}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${config?.isEnabled ? 'bg-primary-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className="text-sm font-medium">{config?.isEnabled ? 'AI Active' : 'AI Disabled'}</span>
                        <button onClick={() => toggleAi(!config?.isEnabled)}
                            className={`ml-2 relative w-10 h-5 rounded-full transition-colors ${config?.isEnabled ? 'bg-primary-400' : 'bg-slate-300'}`}>
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${config?.isEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white/80 rounded-xl border border-emerald-100/50 p-1.5 shadow-sm">
                <div className="flex gap-1 overflow-x-auto">
                    {[
                        { id: 'overview', label: 'Overview', icon: BarChart3 },
                        { id: 'campaigns', label: 'Campaigns', icon: Mail },
                        { id: 'actions', label: 'AI Actions', icon: Zap },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-primary-50 text-primary-700 shadow-sm border border-primary-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                            <tab.icon size={16} />{tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <Card className="p-4"><p className="text-xs text-slate-500">Total Campaigns</p><p className="text-2xl font-bold mt-1">{dashboard?.totalCampaigns || 0}</p></Card>
                        <Card className="p-4"><p className="text-xs text-slate-500">Sent</p><p className="text-2xl font-bold text-primary-700 mt-1">{dashboard?.sentCampaigns || 0}</p></Card>
                        <Card className="p-4"><p className="text-xs text-slate-500">Scheduled</p><p className="text-2xl font-bold text-amber-700 mt-1">{dashboard?.scheduledCampaigns || 0}</p></Card>
                        <Card className="p-4"><p className="text-xs text-slate-500">Open Rate</p><p className="text-2xl font-bold text-emerald-700 mt-1">{metrics?.openRate || 0}%</p></Card>
                    </div>

                    {/* Branding Profile */}
                    {dashboard?.branding && (
                        <Card className="p-5">
                            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><Palette size={16} /> AI Branding Profile</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div><p className="text-xs text-slate-500">Business Type</p><p className="text-sm font-medium">{dashboard.branding.detectedBusinessType}</p></div>
                                <div><p className="text-xs text-slate-500">Tone</p><Badge variant="brand">{dashboard.branding.brandingTone}</Badge></div>
                                <div><p className="text-xs text-slate-500">Slogan</p><p className="text-sm font-medium italic">"{dashboard.branding.slogan}"</p></div>
                                <div><p className="text-xs text-slate-500">Colors</p>
                                    <div className="flex gap-2 mt-1">
                                        <span className="h-6 w-6 rounded-full border" style={{ background: dashboard.branding.primaryColor }} />
                                        <span className="h-6 w-6 rounded-full border" style={{ background: dashboard.branding.secondaryColor }} />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Analysis */}
                    {dashboard?.analysis && (
                        <Card className="p-5">
                            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><Target size={16} /> Service Analysis</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div><p className="text-xs text-slate-500">Website</p><p className="text-sm font-medium">{dashboard.analysis.websiteTitle}</p></div>
                                <div><p className="text-xs text-slate-500">Category</p><p className="text-sm font-medium">{dashboard.analysis.businessCategory}</p></div>
                                <div><p className="text-xs text-slate-500">Target</p><p className="text-sm font-medium">{dashboard.analysis.targetAudience}</p></div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {(dashboard.analysis.detectedServices || []).map((s, i) => (
                                    <Badge key={i} variant="neutral">{s}</Badge>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* Campaigns Tab */}
            {activeTab === 'campaigns' && (
                <div className="space-y-4">
                    {campaigns.length === 0 ? (
                        <Card className="p-12 text-center text-slate-400">
                            <Mail size={32} className="mx-auto mb-3 opacity-30" />
                            <p>No campaigns yet. Run AI to generate your first campaign.</p>
                        </Card>
                    ) : campaigns.map(c => (
                        <Card key={c.id} className="p-4 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 truncate">{c.title}</p>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{c.subject}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <Badge variant={c.status === 'SENT' ? 'success' : c.status === 'SCHEDULED' ? 'warning' : 'neutral'}>{c.status}</Badge>
                                    <Badge variant="brand">{c.recipientType || 'ALL'}</Badge>
                                    {c.scheduleTime && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={10} />{new Date(c.scheduleTime).toLocaleString('id-ID')}</span>}
                                    {c.generatedByAi && <span className="text-[10px] text-primary-600 flex items-center gap-1"><Sparkles size={10} />AI</span>}
                                </div>
                            </div>
                            <Button variant="outline" size="sm" icon={Eye} onClick={() => setPreviewCampaign(c)}>Preview</Button>
                        </Card>
                    ))}
                </div>
            )}

            {/* Actions Tab */}
            {activeTab === 'actions' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-5">
                        <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2"><Target size={18} /> Analyze Website</h3>
                        <p className="text-xs text-slate-500 mb-4">AI scans your website content, services, and generates marketing strategy.</p>
                        <Button onClick={() => runAction('analyze', 'Analysis')} isLoading={running.analyze} icon={Play}>Run Analysis</Button>
                    </Card>
                    <Card className="p-5">
                        <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2"><Palette size={18} /> Generate Branding</h3>
                        <p className="text-xs text-slate-500 mb-4">AI creates brand identity, colors, tone, and slogan based on analysis.</p>
                        <Button onClick={() => runAction('branding/generate', 'Branding')} isLoading={running['branding/generate']} icon={Play}>Generate Branding</Button>
                    </Card>
                    <Card className="p-5">
                        <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2"><Mail size={18} /> Generate Campaign</h3>
                        <p className="text-xs text-slate-500 mb-4">AI creates email campaign with content, design, and scheduling.</p>
                        <div className="mb-3">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Target Audience</label>
                            <select className="w-full border border-emerald-200/80 rounded-xl p-2.5 text-sm bg-white"
                                value={targetCategory} onChange={e => setTargetCategory(e.target.value)}>
                                <option value="ALL">All Recipients</option>
                                <option value="MERCHANT">Merchants Only</option>
                                <option value="BUYER">Buyers Only</option>
                                <option value="DRIVER">Drivers Only</option>
                                <option value="DISTRIBUTOR">Distributors Only</option>
                                <option value="LEAD">Leads Only</option>
                            </select>
                        </div>
                        <Button onClick={() => runAction(`campaign/generate?recipientType=${targetCategory}`, 'Campaign')} isLoading={running[`campaign/generate?recipientType=${targetCategory}`]} icon={Play}>Generate Campaign</Button>
                    </Card>
                    <Card className="p-5">
                        <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2"><Zap size={18} /> Full Automation</h3>
                        <p className="text-xs text-slate-500 mb-4">Run complete pipeline: Analyze → Brand → Campaign → Schedule.</p>
                        <Button onClick={() => runAction('run', 'Full Automation')} isLoading={running.run} icon={Zap}>Run Full Pipeline</Button>
                    </Card>
                </div>
            )}

            {/* Campaign Preview Modal */}
            {previewCampaign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewCampaign(null)}>
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold">{previewCampaign.title}</h2>
                                <p className="text-xs text-slate-500">Subject: {previewCampaign.subject}</p>
                            </div>
                            <Badge variant={previewCampaign.status === 'SENT' ? 'success' : 'warning'}>{previewCampaign.status}</Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                            <div dangerouslySetInnerHTML={{ __html: previewCampaign.content }} />
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end">
                            <Button variant="outline" onClick={() => setPreviewCampaign(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiMarketing;
