import React from 'react';
import { X, Check } from 'lucide-react';

const SKINS = [
    {
        id: 'default',
        name: 'Default',
        description: 'La experiencia original con widgets interactivos y gráficas detalladas.',
        colors: ['#3b82f6', '#1e40af'], // Tonos azules
    },
    {
        id: 'windowsphone',
        name: 'Windows Phone',
        description: 'Azulejos dinámicos (Live Tiles) de colores planos. Minimalista y directo.',
        colors: ['#0078D4', '#E81123', '#107C10', '#FF8C00'], // Colores metro
    }
];

const SkinsModal = ({ isOpen, onClose, currentSkin, onSelectSkin }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-10 sm:pt-16 animate-fade-in">
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
                onClick={onClose}
            ></div>
            
            <div 
                className="relative bg-white dark:bg-[#1a1b4b] w-full max-w-md max-h-[85vh] rounded-3xl shadow-2xl animate-scale-in flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-white/10 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Personalización</h2>
                        <p className="text-xs text-gray-500 dark:text-white/60 mt-0.5">Elegí la experiencia de tu pantalla principal</p>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="p-2 bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/70 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-4">
                    {SKINS.map((s) => {
                        const isActive = currentSkin === s.id;
                        return (
                            <div 
                                key={s.id}
                                onClick={() => {
                                    onSelectSkin(s.id);
                                    setTimeout(onClose, 150);
                                }}
                                className={`
                                    relative p-4 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden
                                    ${isActive 
                                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10' 
                                        : 'border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-white/30'}
                                `}
                            >
                                <div className="flex items-start justify-between relative z-10">
                                    <div className="pr-12">
                                        <h3 className={`text-lg font-bold ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-white'}`}>
                                            {s.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-white/60 mt-1 leading-relaxed">
                                            {s.description}
                                        </p>
                                    </div>
                                    
                                    <div className="flex gap-1">
                                        {s.colors.map(c => (
                                            <div key={c} className="w-3 h-8 rounded-full" style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                </div>

                                {isActive && (
                                    <div className="absolute bottom-4 right-4 bg-blue-500 text-white p-1 rounded-full shadow-lg animate-fade-in">
                                        <Check size={16} strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SkinsModal;
