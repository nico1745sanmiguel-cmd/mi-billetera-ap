import React from 'react';
import { ArrowLeft, Plus, CreditCard as CreditCardIcon, CheckCircle2, Clock } from 'lucide-react';
import { formatMoney } from '../../utils';
import Skeleton from '../UI/Skeleton';
import CardVisual from './CardVisual';

// Formateamos la fecha de vencimiento de forma legible
const formatDueDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const trimmed = dateStr.trim();
    if (trimmed.includes('-')) {
        const parts = trimmed.slice(0, 10).split('-');
        if (parts.length >= 3) return `${parts[2].slice(0, 2)}/${parts[1]}`;
    }
    if (trimmed.includes('/')) {
        const parts = trimmed.split('/');
        if (parts.length >= 2) return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}`;
    }
    return trimmed;
};

// ── Skeleton de Carga Premium ───────────────────────────────────────────────
export function CardsListSkeleton({ isGlass }) {
    const cardBg = isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm';
    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Header Skeleton */}
            <div className={`rounded-2xl p-5 border ${isGlass ? 'bg-white/10 border-white/10' : 'bg-gradient-to-r from-blue-700 to-indigo-700 shadow-lg shadow-blue-200'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 animate-pulse" />
                    <div className="w-10 h-10 rounded-xl bg-white/20 animate-pulse" />
                    <div className="space-y-1.5">
                        <div className="w-36 h-5 rounded bg-white/30 animate-pulse" />
                        <div className="w-24 h-3 rounded bg-white/20 animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Monthly Summary Skeleton */}
            <div className={`rounded-2xl p-5 border ${cardBg}`}>
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-white/10">
                    <div className="space-y-2">
                        <Skeleton type="text" width="130px" className="!h-2.5" />
                        <Skeleton type="title" width="150px" className="!h-7" />
                    </div>
                    <Skeleton type="rectangular" width="80px" height="32px" />
                </div>
                <div className="pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <Skeleton type="circle" width="10px" height="10px" />
                            <Skeleton type="text" width="110px" />
                        </div>
                        <Skeleton type="text" width="70px" />
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <Skeleton type="circle" width="10px" height="10px" />
                            <Skeleton type="text" width="130px" />
                        </div>
                        <Skeleton type="text" width="80px" />
                    </div>
                </div>
            </div>

            {/* Carrusel Skeleton */}
            <div className="flex gap-3 pb-2 px-2 overflow-hidden">
                <div className="flex-shrink-0 w-[82%] max-w-[280px] h-48 rounded-[28px] p-5 bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex flex-col justify-between animate-pulse">
                    <div className="flex justify-between items-center">
                        <div className="w-24 h-4 rounded bg-white/20" />
                        <div className="w-14 h-4 rounded bg-white/10" />
                    </div>
                    <div className="flex gap-4">
                        <div className="w-14 h-6 rounded bg-white/10" />
                        <div className="w-14 h-6 rounded bg-white/10" />
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between items-end">
                        <div className="space-y-1">
                            <div className="w-16 h-2 rounded bg-white/20" />
                            <div className="w-28 h-5 rounded bg-white/20" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Botón Skeleton */}
            <div className="w-full h-14 rounded-2xl bg-gray-200 dark:bg-white/10 animate-pulse" />
        </div>
    );
}

// ── Panel resumen del mes (total tarjetas) ───────────────────────────────────
function MonthlyCardsSummary({ cards, monthKey, privacyMode, isGlass, onSelectCard }) {
    const text = isGlass ? 'text-white' : 'text-gray-800';
    const sub  = isGlass ? 'text-white/50' : 'text-gray-500';

    const safeCards = Array.isArray(cards) ? cards.filter(c => c && typeof c === 'object') : [];

    // Sumamos el totalDue de cada tarjeta para el mes activo asegurando conversión numérica estricta
    const cardsWithData = safeCards.map(card => {
        const stmt = card.monthlyStatements?.[monthKey] || null;
        const numDue = Number(stmt?.totalDue);
        const safeTotalDue = (!isNaN(numDue) && isFinite(numDue) && numDue >= 0) ? numDue : 0;
        return {
            card,
            stmt,
            safeTotalDue,
            isPaid: Boolean(card.paidPeriods?.includes(monthKey)),
        };
    });

    const grandTotal = cardsWithData.reduce((acc, { safeTotalDue }) => acc + safeTotalDue, 0);
    const pendingTotal = cardsWithData
        .filter(({ isPaid }) => !isPaid)
        .reduce((acc, { safeTotalDue }) => acc + safeTotalDue, 0);

    const showMoney = (amount) => (privacyMode ? '****' : formatMoney(amount));

    if (cards.length === 0) return null;

    return (
        <div className={`rounded-2xl overflow-hidden ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-100 shadow-sm'}`}>
            {/* Header del panel */}
            <div className={`px-5 pt-4 pb-3 flex justify-between items-center border-b ${isGlass ? 'border-white/10' : 'border-gray-100'}`}>
                <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${sub}`}>Total tarjetas · este mes</p>
                    <p className={`text-2xl font-black tracking-tight ${text}`}>{showMoney(grandTotal)}</p>
                </div>
                {pendingTotal > 0 ? (
                    <div className="text-right">
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${sub}`}>
                            {pendingTotal === grandTotal ? 'A pagar' : 'Pendiente'}
                        </p>
                        <p className="text-lg font-black text-amber-500 tracking-tight flex items-center justify-end gap-1">
                            <Clock size={14} />
                            {showMoney(pendingTotal)}
                        </p>
                    </div>
                ) : grandTotal > 0 ? (
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-500">Todo pagado</span>
                    </div>
                ) : null}
            </div>

            {/* Detalle por tarjeta */}
            <div className="divide-y divide-gray-100 dark:divide-white/5">
                {cardsWithData.map(({ card, stmt, isPaid }) => (
                    <div
                        key={card.id}
                        onClick={() => onSelectCard && onSelectCard(card)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Ver detalle de tarjeta ${card.name}`}
                        onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && onSelectCard) {
                                e.preventDefault();
                                onSelectCard(card);
                            }
                        }}
                        className={`px-5 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isGlass ? 'hover:bg-white/5 active:bg-white/10' : 'hover:bg-gray-50 active:bg-gray-100'
                        }`}
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            {/* Dot de color de la tarjeta */}
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: card.color || '#888' }} />
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <p className={`text-sm font-bold truncate ${text}`}>{card.name}</p>
                                    {card.last4 && (
                                        <span className={`text-[10px] font-mono shrink-0 opacity-70 ${sub}`}>•••• {card.last4}</span>
                                    )}
                                </div>
                                {stmt?.dueDate ? (
                                    <p className={`text-[10px] ${sub}`}>Vence {formatDueDate(stmt.dueDate)}</p>
                                ) : (
                                    <p className="text-[10px] text-amber-500 font-semibold">Resumen pendiente</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {stmt ? (
                                <span className={`text-sm font-black ${text}`}>{showMoney(stmt.totalDue)}</span>
                            ) : (
                                <span className={`text-xs font-bold ${sub}`}>—</span>
                            )}
                            {isPaid ? (
                                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓</span>
                            ) : stmt ? (
                                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">⏳</span>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Vista lista (carrusel + nueva tarjeta) ────────────────────────────────────
export default function CardsList({ cards = [], loading = false, monthKey, privacyMode, isGlass, onSelectCard, onNewCard, onBack }) {
    const text = isGlass ? 'text-white' : 'text-gray-800';
    const sub  = isGlass ? 'text-white/50' : 'text-gray-400';

    if (loading && cards.length === 0) {
        return <CardsListSkeleton isGlass={isGlass} />;
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Header */}
            <div className={`rounded-2xl p-5 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-lg shadow-blue-200'}`}>
                <div className="flex items-center gap-3">
                    <button
                        aria-label="Volver al panel principal"
                        type="button"
                        onClick={onBack}
                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-all active:scale-95"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                            <CreditCardIcon size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold leading-tight">Tarjetas de Crédito</h2>
                            <p className="text-white/70 text-xs">
                                {cards.length} {cards.length === 1 ? 'tarjeta registrada' : 'tarjetas registradas'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Panel resumen del mes */}
            <MonthlyCardsSummary cards={cards} monthKey={monthKey} privacyMode={privacyMode} isGlass={isGlass} onSelectCard={onSelectCard} />

            {/* Carrusel */}
            {cards.length > 0 ? (
                <div className="flex overflow-x-auto gap-3 pb-4 px-2 snap-x snap-mandatory hide-scrollbar">
                    {cards.map(card => (
                        <CardVisual
                            key={card.id}
                            card={card}
                            monthKey={monthKey}
                            privacyMode={privacyMode}
                            onClick={() => onSelectCard(card)}
                            isSelected={false}
                        />
                    ))}
                </div>
            ) : (
                <div className={`rounded-3xl p-8 text-center border ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isGlass ? 'bg-white/10 text-white/70' : 'bg-blue-50 text-blue-600'}`}>
                        <CreditCardIcon size={32} />
                    </div>
                    <h3 className={`font-bold text-lg mb-1.5 ${text}`}>Sin tarjetas aún</h3>
                    <p className={`text-xs max-w-xs mx-auto mb-5 leading-relaxed ${sub}`}>
                        Agregá tu primera tarjeta para controlar vencimientos, fechas de cierre y resúmenes con inteligencia artificial.
                    </p>
                    <button
                        type="button"
                        onClick={onNewCard}
                        className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-xl text-sm font-bold bg-brand-primary text-white hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/20"
                    >
                        <Plus size={16} /> Agregar Primera Tarjeta
                    </button>
                </div>
            )}

            {/* Botón nueva tarjeta */}
            {cards.length > 0 && (
                <button
                    aria-label="Agregar nueva tarjeta"
                    type="button"
                    onClick={onNewCard}
                    className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${isGlass ? 'bg-surface-glass border border-white/10 text-white hover:bg-white/20' : 'bg-brand-primary text-surface-light hover:bg-blue-700 shadow-blue-500/20'}`}
                >
                    <Plus size={18} />
                    Agregar Tarjeta
                </button>
            )}

            {/* Tip */}
            {cards.length > 0 && (
                <p className={`text-xs text-center px-4 ${sub}`}>
                    Tocá una tarjeta para ver detalles o cargar el resumen del mes.
                </p>
            )}
        </div>
    );
}
