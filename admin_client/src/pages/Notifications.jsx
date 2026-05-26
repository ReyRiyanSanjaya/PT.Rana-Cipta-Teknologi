import React, { useEffect, useState } from 'react';
import api from '../api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Bell, Check, Trash2, Mail, Info, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            if (res.data?.data) {
                setNotifications(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAsRead = async (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        try {
            await api.patch(`/notifications/${id}/read`);
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    };

    const markAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        try {
            await api.post('/notifications/read-all');
        } catch (error) {
            console.error("Failed to mark all read", error);
        }
    };

    const handleClick = (n) => {
        markAsRead(n.id);
        if (n.title.toLowerCase().includes('pesan baru') || n.body.toLowerCase().includes('pesan')) {
            navigate('/admin/contact-inbox');
        }
        // Add other navigation logic here based on notification content
    };

    const getIcon = (title) => {
        if (title.toLowerCase().includes('error') || title.toLowerCase().includes('gagal')) return <AlertTriangle className="text-red-500" />;
        if (title.toLowerCase().includes('pesan')) return <Mail className="text-indigo-500" />;
        return <Info className="text-blue-500" />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
                    <p className="text-slate-500">Manage your system notifications</p>
                </div>
                {notifications.some(n => !n.isRead) && (
                    <Button onClick={markAllRead} variant="outline" className="gap-2">
                        <Check size={16} />
                        Mark all as read
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : notifications.length === 0 ? (
                <Card className="p-12 text-center flex flex-col items-center text-slate-500">
                    <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <Bell size={24} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No notifications</h3>
                    <p>You're all caught up!</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {notifications.map((n) => (
                        <Card 
                            key={n.id} 
                            className={`p-4 transition-all hover:shadow-md cursor-pointer border-l-4 ${n.isRead ? 'border-l-transparent bg-white' : 'border-l-indigo-500 bg-indigo-50/30'}`}
                            onClick={() => handleClick(n)}
                        >
                            <div className="flex gap-4">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${n.isRead ? 'bg-slate-100' : 'bg-white shadow-sm'}`}>
                                    {getIcon(n.title)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className={`text-sm font-semibold ${n.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                                            {n.title}
                                        </h4>
                                        <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                                            {new Date(n.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className={`text-sm mt-1 ${n.isRead ? 'text-slate-500' : 'text-slate-700'}`}>
                                        {n.body}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Notifications;
