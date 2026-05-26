import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBlogPostBySlug, getBlogPosts } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import usePageMeta from '../hooks/usePageMeta';

const getBlogDescription = post => {
    if (!post) {
        return 'Baca insight seputar POS, laporan keuangan, dan pengelolaan bisnis untuk UMKM dari RanaPOS.';
    }
    if (post.summary && typeof post.summary === 'string') {
        return post.summary;
    }
    if (typeof post.content === 'string') {
        const text = post.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!text) {
            return 'Baca insight seputar POS, laporan keuangan, dan pengelolaan bisnis untuk UMKM dari RanaPOS.';
        }
        return text.length > 160 ? `${text.slice(0, 157)}...` : text;
    }
    return 'Baca insight seputar POS, laporan keuangan, dan pengelolaan bisnis untuk UMKM dari RanaPOS.';
};

const BlogDetail = () => {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [related, setRelated] = useState([]);

    const pageTitle = post?.title ? `${post.title} | Blog RanaPOS` : 'Artikel RanaPOS | Insight untuk UMKM';
    const pageDescription = getBlogDescription(post);

    usePageMeta({
        title: pageTitle,
        description: pageDescription
    });

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getBlogPostBySlug(slug);
                setPost(data);
                try {
                    const list = await getBlogPosts();
                    const items = Array.isArray(list?.posts) ? list.posts : list;
                    const filtered = (items || [])
                        .filter(item => item.slug !== slug)
                        .filter(item => {
                            if (!data?.tags || data.tags.length === 0) return true;
                            if (!item.tags || item.tags.length === 0) return false;
                            return item.tags.some(t => data.tags.includes(t));
                        })
                        .slice(0, 3);
                    setRelated(filtered);
                } catch (err) {
                    console.error(err);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [slug]);

    if (loading) return <div className="min-h-screen grid place-items-center">Loading...</div>;
    if (!post) return <div className="min-h-screen grid place-items-center">Post not found</div>;

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0b0f] via-[#0b1020] to-[#0a0b0f] text-slate-200 overflow-x-hidden">
            <Navbar />

            <article className="max-w-4xl mx-auto px-4 pt-32 pb-12">
                <div className="text-center mb-12">
                    <div className="flex justify-center gap-2 mb-6">
                        {post.tags?.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-white/10 border border-white/10 text-indigo-300 rounded-full text-sm font-medium">
                                {tag}
                            </span>
                        ))}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                        {post.title}
                    </h1>
                    <div className="text-slate-400">
                        Oleh <span className="text-slate-200 font-medium">{post.author}</span> • {new Date(post.publishedAt || post.createdAt).toLocaleDateString()}
                    </div>
                </div>

                {post.imageUrl && (
                    <img
                        src={post.imageUrl}
                        alt={post.title}
                        loading="lazy"
                        className="w-full h-[400px] object-cover rounded-3xl mb-12 shadow-[0_20px_50px_rgba(79,70,229,0.2)]"
                    />
                )}

                <div
                    className="mx-auto text-slate-200 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />
            </article>

            <div className="max-w-4xl mx-auto px-4 pb-12 space-y-10">
                {related.length > 0 && (
                    <section className="border-t border-white/10 pt-10">
                        <h2 className="text-2xl font-bold text-white mb-4">Artikel terkait</h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            {related.map(item => (
                                <Link
                                    key={item.id || item.slug}
                                    to={`/blog/${item.slug}`}
                                    className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors flex flex-col"
                                >
                                    <div className="text-xs text-slate-400 mb-2">
                                        {item.tags && item.tags[0] ? item.tags[0] : 'Insight'}
                                    </div>
                                    <div className="font-semibold text-slate-50 mb-2 line-clamp-2">
                                        {item.title}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-auto">
                                        {new Date(item.publishedAt || item.createdAt).toLocaleDateString()}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                <section className="border-t border-white/10 pt-10 text-center space-y-4">
                    <h2 className="text-xl md:text-2xl font-bold text-white">
                        Ingin menerapkan insight ini di bisnis Anda?
                    </h2>
                    <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto">
                        Tim Rana siap membantu Anda memilih setup POS dan laporan yang paling cocok dengan model usaha Anda.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
                        <Link
                            to="/features"
                            className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-100 text-sm font-medium hover:bg-white/10 transition"
                        >
                            Lihat fitur Rana
                        </Link>
                        <Link
                            to="/contact"
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-[0_10px_30px_rgba(79,70,229,0.35)] hover:shadow-[0_15px_40px_rgba(124,58,237,0.45)] transition"
                        >
                            Konsultasi dengan tim Rana
                        </Link>
                    </div>
                    <div className="mt-6">
                        <Link to="/blog" className="inline-block px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-200 hover:bg-white/10 transition">
                            &larr; Kembali ke daftar artikel
                        </Link>
                    </div>
                    </section>
            </div>
            <Footer />
        </div>
    );
};

export default BlogDetail;
