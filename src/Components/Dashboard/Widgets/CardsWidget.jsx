import React from 'react';
import { CreditCard, ExternalLink, Plus } from 'lucide-react';
import { formatMoney } from '../../../utils';
import { CARD_LOGO_MAP } from '../../../config/constants';

export default function CardsWidget({ cards, targetMonthKey, privacyMode, onCardClick }) {
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

    const getCardLogo = (name) => {
        const n = (name || '').toLowerCase();
        const match = CARD_LOGO_MAP.find(({ keywords }) => keywords.some(kw => n.includes(kw)));
        return match?.path || null;
    };

    return (
        <div>
            <div className="flex justify-between items-center px-2 mb-3">
                <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2"><CreditCard size={18} /> Tus Tarjetas <span className="text-[9px] bg-gray-100 dark:bg-white/10 px-1.5 rounded text-gray-400 dark:text-white/40 font-normal">Desliza</span></h3>
            </div>

            <div className="flex overflow-x-auto gap-3 pb-8 px-2 snap-x snap-mandatory hide-scrollbar">
                {cards.map((card) => {
                    const logo = getCardLogo(card.name);
                    return (
                        <div key={card.id} onClick={() => onCardClick(card)} className="cursor-pointer flex-shrink-0 w-[85%] max-w-[280px] h-48 rounded-[30px] shadow-lg p-5 text-white relative overflow-hidden snap-center transition-transform active:scale-95 group" style={{ background: `linear-gradient(135deg, ${card.color || '#1f2937'} 0%, ${card.color || '#111827'}DD 100%)` }}>

                            {/* Background Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-xl"></div>

                            {/* Header: Logo & Bank */}
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                {logo ? (
                                    <img src={logo} alt={card.name} className="h-6 object-contain filter drop-shadow-md brightness-200 contrast-200" loading="lazy" />
                                ) : (
                                    <span className="font-bold text-lg tracking-wider uppercase opacity-90">{card.name}</span>
                                )}
                                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono backdrop-blur-sm uppercase tracking-wide">{card.bank}</span>
                            </div>

                            {/* Info: Cierre y próximo vencimiento */}
                            <div className="relative z-10 flex gap-4 mb-4">
                                <div>
                                    <p className="text-[8px] opacity-70 uppercase tracking-widest mb-0.5">Cierre</p>
                                    <p className="font-mono text-sm font-bold opacity-90">Día {card.closeDay}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] opacity-70 uppercase tracking-widest mb-0.5">Vence</p>
                                    <p className="font-mono text-sm font-bold opacity-90">Día {card.dueDay}</p>
                                </div>
                            </div>

                            {/* Footer: Resumen Mensual */}
                            <div className="absolute bottom-4 left-5 right-5 z-10 border-t border-white/20 pt-2 flex justify-between items-end">
                                <div>
                                    <p className="text-[9px] opacity-70 uppercase mb-0.5 font-medium tracking-wide">Total a pagar</p>
                                    <p className="font-mono text-2xl font-bold tracking-tight text-shadow-sm">{card.monthlyStatements?.[targetMonthKey] ? showMoney(card.monthlyStatements[targetMonthKey].totalDue) : <span className="text-sm opacity-60">Sin resumen</span>}</p>
                                </div>
                                <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors backdrop-blur-md opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onCardClick(card); }}>
                                    <ExternalLink size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Add New Card Placeholder */}
                <div onClick={() => onCardClick(null)} className="flex-shrink-0 w-[85%] max-w-[280px] h-48 rounded-[30px] border-2 border-dashed border-gray-300 dark:border-white/20 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white dark:hover:bg-white/5 hover:border-gray-400 dark:hover:border-white/40 active:scale-95 transition-all snap-center group">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-gray-400 dark:text-white/40 group-hover:bg-gray-200 dark:group-hover:bg-white/20 group-hover:text-gray-600 dark:group-hover:text-white/80 transition-colors">
                        <Plus size={24} />
                    </div>
                    <span className="text-gray-400 dark:text-white/40 font-bold text-sm group-hover:text-gray-600 dark:group-hover:text-white/80">Agregar Tarjeta</span>
                </div>
            </div>
        </div>
    );
}
