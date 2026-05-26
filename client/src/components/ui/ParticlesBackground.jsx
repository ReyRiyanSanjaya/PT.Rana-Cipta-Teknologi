import React, { useMemo, useEffect } from 'react';
import { motion, useTransform, useMotionValue, useSpring } from 'framer-motion';

const ParticleDot = ({ particle, mouseX, mouseY }) => {
    const x = useTransform(mouseX, [-1, 1], [particle.x * 50 - 25, particle.x * -50 + 25]);
    const y = useTransform(mouseY, [-1, 1], [particle.y * 50 - 25, particle.y * -50 + 25]);
    
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
            }}
        />
    );
};

const ParticlesBackground = ({ count = 50 }) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
    const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 2;
            const y = (e.clientY / window.innerHeight - 0.5) * 2;
            mouseX.set(x);
            mouseY.set(y);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const size = Math.random() * 2 + 1;
            const x = (Math.random() - 0.5) * 2;
            const y = (Math.random() - 0.5) * 2;
            temp.push({ size, x, y });
        }
        return temp;
    }, [count]);

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-[#0a0b0f]" />
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.1),transparent_50%)]" />
            
            {particles.map((p, i) => (
                <ParticleDot
                    key={i}
                    particle={p}
                    mouseX={smoothMouseX}
                    mouseY={smoothMouseY}
                />
            ))}
        </div>
    );
};

export default ParticlesBackground;
