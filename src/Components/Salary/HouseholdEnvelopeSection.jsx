import React, { useState } from 'react';
import { Users, CheckCircle2, AlertCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { formatMoney, formatInputNumber, parseInputNumber } from '../../utils';

/**
 * HouseholdEnvelopeSection
 *
 * Muestra la sección de "Gastos Familiares" dentro del plan de sueldo.
 * El usuario debe APROBAR manualmente el monto que se descontará de su sueldo.
 *
 * Props:
 *  - suggestedAmount: monto calculado automáticamente desde Household (proporción × gastos compartidos)
 *  - approvedAmount:  monto que el usuario ya aprobó (puede ser diferente a la sugerencia)
 *  - isApproved:      boolean — si ya aprobó este mes
 *  - onApprove(amount): callback para aprobar con un monto
 *  - onRemove():       callback para desaprobar
 *  - isGlass:          tema
 *  - hasHousehold:     boolean — si el usuario tiene household activo con otro miembro
 */
export default function HouseholdEnvelopeSection({
    suggestedAmount = 0,
    approvedAmount = 0,
    isApproved = false,
    onApprove,
    onRemove,
    isGlass,
    hasHousehold,
}) {
    const [expanded, setExpanded] = useState(false);
    const [customInput, setCustomInput] = useState('');
    const [useCustom, setUseCustom] = useState(false);

    if (!hasHousehold) return null;

    const displayAmount = isApproved ? approvedAmount : suggestedAmount;

    const handleApprove = () => {
        const amount = useCustom
            ? parseInputNumber(customInput)
            : suggestedAmount;
        if (amount > 0) onApprove(amount);
    };

    return (
        <div className={`rounded-2xl border transition-all overflow-hidden
            ${isApproved
                ? (isGlass ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200')
                : (isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200')}`}
        >
            {/* Header */}
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center gap-3 p-4 text-left"
            >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${isApproved ? 'bg-emerald-500/20 text-emerald-400' : (isGlass ? 'bg-white/10 text-white/60' : 'bg-gray-200 text-gray-500')}`}>
                    <Users size={18} />
                </div>

                <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                        Gastos familiares
                    </p>
                    <p className={`text-xs mt-0.5 ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                        {isApproved
                            ? 'Aprobado · ' + formatMoney(approvedAmount)
                            : suggestedAmount > 0
                                ? 'Sugerido: ' + formatMoney(suggestedAmount) + ' · Pendiente aprobación'
                                : 'Sin gastos compartidos este mes'}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {isApproved
                        ? <CheckCircle2 size={16} className="text-emerald-400" />
                        : suggestedAmount > 0
                            ? <AlertCircle size={16} className={isGlass ? 'text-amber-400' : 'text-amber-500'} />
                            : null
                    }
                    {expanded ? <ChevronDown size={16} className={isGlass ? 'text-white/40' : 'text-gray-400'} /> : <ChevronRight size={16} className={isGlass ? 'text-white/40' : 'text-gray-400'} />}
                </div>
            </button>

            {/* Panel expandido */}
            {expanded && (
                <div className={`px-4 pb-4 border-t ${isGlass ? 'border-white/10' : 'border-gray-100'}`}>
                    <p className={`text-xs mt-3 mb-4 leading-relaxed ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>
                        Este monto viene del módulo de <strong className={isGlass ? 'text-white/70' : 'text-gray-700'}>Familia</strong>:
                        es tu parte proporcional de los gastos compartidos del mes.
                        Podés aprobarlo tal cual o ingresar un monto personalizado.
                    </p>

                    {!isApproved && suggestedAmount > 0 && (
                        <div className="space-y-3">
                            {/* Opción: usar sugerido */}
                            <button
                                onClick={() => setUseCustom(false)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all
                                    ${!useCustom
                                        ? (isGlass ? 'border-violet-500 bg-violet-500/10' : 'border-violet-500 bg-violet-50')
                                        : (isGlass ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white')}`}
                            >
                                <span className={`text-sm font-medium ${isGlass ? 'text-white' : 'text-gray-700'}`}>
                                    Usar monto calculado
                                </span>
                                <span className={`text-sm font-bold font-mono ${isGlass ? 'text-violet-300' : 'text-violet-600'}`}>
                                    {formatMoney(suggestedAmount)}
                                </span>
                            </button>

                            {/* Opción: personalizar */}
                            <button
                                onClick={() => setUseCustom(true)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all
                                    ${useCustom
                                        ? (isGlass ? 'border-violet-500 bg-violet-500/10' : 'border-violet-500 bg-violet-50')
                                        : (isGlass ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white')}`}
                            >
                                <span className={`text-sm font-medium ${isGlass ? 'text-white' : 'text-gray-700'}`}>
                                    Personalizar monto
                                </span>
                            </button>

                            {useCustom && (
                                <div className="relative">
                                    <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>$</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="0"
                                        autoFocus
                                        value={customInput ? formatInputNumber(customInput) : ''}
                                        onChange={e => setCustomInput(String(parseInputNumber(e.target.value) || ''))}
                                        className={`w-full pl-8 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500
                                            ${isGlass ? 'bg-white/10 border border-white/20 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleApprove}
                                disabled={useCustom && !customInput}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold
                                    disabled:opacity-40 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
                            >
                                Asignar a mi plan de sueldo
                            </button>
                        </div>
                    )}

                    {isApproved && (
                        <div className="flex items-center justify-between">
                            <div className={`flex items-center gap-2 text-sm ${isGlass ? 'text-emerald-300' : 'text-emerald-600'}`}>
                                <CheckCircle2 size={16} />
                                <span className="font-bold">{formatMoney(approvedAmount)} asignado</span>
                            </div>
                            <button
                                onClick={onRemove}
                                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl transition-colors
                                    ${isGlass ? 'text-white/40 hover:bg-red-500/20 hover:text-red-300' : 'text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
                            >
                                <XCircle size={13} /> Quitar
                            </button>
                        </div>
                    )}

                    {suggestedAmount === 0 && (
                        <p className={`text-xs text-center py-2 ${isGlass ? 'text-white/30' : 'text-gray-400'}`}>
                            No hay gastos compartidos registrados en el módulo de Familia todavía.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
