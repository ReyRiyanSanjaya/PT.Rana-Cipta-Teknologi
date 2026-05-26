import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Search, Filter, ArrowUpRight, ArrowDownLeft, Package, RefreshCw } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

interface Product {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
  unit?: string;
  price: number;
}

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'set'>('add');
  const [adjustmentValue, setAdjustmentValue] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await client.get('/distributor/products');
      setProducts(res.data.data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustClick = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentType('add');
    setAdjustmentValue(0);
    setIsModalOpen(true);
  };

  const handleSaveAdjustment = async () => {
    if (!selectedProduct) return;

    try {
      setIsSubmitting(true);
      let newStock = selectedProduct.stockQuantity;
      
      if (adjustmentType === 'add') {
        newStock += Number(adjustmentValue);
      } else {
        newStock = Number(adjustmentValue);
      }

      await client.put(`/distributor/products/${selectedProduct.id}`, {
        stockQuantity: newStock
      });

      // Refresh list
      await fetchInventory();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to update stock:', error);
      alert('Failed to update stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Inventory</h1>
           <p className="text-muted-foreground text-slate-500 dark:text-slate-400">Manage stock levels and availability</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={fetchInventory} disabled={loading}>
             <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
             Refresh
           </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Products</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{products.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Low Stock Items</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {products.filter(p => p.stockQuantity < 10).length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Stock Value</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                Rp {products.reduce((acc, p) => acc + (p.price * p.stockQuantity), 0).toLocaleString()}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
           <div className="flex items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
                <Input
                  placeholder="Search by name or SKU..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
           </div>
        </CardHeader>
        <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-800">
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Product Name</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">SKU</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Current Stock</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Status</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-slate-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500">Loading inventory...</td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500">No products found.</td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-800">
                        <td className="p-4 align-middle font-medium text-slate-900 dark:text-slate-100">{product.name}</td>
                        <td className="p-4 align-middle text-slate-500 dark:text-slate-400">{product.sku || '-'}</td>
                        <td className="p-4 align-middle">
                          <span className={`font-medium ${product.stockQuantity < 10 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            {product.stockQuantity}
                          </span>
                        </td>
                        <td className="p-4 align-middle">
                          <Badge variant={product.stockQuantity > 0 ? 'success' : 'destructive'}>
                            {product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                          </Badge>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <Button variant="outline" size="sm" onClick={() => handleAdjustClick(product)}>
                            Adjust Stock
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Adjust Stock: ${selectedProduct?.name}`}
      >
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block text-slate-700 dark:text-slate-300">Adjustment Type</label>
              <div className="flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => setAdjustmentType('add')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md border ${
                    adjustmentType === 'add'
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600'
                  }`}
                >
                  Add/Remove
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentType('set')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md border ${
                    adjustmentType === 'set'
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600'
                  }`}
                >
                  Set Exact
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block text-slate-700 dark:text-slate-300">
              {adjustmentType === 'add' ? 'Quantity to Add (use negative to remove)' : 'New Stock Quantity'}
            </label>
            <Input
              type="number"
              value={adjustmentValue}
              onChange={(e) => setAdjustmentValue(Number(e.target.value))}
              className="w-full"
            />
            {adjustmentType === 'add' && selectedProduct && (
              <p className="text-sm text-slate-500 mt-1">
                New Stock will be: <span className="font-medium">{selectedProduct.stockQuantity + Number(adjustmentValue)}</span>
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAdjustment} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Adjustment'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
