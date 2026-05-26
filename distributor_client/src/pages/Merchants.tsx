import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Search, Filter, Store, Phone, MapPin, Loader2, ShoppingBag, CreditCard, CalendarClock, Edit2 } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import client from '../api/client';

interface Merchant {
  id: string;
  name: string; // User/Owner name
  storeName: string;
  phone: string;
  address: string;
  location: string;
  totalOrders: number;
  joinDate: string;
  creditLimit: number;
  creditUsed: number;
  paymentTerm: number;
}

export default function Merchants() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'leads'>('active');
  
  // Edit Credit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [creditForm, setCreditForm] = useState({ creditLimit: '', paymentTerm: '' });

  const fetchMerchants = async () => {
    try {
      setLoading(true);
      const res = await client.get('/distributor/customers', {
        params: { type: activeTab }
      });
      setMerchants(res.data.data);
    } catch (error) {
      console.error('Failed to fetch merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
  }, [activeTab]);

  const handleEditCredit = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setCreditForm({
        creditLimit: merchant.creditLimit.toString(),
        paymentTerm: merchant.paymentTerm.toString()
    });
    setIsModalOpen(true);
  };

  const handleSaveCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchant) return;

    try {
        await client.put(`/distributor/customers/${selectedMerchant.id}/credit`, {
            creditLimit: parseFloat(creditForm.creditLimit),
            paymentTerm: parseInt(creditForm.paymentTerm)
        });
        setIsModalOpen(false);
        fetchMerchants(); // Refresh data
    } catch (error) {
        console.error('Failed to update credit:', error);
        alert('Failed to update credit settings');
    }
  };

  const filteredMerchants = merchants.filter(m => 
    (m.storeName?.toLowerCase() || '').includes(search.toLowerCase()) || 
    (m.name?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Merchants</h1>
           <p className="text-muted-foreground text-slate-500 dark:text-slate-400">
             {activeTab === 'active' ? 'View your active wholesale customers' : 'Explore potential merchants who haven\'t ordered yet'}
           </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('active')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'active'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'}
            `}
          >
            Active Merchants
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'leads'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'}
            `}
          >
            Potential Merchants (No Orders)
          </button>
        </nav>
      </div>

      <Card>
        <CardHeader className="pb-3">
           <div className="flex items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
                <Input
                  placeholder="Search merchant name or store..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
           </div>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                </div>
            ) : filteredMerchants.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    <Store className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No merchants found.</p>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredMerchants.map((merchant) => (
                    <div key={merchant.id} className="relative flex flex-col gap-4 rounded-lg border border-slate-200 dark:border-slate-800 p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
                            <Store className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{merchant.storeName || 'Unknown Store'}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{merchant.name}</p>
                          </div>
                        </div>
                        <Badge variant={activeTab === 'active' ? "outline" : "secondary"} className={activeTab === 'active' ? "bg-slate-100 dark:bg-slate-800" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}>
                          {activeTab === 'active' ? 'Active' : 'No Orders'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {merchant.phone || '-'}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span className="truncate">{merchant.address || 'No address provided'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-slate-400" />
                          <span>{merchant.totalOrders} Orders placed</span>
                        </div>
                      </div>

                      {/* Credit Info Section */}
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 space-y-2 border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                              <span>Credit Status</span>
                              <button onClick={() => handleEditCredit(merchant)} className="text-teal-600 hover:text-teal-700">
                                  <Edit2 className="h-3 w-3" />
                              </button>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                  <CreditCard className="h-4 w-4 text-slate-400" />
                                  <span>Limit:</span>
                              </div>
                              <span className="font-semibold text-slate-900 dark:text-white">Rp {merchant.creditLimit.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                  <CalendarClock className="h-4 w-4 text-slate-400" />
                                  <span>TOP:</span>
                              </div>
                              <span className="font-semibold text-slate-900 dark:text-white">{merchant.paymentTerm} Days</span>
                          </div>
                          
                          {/* Credit Progress Bar - Only show if Limit > 0 */}
                          {merchant.creditLimit > 0 && (
                          <div className="mt-2">
                              <div className="flex justify-between text-xs mb-1">
                                  <span className="text-slate-500">Used: Rp {merchant.creditUsed.toLocaleString()}</span>
                                  <span className={`${(merchant.creditUsed / (merchant.creditLimit || 1)) > 0.8 ? 'text-red-500' : 'text-emerald-500'}`}>
                                      {merchant.creditLimit > 0 ? Math.round((merchant.creditUsed / merchant.creditLimit) * 100) : 0}%
                                  </span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                      className={`h-1.5 rounded-full ${
                                        (merchant.creditUsed / (merchant.creditLimit || 1)) > 0.8 ? 'bg-red-500' : 'bg-emerald-500'
                                      }`} 
                                      style={{ width: `${Math.min((merchant.creditUsed / (merchant.creditLimit || 1)) * 100, 100)}%` }}
                                  ></div>
                              </div>
                          </div>
                          )}
                          
                          {/* Call to Action for Leads */}
                          {activeTab === 'leads' && merchant.creditLimit === 0 && (
                             <div className="mt-2 text-center">
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="w-full h-8 text-xs border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800 dark:border-teal-800 dark:text-teal-400 dark:hover:bg-teal-900/30"
                                    onClick={() => handleEditCredit(merchant)}
                                >
                                    Activate Credit Limit
                                </Button>
                             </div>
                          )}
                      </div>

                      <div className="pt-2 mt-auto border-t border-slate-100 dark:border-slate-800">
                         <p className="text-xs text-slate-400">
                            Joined {new Date(merchant.joinDate).toLocaleDateString()}
                         </p>
                      </div>
                    </div>
                  ))}
                </div>
            )}
        </CardContent>
      </Card>

      {/* Edit Credit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Edit Credit Settings - ${selectedMerchant?.storeName}`}
        className="max-w-md"
      >
          <form onSubmit={handleSaveCredit} className="space-y-4">
              <div className="space-y-2">
                  <label className="text-sm font-medium">Credit Limit (Rp)</label>
                  <Input 
                      type="number" 
                      value={creditForm.creditLimit}
                      onChange={e => setCreditForm({...creditForm, creditLimit: e.target.value})}
                      placeholder="0"
                  />
                  <p className="text-xs text-slate-500">Maximum unpaid debt allowed for this merchant.</p>
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Term (Days)</label>
                  <Input 
                      type="number" 
                      value={creditForm.paymentTerm}
                      onChange={e => setCreditForm({...creditForm, paymentTerm: e.target.value})}
                      placeholder="0"
                  />
                  <p className="text-xs text-slate-500">Number of days allowed for payment (TOP).</p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Changes</Button>
              </div>
          </form>
      </Modal>
    </div>
  );
}