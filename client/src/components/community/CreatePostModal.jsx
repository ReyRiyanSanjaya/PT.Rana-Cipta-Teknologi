import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hash, Send } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from '../../context/AuthContext';
import './quill-dark.css'; // Custom CSS for dark mode

const CreatePostModal = ({ isOpen, onClose, onCreatePost, topics = [], postToEdit = null }) => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    const [selectedTopicId, setSelectedTopicId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const quillRef = React.useRef(null);

    // Initialize state when modal opens or postToEdit changes
    React.useEffect(() => {
        if (isOpen && postToEdit) {
            setContent(postToEdit.content || '');
            setTags(postToEdit.tags ? postToEdit.tags.join(', ') : '');
            setSelectedTopicId(postToEdit.topicId || '');
        } else if (isOpen) {
            setContent('');
            setTags('');
            setSelectedTopicId('');
        }
    }, [isOpen, postToEdit]);

    const isEditing = !!postToEdit;

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'image', 'code-block'],
            ['clean']
        ],
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'list', 'bullet',
        'link', 'image', 'code-block'
    ];

    const handleSubmit = async () => {
        if (!content.trim()) return;
        
        // If no topic selected, default to first one or handle error. 
        // For now let's assume if topics available, user should pick one.
        // Or default to "General" (id=1 or something). 
        // Let's force selection if topics are passed.
        
        const topicIdToUse = selectedTopicId || (topics.length > 0 ? topics[0].id : 1);

        setIsLoading(true);
        
        // Only send necessary data
        const postData = {
            content,
            tags: tags.split(',').map(t => t.trim()).filter(t => t),
            topicId: Number(topicIdToUse)
        };

        await onCreatePost(postData);
        setContent('');
        setTags('');
        setSelectedTopicId('');
        setIsLoading(false);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="bg-[#1a1c29] border border-white/10 w-full max-w-2xl rounded-2xl overflow-hidden relative z-10 shadow-2xl flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#0a0b0f]/50 shrink-0">
                            <h3 className="text-lg font-bold text-white">{isEditing ? 'Edit Diskusi' : 'Buat Diskusi Baru'}</h3>
                            <button 
                                onClick={onClose}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        {/* Editor */}
                        <div className="p-4 md:p-6 overflow-y-auto flex-1 custom-scrollbar relative z-10">
                            {/* Decorative elements inside modal */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            
                            <div className="flex gap-4 mb-6 relative">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shrink-0 border-2 border-white/10 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                                    {user?.name?.charAt(0) || 'U'}
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-white text-base mb-1 flex items-center gap-2">
                                        {user?.name}
                                        <span className="text-[10px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-lg">Author</span>
                                    </div>
                                    <div className="text-xs text-indigo-300 bg-indigo-500/10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                        Posting ke Publik
                                    </div>
                                </div>
                            </div>

                            <div className="group relative mb-6">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-50 transition duration-500 blur" />
                                <div className="relative bg-[#0a0b0f]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-1">
                                    <ReactQuill 
                                        ref={quillRef}
                                        theme="snow"
                                        value={content}
                                        onChange={setContent}
                                        modules={modules}
                                        formats={formats}
                                        className="w-full text-slate-200"
                                        placeholder="Apa yang ingin Anda diskusikan? Bagikan pengalaman, pertanyaan, atau tips bisnis..."
                                    />
                                </div>
                            </div>

                            {/* Tags Input Area */}

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-indigo-500 rounded-full" />
                                        Pilih Topik
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {topics.map(topic => (
                                            <button
                                                key={topic.id}
                                                onClick={() => setSelectedTopicId(topic.id)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 border relative overflow-hidden group ${
                                                    selectedTopicId === topic.id 
                                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' 
                                                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/30 hover:bg-white/10'
                                                }`}
                                            >
                                                <span className="relative z-10">{topic.title}</span>
                                                {selectedTopicId === topic.id && (
                                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 animate-pulse" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-purple-500 rounded-full" />
                                        Tags
                                    </label>
                                    <div className="group relative">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-20 group-focus-within:opacity-50 transition duration-500 blur" />
                                        <div className="relative flex items-center gap-3 bg-[#0a0b0f]/80 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 group-focus-within:border-white/20 transition-colors">
                                            <Hash size={18} className="text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                            <input 
                                                type="text" 
                                                value={tags}
                                                onChange={(e) => setTags(e.target.value)}
                                                placeholder="marketing, promosi, inspirasi (pisahkan dengan koma)"
                                                className="bg-transparent w-full text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 md:p-6 bg-[#0a0b0f]/80 backdrop-blur-xl border-t border-white/10 flex justify-between items-center shrink-0 relative z-20">
                            <button className="text-slate-500 text-sm hover:text-white transition-colors font-medium px-4 py-2 hover:bg-white/5 rounded-lg">
                                Simpan sebagai Draft
                            </button>
                            <button 
                                onClick={handleSubmit}
                                disabled={!content.trim() || isLoading}
                                className="relative group overflow-hidden px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <div className="relative flex items-center gap-2">
                                    {isLoading ? 'Memposting...' : (isEditing ? 'Simpan Perubahan' : 'Posting Diskusi')}
                                    {!isLoading && <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                </div>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CreatePostModal;
