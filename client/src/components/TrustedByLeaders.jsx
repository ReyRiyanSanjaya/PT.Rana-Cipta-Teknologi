import React, { useEffect, useState } from 'react';
import { Coffee, ShoppingBag, Smartphone, ShoppingCart, Utensils, Zap, Globe, Award, Store, MapPin, BadgeCheck } from 'lucide-react';
import api from '../services/api';

const fallbackBrands = [
    { name: "Urban Coffee", icon: Coffee, color: "text-amber-400", category: "F&B", description: "Specialty coffee roaster & cafe chain.", location: "Jakarta Selatan" },
    { name: "Fresh Mart", icon: ShoppingCart, color: "text-emerald-400", category: "Retail", description: "Daily fresh groceries delivered fast.", location: "Surabaya" },
    { name: "Tech Zone", icon: Smartphone, color: "text-blue-400", category: "Electronics", description: "Premium gadgets and accessories store.", location: "Bandung" },
    { name: "Luxe Fashion", icon: ShoppingBag, color: "text-rose-400", category: "Fashion", description: "Modern apparel for the trendsetters.", location: "Medan" },
    { name: "Bistro 99", icon: Utensils, color: "text-orange-400", category: "Restaurant", description: "Authentic flavors with a modern twist.", location: "Bali" },
    { name: "Global Trade", icon: Globe, color: "text-cyan-400", category: "Wholesale", description: "International import & export partner.", location: "Semarang" },
    { name: "Fast Pay", icon: Zap, color: "text-yellow-400", category: "Services", description: "Digital payment solutions for everyone.", location: "Jakarta Pusat" },
    { name: "Elite Corp", icon: Award, color: "text-purple-400", category: "Corporate", description: "Business consulting and strategy.", location: "Yogyakarta" },
];

const TrustedByLeaders = ({ className = "", align = "center" }) => {
    const [brands, setBrands] = useState(fallbackBrands);

    useEffect(() => {
        const fetchStores = async () => {
            try {
                const res = await api.get('/system/stores/featured');
                if (res.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
                     const realBrands = res.data.data.map(store => ({
                         name: store.name,
                         icon: Store,
                         color: 'text-indigo-400',
                         imageUrl: store.imageUrl,
                         category: store.category || 'Merchant',
                         description: store.description || 'Mitra resmi terpercaya Rana POS.',
                         location: store.location || 'Indonesia'
                     }));
                     
                     let finalBrands = [];
                     if (realBrands.length < 5) {
                         finalBrands = [...realBrands, ...fallbackBrands.slice(0, 8 - realBrands.length)];
                     } else {
                         finalBrands = realBrands;
                     }

                     // Randomize order for dynamic feel
                     for (let i = finalBrands.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [finalBrands[i], finalBrands[j]] = [finalBrands[j], finalBrands[i]];
                     }

                     setBrands(finalBrands);
                }
            } catch (error) {
                // Silently fail to fallback
            }
        };
        fetchStores();
    }, []);

    return (
        <div className={`w-full py-16 ${className}`}>
            <div className={`${align === 'center' ? 'text-center' : 'text-left'} mb-16 relative`}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-20 bg-indigo-500/20 blur-[60px] rounded-full pointer-events-none"></div>
                <h2 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-sm tracking-tight mb-4">
                    Dipercaya oleh Mitra Kita
                </h2>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium leading-relaxed">
                    Bergabung bersama ribuan bisnis yang telah bertransformasi digital
                </p>
            </div>
            
            <div className="relative flex overflow-x-hidden group py-4 [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
                <div className="flex animate-marquee whitespace-nowrap gap-6 items-stretch hover:[animation-play-state:paused]">
                    {[...brands, ...brands, ...brands].map((brand, index) => (
                        <div 
                            key={`${brand.name}-${index}`} 
                            className="relative flex flex-col gap-4 p-5 rounded-3xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-md hover:bg-[#0f172a]/80 hover:border-indigo-500/30 hover:shadow-[0_0_40px_rgba(99,102,241,0.1)] hover:-translate-y-1 transition-all duration-300 cursor-default group/card min-w-[320px] max-w-[320px]"
                        >
                            {/* Header */}
                            <div className="flex items-center gap-4">
                                {brand.imageUrl ? (
                                    <img src={brand.imageUrl} alt={brand.name} className="w-12 h-12 rounded-xl object-cover shadow-lg shadow-black/30 ring-1 ring-white/10" />
                                ) : (
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5 flex items-center justify-center ${brand.color} shadow-inner`}>
                                        <brand.icon size={24} />
                                    </div>
                                )}
                                <div className="flex flex-col overflow-hidden">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-base font-bold text-slate-100 truncate group-hover/card:text-white transition-colors">{brand.name}</span>
                                        <BadgeCheck size={14} className="text-blue-400 shrink-0" fill="currentColor" color="#0f172a" />
                                    </div>
                                    {brand.category && (
                                        <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">{brand.category}</span>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-slate-400 leading-relaxed line-clamp-2 whitespace-normal h-10">
                                {brand.description}
                            </p>

                            {/* Footer */}
                            <div className="mt-auto pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-slate-500">
                                <MapPin size={12} className="text-slate-600" />
                                <span className="truncate">{brand.location || 'Indonesia'}</span>
                            </div>

                            {/* Hover Glow Effect */}
                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TrustedByLeaders;
