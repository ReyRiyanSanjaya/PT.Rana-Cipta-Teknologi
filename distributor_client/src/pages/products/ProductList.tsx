import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash, Search, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

interface Product {
  id: string;
  name: string;
  stockQuantity: number;
  unit: string;
  isActive: boolean;
  images: string[];
  pricingTiers: { minQty: number; price: number }[];
  wholesaleCategory?: { name: string };
  sku?: string;
}

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await client.get('/distributor/products');
      setProducts(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await client.delete(`/distributor/products/${id}`);
      fetchProducts();
    } catch (error) {
      alert('Failed to delete');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriceRange = (tiers: { minQty: number; price: number }[]) => {
    if (!tiers || tiers.length === 0) return 'Rp 0';
    const prices = tiers.map(t => t.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `Rp ${min.toLocaleString()}`;
    return `Rp ${min.toLocaleString()} - Rp ${max.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Products</h1>
           <p className="text-muted-foreground text-slate-500 dark:text-slate-400">Manage your product inventory</p>
        </div>
        <Link to="/products/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
           <div className="flex items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
                <Input
                  placeholder="Search products..."
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
          {loading ? (
             <div className="text-center py-8 text-slate-500 dark:text-slate-400">Loading products...</div>
          ) : (
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 data-[state=selected]:bg-muted border-slate-200 dark:border-slate-800">
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Image</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Name</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Category</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Price</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Stock</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Status</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-slate-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 data-[state=selected]:bg-muted border-slate-200 dark:border-slate-800">
                      <td className="p-4 align-middle">
                        <div className="h-10 w-10 rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            {product.images && product.images.length > 0 ? (
                                <img 
                                    src={product.images[0].startsWith('http') ? product.images[0] : `http://localhost:4000${product.images[0]}`} 
                                    alt={product.name} 
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs">No Img</div>
                            )}
                        </div>
                      </td>
                      <td className="p-4 align-middle font-medium text-slate-900 dark:text-slate-100">{product.name}</td>
                      <td className="p-4 align-middle text-slate-600 dark:text-slate-400">{product.wholesaleCategory?.name || '-'}</td>
                      <td className="p-4 align-middle text-slate-600 dark:text-slate-400">{getPriceRange(product.pricingTiers)}</td>
                      <td className="p-4 align-middle text-slate-600 dark:text-slate-400">{product.stockQuantity} {product.unit}</td>
                      <td className="p-4 align-middle">
                        <Badge variant={product.isActive ? 'default' : 'secondary'}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/products/${product.id}/edit`}>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
