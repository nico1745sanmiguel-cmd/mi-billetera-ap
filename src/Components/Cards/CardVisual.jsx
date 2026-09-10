import React from 'react';
import { ChevronRight, CheckCircle, Clock } from 'lucide-react';
import { formatMoney } from '../../utils';
import { CARD_LOGO_MAP } from '../../config/constants';

const getCardLogo = (name) => {
    const n = (name || '').toLowerCase();
    const match = CARD_LOGO_MAP.find(({ keywords }) => keywords.some(kw => n.includes(kw)));
    return match?.path || null;
};

// ── Mini tarjeta visual para el carrusel ─────────────────────────────────────
export default function CardVisual({ card, monthKey, privacyMode, onClick, isSelected }) {
    if (!card) return null;

    const showMoney = (amount) => (privacyMode ? '****' : formatMoney(amount));
    const logo = getCardLogo(card.name);
    const stmt = card.monthlyStatements?.[monthKey];
    const isPaid = Boolean(card.paidPeriods?.includes(monthKey));

    let baseColor = card.color || '#1e293b';
    if (typeof baseColor !== 'string' || !/^#([0-9A-Fa-f]{3}){1,2}$/.test(baseColor)) {
        baseColor = '#1e293b';
    } else if (baseColor.length === 4) {
        baseColor = '#' + baseColor[1] + baseColor[1] + baseColor[2] + baseColor[2] + baseColor[3] + baseColor[3];
    }

    const isInteractive = Boolean(onClick);

    return (
        <div
            onClick={onClick}
            role={isInteractive ? 'button' : 'region'}
            tabIndex={isInteractive ? 0 : undefined}
            aria-label={`Tarjeta ${card.name || 'de crédito'} de ${card.bank || 'banco'}`}
            onKeyDown={isInteractive ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick(e);
                }
            } : undefined}
            className={`flex-shrink-0 w-[82%] max-w-[280px] h-48 rounded-[28px] shadow-md p-5 text-white flex flex-col relative overflow-hidden snap-center transition-all duration-200 select-none ${
                isInteractive
                    ? 'cursor-pointer active:scale-95 group hover:scale-[1.01]'
                    : 'cursor-default'
            } ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-[1.02]' : ''}`}
            style={{
                background: `linear-gradient(135deg, ${baseColor} 0%, ${baseColor}E6 50%, #0f172a 100%)`
            }}
        >
            {/* Glow y textura metálica */}
            <div className="absolute top-0 end-0 w-36 h-36 bg-white/10 rounded-full -me-10 -mt-10 blur-2xl pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-start mb-auto relative z-10 gap-2 min-w-0">
                {logo ? (
                    <img src={logo} alt={`Logo de ${card.name}`} className="h-6 object-contain filter brightness-200 contrast-200 drop-shadow-sm shrink-0" loading="lazy" />
                ) : (
                    <span className="font-bold text-sm tracking-wider uppercase opacity-90 drop-shadow-sm truncate min-w-0 flex-1">
                        {card.name}
                    </span>
                )}
                <span 
                    className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono backdrop-blur-md uppercase tracking-wider border border-white/10 shrink-0 max-w-[95px] truncate"
                    title={card.bank || 'Tarjeta'}
                >
                    {card.bank || 'Tarjeta'}
                </span>
            </div>

            {/* Chip EMV, últimos 4 dígitos y Días */}
            <div className="relative z-10 flex items-center justify-between gap-2 mb-2">
                {/* Chip decorativo y últimos 4 dígitos */}
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-6 rounded-md bg-gradient-to-tr from-amber-300 via-amber-200 to-yellow-400 opacity-90 shadow-sm flex items-center justify-center p-0.5 overflow-hidden shrink-0">
                        <div className="w-full h-full border border-amber-600/30 rounded-sm flex items-center justify-around">
                            <div className="w-0.5 h-full bg-amber-600/30" />
                            <div className="w-0.5 h-full bg-amber-600/30" />
                        </div>
                    </div>
                    {card.last4 && String(card.last4).trim() ? (
                        <span className="font-mono text-xs tracking-widest opacity-85 font-bold truncate" title={`Terminada en ${card.last4}`}>
                            •••• {String(card.last4).trim()}
                        </span>
                    ) : null}
                </div>

                {/* Días de Cierre y Vence */}
                <div className="flex gap-3 shrink-0">
                    <div>
                        <p className="text-[8px] opacity-70 uppercase tracking-widest mb-0.5">Cierre</p>
                        <p className="font-mono text-xs font-bold opacity-90">
                            {card.closeDay ? `Día ${card.closeDay}` : '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-[8px] opacity-70 uppercase tracking-widest mb-0.5">Vence</p>
                        <p className="font-mono text-xs font-bold opacity-90">
                            {card.dueDay ? `Día ${card.dueDay}` : '—'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="z-10 border-t border-white/20 pt-2 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-[9px] opacity-70 uppercase font-medium tracking-wide">Total a pagar</p>
                        {isPaid ? (
                            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <CheckCircle size={9} /> Pagada
                            </span>
                        ) : stmt ? (
                            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Clock size={9} /> Pendiente
                            </span>
                        ) : null}
                    </div>
                    <p className="font-mono text-xl font-black tracking-tight">
                        {stmt ? showMoney(stmt.totalDue) : <span className="text-xs opacity-50 font-sans font-normal">Sin resumen</span>}
                    </p>
                </div>
                {isInteractive ? (
                    <div className="flex items-center gap-0.5 text-white/70 group-hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors">
                        Ver <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                    </div>
                ) : (
                    <div className="text-[9px] font-mono opacity-60 uppercase tracking-widest">
                        {card.closeDay && card.dueDay ? `C${card.closeDay}/V${card.dueDay}` : ''}
                    </div>
                )}
            </div>
        </div>
    );
}
