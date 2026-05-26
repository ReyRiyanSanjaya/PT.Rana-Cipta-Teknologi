import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { Link } from 'react-router-dom';
import { Eye, Search, Filter } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  tenant: { name: string };
  createdAt: string;
}

const TABS = ['ALL', 'PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await client.get('/distributor/orders');
      setOrders(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'success';
      case 'PAID': return 'success';
      case 'PENDING': return 'warning';
      case 'CANCELLED': return 'destructive';
      case 'PROCESSING': return 'default';
      case 'SHIPPED': return 'default';
      default: return 'secondary';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesTab = activeTab === 'ALL' || order.status === activeTab;
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tenant?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
         <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Orders</h1>
         <p className="text-muted-foreground text-slate-500 dark:text-slate-400">Manage your incoming orders</p>
      </div>

      <div className="flex flex-wrap gap-2 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab 
                ? 'bg-teal-600 text-white dark:bg-teal-500' 
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:border-slate-700'
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase().replace('_', ' ')}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
           <div className="flex items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
                <Input
                  placeholder="Search order # or customer..."
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
             <div className="text-center py-8 text-slate-500 dark:text-slate-400">Loading orders...</div>
          ) : (
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 data-[state=selected]:bg-muted border-slate-200 dark:border-slate-800">
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Order #</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Customer</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Date</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Total</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Status</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-slate-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-500 dark:text-slate-400">No orders found.</td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 data-[state=selected]:bg-muted border-slate-200 dark:border-slate-800">
                        <td className="p-4 align-middle font-medium text-slate-900 dark:text-slate-100">{order.orderNumber}</td>
                        <td className="p-4 align-middle text-slate-900 dark:text-slate-100">{order.tenant?.name}</td>
                        <td className="p-4 align-middle text-slate-500 dark:text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 align-middle font-medium text-slate-900 dark:text-slate-100">Rp {order.totalAmount.toLocaleString()}</td>
                        <td className="p-4 align-middle">
                          <Badge variant={getStatusVariant(order.status) as any}>
                            {order.status}
                          </Badge>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <Link to={`/orders/${order.id}`}>
                            <Button variant="ghost" size="sm">
                              View Details
                              <Eye className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
