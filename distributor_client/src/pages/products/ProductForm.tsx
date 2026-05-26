import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../../api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
  ArrowLeft, 
  Save, 
  Upload, 
  Plus, 
  Trash2, 
  Loader2,
  Image as ImageIcon,
  DollarSign,
  Package,
  Layers
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface PricingTier {
  minQty: number;
  price: number;
}

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    stockQuantity: 0,
    moq: 1,
    unit: 'pcs',
    pricingTiers: [{ minQty: 1, price: 0 }] as PricingTier[],
    imageUrl: '',
    isActive: true
  });

  useEffect(() => {
    fetchCategories();
    if (isEdit) {
      fetchProduct();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const res = await client.get('/distributor/categories');
      setCategories(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await client.get(`/distributor/products/${id}`);
      const p = res.data.data;
      
      let tiers = [];
      try {
        tiers = typeof p.pricingTiers === 'string' ? JSON.parse(p.pricingTiers) : p.pricingTiers;
      } catch (e) {
        tiers = [{ minQty: 1, price: 0 }];
      }

      setFormData({
        name: p.name,
        description: p.description || '',
        categoryId: p.wholesaleCategoryId || '',
        stockQuantity: p.stockQuantity,
        moq: p.moq,
        unit: p.unit,
        pricingTiers: Array.isArray(tiers) && tiers.length > 0 ? tiers : [{ minQty: 1, price: 0 }],
        imageUrl: p.images && p.images.length > 0 ? p.images[0] : '',
        isActive: p.isActive
      });
    } catch (error) {
      console.error(error);
      alert('Failed to load product data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const res = await client.post('/distributor/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.data.status === 'success') {
        // Assume backend returns relative path, prepend server URL if needed
        // But for now, let's assume the frontend can serve it or it's a full URL
        // In this setup, we serve /uploads statically, so we need full URL or relative to root
        // If frontend and backend are on different ports, we might need full URL.
        // Let's assume the backend returns a path that works (e.g. /uploads/...)
        const url = res.data.data.url; 
        // If running locally with proxy, relative URL is fine. 
        // If not, we might need base URL. Let's stick with relative for now as Axios baseURL handles API, but images need host.
        // Actually, let's just save the path returned.
        setFormData(prev => ({ ...prev, imageUrl: url }));
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleAddTier = () => {
    setFormData(prev => ({
      ...prev,
      pricingTiers: [...prev.pricingTiers, { minQty: 0, price: 0 }]
    }));
  };

  const handleRemoveTier = (index: number) => {
    if (formData.pricingTiers.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      pricingTiers: prev.pricingTiers.filter((_, i) => i !== index)
    }));
  };

  const handleTierChange = (index: number, field: keyof PricingTier, value: number) => {
    const newTiers = [...formData.pricingTiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setFormData(prev => ({ ...prev, pricingTiers: newTiers }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.unit || !formData.categoryId) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Validate Tiers
    const validTiers = formData.pricingTiers.every(t => t.minQty > 0 && t.price >= 0);
    if (!validTiers) {
      alert('Pricing tiers must have valid quantity (>0) and price (>=0)');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        stockQuantity: Number(formData.stockQuantity),
        moq: Number(formData.moq),
        pricingTiers: formData.pricingTiers, // Backend handles JSON parsing if string, or accepts object if updated
        images: formData.imageUrl ? [formData.imageUrl] : []
      };

      if (isEdit) {
        await client.put(`/distributor/products/${id}`, payload);
      } else {
        await client.post('/distributor/products', payload);
      }
      navigate('/products');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  // Helper to get image source (handle relative paths)
  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // Assuming backend is at localhost:4000 for dev, we might need to prepend.
    // However, if we don't know the exact host, this might be tricky.
    // For now, let's assume relative path works if proxy is set up, 
    // or we need to rely on the backend returning full URL or user providing full URL.
    // Given the previous setup, let's prepend the API base URL's origin if it's relative?
    // Let's just return path and assume <img src> handles it relative to current domain 
    // or we configure a global constant for ASSET_URL.
    // For this environment, let's assume path is relative to server root.
    // If frontend is on 5173 and server on 4000, we need http://localhost:4000
    return `http://localhost:4000${path}`;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate('/products')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isEdit ? 'Edit Product' : 'Create New Product'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {isEdit ? 'Update product details and pricing' : 'Add a new product to your wholesale inventory'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
              <CardDescription>Basic details about the product</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1 block">Product Name *</label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Premium Coffee Beans 1kg"
                    required
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-sm font-medium mb-1 block">Category *</label>
                  <select 
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-950"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-sm font-medium mb-1 block">Unit *</label>
                  <Input 
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    placeholder="e.g. pcs, box, kg"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <textarea 
                    className="w-full min-h-[120px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-950"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Detailed product description..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing Tiers</CardTitle>
              <CardDescription>Set different prices based on order quantity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Min. Quantity</th>
                      <th className="px-4 py-2 text-left font-medium">Price per Unit (IDR)</th>
                      <th className="px-4 py-2 w-[50px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {formData.pricingTiers.map((tier, index) => (
                      <tr key={index}>
                        <td className="p-2">
                          <Input 
                            type="number"
                            min="1"
                            value={tier.minQty}
                            onChange={(e) => handleTierChange(index, 'minQty', parseInt(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-2">
                          <Input 
                            type="number"
                            min="0"
                            value={tier.price}
                            onChange={(e) => handleTierChange(index, 'price', parseInt(e.target.value) || 0)}
                            startIcon={<DollarSign className="h-4 w-4 text-slate-400" />}
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveTier(index)}
                            disabled={formData.pricingTiers.length <= 1}
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddTier} className="w-full border-dashed">
                <Plus className="h-4 w-4 mr-2" /> Add Pricing Tier
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Status & Media */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inventory & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Current Stock</label>
                <Input 
                  type="number"
                  min="0"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({...formData, stockQuantity: parseInt(e.target.value) || 0})}
                  startIcon={<Package className="h-4 w-4 text-slate-400" />}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Minimum Order (MOQ)</label>
                <Input 
                  type="number"
                  min="1"
                  value={formData.moq}
                  onChange={(e) => setFormData({...formData, moq: parseInt(e.target.value) || 1})}
                  startIcon={<Layers className="h-4 w-4 text-slate-400" />}
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <label className="text-sm font-medium">Active Status</label>
                <div 
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${formData.isActive ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                  onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${formData.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Image</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="aspect-square w-full rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden relative group">
                  {formData.imageUrl ? (
                    <>
                      <img 
                        src={getImageUrl(formData.imageUrl)} 
                        alt="Product Preview" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button type="button" variant="secondary" size="sm" onClick={() => document.getElementById('image-upload')?.click()}>
                          Change Image
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
                        <ImageIcon className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500 mb-2">Click to upload image</p>
                      <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('image-upload')?.click()}>
                        Select File
                      </Button>
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                    </div>
                  )}
                </div>
                <input 
                  id="image-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <p className="text-xs text-slate-400 text-center">
                  Recommended size: 800x800px. Max 5MB.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 z-10 md:pl-64">
        <Button variant="ghost" onClick={() => navigate('/products')}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white min-w-[120px]">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Product
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
