import React, { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Pencil, Briefcase, TrendingUp, Wallet, AlertCircle } from 'lucide-react';
import { SalaryProvider, useSalaryState, useSalaryDispatch } from '../../context/SalaryContext';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useServices } from '../../context/ServicesContext';
import { useCards } from '../../context/CardsContext';
import { formatMoney } from '../../utils';
import { calcularProporciones, calcularAporte } from '../../utils/salaryUtils';
import { buildCardsWithDebt } from '../../utils/cardDebtUtils';
import EnvelopeCard from './EnvelopeCard';
import EnvelopeEditor from './EnvelopeEditor';
import SalarySourcesEditor from './SalarySourcesEditor';
import HouseholdEnvelopeSection from './HouseholdEnvelopeSection';
import LoadingState from '../UI/LoadingState';

// ─── Mes en español ────────────────────────────────────────────────────────
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function SalaryDashboardInner({ onBack }) {
    const { isGlass, currentDate, privacyMode } = useUI();
    const { user, householdMembers } = useAuth();
    const { services } = useServices();
    const { cards, transactions } = useCards();

    const {
        loading,
        totalIncome,
        totalBudgeted,
        totalFree,
        envelopes,
        householdApproved,
        householdAmount,
    } = useSalaryState();
    const { upsertEnvelope, deleteEnvelope, approveHouseholdAmount, removeHouseholdApproval } = useSalaryDispatch();

    const [showEnvelopeEditor, setShowEnvelopeEditor] = useState(false);
    const [editingEnvelope, setEditingEnvelope] = useState(null);
    const [showSourcesEditor, setShowSourcesEditor] = useState(false);

    // ─── Cálculo de sugerencia de gastos familiares ────────────────────
    const suggestedHouseholdAmount = useMemo(() => {
        if (!householdMembers || householdMembers.length < 2 || !user) return 0;
        const allHaveSalary = householdMembers.every(m => (m.salaryHistory || []).length > 0);
        if (!allHaveSalary) return 0;

        const proporciones = calcularProporciones(householdMembers.map(m => ({
            uid: m.uid,
            displayName: m.displayName,
            salaryHistory: m.salaryHistory || [],
        })));

        const targetMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const cardsWithDebt = buildCardsWithDebt(cards, transactions, targetMonthKey, currentDate.getFullYear() * 12 + currentDate.getMonth());

        const sharedServicesTotal = services
            .filter(s => s.isShared !== false)
            .reduce((acc, s) => acc + Number(s.amount || 0), 0);
        const sharedCardsTotal = cardsWithDebt
            .filter(c => c.isShared !== false)
            .reduce((acc, c) => acc + Number(c.currentDebt || 0), 0);
        const grandTotal = sharedServicesTotal + sharedCardsTotal;

        const myProportion = proporciones.find(p => p.uid === user.uid);
        if (!myProportion) return 0;
        return calcularAporte(grandTotal, myProportion.proportion);
    }, [householdMembers, user, services, cards, transactions, currentDate]);

    const hasHousehold = householdMembers && householdMembers.length >= 2;
    const percent = totalIncome > 0 ? Math.min(100, Math.round((totalBudgeted / totalIncome) * 100)) : 0;
    const isOverBudget = totalFree < 0;

    const showMoney = (amount) => privacyMode ? '••••' : formatMoney(amount);

    if (loading) {
        return (
            <div className={`min-h-screen p-6 ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                <LoadingState message="Cargando plan de sueldo..." />
            </div>
        );
    }

    return (
        <div className={`min-h-screen pb-24 ${isGlass ? 'text-white' : 'text-gray-800'}`}>
            {/* ─── Header ───────────────────────────────────────────────── */}
            <div className={`sticky top-0 z-20 px-4 pt-4 pb-3 ${isGlass ? 'bg-gradient-to-b from-[#12133a] to-transparent' : 'bg-white/80 backdrop-blur-md border-b border-gray-100'}`}>
                <div className="flex items-center justify-between">
                    <button type="button"
                        onClick={onBack}
                        className={`p-2 rounded-xl transition-all active:scale-90 ${isGlass ? 'text-white/60 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div className="text-center">
                        <h1 className={`text-base font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Sueldo mensual</h1>
                        <p className={`text-xs ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </p>
                    </div>
                    <button type="button"
                        onClick={() => setShowSourcesEditor(true)}
                        className={`p-2 rounded-xl transition-all active:scale-90 ${isGlass ? 'text-white/60 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Pencil size={18} />
                    </button>
                </div>
            </div>

            <div className="px-4 space-y-5 mt-2">
                {/* ─── Resumen ingresos ──────────────────────────────────── */}
                <div className={`rounded-3xl p-5 relative overflow-hidden
                    bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 shadow-xl shadow-violet-500/30`}
                >
                    {/* Fondo decorativo */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-10 -mb-10 blur-xl" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <Briefcase size={14} className="text-white/60" />
                            <p className="text-xs font-bold uppercase tracking-widest text-white/60">Ingreso total del mes</p>
                        </div>
                        <p className="text-4xl font-extrabold text-white mb-4 font-mono">
                            {totalIncome === 0
                                ? <span className="text-2xl text-white/50">Sin configurar</span>
                                : showMoney(totalIncome)
                            }
                        </p>

                        {totalIncome > 0 && (
                            <>
                                {/* Barra de progreso */}
                                <div className={`h-2 rounded-full mb-2 bg-white/20`}>
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${isOverBudget ? 'bg-red-400' : 'bg-white'}`}
                                        style={{ width: `${Math.min(percent, 100)}%` }}
                                    />
                                </div>

                                <div className="flex justify-between text-xs text-white/70">
                                    <span>Asignado: <strong className="text-white">{showMoney(totalBudgeted)}</strong> ({percent}%)</span>
                                    <span className={isOverBudget ? 'text-red-300 font-bold' : 'text-white/70'}>
                                        {isOverBudget ? '⚠ Excedido' : `Libre: ${showMoney(totalFree)}`}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Aviso si no hay income configurado */}
                {totalIncome === 0 && (
                    <div className={`flex items-start gap-3 p-4 rounded-2xl border ${isGlass ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                        <AlertCircle size={18} className={isGlass ? 'text-amber-400 mt-0.5' : 'text-amber-500 mt-0.5'} />
                        <div>
                            <p className={`text-sm font-semibold ${isGlass ? 'text-amber-300' : 'text-amber-700'}`}>
                                Configurá tus ingresos
                            </p>
                            <p className={`text-xs mt-0.5 ${isGlass ? 'text-amber-300/70' : 'text-amber-600'}`}>
                                Tocá el ícono del lápiz arriba para cargar tu sueldo y empezar a planificar el mes.
                            </p>
                        </div>
                    </div>
                )}

                {/* ─── Gastos familiares ─────────────────────────────────── */}
                <HouseholdEnvelopeSection
                    suggestedAmount={suggestedHouseholdAmount}
                    approvedAmount={householdAmount}
                    isApproved={householdApproved}
                    onApprove={approveHouseholdAmount}
                    onRemove={removeHouseholdApproval}
                    isGlass={isGlass}
                    hasHousehold={hasHousehold}
                />

                {/* ─── Sobres personales ─────────────────────────────────── */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Wallet size={16} className={isGlass ? 'text-white/60' : 'text-gray-400'} />
                            <h2 className={`text-sm font-bold uppercase tracking-wider ${isGlass ? 'text-white/60' : 'text-gray-400'}`}>
                                Mis sobres
                            </h2>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isGlass ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-500'}`}>
                            {envelopes.length}
                        </span>
                    </div>

                    {envelopes.length === 0 ? (
                        <div className={`rounded-2xl border-2 border-dashed p-8 text-center ${isGlass ? 'border-white/10' : 'border-gray-200'}`}>
                            <p className={`text-3xl mb-2`}>💰</p>
                            <p className={`text-sm font-semibold mb-1 ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>Sin sobres todavía</p>
                            <p className={`text-xs ${isGlass ? 'text-white/30' : 'text-gray-400'}`}>
                                Creá un sobre para cada destino de tu sueldo: alquiler, ocio, ahorro...
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {envelopes.map(env => (
                                <EnvelopeCard
                                    key={env.id}
                                    envelope={env}
                                    isGlass={isGlass}
                                    onEdit={(e) => { setEditingEnvelope(e); setShowEnvelopeEditor(true); }}
                                    onDelete={deleteEnvelope}
                                />
                            ))}
                        </div>
                    )}

                    {/* Botón agregar sobre */}
                    <button type="button"
                        onClick={() => { setEditingEnvelope(null); setShowEnvelopeEditor(true); }}
                        className={`mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed text-sm font-semibold transition-all active:scale-95
                            ${isGlass ? 'border-white/20 text-white/50 hover:border-violet-500/50 hover:text-violet-300' : 'border-gray-200 text-gray-400 hover:border-violet-400 hover:text-violet-600'}`}
                    >
                        <Plus size={16} /> Agregar sobre
                    </button>
                </div>

                {/* ─── Resumen libre ─────────────────────────────────────── */}
                {totalIncome > 0 && (
                    <div className={`rounded-2xl p-4 border ${
                        isOverBudget
                            ? (isGlass ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200')
                            : (isGlass ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200')
                    }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} className={isOverBudget ? 'text-red-400' : 'text-emerald-400'} />
                                <p className={`text-sm font-bold ${isGlass ? 'text-white' : 'text-gray-700'}`}>
                                    {isOverBudget ? 'Presupuesto excedido' : 'Disponible libre'}
                                </p>
                            </div>
                            <p className={`text-lg font-extrabold font-mono ${
                                isOverBudget
                                    ? (isGlass ? 'text-red-300' : 'text-red-600')
                                    : (isGlass ? 'text-emerald-300' : 'text-emerald-600')
                            }`}>
                                {showMoney(Math.abs(totalFree))}
                                {isOverBudget && ' de más'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Modales ──────────────────────────────────────────────── */}
            {showEnvelopeEditor && (
                <EnvelopeEditor
                    envelope={editingEnvelope}
                    onSave={upsertEnvelope}
                    onClose={() => { setShowEnvelopeEditor(false); setEditingEnvelope(null); }}
                    isGlass={isGlass}
                />
            )}
            {showSourcesEditor && (
                <SalarySourcesEditor
                    onClose={() => setShowSourcesEditor(false)}
                    isGlass={isGlass}
                />
            )}
        </div>
    );
}

// El Provider ahora está en main.jsx
export default function SalaryDashboard({ onBack }) {
    return <SalaryDashboardInner onBack={onBack} />;
}
