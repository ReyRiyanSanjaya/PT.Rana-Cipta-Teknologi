import React, { useEffect, useState } from 'react';
import api from '../api';
import { 
    MessageSquare, Trash2, Search, Filter, Calendar, User 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

const Discussions = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchPosts = async () => {
        try {
            const res = await api.get('/admin/community/posts');
            if (res.data.success) {
                setPosts(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch posts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this post? This cannot be undone.")) return;
        try {
            await api.delete(`/admin/community/posts/${id}`);
            fetchPosts();
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete post");
        }
    };

    const filteredPosts = posts.filter(post => 
        post.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.author?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Manage Discussions</h2>
                    <p className="text-muted-foreground">Monitor and manage community posts.</p>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle>Posts List</CardTitle>
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search posts..." 
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Post</TableHead>
                                <TableHead>Author</TableHead>
                                <TableHead>Stats</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : filteredPosts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No posts found</TableCell>
                                </TableRow>
                            ) : (
                                filteredPosts.map(post => (
                                    <TableRow key={post.id}>
                                        <TableCell className="max-w-md">
                                            <div className="flex flex-col gap-1">
                                                <div className="font-medium line-clamp-1">{post.title || "No Title"}</div>
                                                <div className="text-xs text-muted-foreground line-clamp-2">{post.content}</div>
                                                <div className="flex gap-2 mt-1">
                                                    <Badge variant="outline" className="text-[10px] py-0 h-5">
                                                        {post.topic?.title}
                                                    </Badge>
                                                    {post.tags?.map(tag => (
                                                        <span key={tag} className="text-[10px] text-blue-600">#{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback>{post.author?.name?.[0] || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{post.author?.name}</span>
                                                    <span className="text-xs text-muted-foreground">{post.author?.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1"><MessageSquare size={12}/> {post._count?.comments || 0}</span>
                                                <span className="flex items-center gap-1"><User size={12}/> {post._count?.postLikes || 0}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={12}/>
                                                {new Date(post.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="text-[10px] opacity-70">
                                                {new Date(post.createdAt).toLocaleTimeString()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="destructive" onClick={() => handleDelete(post.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default Discussions;
