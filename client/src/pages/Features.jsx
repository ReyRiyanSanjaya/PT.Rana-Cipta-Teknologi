import React, { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sphere, MeshDistortMaterial, Torus, Text } from '@react-three/drei';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Experience from '../components/3d/Experience';
import useCms from '../hooks/useCms';
import usePageMeta from '../hooks/usePageMeta';
import { 
    CheckCircle, 
    BarChart3, 
    Package, 
    Users, 
    TrendingUp, 
    Smartphone,
    Shield,
    Zap,
    Globe,
    CreditCard,
    Receipt,
    Calculator,
    Database,
    Cloud,
    Settings,
    Award,
    Clock,
    Target,
    Rocket,
    ArrowRight,
    Cpu,
    Server,
    Wind
} from 'lucide-react';
import * as THREE from 'three';

// #region 3D Components

const ParticleDot = ({ particle, mouseX, mouseY, scrollYProgress }) => {
    const x = useTransform(mouseX, [-1, 1], [particle.x * 50 - 25, particle.x * -50 + 25]);
    const y = useTransform(mouseY, [-1, 1], [particle.y * 50 - 25, particle.y * -50 + 25]);
    const scale = useTransform(scrollYProgress, [0, 1], [1, 3 - particle.speed * 5]);
    const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

    return (
        <motion.div
            className="absolute rounded-full bg-white/10"
            style={{
                width: particle.size,
                height: particle.size,
                x,
                y,
                left: `${50 + particle.x * 50}%`,
                top: `${50 + particle.y * 50}%`,
                scale,
                opacity
            }}
        />
    );
};

const Particles = ({ count = 100, mouseX, mouseY, scrollYProgress }) => {
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const size = Math.random() * 1.5 + 0.5;
            const x = (Math.random() - 0.5) * 2;
            const y = (Math.random() - 0.5) * 2;
            const speed = Math.random() * 0.2 + 0.1;
            temp.push({ size, x, y, speed });
        }
        return temp;
    }, [count]);

    return (
        <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
            {particles.map((p, i) => (
                <ParticleDot
                    key={i}
                    particle={p}
                    mouseX={mouseX}
                    mouseY={mouseY}
                    scrollYProgress={scrollYProgress}
                />
            ))}
        </div>
    );
};

const FeatureSphere = ({ position, color, feature, index, onHover, onPointerOut }) => {
    const meshRef = useRef();
    
    return (
        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
            <Sphere 
                ref={meshRef} 
                position={position} 
                args={[0.8, 32, 32]}
                onPointerOver={(e) => (e.stopPropagation(), onHover(index))}
                onPointerOut={onPointerOut}
            >
                <MeshDistortMaterial
                    color={color}
                    attach="material"
                    distort={0.3}
                    speed={2}
                    roughness={0.2}
                    metalness={0.8}
                />
            </Sphere>
        </Float>
    );
};

const TorusConnection = ({ start, end }) => {
    const ref = useRef();

    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const distance = startVec.distanceTo(endVec);
    const midPoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);

    useFrame(() => {
        if (ref.current) {
            ref.current.position.copy(midPoint);
            ref.current.lookAt(endVec);
        }
    });

    return (
        <Torus ref={ref} args={[distance / 2, 0.02, 8, 50]}>
            <meshStandardMaterial color="#888" emissive="#333" roughness={0.5} />
        </Torus>
    );
};

const FeatureShowcase3D = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const updateIsMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        updateIsMobile();
        window.addEventListener('resize', updateIsMobile);
        return () => window.removeEventListener('resize', updateIsMobile);
    }, []);

    const layers = [
        {
            label: 'Frontline • POS & Payment',
            detail: 'Kasir, QRIS, kartu, dan e-wallet di titik transaksi.',
            y: 2.2,
            color: '#38bdf8'
        },
        {
            label: 'Operasional • Inventory & CRM',
            detail: 'Pergerakan stok dan relasi pelanggan.',
            y: 0,
            color: '#22c55e'
        },
        {
            label: 'Insight & Infrastruktur • Laporan & Cloud',
            detail: 'Laporan keuangan, backup, dan multi-cabang.',
            y: -2.2,
            color: '#a855f7'
        }
    ];

    if (isMobile) {
        return (
            <div className="relative w-full h-full flex flex-col justify-center gap-4">
                <div className="space-y-3">
                    {layers.map((layer) => (
                        <div
                            key={layer.label}
                            className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3"
                        >
                            <div className="flex items-center gap-2 mb-1.5">
                                <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: layer.color }}
                                />
                                <span className="text-xs font-semibold text-slate-100">
                                    {layer.label}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-300">{layer.detail}</p>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-slate-400">
                    Di layar lebar, visual ini tampil sebagai tumpukan layer 3D yang saling terhubung.
                </p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full">
            <Canvas camera={{ position: [0, 0, 11], fov: 60 }}>
                <ambientLight intensity={0.7} />
                <directionalLight position={[10, 10, 6]} intensity={1.1} />
                <pointLight position={[-8, -10, -10]} color="#3b82f6" intensity={0.9} />

                <Float speed={1.1} rotationIntensity={0.35} floatIntensity={0.55}>
                    <Sphere args={[0.9, 40, 40]} position={[0, 0, 0]}>
                        <MeshDistortMaterial
                            color="#0f172a"
                            attach="material"
                            distort={0.2}
                            speed={1.6}
                            roughness={0.2}
                            metalness={0.8}
                        />
                    </Sphere>
                    <Torus args={[1.25, 0.04, 24, 140]} position={[0, 0, 0]}>
                        <meshStandardMaterial
                            color="#38bdf8"
                            emissive="#22c55e"
                            emissiveIntensity={0.25}
                            metalness={0.9}
                            roughness={0.15}
                        />
                    </Torus>
                    <Text
                        position={[0, -1.8, 0]}
                        color="#e5e7eb"
                        fontSize={0.35}
                        maxWidth={3}
                        textAlign="center"
                        anchorX="center"
                        anchorY="middle"
                    >
                        Rana System
                    </Text>
                    <Text
                        position={[0, -2.4, 0]}
                        color="#9ca3af"
                        fontSize={0.26}
                        maxWidth={3.5}
                        textAlign="center"
                        anchorX="center"
                        anchorY="middle"
                    >
                        Data terpusat, layer operasional di atasnya
                    </Text>
                </Float>

                {layers.map((layer, i) => (
                    <Float
                        key={layer.label}
                        speed={1.1 + i * 0.15}
                        rotationIntensity={0.25}
                        floatIntensity={0.4}
                    >
                        <Torus position={[0, layer.y, 0]} args={[2.4, 0.07, 22, 130]}>
                            <meshStandardMaterial
                                color={layer.color}
                                emissive={layer.color}
                                emissiveIntensity={0.25}
                                metalness={0.85}
                                roughness={0.18}
                            />
                        </Torus>
                        <Text
                            position={[0, layer.y, 0.9]}
                            color="#e5e7eb"
                            fontSize={0.34}
                            maxWidth={4}
                            lineHeight={1.1}
                            textAlign="center"
                            anchorX="center"
                            anchorY="middle"
                        >
                            {layer.label}
                        </Text>
                        <Text
                            position={[0, layer.y - 0.6, 0.9]}
                            color="#9ca3af"
                            fontSize={0.24}
                            maxWidth={4.2}
                            lineHeight={1.1}
                            textAlign="center"
                            anchorX="center"
                            anchorY="middle"
                        >
                            {layer.detail}
                        </Text>
                    </Float>
                ))}

                <OrbitControls
                    enablePan={false}
                    enableZoom={false}
                    maxPolarAngle={Math.PI / 2}
                    minPolarAngle={Math.PI / 2}
                    autoRotate
                    autoRotateSpeed={0.5}
                />
            </Canvas>
        </div>
    );
};

const BusinessImpact3D = () => {
    const items = [
        { text: "Efisiensi +30%", position: [-3, 0, 0], color: "#22c55e" },
        { text: "Profit +15%", position: [3, 0, 0], color: "#3b82f6" },
        { text: "Kepuasan Pelanggan +25%", position: [0, 3, 0], color: "#f97316" },
    ];

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const updateIsMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        updateIsMobile();
        window.addEventListener('resize', updateIsMobile);
        return () => window.removeEventListener('resize', updateIsMobile);
    }, []);

    if (isMobile) {
        return (
            <div className="h-full grid grid-cols-1 gap-4 items-center">
                {items.map((item) => (
                    <div
                        key={item.text}
                        className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex items-center justify-between"
                    >
                        <span className="text-sm text-slate-200">{item.text}</span>
                        <span className="ml-4 inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-900/70 text-slate-100 border border-white/10">
                            Impact
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
            <ambientLight intensity={0.7} />
            <directionalLight intensity={1} position={[5, 5, 5]} />
            <Suspense fallback={null}>
                {items.map((item, i) => (
                    <Float key={i} speed={1.5} rotationIntensity={0.2} floatIntensity={0.8}>
                        <Torus position={item.position} args={[1, 0.1, 16, 100]}>
                            <meshStandardMaterial color={item.color} roughness={0.1} metalness={0.9} />
                        </Torus>
                        <Text
                            position={[item.position[0], item.position[1], item.position[2] + 1.2]}
                            color="white"
                            fontSize={0.4}
                            maxWidth={2}
                            lineHeight={1}
                            letterSpacing={0.02}
                            textAlign="center"
                            anchorX="center"
                            anchorY="middle"
                        >
                            {item.text}
                        </Text>
                    </Float>
                ))}
            </Suspense>
            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.4} />
        </Canvas>
    );
};

// #endregion

// #region UI Components

const FeatureCard = ({ icon: Icon, title, description, benefits, color, delay = 0 }) => {
    const cardRef = useRef();
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay }}
            whileHover={{ 
                scale: 1.05,
                rotateY: 5,
                transition: { duration: 0.3 }
            }}
            viewport={{ once: true }}
            className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all duration-500 cursor-pointer"
            style={{
                transformStyle: 'preserve-3d',
                perspective: '1000px'
            }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
        >
            <motion.div
                className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ transform: 'translateZ(20px)' }}
            />
            
            <motion.div
                className="absolute inset-0 rounded-3xl"
                animate={{
                    boxShadow: isHovered 
                        ? `0 0 30px ${color.split(' ')[0].replace('from-','rgba(').replace('-500',',0.3)').replace('blue','59, 130, 246').replace('green','16, 185, 129').replace('amber','245, 158, 11').replace('purple','139, 92, 246').replace('indigo','99, 102, 241').replace('teal','20, 184, 166')}, 0 0 60px ${color.split(' ')[1].replace('to-','rgba(').replace('-600',',0.2)').replace('blue','96, 165, 250').replace('green','5, 150, 105').replace('amber','217, 119, 6').replace('purple','124, 58, 237').replace('indigo','88, 81, 216').replace('teal','13, 148, 136')}`
                        : '0 0 0px rgba(0,0,0,0)'
                }}
                transition={{ duration: 0.3 }}
            />
            
            <div className="relative z-10 pb-20 lg:pb-28">
                <motion.div 
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300`}
                    style={{ transform: 'translateZ(40px)' }}
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                >
                    <Icon size={28} className="text-white" />
                </motion.div>
                
                <motion.h3 
                    className="text-2xl font-bold text-white mb-4 group-hover:text-blue-300 transition-colors duration-300"
                    style={{ transform: 'translateZ(30px)' }}
                >
                    {title}
                </motion.h3>
                
                <p className="text-slate-300 leading-relaxed mb-6 group-hover:text-slate-200 transition-colors duration-300">
                    {description}
                </p>
                
                <div className="space-y-3">
                    {benefits.map((benefit, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: delay + 0.2 + index * 0.1 }}
                            whileHover={{ x: 5, scale: 1.02 }}
                            className="flex items-center gap-3 group/benefit"
                        >
                            <motion.div 
                                className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 group-hover/benefit:scale-125 transition-transform duration-300"
                            />
                            <span className="text-slate-400 text-sm group-hover/benefit:text-slate-200 transition-colors duration-300">
                                {benefit}
                            </span>
                        </motion.div>
                    ))}
                </div>
                
                <motion.div
                    className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ transform: 'translateZ(50px)' }}
                >
                    <ArrowRight size={20} className="text-blue-400" aria-hidden="true" focusable="false" />
                </motion.div>
            </div>
        </motion.div>
    );
};

const StatCard = ({ value, label, icon: Icon, color, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{
            y: -8,
            scale: 1.02
        }}
        transition={{ duration: 0.6, delay }}
        viewport={{ once: true }}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/90 shadow-[0_22px_60px_rgba(15,23,42,0.85)]"
    >
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.32),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(45,212,191,0.25),_transparent_55%)]" />
        <motion.div
            className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-emerald-400/20 to-cyan-400/0"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        />
        <div className="relative p-6 flex flex-col items-center text-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-1 shadow-[0_0_25px_rgba(129,140,248,0.35)]`}>
                <Icon size={22} className="text-slate-950" />
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">{value}</div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</div>
        </div>
    </motion.div>
);

const TechnologyStack = () => {
    const techs = [
        { name: "React", icon: Wind, description: "Frontend library" },
        { name: "Node.js", icon: Cpu, description: "Backend runtime" },
        { name: "MongoDB", icon: Database, description: "NoSQL Database" },
        { name: "Socket.IO", icon: Zap, description: "Real-time engine" },
        { name: "Three.js", icon: Globe, description: "3D Graphics" },
        { name: "Cloudflare", icon: Server, description: "CDN & Security" },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {techs.map((tech, i) => (
                <motion.div
                    key={tech.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="flex flex-col items-center text-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                    <tech.icon size={32} className="mb-3 text-blue-400" />
                    <h4 className="font-bold text-white">{tech.name}</h4>
                    <p className="text-xs text-slate-400">{tech.description}</p>
                </motion.div>
            ))}
        </div>
    );
};

// #endregion

const Features = () => {
    const containerRef = useRef();
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isMobile, setIsMobile] = useState(false);
    const [activeSection, setActiveSection] = useState('hero');

    usePageMeta({
        title: 'Fitur RanaPOS | POS, inventory, dan laporan keuangan otomatis',
        description: 'Jelajahi fitur RanaPOS: POS cerdas, manajemen stok real-time, laporan keuangan otomatis, CRM, dan promo engine untuk pertumbuhan bisnis UMKM.'
    });
    
    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({
                x: (e.clientX / window.innerWidth - 0.5) * 2,
                y: (e.clientY / window.innerHeight - 0.5) * 2
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        const updateIsMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        updateIsMobile();
        window.addEventListener('resize', updateIsMobile);
        return () => window.removeEventListener('resize', updateIsMobile);
    }, []);

    const sectionNav = useMemo(
        () => [
            { id: 'hero', label: 'Gambaran Besar', short: 'Hero' },
            { id: 'key-numbers', label: 'Angka Kunci', short: 'Stats' },
            { id: 'why-rana', label: 'Kenapa Rana', short: 'Value' },
            { id: 'daily-flow', label: 'Alur Harian', short: 'Flow' },
            { id: 'all-features', label: 'Semua Fitur', short: 'Features' },
            { id: 'ecosystem', label: 'Ekosistem 3D', short: '3D Map' },
            { id: 'impact', label: 'Dampak Bisnis', short: 'Impact' },
            { id: 'stack', label: 'Teknologi', short: 'Stack' },
            { id: 'implementation', label: 'Implementasi', short: 'Rollout' },
            { id: 'faq', label: 'Pertanyaan Umum', short: 'FAQ' }
        ],
        []
    );

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.target.id) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { threshold: 0.4 }
        );

        sectionNav.forEach((section) => {
            const element = document.getElementById(section.id);
            if (element) {
                observer.observe(element);
            }
        });

        return () => {
            observer.disconnect();
        };
    }, [sectionNav]);

    const smoothMouse = {
        x: useSpring(useTransform(useSpring(mousePosition.x), v => v * 20), { stiffness: 400, damping: 30 }),
        y: useSpring(useTransform(useSpring(mousePosition.y), v => v * 20), { stiffness: 400, damping: 30 })
    };

    const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.8]);

    const features = [
        {
            icon: Calculator,
            title: "Point of Sale (POS) Cerdas",
            description: "Sistem kasir modern dengan antarmuka intuitif dan pemrosesan transaksi super cepat. Mendukung berbagai metode pembayaran dan integrasi perangkat keras.",
            benefits: [
                "Proses transaksi dalam hitungan detik",
                "Mendukung cash, card, dan digital payment",
                "Antarmuka responsif untuk tablet dan mobile",
                "Offline mode saat internet terputus",
                "Custom receipt dan tax calculation"
            ],
            color: "from-blue-500 to-blue-600"
        },
        {
            icon: Package,
            title: "Manajemen Inventory Real-time",
            description: "Pantau stok barang secara otomatis dengan sistem tracking canggih. Dapatkan notifikasi low stock dan analisis penjualan produk.",
            benefits: [
                "Update stok otomatis setiap transaksi",
                "Notifikasi stok menipis via WhatsApp",
                "Analisis produk terlaris dan slow moving",
                "Multi-location inventory tracking",
                "Purchase order otomatis ke supplier"
            ],
            color: "from-green-500 to-green-600"
        },
        {
            icon: BarChart3,
            title: "Analytics & Business Intelligence",
            description: "Dapatkan insight mendalam tentang performa bisnis Anda dengan dashboard analitik real-time dan laporan keuangan komprehensif.",
            benefits: [
                "Dashboard real-time 24/7",
                "Laporan profit & loss otomatis",
                "Analisis tren penjualan harian/mingguan/bulanan",
                "Customer behavior analytics",
                "Export laporan ke Excel/PDF"
            ],
            color: "from-amber-500 to-amber-600"
        },
        {
            icon: Users,
            title: "Customer Relationship Management",
            description: "Bangun hubungan lebih baik dengan pelanggan melalui sistem CRM terintegrasi. Tracking purchase history dan loyalty program.",
            benefits: [
                "Database customer otomatis",
                "Purchase history dan preference tracking",
                "Loyalty point dan reward system",
                "SMS/WhatsApp marketing integration",
                "Customer segmentation untuk promo target"
            ],
            color: "from-purple-500 to-purple-600"
        },
        {
            icon: CreditCard,
            title: "Multi-Payment Gateway",
            description: "Terima berbagai jenis pembayaran dari cash hingga digital wallet. Integrasi dengan payment gateway terpercaya di Indonesia.",
            benefits: [
                "Integrasi QRIS otomatis",
                "Kartu debit/kredit dengan EDC",
                "Digital wallet: GoPay, OVO, ShopeePay",
                "Split payment untuk group order",
                "Refund dan partial payment support"
            ],
            color: "from-indigo-500 to-indigo-600"
        },
        {
            icon: Receipt,
            title: "E-Receipt & Invoice Management",
            description: "Sistem digital receipt yang ramah lingkungan dan mudah ditracking. Kirim invoice otomatis via email atau WhatsApp.",
            benefits: [
                "Digital receipt via QR code",
                "Email/WhatsApp invoice otomatis",
                "Custom template untuk branding",
                "Tax calculation dan PPN support",
                "Archive system untuk audit trail"
            ],
            color: "from-teal-500 to-teal-600"
        },
        {
            icon: Database,
            title: "Cloud Backup & Sync",
            description: "Data Anda aman di cloud dengan sistem backup otomatis. Akses data dari mana saja dengan keamanan tingkat tinggi.",
            benefits: [
                "Auto backup setiap jam",
                "256-bit encryption security",
                "Multi-device synchronization",
                "Offline mode dengan sync otomatis",
                "Data recovery dan restore point"
            ],
            color: "from-cyan-500 to-cyan-600"
        },
        {
            icon: Settings,
            title: "Multi-User Access Control",
            description: "Kelola tim Anda dengan sistem role-based access control. Berikan hak akses sesuai dengan job description masing-masing.",
            benefits: [
                "Role-based permission system",
                "Owner, Manager, Cashier, dan Staff level",
                "Activity log untuk setiap user",
                "Shift management untuk kasir",
                "Remote monitoring dan control"
            ],
            color: "from-orange-500 to-orange-600"
        },
        {
            icon: Target,
            title: "Flash Sales & Promo Engine",
            description: "Buat campaign marketing yang menarik dengan promo engine canggih. Atur diskon, bundle deal, dan loyalty program dengan mudah.",
            benefits: [
                "Flash sales dengan countdown timer",
                "Bundle deals dan package offers",
                "Member discount otomatis",
                "Happy hour pricing",
                "Voucher dan coupon management"
            ],
            color: "from-red-500 to-red-600"
        }
    ];

    const stats = [
        { value: "50+", label: "Fitur Premium", icon: Award, color: "from-yellow-500 to-orange-500" },
        { value: "10K+", label: "Merchant Aktif", icon: TrendingUp, color: "from-green-500 to-emerald-500" },
        { value: "99.9%", label: "Uptime Server", icon: Shield, color: "from-blue-500 to-cyan-500" },
        { value: "24/7", label: "Support Team", icon: Clock, color: "from-purple-500 to-pink-500" }
    ];

    const faqItems = [
        {
            question: "Apakah Rana bisa digunakan saat internet mati?",
            answer: "Bisa. Transaksi tetap bisa dicatat secara offline dan akan tersinkron otomatis ke server ketika perangkat kembali terhubung ke internet."
        },
        {
            question: "Apakah ada batasan jumlah cabang dan perangkat?",
            answer: "Rana dirancang untuk skala dari satu gerai hingga banyak cabang. Anda bisa menambah perangkat dan cabang sesuai kebutuhan paket berlangganan."
        },
        {
            question: "Data saya aman tidak?",
            answer: "Data disimpan dengan enkripsi dan backup berkala. Akses juga diatur dengan role-based access control, sehingga hanya tim yang berwenang yang dapat melihat data tertentu."
        },
        {
            question: "Apakah ada tim yang membantu onboarding?",
            answer: "Ada. Tim Rana akan membantu proses setup awal, impor data penting, serta pelatihan singkat untuk tim kasir dan manajemen."
        }
    ];

    const [openFaqIndex, setOpenFaqIndex] = useState(0);

    return (
        <div ref={containerRef} className="min-h-screen bg-[#0a0b0f] font-sans text-slate-200 overflow-x-hidden relative">
            <Navbar />

            <motion.div
                className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 via-emerald-400 to-cyan-400 origin-left z-40"
                style={{ scaleX: scrollYProgress }}
            />

            {/* 3D Background Layer */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-25" aria-hidden="true">
                <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
                    <Experience />
                </Canvas>
            </div>
            <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-600/30 to-violet-600/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 rounded-full blur-3xl" />
            </div>

            <Particles count={isMobile ? 40 : 100} mouseX={smoothMouse.x} mouseY={smoothMouse.y} scrollYProgress={scrollYProgress} />

            <div className="fixed inset-x-0 bottom-0 z-30 hidden lg:flex justify-center pointer-events-none px-4 pb-6">
                <div className="pointer-events-auto max-w-xl w-full">
                    <div className="bg-slate-900/80 border border-white/15 rounded-2xl shadow-[0_20px_60px_rgba(15,23,42,0.9)] px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row items-center gap-3">
                        <div className="flex-1 text-left">
                            <div className="text-xs uppercase tracking-[0.18em] text-indigo-300 mb-1">
                                Tertarik dengan fitur RanaPOS?
                            </div>
                            <div className="text-sm text-slate-200">
                                Diskusikan kebutuhan toko Anda dengan tim Rana dan lihat skenario implementasi yang paling pas.
                            </div>
                        </div>
                        <Link
                            to="/contact"
                            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition-colors whitespace-nowrap"
                        >
                            Konsultasi gratis
                        </Link>
                    </div>
                </div>
            </div>

            <motion.section 
                id="hero"
                style={{ opacity: heroOpacity, scale: heroScale }}
                className="min-h-screen flex items-center justify-center sticky top-0 px-4 pt-32 pb-20"
            >
                <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-10 items-center">
                    <div className="text-center lg:text-left space-y-8">
                        <motion.div 
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-emerald-500/30 text-xs font-semibold tracking-[0.2em] uppercase text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <span className="relative flex h-2 w-2">
                                <motion.span 
                                    className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
                                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                            </span>
                            <span>Product Tour</span>
                        </motion.div>
                        <motion.h1 
                            style={{ x: smoothMouse.x, y: smoothMouse.y }}
                            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-tight text-white"
                        >
                            Fitur kelas <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300">enterprise</span> 
                            <br className="hidden md:block" />
                            untuk skala <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">UMKM</span>.
                        </motion.h1>
                        <motion.p 
                            style={{ x: smoothMouse.x, y: smoothMouse.y }}
                            className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
                        >
                            Dari kasir hingga laporan keuangan, <span className="text-blue-300 font-semibold">RanaPOS</span> menyatukan semua data operasional
                            dalam satu layar yang cepat, real-time, dan siap dipakai mengambil keputusan.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                        >
                            <Link
                                to="/register"
                                className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 text-sm md:text-base font-semibold text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,0.6)] hover:shadow-[0_22px_60px_rgba(15,23,42,0.85)] transition-all duration-300 hover:-translate-y-0.5"
                            >
                                Mulai free trial
                                <ArrowRight size={18} className="ml-2" />
                            </Link>
                            <Link
                                to="/contact"
                                className="inline-flex items-center justify-center px-6 py-3 rounded-2xl border border-white/25 text-sm md:text-base font-semibold text-slate-100 bg-white/5 hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                            >
                                Jadwalkan demo dengan tim Rana
                            </Link>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.6 }}
                            className="flex flex-wrap items-center gap-4 justify-center lg:justify-start text-xs md:text-sm text-slate-400"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <CheckCircle size={14} className="text-emerald-400" />
                                </div>
                                <span>Onboarding dibantu tim Rana</span>
                            </div>
                            <div className="h-4 w-px bg-slate-700 hidden md:block" />
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center">
                                    <Shield size={14} className="text-sky-300" />
                                </div>
                                <span>Data terenkripsi & siap audit</span>
                            </div>
                        </motion.div>
                    </div>

                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="w-full"
                    >
                        <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_25px_80px_rgba(15,23,42,0.9)] p-4 md:p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                                    </div>
                                    <div className="text-xs text-slate-300">RanaPOS Feature Console</div>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span className="flex h-2 w-2 relative">
                                        <motion.span 
                                            className="absolute inline-flex h-full w-full rounded-full bg-emerald-400" 
                                            animate={{ opacity: [0.3, 0.8, 0.3] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                    </span>
                                    <span>Realtime synced</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="rounded-2xl bg-slate-900/80 border border-slate-700/60 p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] text-slate-400">POS Today</span>
                                        <span className="text-[11px] text-emerald-400 font-medium">+18%</span>
                                    </div>
                                    <div className="text-lg font-semibold text-slate-50">Rp 24,5jt</div>
                                    <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                                        <div className="h-full w-3/4 bg-gradient-to-r from-indigo-400 to-emerald-400" />
                                    </div>
                                </div>
                                <div className="rounded-2xl bg-slate-900/60 border border-slate-700/60 p-3 flex flex-col justify-between">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] text-slate-400">Inventory Health</span>
                                        <span className="text-[11px] text-cyan-300">Stable</span>
                                    </div>
                                    <div className="flex items-end gap-1 h-10 mt-1">
                                        {[60, 90, 50, 80, 70].map((v, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 rounded-full bg-slate-800 overflow-hidden"
                                            >
                                                <div
                                                    className="w-full bg-gradient-to-t from-cyan-500 to-indigo-400"
                                                    style={{ height: `${v}%` }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-slate-900/70 border border-slate-700/60 p-3 flex items-center justify-between">
                                <div>
                                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 mb-1">
                                        Flash Sales Engine
                                    </div>
                                    <div className="text-sm font-semibold text-slate-50">Happy Hour Kopi Susu</div>
                                    <div className="text-[11px] text-slate-400">Konversi +32% dibanding hari biasa</div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-[10px] text-emerald-300 font-medium">
                                        LIVE
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                        <Users size={12} className="text-indigo-300" />
                                        <span>128 viewer di POS</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.section>
            
            <div className="relative z-10">
                <div className="hidden 2xl:flex fixed right-6 top-1/2 -translate-y-1/2 z-40">
                    <div className="bg-black/40 border border-white/15 rounded-2xl px-3 py-4 backdrop-blur-xl shadow-[0_18px_55px_rgba(15,23,42,0.9)] flex flex-col gap-3">
                        {sectionNav.map((section) => (
                            <button
                                key={section.id}
                                type="button"
                                onClick={() => {
                                    const element = document.getElementById(section.id);
                                    if (element) {
                                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }}
                                className="flex items-center gap-3 group"
                            >
                                <div className="w-1.5 h-10 rounded-full bg-white/10 overflow-hidden">
                                    <motion.div
                                        className="w-full h-full bg-gradient-to-b from-indigo-400 via-violet-400 to-cyan-400"
                                        animate={{
                                            opacity: activeSection === section.id ? 1 : 0.35,
                                            scaleY: activeSection === section.id ? 1 : 0.45
                                        }}
                                        transition={{ duration: 0.25 }}
                                        style={{ transformOrigin: 'center' }}
                                    />
                                </div>
                                <div className="text-left">
                                    <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                        {section.short}
                                    </div>
                                    <div
                                        className={`text-xs font-medium transition-colors ${
                                            activeSection === section.id
                                                ? 'text-white'
                                                : 'text-slate-500 group-hover:text-slate-200'
                                        }`}
                                    >
                                        {section.label}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
                <section id="key-numbers" className="py-20 md:py-24 px-4 md:px-8">
                    <div className="max-w-6xl mx-auto space-y-10">
                        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                            <div>
                                <div className="text-xs font-semibold tracking-[0.25em] uppercase text-indigo-300 mb-2">
                                    Key numbers
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold text-white">
                                    Dibangun untuk skala nasional
                                </h2>
                            </div>
                            <p className="text-sm md:text-base text-slate-400 max-w-md">
                                Angka di bawah ini bergerak seiring pertumbuhan merchant yang menggunakan Rana di berbagai kota dan tipe usaha.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {stats.map((stat, index) => (
                                <StatCard key={index} {...stat} delay={index * 0.08} />
                            ))}
                        </div>
                    </div>
                </section>

                <section id="why-rana" className="py-24 px-4 md:px-8 bg-black/10">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        <div className="space-y-6">
                            <h2 className="text-3xl md:text-4xl font-bold text-white">
                                Kenapa Rana berbeda dari POS lain?
                            </h2>
                            <p className="text-lg text-slate-400">
                                Kami tidak hanya membantu mencatat transaksi, tetapi membangun fondasi data yang kuat untuk pertumbuhan bisnis jangka panjang.
                            </p>
                            <div className="space-y-4">
                                <div className="flex gap-3 items-start">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300">
                                        <CheckCircle size={14} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-white">Fokus UMKM Indonesia</div>
                                        <div className="text-slate-400 text-sm">Didesain sesuai pola operasional toko, restoran, dan gerai ritel di Indonesia.</div>
                                    </div>
                                </div>
                                <div className="flex gap-3 items-start">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                                        <Zap size={14} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-white">Siap offline dan online</div>
                                        <div className="text-slate-400 text-sm">Tetap bisa berjualan saat internet putus dengan sinkronisasi otomatis ketika tersambung kembali.</div>
                                    </div>
                                </div>
                                <div className="flex gap-3 items-start">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-300">
                                        <BarChart3 size={14} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-white">Insight keuangan yang bisa langsung dipakai</div>
                                        <div className="text-slate-400 text-sm">Laporan profit & loss, stok, dan performa cabang dalam format yang mudah dipahami pemilik bisnis.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span>Use case utama</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white">Cocok untuk jenis usaha seperti</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    "Kedai kopi & kafe",
                                    "Restoran & rumah makan",
                                    "Minimarket & toko kelontong",
                                    "Butik & toko fashion",
                                    "Barbershop & salon",
                                    "Toko elektronik & gadget"
                                ].map((label) => (
                                    <div
                                        key={label}
                                        className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:border-indigo-400/60 hover:bg-white/10 transition-all duration-300"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/40 to-cyan-400/40 flex items-center justify-center text-white text-xs font-semibold">
                                            <Users size={16} />
                                        </div>
                                        <span className="text-sm text-slate-200">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="daily-flow" className="py-24 px-4 md:px-8">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        <div className="space-y-6">
                            <div>
                                <div className="text-xs font-semibold tracking-[0.22em] uppercase text-indigo-300 mb-2">
                                    Daily flow
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold text-white">
                                    Sehari bersama RanaPOS di bisnis Anda
                                </h2>
                            </div>
                            <p className="text-lg text-slate-400">
                                Narasi sederhana tentang bagaimana Rana menyatu dengan ritme operasional Anda,
                                dari toko baru buka sampai tutup buku di akhir hari.
                            </p>
                            <div className="space-y-4">
                                {[
                                    {
                                        icon: Clock,
                                        label: "Sebelum toko buka",
                                        title: "Semua siap bahkan sebelum pelanggan datang",
                                        desc: "Owner mengecek jadwal shift, stok kritis, dan target omzet hari ini dari dashboard di ponsel."
                                    },
                                    {
                                        icon: Zap,
                                        label: "Jam sibuk",
                                        title: "Transaksi lancar tanpa antrian mengular",
                                        desc: "Kasir memproses pesanan dengan cepat, stok berkurang otomatis, dan promo flash sales berjalan sesuai skenario."
                                    },
                                    {
                                        icon: BarChart3,
                                        label: "Setelah tutup kasir",
                                        title: "Tutup buku dalam hitungan menit",
                                        desc: "Laporan penjualan, margin, dan performa produk sudah tersusun otomatis. Anda tinggal membaca dan mengambil keputusan."
                                    }
                                ].map((item, index) => (
                                    <motion.div
                                        key={item.label}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: index * 0.1 }}
                                        viewport={{ once: true }}
                                        className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-400/60 hover:bg-white/10 transition-all duration-300"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300">
                                            <item.icon size={20} />
                                        </div>
                                        <div>
                                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">
                                                {item.label}
                                            </div>
                                            <div className="font-semibold text-white mb-1">
                                                {item.title}
                                            </div>
                                            <div className="text-sm text-slate-400">
                                                {item.desc}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h3 className="text-2xl md:text-3xl font-bold text-white">
                                Dibanding solusi lain di pasar
                            </h3>
                            <p className="text-slate-400">
                                Setiap bisnis berbeda. Berikut gambaran singkat posisi Rana dibandingkan
                                tipe solusi yang umum ditemui pemilik usaha.
                            </p>
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 text-xs font-semibold">
                                            01
                                        </div>
                                        <div className="font-semibold text-white">
                                            Aplikasi kasir sederhana
                                        </div>
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        Cocok untuk mulai digitalisasi, tetapi biasanya hanya berhenti di pencatatan transaksi
                                        tanpa insight mendalam dan dukungan multi-cabang.
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 text-xs font-semibold">
                                            02
                                        </div>
                                        <div className="font-semibold text-white">
                                            Sistem ERP besar
                                        </div>
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        Sangat lengkap namun kompleks, mahal, dan sering kali berlebihan untuk kebutuhan harian
                                        UMKM yang bergerak cepat.
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-indigo-500/60 bg-gradient-to-br from-indigo-600/20 via-violet-600/20 to-cyan-500/20 p-5 shadow-[0_0_40px_rgba(79,70,229,0.4)]">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-semibold">
                                            Rana
                                        </div>
                                        <div className="font-semibold text-white flex items-center gap-2">
                                            RanaPOS untuk UMKM ambisius
                                            <Rocket size={16} className="text-cyan-300" />
                                        </div>
                                    </div>
                                    <ul className="space-y-2 text-sm text-slate-100">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle size={16} className="mt-0.5 text-emerald-400" />
                                            <span>Fokus pada kebutuhan operasional harian dengan dashboard keuangan yang bisa langsung dipakai owner.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle size={16} className="mt-0.5 text-emerald-400" />
                                            <span>Kombinasi mode offline dan online, cocok untuk lokasi dengan internet yang belum stabil.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle size={16} className="mt-0.5 text-emerald-400" />
                                            <span>Harga yang selaras dengan skala bisnis, namun tetap siap tumbuh ketika Anda membuka cabang baru.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="all-features" className="py-24 px-4 md:px-8 bg-black/20">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Semua yang Anda Butuhkan</h2>
                            <p className="text-lg text-slate-400 max-w-2xl mx-auto">Dari kasir hingga laporan keuangan, kami menyediakan alat yang tepat untuk setiap aspek bisnis Anda.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {features.map((feature, index) => (
                                <FeatureCard key={index} {...feature} delay={index * 0.1} />
                            ))}
                        </div>
                    </div>
                </section>

                <section id="ecosystem" className="py-24 px-4 md:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Visualisasi Ekosistem Fitur</h2>
                            <p className="text-lg text-slate-400 max-w-3xl mx-auto">Lihat bagaimana setiap fitur terhubung dan saling mendukung untuk menciptakan ekosistem bisnis yang kuat dan terintegrasi.</p>
                        </div>
                        <div className="h-[360px] md:h-[500px] w-full rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-black/50 p-4">
                            <FeatureShowcase3D />
                        </div>
                    </div>
                </section>

                <section id="impact" className="py-24 px-4 md:px-8 bg-black/20">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Dampak Nyata bagi Bisnis Anda</h2>
                            <p className="text-lg text-slate-400 max-w-2xl mx-auto">RanaPOS bukan hanya software, tapi partner pertumbuhan yang memberikan hasil terukur.</p>
                        </div>
                        <div className="h-[320px] md:h-[400px] w-full">
                            <BusinessImpact3D />
                        </div>
                    </div>
                </section>

                <section id="stack" className="py-24 px-4 md:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <motion.h2 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                viewport={{ once: true }}
                                className="text-4xl md:text-5xl font-bold text-white mb-4"
                            >
                                Dibangun dengan Teknologi Terdepan
                            </motion.h2>
                            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                                Kami menggunakan tumpukan teknologi modern untuk memastikan performa, keamanan, dan skalabilitas terbaik.
                            </p>
                        </div>
                        <TechnologyStack />
                    </div>
                </section>

                <section id="implementation" className="py-24 px-4 md:px-8 bg-gradient-to-r from-indigo-900/60 via-slate-900/80 to-cyan-900/60 border-t border-white/10">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-3xl md:text-4xl font-bold text-white">
                                Implementasi tanpa harus punya tim IT sendiri
                            </h2>
                            <p className="text-lg text-slate-200">
                                Kami mendesain proses implementasi yang sederhana namun rapi, sehingga Anda bisa fokus
                                ke operasional sementara tim kami mengawal teknis di belakang layar.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    {
                                        title: "Analisis kebutuhan",
                                        desc: "Kami memetakan alur kasir, stok, dan laporan yang Anda butuhkan."
                                    },
                                    {
                                        title: "Setup & migrasi data",
                                        desc: "Bantuan impor menu, produk, dan saldo awal agar transisi mulus."
                                    },
                                    {
                                        title: "Pelatihan tim",
                                        desc: "Sesi singkat untuk kasir dan manajemen, online atau on-site."
                                    },
                                    {
                                        title: "Support berkelanjutan",
                                        desc: "Tim support siap membantu ketika ada perubahan atau kendala baru."
                                    }
                                ].map((item, index) => (
                                    <motion.div
                                        key={item.title}
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: index * 0.1 }}
                                        viewport={{ once: true }}
                                        className="p-4 rounded-2xl bg-white/5 border border-white/10"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                                                <CheckCircle size={14} />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-white text-sm mb-1">
                                                    {item.title}
                                                </div>
                                                <div className="text-xs text-slate-300">
                                                    {item.desc}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="rounded-3xl bg-black/30 border border-white/15 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.9)]">
                                <div className="text-sm uppercase tracking-[0.2em] text-indigo-300 mb-4">
                                    Langkah berikutnya
                                </div>
                                <div className="text-2xl md:text-3xl font-bold text-white mb-4">
                                    Siap melihat Rana bekerja di toko Anda?
                                </div>
                                <p className="text-slate-300 text-sm mb-6">
                                    Ceritakan kondisi bisnis Anda hari ini, tim kami akan rekomendasikan cara implementasi
                                    paling realistis – mulai dari satu kasir hingga banyak cabang.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Link
                                        to="/contact"
                                        className="flex-1 inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-white text-slate-900 font-semibold text-sm md:text-base hover:bg-slate-100 transition-colors"
                                    >
                                        Konsultasi dengan tim Rana
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="flex-1 inline-flex items-center justify-center px-6 py-3 rounded-2xl border border-white/40 text-white font-semibold text-sm md:text-base bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        Coba daftar sekarang
                                    </Link>
                                </div>
                                <div className="mt-4 text-xs text-slate-400">
                                    Tidak ada komitmen jangka panjang di awal. Anda bisa mulai kecil dan
                                    memperluas penggunaan seiring bisnis berkembang.
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="faq" className="py-24 px-4 md:px-8 bg-black/30">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-6">
                            Pertanyaan yang sering ditanyakan
                        </h2>
                        <p className="text-center text-slate-400 mb-10 max-w-2xl mx-auto">
                            Beberapa hal yang biasanya ditanyakan calon merchant sebelum mulai menggunakan Rana.
                        </p>
                        <div className="space-y-4">
                            {faqItems.map((item, index) => (
                                <motion.button
                                    key={item.question}
                                    type="button"
                                    onClick={() =>
                                        setOpenFaqIndex((current) => (current === index ? -1 : index))
                                    }
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: index * 0.05 }}
                                    viewport={{ once: true }}
                                    className="w-full text-left bg-white/5 border border-white/10 rounded-2xl px-5 py-4 hover:border-indigo-400/70 hover:bg-white/10 transition-all duration-300"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-semibold text-white">
                                            {item.question}
                                        </div>
                                        <motion.span
                                            animate={{
                                                rotate: openFaqIndex === index ? 90 : 0
                                            }}
                                            transition={{ duration: 0.2 }}
                                            className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-slate-200"
                                        >
                                            <ArrowRight size={16} />
                                        </motion.span>
                                    </div>
                                    <AnimatePresence initial={false}>
                                        {openFaqIndex === index && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                transition={{ duration: 0.25 }}
                                                className="text-sm text-slate-300 border-t border-white/10 pt-3"
                                            >
                                                {item.answer}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </section>
                <Footer />
            </div>
        </div>
    );
};

export default Features;
