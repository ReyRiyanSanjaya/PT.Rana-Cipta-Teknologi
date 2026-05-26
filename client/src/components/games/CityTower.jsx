import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, RefreshCw, Play, Pause, Volume2, VolumeX, Home } from 'lucide-react';

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
    
    if (type === 'tap') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'perfect') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        // Harmonic
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(1000, now);
        osc2.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
        gain2.gain.setValueAtTime(0.1, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc2.start(now);
        osc2.stop(now + 0.3);

        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    }
};

const COLORS = [
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
];

const INITIAL_WIDTH = 200; // px
const BLOCK_HEIGHT = 40; // px
const AREA_HEIGHT = 600;
const BASE_SPEED = 3;

const CityTower = ({ onBack }) => {
    const [gameState, setGameState] = useState('IDLE'); // IDLE, PLAYING, GAME_OVER
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('tower_highscore')) || 0);
    const [soundEnabled, setSoundEnabled] = useState(true);
    
    // Game Logic Refs
    const containerRef = useRef(null);
    const requestRef = useRef();
    const stackRef = useRef([]);
    const debrisRef = useRef([]); // Falling pieces
    const particlesRef = useRef([]); // Visual effects
    const currentBlockRef = useRef({
        width: INITIAL_WIDTH,
        left: 0,
        direction: 1, // 1 for right, -1 for left
        speed: BASE_SPEED,
        hue: 0
    });
    const cameraOffsetRef = useRef(0);

    // React State for rendering
    const [stack, setStack] = useState([]);
    const [currentBlock, setCurrentBlock] = useState(null);
    const [cameraY, setCameraY] = useState(0);
    const [debris, setDebris] = useState([]);
    const [particles, setParticles] = useState([]);

    const initGame = () => {
        const initialStack = [
            { width: INITIAL_WIDTH, left: (containerRef.current?.offsetWidth || 400) / 2 - INITIAL_WIDTH / 2, color: COLORS[0] }
        ];
        stackRef.current = initialStack;
        setStack(initialStack);
        
        debrisRef.current = [];
        setDebris([]);
        particlesRef.current = [];
        setParticles([]);

        currentBlockRef.current = {
            width: INITIAL_WIDTH,
            left: 0,
            direction: 1,
            speed: BASE_SPEED,
            hue: 0
        };
        
        setScore(0);
        setCameraY(0);
        cameraOffsetRef.current = 0;
        setGameState('PLAYING');
    };

    const gameOver = () => {
        if (soundEnabled) playSound('gameover');
        setGameState('GAME_OVER');
        cancelAnimationFrame(requestRef.current);
        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('tower_highscore', score);
        }
    };

    const placeBlock = useCallback(() => {
        if (gameState !== 'PLAYING') return;

        const prevBlock = stackRef.current[stackRef.current.length - 1];
        const curr = currentBlockRef.current;
        
        const containerWidth = containerRef.current?.offsetWidth || 400;

        // Calculate overlap
        let prevLeft = prevBlock.left;
        let prevRight = prevBlock.left + prevBlock.width;
        let currLeft = curr.left;
        let currRight = curr.left + curr.width;

        // Perfect match tolerance (e.g., 3px)
        const diff = currLeft - prevLeft;
        if (Math.abs(diff) < 3) {
            // Snap to perfect
            currLeft = prevLeft;
            currRight = prevRight;
            if (soundEnabled) playSound('perfect');
            
            // Spawn particles for perfect match
            for (let i = 0; i < 10; i++) {
                particlesRef.current.push({
                    id: Math.random(),
                    x: currLeft + Math.random() * curr.width,
                    y: stackRef.current.length * BLOCK_HEIGHT,
                    vx: (Math.random() - 0.5) * 5,
                    vy: Math.random() * 5 + 2,
                    life: 1.0,
                    color: '#FFD700' // Gold
                });
            }
        } else {
            if (soundEnabled) playSound('tap');
        }

        const overlapLeft = Math.max(prevLeft, currLeft);
        const overlapRight = Math.min(prevRight, currRight);
        const overlapWidth = overlapRight - overlapLeft;

        if (overlapWidth <= 0) {
            gameOver();
            return;
        }

        // Create Debris for the cut off part
        if (Math.abs(diff) >= 3) {
            const isLeftCut = currLeft < prevLeft;
            const debrisWidth = Math.abs(diff);
            const debrisLeft = isLeftCut ? currLeft : overlapRight;
            
            debrisRef.current.push({
                id: Date.now(),
                width: debrisWidth,
                left: debrisLeft,
                y: stackRef.current.length * BLOCK_HEIGHT,
                vy: 0,
                vx: isLeftCut ? -2 : 2,
                rotation: 0,
                vr: (Math.random() - 0.5) * 0.5,
                color: COLORS[(stackRef.current.length) % COLORS.length]
            });
        }

        // New block properties
        const newBlock = {
            width: overlapWidth,
            left: overlapLeft,
            color: COLORS[(stackRef.current.length) % COLORS.length]
        };

        const newStack = [...stackRef.current, newBlock];
        stackRef.current = newStack;
        setStack(newStack);
        setScore(prev => prev + 1);

        // Speed up slightly
        const newSpeed = Math.min(BASE_SPEED + (newStack.length * 0.1), 8);

        // Setup next block
        currentBlockRef.current = {
            width: overlapWidth,
            left: curr.direction === 1 ? -overlapWidth : containerWidth, // Start from edge
            direction: curr.direction * -1, // Flip start direction for variety? Or keep same logic
            speed: newSpeed,
            hue: (curr.hue + 20) % 360
        };

        // Move camera if stack is high
        if (newStack.length * BLOCK_HEIGHT > AREA_HEIGHT / 2) {
            const targetY = (newStack.length * BLOCK_HEIGHT) - (AREA_HEIGHT / 2);
            setCameraY(targetY);
        }

    }, [gameState, soundEnabled]);

    const gameLoop = useCallback(() => {
        if (gameState !== 'PLAYING') return;

        const containerWidth = containerRef.current?.offsetWidth || 400;
        const curr = currentBlockRef.current;
        
        // Update position
        curr.left += curr.speed * curr.direction;

        // Bounce off walls
        const maxLeft = containerWidth - curr.width;
        if (curr.left >= maxLeft) {
            curr.left = maxLeft;
            curr.direction = -1;
        } else if (curr.left <= 0) {
            curr.left = 0;
            curr.direction = 1;
        }

        // Update Debris
        debrisRef.current = debrisRef.current.filter(d => d.y > -50);
        debrisRef.current.forEach(d => {
            d.vy -= 0.5; // Gravity
            d.y += d.vy;
            d.left += d.vx;
            d.rotation += d.vr;
        });

        // Update Particles
        particlesRef.current = particlesRef.current.filter(p => p.life > 0);
        particlesRef.current.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy -= 0.2; // Gravity
            p.life -= 0.02;
        });

        setCurrentBlock({ ...curr }); // Update state for render
        setDebris([...debrisRef.current]);
        setParticles([...particlesRef.current]);

        requestRef.current = requestAnimationFrame(gameLoop);
    }, [gameState]);

    useEffect(() => {
        if (gameState === 'PLAYING') {
            requestRef.current = requestAnimationFrame(gameLoop);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [gameState, gameLoop]);

    // Handle clicks/taps
    const handleAction = (e) => {
        e.preventDefault(); // Prevent double firing on touch devices if needed
        if (gameState === 'IDLE' || gameState === 'GAME_OVER') {
            initGame();
        } else {
            placeBlock();
        }
    };

    return (
        <div 
            className="w-full max-w-md mx-auto flex flex-col h-[700px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 relative select-none"
            ref={containerRef}
            onMouseDown={handleAction}
            onTouchStart={handleAction}
        >
            {/* Back Button */}
             <div className="absolute top-4 left-4 z-50 pointer-events-auto" onMouseDown={(e) => e.stopPropagation()}>
                <button 
                    onClick={onBack}
                    className="p-2 bg-slate-800/80 rounded-full shadow-lg hover:scale-110 transition-transform border border-slate-700"
                >
                    <Home size={20} className="text-slate-200" />
                </button>
            </div>

            {/* Header / Score */}
            <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-start bg-gradient-to-b from-slate-900/90 to-transparent pointer-events-none">
                <div>
                    <h2 className="text-white font-black text-3xl drop-shadow-lg font-mono">{score}</h2>
                    <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">Score</p>
                </div>
                
                <div className="flex gap-4 pointer-events-auto">
                    <button 
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className="p-2 bg-slate-800/80 rounded-full shadow-lg hover:scale-110 transition-transform border border-slate-700"
                    >
                        {soundEnabled ? <Volume2 size={20} className="text-emerald-400" /> : <VolumeX size={20} className="text-rose-400" />}
                    </button>
                    <div className="text-right pointer-events-none">
                        <div className="flex items-center gap-2 text-yellow-400">
                            <Trophy size={16} />
                            <span className="font-bold text-xl font-mono">{highScore}</span>
                        </div>
                        <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">Best</p>
                    </div>
                </div>
            </div>

            {/* Game Area */}
            <div className="relative flex-1 w-full h-full overflow-hidden cursor-pointer active:cursor-grabbing">
                {/* Background Grid/Effects */}
                <div className="absolute inset-0 opacity-20" 
                    style={{ 
                        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)', 
                        backgroundSize: '40px 40px',
                        transform: `translateY(${cameraY * 0.5}px)` // Parallax effect
                    }} 
                />

                {/* Game Container translated by Camera */}
                <div 
                    className="absolute bottom-0 left-0 w-full transition-transform duration-500 ease-out"
                    style={{ transform: `translateY(${cameraY}px)` }}
                >
                    {/* Base Platform */}
                    <div className="absolute bottom-0 left-0 w-full h-10 bg-slate-800 border-t border-slate-700" />

                    {/* Stacked Blocks */}
                    {stack.map((block, i) => (
                        <div
                            key={i}
                            className={`absolute shadow-lg border-b border-black/10 transition-all duration-300 ${block.color}`}
                            style={{
                                width: block.width,
                                height: BLOCK_HEIGHT,
                                left: block.left,
                                bottom: (i + 1) * BLOCK_HEIGHT,
                                borderRadius: '4px'
                            }}
                        >
                            {/* Inner shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent pointer-events-none" />
                        </div>
                    ))}

                    {/* Debris (Falling pieces) */}
                    {debris.map(d => (
                        <div
                            key={d.id}
                            className={`absolute shadow-lg border-b border-black/10 ${d.color}`}
                            style={{
                                width: d.width,
                                height: BLOCK_HEIGHT,
                                left: d.left,
                                bottom: d.y,
                                transform: `rotate(${d.rotation}rad)`,
                                borderRadius: '4px',
                                opacity: 0.8
                            }}
                        />
                    ))}

                    {/* Particles */}
                    {particles.map(p => (
                        <div 
                            key={p.id}
                            className="absolute w-2 h-2 rounded-full"
                            style={{
                                left: p.x,
                                bottom: p.y,
                                backgroundColor: p.color,
                                opacity: p.life,
                                transform: `scale(${p.life})`
                            }}
                        />
                    ))}

                    {/* Current Moving Block */}
                    {gameState === 'PLAYING' && currentBlock && (
                        <div
                            className={`absolute shadow-[0_0_15px_rgba(255,255,255,0.5)] z-10 ${COLORS[stack.length % COLORS.length]}`}
                            style={{
                                width: currentBlock.width,
                                height: BLOCK_HEIGHT,
                                left: currentBlock.left,
                                bottom: stack.length * BLOCK_HEIGHT,
                                borderRadius: '4px'
                            }}
                        >
                             <div className="absolute inset-0 bg-white/30 animate-pulse" />
                        </div>
                    )}
                </div>

                {/* Overlays */}
                {gameState === 'IDLE' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-30">
                        <div className="w-24 h-24 bg-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/50 animate-bounce">
                            <Play size={48} className="text-white ml-2" />
                        </div>
                        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">CITY TOWER</h1>
                        <p className="text-slate-400 mb-8 font-medium">Tap to stack blocks perfectly</p>
                        <button className="px-8 py-3 bg-white text-slate-900 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl">
                            START GAME
                        </button>
                    </div>
                )}

                {gameState === 'GAME_OVER' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md z-30 animate-in fade-in duration-300">
                        <div className="text-6xl mb-4">💥</div>
                        <h2 className="text-3xl font-bold text-white mb-2">Game Over!</h2>
                        <p className="text-slate-400 mb-8 text-lg">You stacked <span className="text-white font-bold">{score}</span> blocks</p>
                        
                        <button 
                            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-full font-bold text-lg hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/30"
                            onClick={(e) => { e.stopPropagation(); initGame(); }}
                        >
                            <RefreshCw size={20} />
                            Try Again
                        </button>
                    </div>
                )}
            </div>
            
            {/* Footer hint */}
            <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none z-20">
                <p className="text-slate-500 text-xs font-medium opacity-50 uppercase tracking-widest">
                    {gameState === 'PLAYING' ? 'Tap screen to drop' : ''}
                </p>
            </div>
        </div>
    );
};

export default CityTower;
