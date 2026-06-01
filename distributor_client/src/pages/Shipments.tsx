import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Search, Filter, Truck, Calendar, MapPin, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/Input';
import client from '../api/client';

interface Shipment {
  id: string; // Using Order ID as Shipment ID for now
  orderNumber: string;
  tenant: {
    name: string;
    users: { name: string }[];
    stores: { name: string; location: string; waNumber: string }[];
  };
  updatedAt: string;
  status: string;
}

export default function Shipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const res = await client.get('/distributor/shipments');
      setShipments(res.data.data);
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const filteredShipments = shipments.filter(s => 
    s.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    s.tenant?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.tenant?.stores?.[0]?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'success';
      case 'SHIPPED': return 'default'; // Blue-ish usually
      case 'PROCESSING': return 'secondary';
      case 'PAID': return 'warning';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Shipments</h1>
           <p className="text-muted-foreground text-slate-500 dark:text-slate-400">Track and manage deliveries</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
           <div className="flex items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
                <Input
                  placeholder="Search order number or customer..."
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
            ) : filteredShipments.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    <Truck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No active shipments found.</p>
                </div>
            ) : (
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-800">
                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Order ID</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Customer</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Last Update</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Destination</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400">Status</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-slate-500 dark:text-slate-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {filteredShipments.map((item) => (
                        <tr key={item.id} className="border-b transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-800">
                          <td className="p-4 align-middle font-medium text-slate-900 dark:text-slate-100">{item.orderNumber}</td>
                          <td className="p-4 align-middle text-slate-900 dark:text-slate-100">
                            <div className="flex flex-col">
                                <span>{item.tenant.stores?.[0]?.name || item.tenant.name}</span>
                                <span className="text-xs text-slate-500">{item.tenant.users?.[0]?.name}</span>
                            </div>
                          </td>
                          <td className="p-4 align-middle text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                               <Calendar className="h-3 w-3" />
                               {new Date(item.updatedAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-4 align-middle text-slate-500 dark:text-slate-400">
                             <div className="flex items-center gap-2">
                               <MapPin className="h-3 w-3" />
                               <span className="truncate max-w-[150px]">{item.tenant.stores?.[0]?.location || '-'}</span>
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <Badge variant={getStatusVariant(item.status) as any}>
                              {item.status}
                            </Badge>
                          </td>
                          <td className="p-4 align-middle text-right">
                            <Button variant="ghost" size="sm">
                               <Truck className="h-4 w-4 mr-2" />
                               Detail
                            </Button>
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
