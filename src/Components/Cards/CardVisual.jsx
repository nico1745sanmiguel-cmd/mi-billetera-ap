import React from 'react';
import { ChevronRight } from 'lucide-react';
import { formatMoney } from '../../utils';
import { CARD_LOGO_MAP } from '../../config/constants';

const getCardLogo = (name) => {
    const n = (name || '').toLowerCase();
    const match = CARD_LOGO_MAP.find(({ keywords }) => keywords.some(kw => n.includes(kw)));
    return match?.path || null;
};

// ── Mini tarjeta visual para el carrusel ─────────────────────────────────────
export default function CardVisual({ card, monthKey, privacyMode, onClick, isSelected }) {
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);
    const logo = getCardLogo(card.name);
    const stmt = card.monthlyStatements?.[monthKey];

    return (
        <div
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick(e) : undefined}
            className={`cursor-pointer flex-shrink-0 w-[82%] max-w-[280px] h-48 rounded-[28px] shadow-sm p-5 text-white flex flex-col relative overflow-hidden snap-center transition-all duration-200 active:scale-95 group ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-[1.02]' : 'hover:scale-[1.01]'}`}
            style={{ backgroundColor: card.color || 'var(--card-color)' }}
        >
            {/* Glow */}
            <div className="absolute top-0 end-0 w-32 h-32 bg-white/5 rounded-full -me-10 -mt-10 blur-xl pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-start mb-auto relative z-10">
                {logo ? (
                    <img src={logo} alt={`Logo de ${card.name}`} className="h-6 object-contain filter brightness-200 contrast-200 drop-shadow-sm" loading="lazy" />
                ) : (
                    <span className="font-bold text-sm tracking-wider uppercase opacity-90">{card.name}</span>
                )}
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono backdrop-blur-sm uppercase tracking-wide">{card.bank}</span>
            </div>

            {/* Días */}
            <div className="relative z-10 flex gap-4 mb-3">
                <div>
                    <p className="text-[8px] opacity-70 uppercase tracking-widest mb-0.5">Cierre</p>
                    <p className="font-mono text-sm font-bold opacity-90">Día {card.closeDay}</p>
                </div>
                <div>
                    <p className="text-[8px] opacity-70 uppercase tracking-widest mb-0.5">Vence</p>
                    <p className="font-mono text-sm font-bold opacity-90">Día {card.dueDay}</p>
                </div>
            </div>

            {/* Footer */}
            <div className="z-10 border-t border-white/20 pt-2 flex justify-between items-end">
                <div>
                    <p className="text-[9px] opacity-70 uppercase mb-0.5 font-medium tracking-wide">Total a pagar</p>
                    <p className="font-mono text-xl font-bold tracking-tight">
                        {stmt ? showMoney(stmt.totalDue) : <span className="text-sm opacity-50">Sin resumen</span>}
                    </p>
                </div>
                <div className="flex items-center gap-1 text-white/60 text-[10px] font-bold uppercase tracking-wide">
                    Ver <ChevronRight size={12} />
                </div>
            </div>
        </div>
    );
}
