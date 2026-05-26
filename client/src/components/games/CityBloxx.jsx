import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, RefreshCw, Play, Building2, Home, Volume2, VolumeX } from 'lucide-react';

const BLOCK_SIZE = 60;
const CONTAINER_HEIGHT = 700; // Updated to match CSS height
const ROPE_LENGTH = 100;
const PIVOT_TOP = 96; // 24 * 4px (top-24)

// --- Sound System ---
const playSound = (type) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === 'drop') {
        // Whoosh sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'land') {
        // Thud
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'perfect') {
        // High pitch ding
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        // Add a second harmonic for richness
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1200, now);
        gain2.gain.setValueAtTime(0.1, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc2.start(now);
        osc2.stop(now + 0.5);
        
        osc.start(now);
        osc.stop(now + 0.5);
    } else if (type === 'gameover') {
        // Sad crash
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 1);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1);
        osc.start(now);
        osc.stop(now + 1);
    }
};

const CityBloxx = ({ onBack }) => {
    const [gameState, setGameState] = useState('IDLE'); // IDLE, PLAYING, GAME_OVER
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('citybloxx_highscore')) || 0);
    const [lives, setLives] = useState(3);
    const [perfectCount, setPerfectCount] = useState(0);
    const [soundEnabled, setSoundEnabled] = useState(true);
    
    // Refs for game loop
    const requestRef = useRef();
    const lastTimeRef = useRef();
    const containerRef = useRef(null);
    const towerRef = useRef([]);
    const craneRef = useRef({
        angle: 0,
        speed: 0.03,
        direction: 1
    });
    const fallingBlockRef = useRef(null);
    const cameraYRef = useRef(0);
    const towerSwayRef = useRef({
        angle: 0,
        speed: 0,
        amplitude: 0
    });

    // State for rendering
    const [tower, setTower] = useState([]); // Array of blocks { x, y, type }
    const [craneAngle, setCraneAngle] = useState(0);
    const [fallingBlock, setFallingBlock] = useState(null);
    const [cameraY, setCameraY] = useState(0);
    const [towerSway, setTowerSway] = useState(0);
    const [particles, setParticles] = useState([]);

    const initGame = () => {
        towerRef.current = [
            { x: 0, y: 0, type: 'base', rotation: 0 } // Base block at center (relative to container center)
        ];
        setTower([...towerRef.current]);
        
        craneRef.current = {
            angle: 0,
            speed: 0.04, // Slightly faster for harmonic motion feel
            time: 0,
            angularVelocity: 0
        };
        
        fallingBlockRef.current = null;
        setFallingBlock(null);
        
        cameraYRef.current = 0;
        setCameraY(0);
        
        towerSwayRef.current = { angle: 0, speed: 0.02, amplitude: 0 };
        setTowerSway(0);
        
        setScore(0);
        setLives(3);
        setPerfectCount(0);
        setParticles([]);
        setGameState('PLAYING');
        lastTimeRef.current = performance.now();
    };

    const dropBlock = useCallback(() => {
        if (fallingBlockRef.current) return; // Already dropping

        if (soundEnabled) playSound('drop');

        // Calculate drop position based on crane angle
        const angle = craneRef.current.angle;
        // Visual center X of the block on the crane
        // Rope Length (100) + Half Block Height (30) due to translate-y-full being relative to bottom of rope
        // Actually, visual implementation:
        // Rope is 100px. Block is at bottom (100px).
        // translate-y-full moves it down by 60px.
        // So Top of block is at 100px. Center is at 130px.
        const distFromPivot = ROPE_LENGTH + (BLOCK_SIZE / 2);
        
        const x = Math.sin(angle) * distFromPivot;
        
        // Precise Y calculation
        // Viewport Height - Pivot Top - Vertical Projection of (Rope + Block Height)
        // Note: Block is at bottom of rope (100), plus full height (60) = 160 bottom edge from pivot
        const distFromPivotY = (ROPE_LENGTH + BLOCK_SIZE); 
        const startYViewport = CONTAINER_HEIGHT - PIVOT_TOP - (Math.cos(angle) * distFromPivotY);
        
        // Add CameraY because 'y' is World Coordinate (Height from Ground)
        const startY = startYViewport + cameraYRef.current;

        fallingBlockRef.current = {
            x: x,
            y: startY, 
            velocity: 0,
            vx: 0, // Removed horizontal inertia for vertical precision
            rotation: angle, // Keep rotation for visual continuity
            checkedCollision: false
        };
    }, [soundEnabled]);

    const spawnParticles = (x, y, type) => {
        const newParticles = [];
        const color = type === 'perfect' ? '#FCD34D' : '#A5B4FC'; // Gold or Indigo
        
        for (let i = 0; i < 8; i++) {
            newParticles.push({
                id: Date.now() + i,
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1,
                color: color
            });
        }
        setParticles(prev => [...prev, ...newParticles]);
    };

    const updatePhysics = (deltaTime) => {
        const dt = deltaTime / 16.67; // Normalize to 60fps

        if (gameState === 'COLLAPSING') {
            const currentAngle = towerSwayRef.current.angle;
            const direction = Math.sign(currentAngle) || (Math.random() > 0.5 ? 1 : -1);
            const fallSpeed = 0.05 * dt * (1 + Math.abs(currentAngle)); // Accelerate
            
            towerSwayRef.current.angle += direction * fallSpeed;
            setTowerSway(towerSwayRef.current.angle);

            // Trigger crash when angle is large enough
            if (Math.abs(towerSwayRef.current.angle) > 1.57) { // ~90 degrees
                if (soundEnabled) playSound('gameover');
                setGameState('GAME_OVER');
            }
            return;
        }

        // 1. Update Crane
        // Harmonic pendulum logic (Sinusoidal)
        craneRef.current.time += craneRef.current.speed * dt;
        const maxAngle = 0.9;
        craneRef.current.angle = maxAngle * Math.sin(craneRef.current.time);
        
        // Calculate angular velocity for momentum transfer
        // d(angle)/dt = maxAngle * cos(time) * speed
        craneRef.current.angularVelocity = maxAngle * Math.cos(craneRef.current.time) * craneRef.current.speed;
        
        setCraneAngle(craneRef.current.angle);

        // 2. Update Tower Sway
        if (towerRef.current.length > 1) {
             towerSwayRef.current.angle = Math.sin(Date.now() / 1000 * (1 + towerSwayRef.current.speed)) * towerSwayRef.current.amplitude;
             setTowerSway(towerSwayRef.current.angle);
        }

        // 3. Update Particles
        if (particles.length > 0) {
            setParticles(prev => prev.map(p => ({
                ...p,
                x: p.x + p.vx * dt,
                y: p.y + p.vy * dt,
                life: p.life - 0.05 * dt
            })).filter(p => p.life > 0));
        }

        // 4. Update Falling Block
        if (fallingBlockRef.current) {
            const block = fallingBlockRef.current;
            block.velocity += 0.8 * dt; // Gravity
            block.y -= block.velocity * dt; // Move down (y is height from ground)
            block.x += (block.vx || 0) * dt; // Apply horizontal inertia

            // Check collision with top block
            const topBlock = towerRef.current[towerRef.current.length - 1];
            const topBlockY = topBlock.y + BLOCK_SIZE; // Top surface of top block
            
            // Check collision window logic
            if (!block.checkedCollision && block.y <= topBlockY) {
                const relativeX = block.x - topBlock.x;
                
                if (Math.abs(relativeX) < BLOCK_SIZE) {
                    // Landed
                    const isPerfect = Math.abs(relativeX) < 10;
                    
                    if (soundEnabled) playSound(isPerfect ? 'perfect' : 'land');
                    if (isPerfect) spawnParticles(block.x, topBlockY + cameraY, 'perfect');
                    else spawnParticles(block.x, topBlockY + cameraY, 'normal');

                    const newBlock = {
                        x: block.x,
                        y: topBlockY,
                        type: isPerfect ? 'perfect' : 'normal',
                        rotation: 0 
                    };
                    
                    towerRef.current.push(newBlock);
                    setTower([...towerRef.current]);
                    
                    // Update Score
                    let points = 10;
                    if (isPerfect) {
                        points += 10 + (perfectCount * 5);
                        setPerfectCount(p => p + 1);
                        towerSwayRef.current.amplitude = Math.max(0, towerSwayRef.current.amplitude - 0.05);
                    } else {
                        setPerfectCount(0);
                        towerSwayRef.current.amplitude += 0.05;
                    }
                    setScore(s => s + points);

                    // Smooth Camera
                    if (towerRef.current.length > 3) {
                        cameraYRef.current = (towerRef.current.length - 3) * BLOCK_SIZE;
                        setCameraY(cameraYRef.current);
                    }
                    
                    fallingBlockRef.current = null;
                    setFallingBlock(null);
                    return;
                } else {
                    // Missed - Mark checked, let it fall
                    block.checkedCollision = true;
                }
            } 
            
            // Check Ground Collision
            if (block.y <= 0) {
                 if (soundEnabled) playSound('land');
                 
                 setLives(l => {
                        const newLives = l - 1;
                        if (newLives <= 0) {
                            setGameState('COLLAPSING');
                            if (Math.abs(towerSwayRef.current.angle) < 0.05) {
                                towerSwayRef.current.angle = Math.random() > 0.5 ? 0.05 : -0.05;
                            }
                        }
                        return newLives;
                 });
                 setPerfectCount(0);
                 
                 fallingBlockRef.current = null;
                 setFallingBlock(null);
            } else {
                 setFallingBlock({ ...block });
            }
        }
    };

    // Main Game Loop
    const gameLoop = useCallback((time) => {
        if (gameState !== 'PLAYING' && gameState !== 'COLLAPSING') return;
        
        if (!lastTimeRef.current) lastTimeRef.current = time;
        const deltaTime = time - lastTimeRef.current;
        lastTimeRef.current = time;

        updatePhysics(deltaTime);
        requestRef.current = requestAnimationFrame(gameLoop);
    }, [gameState, particles, soundEnabled]); // Added dependencies to ensure fresh closure if needed, though ref is better

    useEffect(() => {
        if (gameState === 'PLAYING' || gameState === 'COLLAPSING') {
            requestRef.current = requestAnimationFrame(gameLoop);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [gameState, gameLoop]);

    const handleTap = (e) => {
        e.stopPropagation();
        if (gameState === 'IDLE' || gameState === 'GAME_OVER') {
            initGame();
        } else {
            dropBlock();
        }
    };

    return (
        <div 
            className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 p-4"
        >
             {/* Controls */}
             <div className="absolute top-4 left-4 z-50 flex gap-2">
                <button 
                    onClick={onBack}
                    className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg hover:scale-110 transition-transform"
                >
                    <Home size={24} className="text-slate-700 dark:text-slate-200" />
                </button>
                <button 
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg hover:scale-110 transition-transform"
                >
                    {soundEnabled ? (
                        <Volume2 size={24} className="text-slate-700 dark:text-slate-200" />
                    ) : (
                        <VolumeX size={24} className="text-slate-400 dark:text-slate-500" />
                    )}
                </button>
            </div>

            <div 
                className="w-full max-w-md h-[700px] bg-sky-300 dark:bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-700 relative select-none"
                ref={containerRef}
                onMouseDown={handleTap}
                onTouchStart={handleTap}
            >
                {/* Background City Scape (Static) */}
                <div className="absolute bottom-0 left-0 right-0 h-64 bg-slate-200 dark:bg-slate-900 opacity-40 pointer-events-none" 
                    style={{ clipPath: 'polygon(0% 100%, 0% 40%, 10% 40%, 10% 20%, 20% 20%, 20% 60%, 30% 60%, 30% 30%, 40% 30%, 40% 70%, 50% 70%, 50% 40%, 60% 40%, 60% 80%, 70% 80%, 70% 30%, 80% 30%, 80% 50%, 90% 50%, 90% 20%, 100% 20%, 100% 100%)' }}
                />
                
                {/* Moving Clouds */}
                <div className="absolute top-10 left-10 w-20 h-8 bg-white/40 rounded-full blur-xl animate-[pulse_4s_infinite]" />
                <div className="absolute top-24 right-20 w-32 h-12 bg-white/30 rounded-full blur-xl animate-[pulse_6s_infinite]" />

                {/* Score & Lives */}
                <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-start mt-12">
                    <div>
                        <h2 className="text-white font-black text-5xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] font-sans tracking-tighter">{score}</h2>
                        <div className="flex gap-1 mt-2">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className={`w-3 h-3 rounded-full shadow-sm transition-colors duration-300 ${i < lives ? 'bg-rose-500 border border-rose-600' : 'bg-slate-400/50'}`} />
                            ))}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-2 text-yellow-400 drop-shadow-md">
                            <Trophy size={24} className="fill-yellow-400" />
                            <span className="font-bold text-2xl">{highScore}</span>
                        </div>
                    </div>
                </div>

                {/* Game World */}
                <div className="relative w-full h-full overflow-hidden">
                    {/* Camera Container */}
                    <div 
                        className="absolute left-0 w-full h-full transition-transform duration-700 cubic-bezier(0.34, 1.56, 0.64, 1)"
                        style={{ 
                            transform: `translateY(${cameraY}px)`,
                            bottom: 0 
                        }}
                    >
                         {/* Ground */}
                         <div className="absolute bottom-0 w-full h-20 bg-gradient-to-b from-emerald-500 to-emerald-700 border-t-4 border-emerald-400 z-10 shadow-lg" />

                         {/* Tower Group */}
                         <div 
                            className="absolute bottom-20 left-1/2 w-0 h-0 transition-transform duration-100 origin-bottom"
                            style={{ transform: `rotate(${towerSway}rad)` }}
                         >
                             {tower.map((block, i) => (
                                 <div
                                    key={i}
                                    className={`absolute flex items-center justify-center border-2 border-black/10 shadow-[4px_4px_10px_rgba(0,0,0,0.2)]
                                        ${block.type === 'base' ? 'bg-slate-700' : 'bg-indigo-500'}
                                        ${block.type === 'perfect' ? 'ring-2 ring-yellow-400 z-10' : ''}
                                    `}
                                    style={{
                                        width: BLOCK_SIZE,
                                        height: BLOCK_SIZE,
                                        left: block.x - BLOCK_SIZE/2,
                                        bottom: block.y, // Relative to pivot
                                        borderRadius: '8px',
                                        backgroundImage: block.type === 'base' ? 'none' : 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)'
                                    }}
                                 >
                                    {/* 3D-ish Side Effect */}
                                    <div className="absolute top-1 right-1 bottom-1 w-2 bg-black/10 rounded-r-sm blur-[1px]" />
                                    <div className="absolute bottom-1 left-1 right-1 h-2 bg-black/20 rounded-b-sm blur-[1px]" />

                                    {block.type !== 'base' && (
                                        <div className="w-10 h-10 border border-white/20 grid grid-cols-2 gap-1 p-1 shadow-inner bg-indigo-600 rounded">
                                            <div className="bg-yellow-100/90 w-full h-full rounded-sm shadow-[0_0_5px_rgba(253,224,71,0.6)] animate-pulse"></div>
                                            <div className="bg-yellow-100/70 w-full h-full rounded-sm"></div>
                                            <div className="bg-yellow-100/80 w-full h-full rounded-sm"></div>
                                            <div className="bg-yellow-100/90 w-full h-full rounded-sm shadow-[0_0_5px_rgba(253,224,71,0.6)]"></div>
                                        </div>
                                    )}
                                 </div>
                             ))}
                         </div>
                    </div>

                    {/* Particles */}
                    {particles.map(p => (
                        <div 
                            key={p.id}
                            className="absolute w-2 h-2 rounded-full"
                            style={{
                                left: `calc(50% + ${p.x}px)`,
                                bottom: p.y - cameraY, // Adjust for camera
                                backgroundColor: p.color,
                                opacity: p.life,
                                transform: `translate(-50%, 0) scale(${p.life})`
                            }}
                        />
                    ))}

                    {/* Crane Assembly */}
                    <div className="absolute top-24 left-1/2 w-0 h-0 z-30">
                         {/* Rope */}
                         <div 
                            className="absolute top-0 left-0 w-0.5 bg-slate-800 origin-top"
                            style={{ 
                                height: ROPE_LENGTH, 
                                transform: `translateX(-50%) rotate(${craneAngle}rad)` 
                            }}
                         >
                             {/* Block on Crane */}
                             {!fallingBlock && (
                                 <div 
                                    className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-[60px] h-[60px] bg-indigo-500 border-2 border-black/10 shadow-2xl rounded-lg flex items-center justify-center"
                                    style={{
                                        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)'
                                    }}
                                 >
                                     <div className="w-10 h-10 border border-white/20 grid grid-cols-2 gap-1 p-1 bg-indigo-600 rounded shadow-inner">
                                        <div className="bg-yellow-100/90 w-full h-full rounded-sm"></div>
                                        <div className="bg-yellow-100/90 w-full h-full rounded-sm"></div>
                                        <div className="bg-yellow-100/90 w-full h-full rounded-sm"></div>
                                        <div className="bg-yellow-100/90 w-full h-full rounded-sm"></div>
                                    </div>
                                 </div>
                             )}
                         </div>
                         {/* Crane Arm/Pivot visual */}
                         <div className="absolute -top-4 -left-4 w-8 h-8 bg-slate-800 rounded-full shadow-lg border-2 border-slate-600" />
                    </div>

                    {/* Laser Guide (Only when block is held) */}
                    {!fallingBlock && gameState === 'PLAYING' && (
                        <div 
                            className="absolute z-10 pointer-events-none"
                            style={{
                                top: PIVOT_TOP + (ROPE_LENGTH + BLOCK_SIZE/2) * Math.cos(craneAngle), // Center Y relative to container top
                                left: `calc(50% + ${(ROPE_LENGTH + BLOCK_SIZE/2) * Math.sin(craneAngle)}px)`, // Center X
                                height: CONTAINER_HEIGHT, // Just long enough
                                width: '2px',
                                transform: 'translateX(-50%)',
                                backgroundImage: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 80%)',
                                borderLeft: '2px dashed rgba(255, 255, 255, 0.3)'
                            }}
                        />
                    )}

                    {/* Falling Block (Independent) */}
                    {fallingBlock && (
                        <div 
                            className="absolute bg-indigo-500 border-2 border-black/10 shadow-xl rounded-lg flex items-center justify-center z-20"
                            style={{
                                width: BLOCK_SIZE,
                                height: BLOCK_SIZE,
                                left: `calc(50% + ${fallingBlock.x}px)`, // Relative to center
                                bottom: fallingBlock.y - cameraY, // Adjust for camera scrolling
                                transform: `translate(-50%, 0) rotate(${fallingBlock.rotation}rad)`,
                                backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)'
                            }}
                        >
                            <div className="w-10 h-10 border border-white/20 grid grid-cols-2 gap-1 p-1 bg-indigo-600 rounded shadow-inner">
                                <div className="bg-yellow-100/90 w-full h-full rounded-sm"></div>
                                <div className="bg-yellow-100/90 w-full h-full rounded-sm"></div>
                                <div className="bg-yellow-100/90 w-full h-full rounded-sm"></div>
                                <div className="bg-yellow-100/90 w-full h-full rounded-sm"></div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Overlays */}
                {gameState === 'IDLE' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm z-50">
                        <div className="bg-white/10 p-8 rounded-3xl border border-white/20 shadow-2xl flex flex-col items-center">
                            <Building2 size={64} className="text-yellow-400 mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                            <h1 className="text-5xl font-black text-white mb-2 tracking-tighter drop-shadow-lg">CITY BLOXX</h1>
                            <p className="text-slate-200 mb-8 font-medium">Build the highest skyscraper!</p>
                            <button className="px-10 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-2xl font-bold text-xl shadow-[0_10px_20px_rgba(79,70,229,0.4)] transition-all hover:scale-105 hover:-translate-y-1 active:scale-95">
                                START BUILDING
                            </button>
                        </div>
                    </div>
                )}
                
                {gameState === 'GAME_OVER' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md z-50 animate-in fade-in zoom-in duration-300">
                        <div className="text-8xl mb-6 animate-bounce">🏗️</div>
                        <h2 className="text-4xl font-black text-white mb-2 drop-shadow-lg">Construction Failed!</h2>
                        <div className="bg-white/10 px-6 py-4 rounded-xl mb-8 border border-white/10">
                            <p className="text-slate-200 text-xl">Height: <span className="text-yellow-400 font-bold text-3xl ml-2">{score}</span> floors</p>
                        </div>
                        <button 
                            className="flex items-center gap-3 px-10 py-4 bg-white text-indigo-600 rounded-full font-black text-xl hover:scale-105 transition-transform shadow-xl"
                            onClick={(e) => { e.stopPropagation(); initGame(); }}
                        >
                            <RefreshCw size={24} className="animate-spin-slow" />
                            Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CityBloxx;