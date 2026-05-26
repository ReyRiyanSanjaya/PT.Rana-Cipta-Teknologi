import React, { useEffect, useState } from 'react';
import api from '../api';
import { 
    Hash, Plus, Edit2, Trash2, TrendingUp, Users, Heart, 
    MessageCircle, Award, Wallet, Save, X 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';

const AVAILABLE_ICONS = [
    { name: 'TrendingUp', icon: TrendingUp },
    { name: 'Users', icon: Users },
    { name: 'Heart', icon: Heart },
    { name: 'MessageCircle', icon: MessageCircle },
    { name: 'Award', icon: Award },
    { name: 'Wallet', icon: Wallet },
];

const DiscussionTopics = () => {
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        title: '',
        description: '',
        icon: 'MessageCircle',
        color: '#3b82f6'
    });

    const fetchTopics = async () => {
        try {
            const res = await api.get('/admin/community/topics');
            if (res.data.success) {
                setTopics(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch topics", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTopics();
    }, []);

    const resetForm = () => {
        setForm({
            title: '',
            description: '',
            icon: 'MessageCircle',
            color: '#3b82f6'
        });
        setEditingId(null);
    };

    const handleEdit = (topic) => {
        setEditingId(topic.id);
        setForm({
            title: topic.title,
            description: topic.description || '',
            icon: topic.icon || 'MessageCircle',
            color: topic.color || '#3b82f6'
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/admin/community/topics/${editingId}`, form);
                alert("Topic updated successfully");
            } else {
                await api.post('/admin/community/topics', form);
                alert("Topic created successfully");
            }
            fetchTopics();
            resetForm();
        } catch (error) {
            console.error("Error saving topic:", error);
            alert("Failed to save topic");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure? This will delete all posts in this topic.")) return;
        try {
            await api.delete(`/admin/community/topics/${id}`);
            fetchTopics();
        } catch (error) {
            console.error("Error deleting topic:", error);
            alert("Failed to delete topic");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Manage Topics</h2>
                    <p className="text-muted-foreground">Create and manage discussion categories.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {editingId ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                {editingId ? 'Edit Topic' : 'Create Topic'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Title</label>
                                    <Input 
                                        value={form.title} 
                                        onChange={e => setForm({...form, title: e.target.value})} 
                                        placeholder="e.g. Business Tips"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Description</label>
                                    <textarea 
                                        className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px]"
                                        value={form.description} 
                                        onChange={e => setForm({...form, description: e.target.value})}
                                        placeholder="Brief description..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Icon</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {AVAILABLE_ICONS.map(({ name, icon: Icon }) => (
                                            <div 
                                                key={name}
                                                onClick={() => setForm({...form, icon: name})}
                                                className={`cursor-pointer p-2 border rounded flex flex-col items-center gap-1 hover:bg-slate-50 ${form.icon === name ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-slate-200'}`}
                                            >
                                                <Icon size={20} />
                                                <span className="text-[10px]">{name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Color</label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="color" 
                                            value={form.color} 
                                            onChange={e => setForm({...form, color: e.target.value})} 
                                            className="w-12 h-10 p-1"
                                        />
                                        <Input 
                                            value={form.color} 
                                            onChange={e => setForm({...form, color: e.target.value})} 
                                            placeholder="#000000"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button type="submit" className="flex-1">
                                        <Save className="mr-2 h-4 w-4" />
                                        {editingId ? 'Update' : 'Create'}
                                    </Button>
                                    {editingId && (
                                        <Button type="button" variant="outline" onClick={resetForm}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Topics List</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Topic</TableHead>
                                        <TableHead>Posts</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
                                        </TableRow>
                                    ) : topics.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No topics found</TableCell>
                                        </TableRow>
                                    ) : (
                                        topics.map(topic => {
                                            const IconComp = AVAILABLE_ICONS.find(i => i.name === topic.icon)?.icon || MessageCircle;
                                            return (
                                                <TableRow key={topic.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div 
                                                                className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
                                                                style={{ backgroundColor: topic.color || '#94a3b8' }}
                                                            >
                                                                <IconComp size={20} />
                                                            </div>
                                                            <div>
                                                                <div className="font-medium">{topic.title}</div>
                                                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">{topic.description}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">{topic._count?.posts || 0} posts</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {new Date(topic.createdAt).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button size="sm" variant="outline" onClick={() => handleEdit(topic)}>
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button size="sm" variant="destructive" onClick={() => handleDelete(topic.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DiscussionTopics;
