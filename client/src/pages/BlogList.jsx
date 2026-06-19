import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBlogPosts } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
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
        <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans overflow-x-hidden transition-colors duration-300">
            {/* Soft background accents */}
            <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-100/60 dark:bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-green-100/50 dark:bg-green-500/10 rounded-full blur-3xl" />
            </div>
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 pt-32 pb-12 relative z-10">
                <div className="max-w-2xl mb-12">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 text-sm font-semibold mb-4">
                        Blog & Berita
                    </span>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
                        Update & Berita{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">Terbaru</span>
                    </h1>
                    <p className="text-lg text-slate-500 dark:text-slate-400">
                        Insight seputar POS, laporan keuangan, dan strategi pertumbuhan bisnis untuk pelaku UMKM Indonesia.
                    </p>
                </div>

                {loading ? (
                    <div className="text-center text-slate-500 dark:text-slate-400">Loading...</div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {posts.map(post => (
                            <Link to={`/blog/${post.slug}`} key={post.id} className="group">
                                <article className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden h-full flex flex-col hover:-translate-y-1">
                                    {post.imageUrl && (
                                        <img
                                            src={post.imageUrl}
                                            alt={post.title}
                                            loading="lazy"
                                            className="w-full h-48 object-cover group-hover:scale-105 transition duration-500"
                                        />
                                    )}
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-3">
                                            <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/20 rounded-full text-xs font-semibold">{post.tags?.[0] || 'News'}</span>
                                            <span className="mx-2">•</span>
                                            <span>{new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition">
                                            {post.title}
                                        </h2>
                                        <p className="text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 flex-1">
                                            {post.summary}
                                        </p>
                                        <div className="flex items-center text-blue-700 dark:text-blue-400 font-semibold">
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
