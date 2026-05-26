import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, RefreshCw, Play, Pause, Volume2, VolumeX, Home, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

// --- Sound System ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

const playSound = (type) => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'eat') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'move') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
    } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    }
};

const GRID_SIZE = 25;
const CELL_SIZE = 20; // Used for calculations, responsive CSS handles actual size
const SPEED_INITIAL = 150;

const Snake = ({ onBack }) => {
    const [gameState, setGameState] = useState('IDLE'); // IDLE, PLAYING, GAME_OVER, PAUSED
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('snake_highscore')) || 0);
    const [soundEnabled, setSoundEnabled] = useState(true);
    
    const [snake, setSnake] = useState([{x: 10, y: 10}]);
    const [food, setFood] = useState({x: 15, y: 5});
    const [direction, setDirection] = useState({x: 0, y: -1}); // Start moving UP
    const directionRef = useRef({x: 0, y: -1}); // Ref for immediate updates to prevent rapid keypress bugs
    
    const gameLoopRef = useRef();

    const [particles, setParticles] = useState([]);
    
    // Particle System
    useEffect(() => {
        if (particles.length === 0) return;
        
        const interval = setInterval(() => {
            setParticles(prev => prev.map(p => ({
                ...p,
                x: p.x + p.vx,
                y: p.y + p.vy,
                life: p.life - 0.05
            })).filter(p => p.life > 0));
        }, 16);
        
        return () => clearInterval(interval);
    }, [particles.length]);

    const spawnParticles = (x, y, color) => {
        const newParticles = [];
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const speed = Math.random() * 0.5 + 0.2;
            newParticles.push({
                id: Math.random(),
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color: color
            });
        }
        setParticles(prev => [...prev, ...newParticles]);
    };

    const initGame = () => {
        setSnake([{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}]);
        setFood(generateFood([{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}]));
        setDirection({x: 0, y: -1});
        directionRef.current = {x: 0, y: -1};
        setScore(0);
        setGameState('PLAYING');
    };

    const generateFood = (currentSnake) => {
        let newFood;
        let isCollision;
        do {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
            isCollision = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
        } while (isCollision);
        return newFood;
    };

    const gameOver = () => {
        if (soundEnabled) playSound('gameover');
        setGameState('GAME_OVER');
        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('snake_highscore', score);
        }
    };

    const handleKeyDown = useCallback((e) => {
        if (gameState !== 'PLAYING') return;

        const key = e.key;
        const currentDir = directionRef.current;

        // Prevent 180 degree turns
        if (key === 'ArrowUp' && currentDir.y !== 1) {
            directionRef.current = {x: 0, y: -1};
        } else if (key === 'ArrowDown' && currentDir.y !== -1) {
            directionRef.current = {x: 0, y: 1};
        } else if (key === 'ArrowLeft' && currentDir.x !== 1) {
            directionRef.current = {x: -1, y: 0};
        } else if (key === 'ArrowRight' && currentDir.x !== -1) {
            directionRef.current = {x: 1, y: 0};
        }
    }, [gameState]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const moveSnake = () => {
            const currentHead = snake[0];
            const newHead = {
                x: currentHead.x + directionRef.current.x,
                y: currentHead.y + directionRef.current.y
            };

            // Wall Collision
            if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
                gameOver();
                return;
            }

            // Self Collision
            if (snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
                gameOver();
                return;
            }

            const newSnake = [newHead, ...snake];
            
            // Eat Food
            if (newHead.x === food.x && newHead.y === food.y) {
                if (soundEnabled) playSound('eat');
                spawnParticles(newHead.x, newHead.y, '#f43f5e'); // Spawn particles
                setScore(s => s + 10);
                setFood(generateFood(newSnake));
                // Don't pop tail, so it grows
            } else {
                newSnake.pop(); 
            }

            setSnake(newSnake);
            setDirection(directionRef.current);
        };

        const speed = Math.max(50, SPEED_INITIAL - Math.floor(score / 50) * 5); // Increase speed every 50 points
        gameLoopRef.current = setInterval(moveSnake, speed);

        return () => clearInterval(gameLoopRef.current);
    }, [gameState, snake, food, score, soundEnabled]);


    // Helper for mobile controls
    const handleControl = (dir) => {
        if (gameState !== 'PLAYING') return;
        const currentDir = directionRef.current;
        if (dir === 'UP' && currentDir.y !== 1) directionRef.current = {x: 0, y: -1};
        if (dir === 'DOWN' && currentDir.y !== -1) directionRef.current = {x: 0, y: 1};
        if (dir === 'LEFT' && currentDir.x !== 1) directionRef.current = {x: -1, y: 0};
        if (dir === 'RIGHT' && currentDir.x !== -1) directionRef.current = {x: 1, y: 0};
    };

    return (
        <div className="w-full max-w-md mx-auto h-[600px] flex flex-col bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-700 relative select-none">
            {/* Header */}
            <div className="relative z-20 flex justify-between items-center p-4 bg-slate-900/80 backdrop-blur-md border-b border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full text-cyan-400 transition-colors shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                    <Home size={20} />
                </button>
                
                <div className="flex flex-col items-center">
                    <span className="text-cyan-500/80 text-[10px] font-black tracking-[0.2em] uppercase mb-1">Score</span>
                    <span className="text-white font-black text-3xl font-mono leading-none drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] tabular-nums">{score}</span>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`p-2 rounded-full transition-all duration-300 ${soundEnabled ? 'text-cyan-400 bg-cyan-950/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-slate-500 hover:text-slate-400'}`}
                    >
                        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                    <div className="flex flex-col items-end justify-center">
                        <div className="flex items-center gap-1.5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">
                            <Trophy size={14} />
                            <span className="font-bold text-lg font-mono leading-none">{highScore}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Game Area */}
            <div className="flex-1 relative flex items-center justify-center bg-[#050505] p-4 overflow-hidden">
                {/* CRT Vignette & Scanlines */}
                <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
                <div className="absolute inset-0 pointer-events-none z-10 opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))]" style={{backgroundSize: '100% 2px, 3px 100%'}} />

                <div 
                    className="relative bg-[#0a0a0a] border border-slate-800/50 shadow-[0_0_50px_rgba(6,182,212,0.15)] rounded-lg overflow-hidden"
                    style={{
                        width: '100%',
                        aspectRatio: '1/1',
                        maxWidth: '400px',
                        display: 'grid',
                        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                        gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
                    }}
                >
                    {/* Grid Background */}
                    <div className="absolute inset-0 grid grid-cols-[repeat(25,1fr)] grid-rows-[repeat(25,1fr)] pointer-events-none">
                        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
                            <div key={i} className="border-[0.5px] border-cyan-900/20" />
                        ))}
                    </div>

                    {/* Particles */}
                    {particles.map(p => (
                        <div 
                            key={p.id}
                            className="absolute w-1 h-1 rounded-full z-20 pointer-events-none"
                            style={{
                                left: `${(p.x + 0.5) * (100/GRID_SIZE)}%`,
                                top: `${(p.y + 0.5) * (100/GRID_SIZE)}%`,
                                backgroundColor: p.color,
                                opacity: p.life,
                                transform: `translate(-50%, -50%) scale(${p.life})`,
                                boxShadow: `0 0 5px ${p.color}`
                            }}
                        />
                    ))}

                    {/* Food */}
                    <div 
                        className="relative z-10"
                        style={{
                            gridColumn: food.x + 1,
                            gridRow: food.y + 1,
                        }}
                    >
                        <div className="absolute inset-1 bg-rose-500 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse" />
                        <div className="absolute inset-2 bg-white rounded-full opacity-50 animate-ping" />
                    </div>

                    {/* Snake */}
                    {snake.map((segment, i) => {
                        const isHead = i === 0;
                        return (
                            <div
                                key={i}
                                className="relative z-10"
                                style={{
                                    gridColumn: segment.x + 1,
                                    gridRow: segment.y + 1,
                                }}
                            >
                                <div 
                                    className={`absolute inset-[1px] shadow-[0_0_10px_rgba(34,211,238,0.4)] transition-all duration-100
                                        ${isHead ? 'bg-cyan-400 z-20 rounded-md' : 'bg-cyan-600/80 rounded-sm'}
                                    `}
                                >
                                    {isHead && (
                                        <>
                                            <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-black/80 rounded-full shadow-inner" />
                                            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-black/80 rounded-full shadow-inner" />
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Overlays */}
                {gameState === 'IDLE' && (
                    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center z-30">
                        <div className="relative mb-8 group">
                            <div className="absolute -inset-4 bg-cyan-500/20 blur-xl rounded-full group-hover:bg-cyan-500/30 transition-all duration-500" />
                            <h2 className="relative text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-blue-500 tracking-tighter drop-shadow-lg">
                                NEON SNAKE
                            </h2>
                        </div>
                        <p className="text-cyan-100/60 mb-8 text-center px-8 font-medium tracking-wide">Swipe or use arrow keys to survive</p>
                        <button 
                            onClick={initGame}
                            className="group relative px-10 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-full font-black text-xl transition-all shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:shadow-[0_0_50px_rgba(6,182,212,0.7)] hover:-translate-y-1 active:translate-y-0 overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                <Play size={24} className="fill-current" />
                                PLAY NOW
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        </button>
                    </div>
                )}

                {gameState === 'GAME_OVER' && (
                    <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center z-30 animate-in fade-in zoom-in duration-300">
                        <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-rose-400 to-purple-500 mb-2 drop-shadow-lg tracking-tighter">GAME OVER</h2>
                        <div className="text-center mb-10 bg-slate-800/50 p-6 rounded-2xl border border-white/5 backdrop-blur-md shadow-xl">
                            <p className="text-cyan-100/50 text-xs font-bold uppercase tracking-[0.2em] mb-2">Final Score</p>
                            <p className="text-6xl font-mono font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">{score}</p>
                        </div>
                        <button 
                            onClick={initGame}
                            className="group flex items-center gap-3 px-8 py-4 bg-white text-slate-900 hover:bg-cyan-50 rounded-full font-bold text-lg transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95"
                        >
                            <RefreshCw size={24} className="group-hover:rotate-180 transition-transform duration-500 text-cyan-600" />
                            TRY AGAIN
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile Controls */}
            <div className="bg-slate-900 p-6 pb-10 grid grid-cols-3 gap-3 justify-items-center border-t border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] relative z-20">
                <div />
                <button 
                    className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center active:bg-cyan-500 active:text-slate-900 active:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all duration-150 text-slate-400 border border-slate-700/50"
                    onPointerDown={() => handleControl('UP')}
                >
                    <ArrowUp size={28} strokeWidth={3} />
                </button>
                <div />
                
                <button 
                    className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center active:bg-cyan-500 active:text-slate-900 active:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all duration-150 text-slate-400 border border-slate-700/50"
                    onPointerDown={() => handleControl('LEFT')}
                >
                    <ArrowLeft size={28} strokeWidth={3} />
                </button>
                <button 
                    className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center active:bg-cyan-500 active:text-slate-900 active:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all duration-150 text-slate-400 border border-slate-700/50"
                    onPointerDown={() => handleControl('DOWN')}
                >
                    <ArrowDown size={28} strokeWidth={3} />
                </button>
                <button 
                    className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center active:bg-cyan-500 active:text-slate-900 active:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all duration-150 text-slate-400 border border-slate-700/50"
                    onPointerDown={() => handleControl('RIGHT')}
                >
                    <ArrowRight size={28} strokeWidth={3} />
                </button>
            </div>
        </div>
    );
};

export default Snake;