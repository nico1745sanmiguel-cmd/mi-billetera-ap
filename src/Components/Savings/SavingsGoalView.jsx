import React from 'react';
import { Target, Edit3, Trophy, ImageOff, Sparkles } from 'lucide-react';

const SavingsGoalView = ({ 
    savingsGoal, isComplete, hasImage, imageError, setImageError, 
    progress, privacyMode, formatCurrency, totalARS, goalAmount, remaining, 
    handleDelete, saving, openEdit, isGlass, cardBg, textColor 
}) => {
    return (
        <div className={`rounded-3xl overflow-hidden ${cardBg} animate-fade-in`}>
            <div className="px-5 pt-5 pb-3 flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl transition-colors ${
                        isComplete
                            ? isGlass ? 'bg-yellow-400/20 text-yellow-400' : 'bg-yellow-100 text-yellow-500'
                            : isGlass ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                    }`}>
                        {isComplete ? <Trophy size={22} /> : <Target size={22} />}
                    </div>
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-wider ${
                            isComplete
                                ? isGlass ? 'text-yellow-400/80' : 'text-yellow-600'
                                : isGlass ? 'text-white/50' : 'text-gray-500'
                        }`}>
                            {isComplete ? '🎉 ¡Objetivo alcanzado!' : 'Mi Objetivo'}
                        </p>
                        <h2 className={`text-xl font-black leading-tight ${textColor}`}>{savingsGoal.name}</h2>
                    </div>
                </div>
                <button type="button"
                    onClick={openEdit}
                    className={`p-2 rounded-xl opacity-40 hover:opacity-100 transition-all ${
                        isGlass ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title="Editar objetivo"
                >
                    <Edit3 size={16} />
                </button>
            </div>

            {hasImage ? (
                <div className="mx-5 relative overflow-hidden rounded-2xl bg-gray-800 dark:bg-gray-900" style={{ height: '220px' }}>
                    <img
                        src={savingsGoal.imageUrl}
                        alt={savingsGoal.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ filter: 'grayscale(100%) brightness(0.75)' }}
                        onError={() => setImageError(true)}
                    />
                    {progress > 0 && (
                        <img
                            src={savingsGoal.imageUrl}
                            alt={savingsGoal.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{
                                clipPath: `inset(${(100 - progress).toFixed(2)}% 0 0 0)`,
                                transition: 'clip-path 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                            }}
                        />
                    )}
                    {progress > 1 && progress < 99 && (
                        <div
                            className="absolute left-0 right-0 pointer-events-none"
                            style={{
                                top: `${(100 - progress).toFixed(2)}%`,
                                height: '2px',
                                background: 'rgba(255,255,255,0.85)',
                                boxShadow: '0 0 8px 2px rgba(255,255,255,0.5)',
                                transition: 'top 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                            }}
                        />
                    )}
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end pointer-events-none">
                        <div className="bg-black/65 backdrop-blur-sm text-white text-sm font-black px-3 py-1.5 rounded-xl">
                            {privacyMode ? '**%' : `${progress.toFixed(0)}% ahorrado`}
                        </div>
                        {isComplete && (
                            <div className="bg-yellow-400 text-yellow-900 text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1">
                                <Sparkles size={12} />
                                ¡Logrado!
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="mx-5">
                    <div className={`rounded-2xl p-5 ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-dashed border-gray-200'} flex flex-col items-center gap-3`}>
                        <ImageOff size={28} className={isGlass ? 'text-white/20' : 'text-gray-300'} />
                        <p className={`text-xs text-center ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                            Editá el objetivo para agregar una imagen
                        </p>
                        <div className="w-full mt-1">
                            <div className={`h-4 rounded-full overflow-hidden ${isGlass ? 'bg-black/30' : 'bg-gray-200'}`}>
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ease-out ${
                                        isComplete ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 'bg-gradient-to-r from-amber-400 to-amber-600'
                                    }`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className={`flex justify-between mt-1 text-xs font-semibold ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>
                                <span>0%</span>
                                {!privacyMode && <span className="font-black text-amber-500">{progress.toFixed(0)}%</span>}
                                <span>100%</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-5 grid grid-cols-2 gap-3">
                <div className={`p-3.5 rounded-2xl ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-semibold mb-0.5 ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>Tenés ahorrado</p>
                    <p className={`text-base font-black ${isGlass ? 'text-green-400' : 'text-green-600'} truncate`}>
                        {formatCurrency(totalARS)}
                    </p>
                </div>
                <div className={`p-3.5 rounded-2xl ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-semibold mb-0.5 ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>Meta</p>
                    <p className={`text-base font-black ${textColor} truncate`}>
                        {formatCurrency(goalAmount)}
                    </p>
                </div>

                {!isComplete ? (
                    <div className={`col-span-2 p-3.5 rounded-2xl ${isGlass ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-100'}`}>
                        <p className={`text-xs font-semibold ${isGlass ? 'text-amber-300/70' : 'text-amber-700'}`}>Te falta para lograrlo</p>
                        <p className={`text-xl font-black ${isGlass ? 'text-amber-400' : 'text-amber-600'} truncate`}>
                            {formatCurrency(remaining)}
                        </p>
                    </div>
                ) : (
                    <div className={`col-span-2 p-3.5 rounded-2xl ${isGlass ? 'bg-yellow-400/10 border border-yellow-400/20' : 'bg-yellow-50 border border-yellow-100'}`}>
                        <p className={`text-sm font-black ${isGlass ? 'text-yellow-400' : 'text-yellow-600'}`}>
                            🏆 ¡Llegaste a tu objetivo! Podés editarlo para ponerte uno nuevo.
                        </p>
                    </div>
                )}
            </div>

            <button aria-label="Acción" type="button"
                onClick={handleDelete}
                disabled={saving}
                className={`w-full py-3 text-xs font-bold uppercase tracking-wider transition-colors border-t ${
                    isGlass
                        ? 'border-white/10 text-red-400/50 hover:text-red-400 hover:bg-red-500/10'
                        : 'border-gray-100 text-gray-300 hover:text-red-400 hover:bg-red-50'
                }`}
            >
                {saving ? 'Eliminando...' : 'Eliminar objetivo'}
            </button>
        </div>
    );
};

export default SavingsGoalView;
