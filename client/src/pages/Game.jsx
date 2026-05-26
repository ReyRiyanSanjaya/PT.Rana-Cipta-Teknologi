import React, { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Gamepad2, Building2, Layers, Zap } from 'lucide-react';
import CityTower from '../components/games/CityTower';
import CityBloxx from '../components/games/CityBloxx';
import Snake from '../components/games/Snake';

const Game = () => {
    const [activeGame, setActiveGame] = useState(null);

    const GAMES = [
        {
            id: 'city-bloxx',
            title: 'City Bloxx',
            description: 'Bangun gedung pencakar langit dengan menjatuhkan blok dari derek yang bergoyang. Uji ketepatan Anda!',
            icon: Building2,
            color: 'bg-indigo-500',
            component: CityBloxx
        },
        {
            id: 'stack-tower',
            title: 'Stack Tower',
            description: 'Tumpuk blok setinggi mungkin. Potong bagian yang berlebih dan pertahankan keseimbangan!',
            icon: Layers,
            color: 'bg-emerald-500',
            component: CityTower
        },
        {
            id: 'snake',
            title: 'Neon Snake',
            description: 'Kendalikan ular neon, makan partikel energi, dan hindari tabrakan. Klasik dengan sentuhan modern!',
            icon: Zap,
            color: 'bg-rose-500',
            component: Snake
        }
    ];

    return (
        <DashboardLayout>
            <div className="p-6 min-h-screen">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Gamepad2 className="w-8 h-8 text-indigo-500" />
                        Game Center
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {activeGame ? `Playing: ${GAMES.find(g => g.id === activeGame)?.title}` : 'Pilih game untuk dimainkan'}
                    </p>
                </div>

                <div className="flex justify-center pb-10">
                    {!activeGame ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                            {GAMES.map((game) => (
                                <button
                                    key={game.id}
                                    onClick={() => setActiveGame(game.id)}
                                    className="group relative bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 text-left border border-slate-200 dark:border-slate-700 hover:-translate-y-1"
                                >
                                    <div className={`h-32 ${game.color} flex items-center justify-center relative overflow-hidden`}>
                                        <game.icon size={64} className="text-white opacity-90 relative z-10 group-hover:scale-110 transition-transform duration-500" />
                                        
                                        {/* Background Pattern */}
                                        <div className="absolute inset-0 opacity-20" 
                                            style={{ 
                                                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                                                backgroundSize: '20px 20px' 
                                            }} 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                    </div>
                                    
                                    <div className="p-6">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-500 transition-colors">
                                            {game.title}
                                        </h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                            {game.description}
                                        </p>
                                        
                                        <div className="mt-6 flex items-center text-sm font-bold text-indigo-500 dark:text-indigo-400 group-hover:gap-2 transition-all">
                                            Mainkan Sekarang
                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="w-full h-full flex justify-center animate-in fade-in zoom-in duration-300">
                            {(() => {
                                const GameComponent = GAMES.find(g => g.id === activeGame)?.component;
                                return GameComponent ? <GameComponent onBack={() => setActiveGame(null)} /> : null;
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Game;