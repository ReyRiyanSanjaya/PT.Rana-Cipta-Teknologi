import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../../api/client';
import { ArrowLeft, Printer, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await client.get(`/distributor/orders/${id}`);
      setOrder(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!window.confirm(`Change status to ${status}?`)) return;
    try {
      await client.put(`/distributor/orders/${id}/status`, { status });
      fetchOrder();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  if (loading) return <div className="p-6 text-center text-slate-500 dark:text-slate-400">Loading order details...</div>;
  if (!order) return <div className="p-6 text-center text-slate-500 dark:text-slate-400">Order not found</div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED': return <Badge variant="success">Delivered</Badge>;
      case 'PAID': return <Badge variant="success">Paid</Badge>;
      case 'PENDING': return <Badge variant="warning">Pending</Badge>;
      case 'PROCESSING': return <Badge variant="default">Processing</Badge>;
      case 'SHIPPED': return <Badge variant="default">Shipped</Badge>;
      case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/orders">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3 text-slate-900 dark:text-white">
              Order {order.orderNumber}
              {getStatusBadge(order.status)}
            </h1>
            <p className="text-muted-foreground text-slate-500 dark:text-slate-400">
              Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline">
             <Printer className="w-4 h-4 mr-2" />
             Print Invoice
           </Button>
           {(order.status === 'PENDING' || order.status === 'PAID') && (
            <Button onClick={() => updateStatus('PROCESSING')}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Accept Order
            </Button>
          )}
          {order.status === 'PROCESSING' && (
            <Button onClick={() => updateStatus('SHIPPED')} className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white">
              <Truck className="w-4 h-4 mr-2" />
              Ship Order
            </Button>
          )}
          {order.status === 'SHIPPED' && (
            <Button onClick={() => updateStatus('DELIVERED')} variant="default" className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white">
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Delivered
            </Button>
          )}
          {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
            <Button onClick={() => updateStatus('CANCELLED')} variant="destructive">
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Customer Info */}
        <Card className="md:col-span-2">
          <CardHeader>
             <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm text-slate-900 dark:text-slate-200">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground text-slate-500 dark:text-slate-400">Product</th>
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground text-slate-500 dark:text-slate-400">Price</th>
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground text-slate-500 dark:text-slate-400">Qty</th>
                    <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground text-slate-500 dark:text-slate-400">Total</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {order.items.map((item: any) => (
                    <tr key={item.id} className="border-b border-slate-200 dark:border-slate-700">
                      <td className="p-4 align-middle font-medium">{item.wholesaleProduct?.name}</td>
                      <td className="p-4 align-middle">Rp {item.unitPrice?.toLocaleString()}</td>
                      <td className="p-4 align-middle">{item.quantity}</td>
                      <td className="p-4 align-middle text-right font-bold">Rp {item.subtotal?.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                     <td colSpan={3} className="p-4 text-right font-medium">Subtotal</td>
                     <td className="p-4 text-right font-bold">Rp {order.totalAmount.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                     <td colSpan={3} className="p-4 text-right font-medium">Tax</td>
                     <td className="p-4 text-right font-bold">Rp 0</td>
                  </tr>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                     <td colSpan={3} className="p-4 text-right font-bold text-lg">Grand Total</td>
                     <td className="p-4 text-right font-bold text-lg text-teal-600 dark:text-teal-400">Rp {order.totalAmount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-900 dark:text-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Merchant Name</p>
                <p className="font-medium">{order.tenant?.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Contact Person</p>
                <p>{order.tenant?.users?.[0]?.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{order.tenant?.users?.[0]?.email}</p>
              </div>
              <div>
                 <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Shipping Address</p>
                 <p className="text-sm mt-1 p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">{order.shippingAddress || 'No address provided'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-900 dark:text-slate-200">
               <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                 <span className="text-sm text-slate-500 dark:text-slate-400">Method</span>
                 <span className="font-medium">{order.paymentMethod}</span>
               </div>
               <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                 <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
                 <Badge variant={order.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                   {order.paymentStatus}
                 </Badge>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
