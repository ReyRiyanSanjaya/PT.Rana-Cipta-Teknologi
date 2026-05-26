import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float, Sphere, Torus, Octahedron, Icosahedron, Stars, Sparkles } from '@react-three/drei';

function MovingShape({ position, rotation, color, geometry: Geometry, scale = 1, speed = 1, introDelay = 0 }) {
    const meshRef = useRef();
    const baseRotation = useRef(rotation || [0, 0, 0]);
    const startTimeRef = useRef(null);

    useFrame((state) => {
        if (!meshRef.current) return;

        const t = state.clock.getElapsedTime();
        if (startTimeRef.current === null) {
            startTimeRef.current = t;
        }

        const elapsed = t - startTimeRef.current - introDelay;
        const introDuration = 2.2;
        const rawProgress = elapsed / introDuration;
        const clamped = Math.min(Math.max(rawProgress, 0), 1);
        const ease = 1 - Math.pow(1 - clamped, 3);

        const baseX = Array.isArray(position) ? position[0] || 0 : 0;
        const baseY = Array.isArray(position) ? position[1] || 0 : 0;
        const baseZ = Array.isArray(position) ? position[2] || 0 : 0;

        const startZ = baseZ + 10;
        const currentZ = startZ + (baseZ - startZ) * ease;
        const currentScale = scale * (0.4 + 0.6 * ease);

        meshRef.current.position.set(baseX, baseY, currentZ);
        meshRef.current.scale.setScalar(currentScale);

        meshRef.current.rotation.x = baseRotation.current[0] + Math.sin(t * 0.2 * speed) * 0.5 * ease;
        meshRef.current.rotation.y = baseRotation.current[1] + Math.cos(t * 0.3 * speed) * 0.5 * ease;
        meshRef.current.rotation.z = baseRotation.current[2];
    });

    return (
        <Float speed={2 * speed} rotationIntensity={1} floatIntensity={1}>
            <Geometry ref={meshRef} position={position} rotation={rotation} scale={scale}>
                <meshStandardMaterial
                    color={color}
                    roughness={0.05}
                    metalness={0.9}
                    emissive={color}
                    emissiveIntensity={0.7}
                />
            </Geometry>
        </Float>
    );
}

export default function Experience() {
    const { camera, mouse } = useThree();
    const introStartRef = useRef(null);

    useFrame((state) => {
        if (!camera) return;

        const t = state.clock.getElapsedTime();
        if (introStartRef.current === null) {
            introStartRef.current = t;
        }

        const elapsed = t - introStartRef.current;
        const introDuration = 2.8;
        const progress = Math.min(Math.max(elapsed / introDuration, 0), 1);
        const ease = 1 - Math.pow(1 - progress, 3);

        const startZ = 14;
        const targetZ = 8;
        const currentZ = startZ + (targetZ - startZ) * ease;

        // Parallax effect based on mouse position
        const parallaxX = (state.mouse.x * 0.5);
        const parallaxY = (state.mouse.y * 0.5);

        camera.position.set(parallaxX, parallaxY, currentZ);
        camera.lookAt(0, 0, 0);
    });

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
            <pointLight position={[-10, -10, -10]} intensity={1} color="#4F46E5" />
            
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
            <Sparkles count={50} scale={10} size={4} speed={0.4} opacity={0.5} color="#818cf8" />

            {/* Hero Shapes - Indigo/Violet Theme */}
            <MovingShape
                geometry={Torus}
                position={[2, 0, 0]}
                rotation={[Math.PI / 4, 0, 0]}
                scale={1.5}
                color="#6366F1" // Indigo 500
                speed={1}
                introDelay={0}
            />
            <MovingShape
                geometry={Sphere}
                position={[-2, 1, -2]}
                scale={1}
                color="#8B5CF6" // Violet 500
                speed={0.8}
                introDelay={0.15}
            />
            <MovingShape
                geometry={Octahedron}
                position={[3, -2, -1]}
                scale={1.2}
                color="#06B6D4" // Cyan 500
                speed={1.2}
                introDelay={0.3}
            />
            <MovingShape
                geometry={Icosahedron}
                position={[-3, -1.5, 0]}
                scale={0.8}
                color="#EC4899" // Pink 500 (Accent)
                speed={0.9}
                introDelay={0.45}
            />

            {/* Background Elements */}
            <MovingShape
                geometry={Sphere}
                position={[-5, 4, -8]}
                scale={0.5}
                color="#C7D2FE" // Indigo 200
                speed={0.5}
                introDelay={0.6}
            />
            <MovingShape
                geometry={Torus}
                position={[6, -4, -6]}
                scale={0.8}
                color="#DDD6FE" // Violet 200
                speed={0.7}
                introDelay={0.75}
            />
        </>
    );
}
