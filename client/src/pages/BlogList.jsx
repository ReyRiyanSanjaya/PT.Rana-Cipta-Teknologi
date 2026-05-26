import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { getBlogPosts } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Experience from '../components/3d/Experience';
import usePageMeta from '../hooks/usePageMeta';

const BlogList = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    usePageMeta({
        title: 'Blog RanaPOS | Insight & update untuk UMKM',
        description: 'Artikel seputar POS, laporan keuangan, dan strategi pertumbuhan bisnis untuk pelaku UMKM Indonesia.'
    });

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getBlogPosts();
                setPosts(data.posts);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0b0f] via-[#0b1020] to-[#0a0b0f] text-slate-200 relative overflow-x-hidden">
            <div className="fixed inset-0 z-0 pointer-events-none opacity-25" aria-hidden="true">
                <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
                    <Experience />
                </Canvas>
            </div>
            <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-600/30 to-violet-600/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 rounded-full blur-3xl" />
            </div>
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 pt-32 pb-12 relative z-10">
                <h1 className="text-4xl font-bold text-white mb-8">Update & Berita Terbaru</h1>

                {loading ? (
                    <div className="text-center">Loading...</div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {posts.map(post => (
                            <Link to={`/blog/${post.slug}`} key={post.id} className="group">
                                <article className="bg-white/5 border border-white/10 rounded-2xl transition overflow-hidden h-full flex flex-col hover:-translate-y-1 duration-300">
                                    {post.imageUrl && (
                                        <img
                                            src={post.imageUrl}
                                            alt={post.title}
                                            loading="lazy"
                                            className="w-full h-48 object-cover group-hover:scale-105 transition duration-500"
                                        />
                                    )}
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex items-center text-sm text-slate-400 mb-3">
                                            <span className="px-2 py-0.5 bg-white/10 border border-white/10 rounded-full">{post.tags?.[0] || 'News'}</span>
                                            <span className="mx-2">•</span>
                                            <span>{new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <h2 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition">
                                            {post.title}
                                        </h2>
                                        <p className="text-slate-300 line-clamp-3 mb-4 flex-1">
                                            {post.summary}
                                        </p>
                                        <div className="flex items-center text-indigo-300 font-medium">
                                            Baca Selengkapnya &rarr;
                                        </div>
                                    </div>
                                </article>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default BlogList;
