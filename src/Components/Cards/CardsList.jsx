import React from 'react';
import { ArrowLeft, Plus, CreditCard as CreditCardIcon } from 'lucide-react';
import { formatMoney } from '../../utils';
import CardVisual from './CardVisual';

// Formateamos la fecha de vencimiento de forma legible
const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
};

// ── Panel resumen del mes (total tarjetas) ───────────────────────────────────
function MonthlyCardsSummary({ cards, monthKey, privacyMode, isGlass }) {
    const text = isGlass ? 'text-white' : 'text-gray-800';
    const sub  = isGlass ? 'text-white/50' : 'text-gray-500';

    // Sumamos el totalDue de cada tarjeta para el mes activo
    const cardsWithData = cards.map(card => ({
        card,
        stmt: card.monthlyStatements?.[monthKey] || null,
        isPaid: card.paidPeriods?.includes(monthKey) || false,
    }));

    const grandTotal = cardsWithData.reduce((acc, { stmt }) => acc + (stmt?.totalDue || 0), 0);
    const pendingTotal = cardsWithData
        .filter(({ isPaid }) => !isPaid)
        .reduce((acc, { stmt }) => acc + (stmt?.totalDue || 0), 0);

    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);


    if (cards.length === 0) return null;

    return (
        <div className={`rounded-2xl overflow-hidden ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-100 shadow-sm'}`}>
            {/* Header del panel */}
            <div className={`px-5 pt-4 pb-3 flex justify-between items-center border-b ${isGlass ? 'border-white/10' : 'border-gray-100'}`}>
                <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${sub}`}>Total tarjetas · este mes</p>
                    <p className={`text-2xl font-black tracking-tight ${text}`}>{showMoney(grandTotal)}</p>
                </div>
                {pendingTotal > 0 && pendingTotal < grandTotal && (
                    <div className="text-right">
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${sub}`}>Pendiente</p>
                        <p className="text-lg font-black text-amber-500 tracking-tight">{showMoney(pendingTotal)}</p>
                    </div>
                )}
                {grandTotal > 0 && pendingTotal === 0 && (
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        <span className="text-xs font-bold text-emerald-500">Todo pagado</span>
                    </div>
                )}
            </div>

            {/* Detalle por tarjeta */}
            <div className="divide-y divide-gray-100 dark:divide-white/5">
                {cardsWithData.map(({ card, stmt, isPaid }) => (
                    <div key={card.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            {/* Dot de color de la tarjeta */}
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: card.color || '#888' }} />
                            <div className="min-w-0">
                                <p className={`text-sm font-bold truncate ${text}`}>{card.name}</p>
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
export default function CardsList({ cards, monthKey, privacyMode, isGlass, onSelectCard, onNewCard, onBack }) {
    const text = isGlass ? 'text-white' : 'text-gray-800';
    const sub  = isGlass ? 'text-white/50' : 'text-gray-400';

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className={`rounded-2xl p-5 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-lg shadow-blue-200'}`}>
                <div className="flex items-center gap-3">
                    <button type="button"
                        onClick={onBack}
                        className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all active:scale-95"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <CreditCardIcon size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold leading-tight">Tarjetas de Crédito</h2>
                            <p className="text-white/70 text-xs">{cards.length} tarjeta{cards.length !== 1 ? 's' : ''} registrada{cards.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Panel resumen del mes */}
            <MonthlyCardsSummary cards={cards} monthKey={monthKey} privacyMode={privacyMode} isGlass={isGlass} />

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
                <div className={`rounded-2xl p-8 text-center ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-100 shadow-sm'}`}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isGlass ? 'bg-white/10' : 'bg-blue-50'}`}>
                        <CreditCardIcon size={28} className={isGlass ? 'text-white/40' : 'text-blue-300'} />
                    </div>
                    <p className={`font-bold text-base mb-1 ${text}`}>Sin tarjetas aún</p>
                    <p className={`text-sm ${sub}`}>Agregá tu primera tarjeta para empezar a registrar resúmenes.</p>
                </div>
            )}

            {/* Botón nueva tarjeta */}
            <button type="button"
                onClick={onNewCard}
                className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${isGlass ? 'bg-surface-glass border border-white/10 text-white hover:bg-white/20' : 'bg-brand-primary text-surface-light hover:bg-blue-700'}`}
            >
                <Plus size={18} />
                Agregar Tarjeta
            </button>

            {/* Tip */}
            {cards.length > 0 && (
                <p className={`text-xs text-center px-4 ${sub}`}>
                    Tocá una tarjeta para ver o cargar el resumen del mes.
                </p>
            )}
        </div>
    );
}
