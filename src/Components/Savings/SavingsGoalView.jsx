import React, { useEffect, useState } from 'react';
import { Target, Edit3, Trophy, ImageOff, Sparkles, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Componente simple de Confetti usando framer-motion
const ConfettiExplosion = ({ isComplete }) => {
    const [particles, setParticles] = useState([]);
    
    useEffect(() => {
        if (isComplete) {
            const colors = ['#f59e0b', '#fbbf24', '#34d399', '#60a5fa', '#f472b6'];
            const newParticles = Array.from({ length: 50 }).map((_, i) => ({
                id: i,
                x: (Math.random() - 0.5) * 400, // random x spread
                y: (Math.random() - 1.5) * 400, // random y spread (mostly up)
                rotation: Math.random() * 360,
                scale: Math.random() * 0.5 + 0.5,
                color: colors[Math.floor(Math.random() * colors.length)],
                delay: Math.random() * 0.2
            }));
            setParticles(newParticles);
        } else {
            setParticles([]);
        }
    }, [isComplete]);

    if (!isComplete) return null;

    return (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-10">
            <AnimatePresence>
                {particles.map(p => (
                    <motion.div
                        key={p.id}
                        initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
                        animate={{ 
                            x: p.x, 
                            y: p.y, 
                            scale: p.scale, 
                            rotate: p.rotation + 360,
                            opacity: 0
                        }}
                        transition={{ 
                            duration: 2 + Math.random() * 1.5, 
                            delay: p.delay,
                            ease: "easeOut" 
                        }}
                        className="absolute w-3 h-3 rounded-sm"
                        style={{ backgroundColor: p.color }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};


const SavingsGoalView = ({ 
    savingsGoal, isComplete, hasImage, imageError, setImageError, 
    progress, privacyMode, formatCurrency, totalARS, goalAmount, remaining, 
    handleDelete, saving, openEdit, isGlass, cardBg, textColor 
}) => {
    return (
        <div className={`rounded-3xl overflow-hidden ${cardBg} animate-fade-in relative`}>
            
            {/* Confetti overlay cuando llega al 100% */}
            <ConfettiExplosion isComplete={isComplete} />

            <div className="px-6 pt-6 pb-4 flex justify-between items-start relative z-20">
                <div className="flex items-center gap-4">
                    <div className={`p-3.5 rounded-2xl shadow-sm transition-colors ${
                        isComplete
                            ? isGlass ? 'bg-yellow-400/20 text-yellow-400' : 'bg-yellow-100 text-yellow-500'
                            : isGlass ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                    }`}>
                        {isComplete ? <Trophy size={28} /> : <Target size={28} />}
                    </div>
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                            isComplete
                                ? isGlass ? 'text-yellow-400' : 'text-yellow-600'
                                : isGlass ? 'text-white/50' : 'text-gray-500'
                        }`}>
                            {isComplete ? '🎉 ¡Objetivo alcanzado!' : 'Mi Objetivo'}
                        </p>
                        <h2 className={`text-2xl font-black leading-tight ${textColor}`}>{savingsGoal.name}</h2>
                    </div>
                </div>
                <button type="button"
                    onClick={openEdit}
                    className={`p-3 rounded-2xl transition-all ${
                        isGlass ? 'bg-white/5 hover:bg-white/20 text-white' : 'bg-gray-50 hover:bg-gray-200 text-gray-600'
                    }`}
                    title="Editar objetivo"
                >
                    <Edit3 size={18} />
                </button>
            </div>

            {hasImage ? (
                <div className="mx-6 mt-2 mb-6 relative overflow-hidden rounded-3xl bg-gray-900 shadow-inner group" style={{ height: '240px' }}>
                    <img
                        src={savingsGoal.imageUrl}
                        alt={savingsGoal.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        style={{ filter: 'grayscale(100%) brightness(0.5)' }}
                        onError={() => setImageError(true)}
                    />
                    
                    {progress > 0 && (
                        <motion.img
                            initial={{ clipPath: 'inset(100% 0 0 0)' }}
                            animate={{ clipPath: `inset(${(100 - progress).toFixed(2)}% 0 0 0)` }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                            src={savingsGoal.imageUrl}
                            alt={savingsGoal.name}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    )}
                    
                    {progress > 1 && progress < 99 && (
                        <motion.div
                            initial={{ top: '100%' }}
                            animate={{ top: `${(100 - progress).toFixed(2)}%` }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                            className="absolute left-0 right-0 pointer-events-none"
                            style={{
                                height: '3px',
                                background: 'rgba(255,255,255,0.9)',
                                boxShadow: '0 0 12px 3px rgba(255,255,255,0.6)',
                            }}
                        />
                    )}

                    <div className="absolute inset-x-4 bottom-4 flex justify-between items-end pointer-events-none z-10">
                        <div className="bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-2xl flex items-center gap-2 border border-white/10 shadow-lg">
                            <TrendingUp size={16} className="text-amber-400" />
                            <span className="font-black text-lg">
                                {privacyMode ? '**%' : `${progress.toFixed(0)}%`}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-white/70">Ahorrado</span>
                        </div>
                        {isComplete && (
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', bounce: 0.5, delay: 1 }}
                                className="bg-yellow-400 text-yellow-900 text-sm font-black px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg shadow-yellow-400/20"
                            >
                                <Sparkles size={16} />
                                ¡Logrado!
                            </motion.div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="mx-6 mt-2 mb-6">
                    <div className={`rounded-3xl p-8 ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-dashed border-gray-200'} flex flex-col items-center justify-center gap-4 text-center`}>
                        <ImageOff size={32} className={isGlass ? 'text-white/20' : 'text-gray-300'} />
                        <p className={`text-sm font-semibold max-w-[200px] ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                            Podés agregarle una imagen desde el botón de editar
                        </p>
                        
                        <div className="w-full mt-4 max-w-sm">
                            <div className="flex justify-between mb-2 text-xs font-bold">
                                <span className={isGlass ? 'text-white/50' : 'text-gray-400'}>Progreso</span>
                                <span className="font-black text-amber-500">{privacyMode ? '**' : progress.toFixed(0)}%</span>
                            </div>
                            <div className={`h-6 rounded-full overflow-hidden shadow-inner ${isGlass ? 'bg-black/40' : 'bg-gray-200'}`}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className={`h-full rounded-full ${
                                        isComplete ? 'bg-gradient-to-r from-yellow-400 to-amber-400' : 'bg-gradient-to-r from-amber-400 to-amber-600'
                                    }`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="px-6 pb-6 grid grid-cols-2 gap-4 relative z-20">
                <div className={`p-4 sm:p-5 rounded-3xl ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>Tenés ahorrado</p>
                    <p className={`text-xl sm:text-2xl font-black ${isGlass ? 'text-green-400' : 'text-green-600'} truncate`}>
                        {formatCurrency(totalARS)}
                    </p>
                </div>
                <div className={`p-4 sm:p-5 rounded-3xl ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>Meta final</p>
                    <p className={`text-xl sm:text-2xl font-black ${textColor} truncate`}>
                        {formatCurrency(goalAmount)}
                    </p>
                </div>

                {!isComplete ? (
                    <div className={`col-span-2 p-5 rounded-3xl flex items-center justify-between gap-4 ${isGlass ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-100'}`}>
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isGlass ? 'text-amber-300/70' : 'text-amber-700'}`}>Te falta para lograrlo</p>
                            <p className={`text-2xl font-black ${isGlass ? 'text-amber-400' : 'text-amber-600'} truncate`}>
                                {formatCurrency(remaining)}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className={`col-span-2 p-5 rounded-3xl flex items-center gap-3 ${isGlass ? 'bg-yellow-400/20 border border-yellow-400/30' : 'bg-yellow-100 border border-yellow-200'}`}>
                        <div className="p-2 bg-yellow-400 rounded-xl text-yellow-900 shrink-0">
                            <Trophy size={20} />
                        </div>
                        <p className={`text-sm font-black ${isGlass ? 'text-yellow-400' : 'text-yellow-700'}`}>
                            ¡Llegaste a tu objetivo! Ya podés establecer uno nuevo.
                        </p>
                    </div>
                )}
            </div>

            <button aria-label="Acción" type="button"
                onClick={handleDelete}
                disabled={saving}
                className={`w-full py-4 text-xs font-bold uppercase tracking-wider transition-colors border-t relative z-20 ${
                    isGlass
                        ? 'border-white/10 text-red-400/50 hover:text-red-400 hover:bg-red-500/10'
                        : 'border-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50'
                }`}
            >
                {saving ? 'Eliminando...' : 'Eliminar objetivo'}
            </button>
        </div>
    );
};

export default SavingsGoalView;
