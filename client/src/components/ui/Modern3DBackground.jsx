import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

const MovingStars = () => {
    const ref = useRef();
    
    useFrame((state) => {
        if (ref.current) {
            // Slow rotation for background feeling
            ref.current.rotation.y = state.clock.getElapsedTime() * 0.05;
            ref.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.05) * 0.1;
        }
    });

    return (
        <group ref={ref}>
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        </group>
    );
};

const MouseInteractive = () => {
    const groupRef = useRef();
    
    useFrame((state) => {
        if (groupRef.current) {
            const { x, y } = state.pointer;
            // Smoothly interpolate rotation based on mouse position
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -y * 0.2, 0.1);
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, x * 0.2, 0.1);
        }
    });

    return (
        <group ref={groupRef}>
             <Sparkles 
                count={200} 
                scale={12} 
                size={4} 
                speed={0.4} 
                opacity={0.5} 
                color="#14B8A6" // Teal
            />
             <Sparkles 
                count={100} 
                scale={10} 
                size={2} 
                speed={0.2} 
                opacity={0.3} 
                color="#38BDF8" // Sky blue
            />
        </group>
    );
};

const SceneContent = () => {
    return (
        <>
            <color attach="background" args={['#0f172a']} /> {/* Slate 900 */}
            
            {/* Ambient Lighting */}
            <ambientLight intensity={0.5} />
            
            {/* Moving Elements */}
            <MovingStars />
            
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <MouseInteractive />
            </Float>
            
            {/* Subtle Fog for depth */}
            <fog attach="fog" args={['#0f172a', 5, 20]} />
        </>
    );
};

const Modern3DBackground = () => {
    return (
        <div className="fixed inset-0 z-0 w-full h-full pointer-events-none bg-slate-900">
            <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
                <Suspense fallback={null}>
                    <SceneContent />
                </Suspense>
            </Canvas>
            
            {/* Gradient Overlay to ensure text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-transparent to-slate-900/80 pointer-events-none" />
        </div>
    );
};

export default Modern3DBackground;
