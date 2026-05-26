import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, RefreshCw } from 'lucide-react';
import ParticlesBackground from '../components/ui/ParticlesBackground';
import MagneticButton from '../components/MagneticButton';

// Glitch Text Component
const GlitchText = ({ text }) => {
    return (
        <div className="relative inline-block group">
            <span className="relative z-10">{text}</span>
            <span className="absolute top-0 left-0 -z-10 w-full h-full text-indigo-500 opacity-0 group-hover:opacity-70 group-hover:translate-x-[2px] group-hover:translate-y-[-2px] transition-all duration-100 animate-pulse">
                {text}
            </span>
            <span className="absolute top-0 left-0 -z-10 w-full h-full text-red-500 opacity-0 group-hover:opacity-70 group-hover:translate-x-[-2px] group-hover:translate-y-[2px] transition-all duration-100 animate-pulse delay-75">
                {text}
            </span>
        </div>
    );
};

// Scramble Text Effect
const ScrambleText = ({ text, className }) => {
    const [display, setDisplay] = useState(text);
    const chars = '!<>-_\\/[]{}—=+*^?#________';
    
    useEffect(() => {
        let interval;
        let iteration = 0;
        
        const scramble = () => {
            interval = setInterval(() => {
                setDisplay(
                    text
                        .split("")
                        .map((letter, index) => {
                            if (index < iteration) {
                                return text[index];
                            }
                            return chars[Math.floor(Math.random() * chars.length)];
                        })
                        .join("")
                );
                
                if (iteration >= text.length) {
                    clearInterval(interval);
                }
                
                iteration += 1 / 3;
            }, 30);
        };

        scramble();
        
        return () => clearInterval(interval);
    }, [text]);

    return <span className={className}>{display}</span>;
};

const NotFound = () => {
    const navigate = useNavigate();
    
    // Mouse movement logic for 404 Tilt
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    
    const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 15 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-15deg", "15deg"]);

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <div 
            className="relative min-h-screen w-full overflow-hidden bg-[#0a0b0f] text-white selection:bg-indigo-500/30 perspective-1000"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Background */}
            <ParticlesBackground />
            
            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,23,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[1] bg-[length:100%_4px,6px_100%] pointer-events-none" />

            {/* Content Container */}
            <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
                
                {/* 404 Glitch/Layer Effect with Tilt */}
                <motion.div
                    style={{
                        rotateX,
                        rotateY,
                        transformStyle: "preserve-3d",
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative group cursor-default"
                >
                    {/* Background glow */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />

                    {/* Main 404 Text */}
                    <h1 className="relative text-[120px] sm:text-[180px] md:text-[250px] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-600 select-none drop-shadow-2xl z-20">
                        <GlitchText text="404" />
                    </h1>
                    
                    {/* Floating elements */}
                    <motion.div 
                        animate={{ y: [0, -20, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-10 -right-10 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl z-0"
                    />
                    
                    {/* Glitch Overlay Elements */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-100 mix-blend-difference">
                        <h1 className="text-[120px] sm:text-[180px] md:text-[250px] font-black leading-none tracking-tighter text-red-500 translate-x-[2px] blur-[1px]">404</h1>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-100 mix-blend-difference delay-75">
                         <h1 className="text-[120px] sm:text-[180px] md:text-[250px] font-black leading-none tracking-tighter text-cyan-500 -translate-x-[2px] blur-[1px]">404</h1>
                    </div>
                </motion.div>

                {/* Description */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="mt-4 text-center z-20"
                >
                    <h2 className="text-2xl font-bold md:text-4xl bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4 h-12">
                        <ScrambleText text="Lost in the Void" className="" />
                    </h2>
                    <p className="max-w-md mx-auto text-slate-400 md:text-lg leading-relaxed">
                        Halaman yang Anda cari telah menghilang ke dimensi lain atau tidak pernah ada.
                    </p>
                </motion.div>

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="mt-12 flex flex-col gap-4 sm:flex-row items-center z-20"
                >
                    <MagneticButton>
                        <button
                            onClick={() => navigate(-1)}
                            className="group flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/50 px-8 py-4 font-medium text-slate-300 backdrop-blur-md transition-all hover:bg-slate-800 hover:text-white hover:border-slate-500 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        >
                            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                            <span>Kembali</span>
                        </button>
                    </MagneticButton>

                    <MagneticButton>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="group flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-4 font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40 hover:-translate-y-0.5 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <Home className="h-5 w-5 transition-transform group-hover:scale-110 relative z-10" />
                            <span className="relative z-10">Ke Dashboard</span>
                        </button>
                    </MagneticButton>
                </motion.div>

                {/* Decorative Code */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="absolute bottom-8 left-0 w-full text-center flex justify-center gap-4"
                >
                    <code className="px-4 py-2 rounded-lg bg-white/5 text-xs text-slate-500 font-mono border border-white/5 hover:bg-white/10 transition-colors cursor-help">
                        ERROR_CODE: 404_NOT_FOUND
                    </code>
                    <code className="hidden sm:block px-4 py-2 rounded-lg bg-white/5 text-xs text-slate-500 font-mono border border-white/5 hover:bg-white/10 transition-colors cursor-help">
                        SYSTEM_STATUS: CRITICAL_FAILURE
                    </code>
                </motion.div>
            </div>
        </div>
    );
};

export default NotFound;
