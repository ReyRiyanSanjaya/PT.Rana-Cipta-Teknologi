import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Plus, Edit, Trash, Search, Tag, Calendar, Percent, DollarSign } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Discount {
    id: string;
    name: string;
    code?: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    minOrderAmount: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
    products: { id: string; name: string }[];
}

interface Product {
    id: string;
    name: string;
}

export default function Discounts() {
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'PERCENTAGE',
        value: '',
        minOrderAmount: '',
        startDate: '',
        endDate: '',
        productIds: [] as string[]
    });

    useEffect(() => {
        fetchDiscounts();
        fetchProducts();
    }, []);

    const fetchDiscounts = async () => {
        try {
            const res = await client.get('/distributor/discounts');
            setDiscounts(res.data.data);
        } catch (error) {
            console.error('Failed to fetch discounts', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await client.get('/distributor/products');
            setProducts(res.data.data);
        } catch (error) {
            console.error('Failed to fetch products', error);
        }
    };

    const handleOpenModal = (discount?: Discount) => {
        if (discount) {
            setEditingDiscount(discount);
            setFormData({
                name: discount.name,
                code: discount.code || '',
                type: discount.type,
                value: discount.value.toString(),
                minOrderAmount: discount.minOrderAmount.toString(),
                startDate: discount.startDate.split('T')[0],
                endDate: discount.endDate.split('T')[0],
                productIds: discount.products.map(p => p.id)
            });
        } else {
            setEditingDiscount(null);
            setFormData({
                name: '',
                code: '',
                type: 'PERCENTAGE',
                value: '',
                minOrderAmount: '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                productIds: []
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                value: parseFloat(formData.value) || 0,
                minOrderAmount: parseFloat(formData.minOrderAmount) || 0,
            };

            if (editingDiscount) {
                await client.put(`/distributor/discounts/${editingDiscount.id}`, payload);
            } else {
                await client.post('/distributor/discounts', payload);
            }
            setIsModalOpen(false);
            fetchDiscounts();
        } catch (error) {
            console.error('Failed to save discount', error);
            alert('Failed to save discount');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this discount?')) return;
        try {
            await client.delete(`/distributor/discounts/${id}`);
            fetchDiscounts();
        } catch (error) {
            console.error('Failed to delete discount', error);
        }
    };

    const toggleProductSelection = (productId: string) => {
        setFormData(prev => {
            const exists = prev.productIds.includes(productId);
            if (exists) {
                return { ...prev, productIds: prev.productIds.filter(id => id !== productId) };
            } else {
                return { ...prev, productIds: [...prev.productIds, productId] };
            }
        });
    };

    const filteredDiscounts = discounts.filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Promotions</h1>
                    <p className="text-muted-foreground text-slate-500 dark:text-slate-400">Manage discounts and promo codes</p>
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Promo
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
                            <Input
                                placeholder="Search promos..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">Loading...</div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredDiscounts.map((discount) => (
                                <div key={discount.id} className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:shadow-md transition-all">
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(discount)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(discount.id)}>
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-3 rounded-lg ${discount.type === 'PERCENTAGE' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {discount.type === 'PERCENTAGE' ? <Percent className="h-6 w-6" /> : <DollarSign className="h-6 w-6" />}
                                        </div>
                                        <Badge variant={discount.isActive ? 'success' : 'secondary'}>
                                            {discount.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>

                                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-1">{discount.name}</h3>
                                    {discount.code && (
                                        <div className="flex items-center gap-2 mb-3">
                                            <Badge variant="outline" className="font-mono bg-slate-50 dark:bg-slate-800">
                                                {discount.code}
                                            </Badge>
                                        </div>
                                    )}

                                    <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <Tag className="h-4 w-4" />
                                            <span>
                                                {discount.type === 'PERCENTAGE' ? `${discount.value}% Off` : `Rp ${discount.value.toLocaleString()} Off`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span>{format(new Date(discount.startDate), 'dd MMM', { locale: id })} - {format(new Date(discount.endDate), 'dd MMM yyyy', { locale: id })}</span>
                                        </div>
                                        <div className="text-xs pt-2 border-t border-slate-100 dark:border-slate-800 mt-3">
                                            {discount.products.length > 0 ? (
                                                <span className="text-emerald-600">{discount.products.length} specific products</span>
                                            ) : (
                                                <span className="text-blue-600">All Products</span>
                                            )}
                                            {discount.minOrderAmount > 0 && (
                                                <span className="ml-2 text-slate-400">• Min. Order: Rp {discount.minOrderAmount.toLocaleString()}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingDiscount ? 'Edit Promotion' : 'Create Promotion'}
                className="max-w-2xl"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Promo Name</label>
                            <Input
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Ramadhan Sale"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Promo Code (Optional)</label>
                            <Input
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="e.g. RAMADHAN2025"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <select
                                className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:text-white"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                            >
                                <option value="PERCENTAGE">Percentage (%)</option>
                                <option value="FIXED">Fixed Amount (Rp)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Value</label>
                            <Input
                                required
                                type="number"
                                value={formData.value}
                                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                placeholder={formData.type === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 10000'}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Minimum Order Amount (Rp)</label>
                        <Input
                            type="number"
                            value={formData.minOrderAmount}
                            onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                            placeholder="0 for no minimum"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Start Date</label>
                            <Input
                                required
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">End Date</label>
                            <Input
                                required
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Applicable Products</label>
                        <div className="h-40 overflow-y-auto border rounded-md p-2 space-y-1 dark:border-slate-700">
                            {products.length === 0 && <p className="text-sm text-slate-500">No products available.</p>}
                            {products.map(product => (
                                <div key={product.id} className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded">
                                    <input
                                        type="checkbox"
                                        id={`prod-${product.id}`}
                                        checked={formData.productIds.includes(product.id)}
                                        onChange={() => toggleProductSelection(product.id)}
                                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <label htmlFor={`prod-${product.id}`} className="text-sm cursor-pointer flex-1">
                                        {product.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500">Leave empty to apply to all products.</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit">{editingDiscount ? 'Update Promo' : 'Create Promo'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}