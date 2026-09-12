import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    CheckCircle2, 
    Circle, 
    Pencil, 
    Trash2, 
    Receipt, 
    Plus, 
    CreditCard, 
    Banknote, 
    X, 
    Calendar, 
    DollarSign 
} from 'lucide-react';
import ConfirmDialog from '../UI/ConfirmDialog';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { useCards } from '../../context/CardsContext';
import { useUI } from '../../context/UIContext';
import { formatInputNumber, parseInputNumber } from '../../utils';

function TransactionsManager({
    showMoney,
    glassTextPrimary,
    glassTextSecondary,
    isGlass,
    CAT_LABELS = {}
}) {
    const navigate = useNavigate();
    const { transactions = [], cards = [], updateTransaction, deleteTransaction } = useCards();
    const { currentDate, showToast } = useUI();

    const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'cash' | 'credit'
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [monthFilter, setMonthFilter] = useState('current'); // 'current' | 'all'

    // Estado para edición
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [editForm, setEditForm] = useState({
        amount: '',
        description: '',
        date: '',
        category: 'varios'
    });
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Estado para eliminación con ConfirmDialog
    const [deletingTransaction, setDeletingTransaction] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const categoriesMap = useMemo(() => ({
        supermarket: 'Supermercado',
        food: 'Comida',
        transport: 'Transporte',
        services: 'Servicios',
        home: 'Hogar',
        health: 'Salud',
        shopping: 'Compras',
        education: 'Educación',
        varios: 'Varios',
        ...CAT_LABELS
    }), [CAT_LABELS]);

    const getCardName = (cardId) => {
        if (!cardId) return 'Tarjeta';
        const c = cards.find(item => item.id === cardId);
        return c ? c.name : 'Tarjeta';
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            // Filtro Tipo
            if (typeFilter !== 'all' && t.type !== typeFilter) return false;

            // Filtro Categoría
            if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

            // Filtro Mes
            if (monthFilter === 'current' && currentDate) {
                const rawDate = t.date || t.createdAt;
                if (rawDate) {
                    const d = new Date(rawDate);
                    const dLocal = new Date(d.valueOf() + d.getTimezoneOffset() * 60000);
                    if (dLocal.getFullYear() !== currentDate.getFullYear() || dLocal.getMonth() !== currentDate.getMonth()) {
                        return false;
                    }
                }
            }

            return true;
        }).sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt || 0);
            const dateB = new Date(b.date || b.createdAt || 0);
            return dateB - dateA;
        });
    }, [transactions, typeFilter, categoryFilter, monthFilter, currentDate]);

    const handleStartEdit = (t) => {
        setEditingTransaction(t);
        setEditForm({
            amount: t.amount !== undefined ? String(t.amount) : '',
            description: t.description || '',
            date: t.date || new Date().toISOString().split('T')[0],
            category: t.category || 'varios'
        });
    };

    const handleSaveEdit = async (e) => {
        if (e) e.preventDefault();
        if (!editingTransaction || isSavingEdit) return;

        const numAmount = Number(editForm.amount);
        if (!numAmount || numAmount <= 0) {
            showToast("Ingresa un monto válido mayor a $ 0", "error");
            return;
        }

        setIsSavingEdit(true);
        try {
            await updateTransaction(editingTransaction.id, {
                amount: numAmount,
                description: editForm.description.trim() || 'Gasto General',
                date: editForm.date,
                category: editForm.category
            });
            setEditingTransaction(null);
            showToast?.("Movimiento actualizado", "success");
        } catch (error) {
            console.error("Error al actualizar movimiento:", error);
            showToast?.("Error al actualizar el movimiento", "error");
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingTransaction || isDeleting) return;

        setIsDeleting(true);
        try {
            await deleteTransaction(deletingTransaction.id);
            setDeletingTransaction(null);
            showToast?.("Movimiento eliminado", "success");
        } catch (error) {
            console.error("Error al eliminar movimiento:", error);
            showToast?.("Error al eliminar el movimiento", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Cabecera y Filtros */}
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${glassTextPrimary} flex items-center gap-2`}>
                        <Receipt size={14} className="opacity-70" />
                        Movimientos Registrados
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono">
                            {filteredTransactions.length}
                        </span>
                    </h4>

                    {/* Selector de Mes */}
                    <button
                        type="button"
                        aria-label={monthFilter === 'current' ? 'Ver histórico completo' : 'Ver solo mes actual'}
                        onClick={() => setMonthFilter(prev => prev === 'current' ? 'all' : 'current')}
                        className={`text-xs font-bold px-3.5 py-2 min-h-[44px] flex items-center justify-center rounded-xl border transition-all ${
                            monthFilter === 'current'
                                ? (isGlass ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30' : 'bg-indigo-50 text-indigo-600 border-indigo-200')
                                : (isGlass ? 'bg-white/5 text-white/60 border-white/10' : 'bg-gray-100 text-gray-500 border-gray-200')
                        }`}
                    >
                        {monthFilter === 'current' ? '📅 Mes Actual' : '🌐 Histórico'}
                    </button>
                </div>

                {/* Filtros Tipo y Categoría */}
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                    {/* Selector Efectivo / Tarjeta */}
                    <div className={`flex p-0.5 rounded-xl border ${isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'}`} role="group" aria-label="Filtrar por tipo de pago">
                        {[
                            { id: 'all', label: 'Todos' },
                            { id: 'cash', label: 'Efectivo', icon: Banknote },
                            { id: 'credit', label: 'Tarjeta', icon: CreditCard }
                        ].map(f => {
                            const IconComponent = f.icon;
                            return (
                                <button
                                    key={f.id}
                                    type="button"
                                    aria-label={`Filtrar por ${f.label}`}
                                    aria-pressed={typeFilter === f.id}
                                    onClick={() => setTypeFilter(f.id)}
                                    className={`px-3 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        typeFilter === f.id
                                            ? (isGlass ? 'bg-white text-indigo-950 shadow-sm' : 'bg-white text-indigo-600 shadow-sm')
                                            : (isGlass ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-800')
                                    }`}
                                >
                                    {IconComponent && <IconComponent size={14} />}
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Filtro Categoría */}
                    <select
                        aria-label="Filtrar por categoría"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className={`text-xs font-bold rounded-xl px-3 py-2 min-h-[44px] border outline-none cursor-pointer ${
                            isGlass
                                ? 'bg-slate-900/80 text-white border-white/10'
                                : 'bg-white text-gray-700 border-gray-200'
                        }`}
                    >
                        <option value="all">Todas las Categorías</option>
                        {Object.entries(categoriesMap).map(([key, label]) => (
                            <option key={key} value={key} className={isGlass ? 'bg-slate-900 text-white' : 'bg-white text-gray-800'}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Listado de Transacciones */}
            {filteredTransactions.length === 0 ? (
                /* Estado Vacío Glassmorphic Premium */
                <div className={`p-8 rounded-3xl border border-dashed text-center my-2 ${isGlass ? 'border-white/15 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                        <Receipt size={28} />
                    </div>
                    <h4 className={`text-sm font-bold mb-1 ${glassTextPrimary}`}>Sin movimientos aún</h4>
                    <p className={`text-xs max-w-xs mx-auto mb-4 ${glassTextSecondary}`}>
                        No se encontraron gastos registrados para este período o filtro seleccionado.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/purchase')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                            isGlass 
                                ? 'bg-white text-indigo-950 hover:bg-white/90 shadow-white/10' 
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                        }`}
                    >
                        <Plus size={15} /> Registrar Gasto
                    </button>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {filteredTransactions.map((t) => {
                        const isCredit = t.type === 'credit';
                        const catLabel = categoriesMap[t.category] || t.category || 'Varios';
                        const cardName = isCredit ? getCardName(t.cardId) : null;

                        return (
                            <div
                                key={t.id}
                                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                    isGlass ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-gray-50 border-gray-100 hover:bg-gray-100/70'
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                            isCredit
                                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                        }`}
                                    >
                                        {isCredit ? <CreditCard size={17} /> : <Banknote size={17} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`font-bold text-sm truncate ${glassTextPrimary}`}>
                                            {t.description || 'Gasto General'}
                                        </p>
                                        <div className={`flex flex-wrap items-center gap-1.5 text-[10px] mt-0.5 ${glassTextSecondary}`}>
                                            <span>{t.date || 'S/F'}</span>
                                            <span>•</span>
                                            <span className="font-semibold">{catLabel}</span>
                                            <span>•</span>
                                            <span className={`px-1.5 py-0.5 rounded font-bold ${
                                                isCredit
                                                    ? 'bg-blue-500/10 text-blue-400'
                                                    : 'bg-emerald-500/10 text-emerald-400'
                                            }`}>
                                                {isCredit ? `${cardName}${t.installments > 1 ? ` (${t.installments}x)` : ''}` : 'Efectivo'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className="text-right">
                                        <p className={`font-mono font-bold text-sm ${glassTextPrimary}`}>
                                            {showMoney(t.amount)}
                                        </p>
                                        {isCredit && t.installments > 1 && (
                                            <p className={`text-[9px] font-mono opacity-60 ${glassTextSecondary}`}>
                                                {showMoney(t.monthlyInstallment || Math.round(t.amount / (t.installments || 1)))}/mes
                                            </p>
                                        )}
                                    </div>

                                    {/* Botones de Acción */}
                                    <div className="flex items-center gap-1 ml-1">
                                        <button
                                            type="button"
                                            onClick={() => handleStartEdit(t)}
                                            aria-label={`Editar movimiento ${t.description || ''}`}
                                            title="Editar movimiento"
                                            className={`min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-xl transition-colors ${
                                                isGlass ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            <Pencil size={15} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeletingTransaction(t)}
                                            aria-label={`Eliminar movimiento ${t.description || ''}`}
                                            title="Eliminar movimiento"
                                            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Edición Glassmorphism */}
            {editingTransaction && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className={`w-full max-w-md p-6 rounded-[28px] border shadow-2xl relative ${isGlass ? 'bg-slate-900/95 border-white/20 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <Pencil size={18} className="text-indigo-400" /> Editar Movimiento
                            </h3>
                            <button
                                type="button"
                                aria-label="Cerrar modal de edición"
                                onClick={() => setEditingTransaction(null)}
                                className={`min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-full hover:bg-white/10 transition-colors ${isGlass ? 'text-white/60' : 'text-gray-400'}`}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            <div>
                                <label htmlFor="edit-tx-amount" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/60 mb-1.5">
                                    Monto
                                </label>
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-black/10 border-white/10 min-h-[44px]">
                                    <span className="font-bold opacity-50">$</span>
                                    <input
                                        id="edit-tx-amount"
                                        aria-label="Monto de la transacción"
                                        type="tel"
                                        value={editForm.amount === '' ? '' : formatInputNumber(editForm.amount)}
                                        onChange={(e) => {
                                             const raw = e.target.value;
                                             setEditForm(prev => ({ ...prev, amount: raw === '' ? '' : String(parseInputNumber(raw)) }));
                                        }}
                                        className="bg-transparent font-bold text-lg w-full outline-none"
                                        placeholder="0"
                                        required
                                    />
                                </div>
                            </div>

                            <Input
                                id="edit-tx-desc"
                                label="Descripción"
                                type="text"
                                value={editForm.description}
                                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Ej: Almuerzo, Nafta, Super"
                            />

                            <Input
                                id="edit-tx-date"
                                label="Fecha"
                                type="date"
                                value={editForm.date}
                                onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                            />

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/60 mb-2">Categoría</label>
                                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Seleccionar categoría">
                                    {['supermarket', 'food', 'transport', 'services', 'home', 'health', 'shopping', 'education', 'varios'].map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            aria-pressed={editForm.category === cat}
                                            aria-label={`Categoría ${categoriesMap[cat] || cat}`}
                                            onClick={() => setEditForm(prev => ({ ...prev, category: cat }))}
                                            className={`px-3 py-2 min-h-[44px] flex items-center justify-center rounded-xl text-xs font-bold capitalize transition-all border ${
                                                editForm.category === cat
                                                    ? (isGlass ? 'bg-white text-black border-white shadow-sm' : 'bg-indigo-600 text-white border-indigo-600 shadow-sm')
                                                    : (isGlass ? 'bg-white/5 text-white/60 border-transparent hover:bg-white/10' : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200')
                                            }`}
                                        >
                                            {categoriesMap[cat] || cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-3">
                                <Button
                                    variant="secondary"
                                    size="md"
                                    className="flex-1"
                                    onClick={() => setEditingTransaction(null)}
                                    disabled={isSavingEdit}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="md"
                                    isLoading={isSavingEdit}
                                    disabled={isSavingEdit || !editForm.amount || Number(editForm.amount) <= 0}
                                    className="flex-1"
                                >
                                    Guardar Cambios
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Borrado */}
            <ConfirmDialog
                isOpen={Boolean(deletingTransaction)}
                title="¿Eliminar movimiento?"
                message={`¿Estás seguro de que deseas eliminar "${deletingTransaction?.description || 'este gasto'}" de ${deletingTransaction ? showMoney(deletingTransaction.amount) : ''}? Esta acción no se puede deshacer.`}
                confirmText={isDeleting ? "Eliminando..." : "Eliminar"}
                cancelText="Cancelar"
                isDanger={true}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeletingTransaction(null)}
            />
        </div>
    );
}

export default function StatsDetails({
    filter,
    chartData,
    showMoney,
    cardsStatus,
    scopedServices,
    currentMonthKey,
    _cashTransactions,
    CAT_LABELS,
    superEffective,
    superSpent,
    superProjected,
    freshEffective,
    freshSpent,
    freshProjected,
    currentChartTotal,
    glassClass,
    glassTextPrimary,
    glassTextSecondary,
    isGlass
}) {
    return (
        <div className="space-y-4">
            <h3 className={`font-bold text-sm px-2 ${glassTextPrimary}`}>Detalle del Segmento</h3>
            
            {/* VIEW: ALL */}
            {filter === 'all' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        {chartData.map((item, idx) => (
                            <div key={item.name || idx} className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${glassClass}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                    <span className={`text-xs font-bold ${glassTextSecondary}`}>{item.name}</span>
                                </div>
                                <span className={`text-lg font-black ${glassTextPrimary}`}>{showMoney(item.value)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Transacciones en vista Todos */}
                    <div className={`p-4 rounded-2xl border shadow-sm ${glassClass}`}>
                        <TransactionsManager
                            showMoney={showMoney}
                            glassTextPrimary={glassTextPrimary}
                            glassTextSecondary={glassTextSecondary}
                            isGlass={isGlass}
                            CAT_LABELS={CAT_LABELS}
                        />
                    </div>
                </div>
            )}

            {/* VIEW: CARDS & SERVICES */}
            {filter === 'cards_services' && (
                <div className="space-y-3">
                    <div className={`p-4 rounded-2xl border shadow-sm ${glassClass}`}>
                        <p className="text-xs font-bold uppercase opacity-50 mb-3">Tarjetas</p>
                        <div className="space-y-3">
                            {cardsStatus.map(card => (
                                <div key={card.id} className="flex justify-between items-center text-sm">
                                    <div className="flex flex-col">
                                        <span className="font-bold">{card.name}</span>
                                        <span className="text-[10px] opacity-60">{card.details.length} consumos</span>
                                    </div>
                                    <span className="font-mono font-bold">{showMoney(card.currentMonthDebt)}</span>
                                </div>
                            ))}
                            {cardsStatus.length === 0 && <p className="text-xs opacity-50">Sin consumos</p>}
                        </div>
                    </div>
                    <div className={`p-4 rounded-2xl border shadow-sm ${glassClass}`}>
                        <p className="text-xs font-bold uppercase opacity-50 mb-3">Servicios Fijos</p>
                        <div className="space-y-3">
                            {scopedServices.map(s => {
                                const isPaid = s.paidPeriods?.includes(currentMonthKey);
                                return (
                                    <div key={s.id} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            {isPaid ? <CheckCircle2 size={16} className="text-green-500" /> : <Circle size={16} className="opacity-30" />}
                                            <span className={`font-bold ${isPaid ? 'opacity-70 line-through' : ''}`}>{s.name}</span>
                                        </div>
                                        <span className={`font-mono font-bold ${isPaid ? 'opacity-70' : ''}`}>{showMoney(Number(s.amount))}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW: MANUAL */}
            {filter === 'manual' && (
                <div className={`p-4 rounded-2xl border shadow-sm ${glassClass}`}>
                    <div className="space-y-4 mb-6">
                        {chartData.map((cat) => (
                            <div key={cat.name}>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <cat.icon size={16} className="opacity-70" />
                                        <span className="text-sm font-bold">{cat.name}</span>
                                    </div>
                                    <span className="font-mono font-bold">{showMoney(cat.value)}</span>
                                </div>
                                <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${currentChartTotal > 0 ? (cat.value / currentChartTotal) * 100 : 0}%`, backgroundColor: cat.color }}></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Listado de Movimientos Completo */}
                    <div className={`pt-4 border-t ${isGlass ? 'border-white/10' : 'border-gray-200'}`}>
                        <TransactionsManager
                            showMoney={showMoney}
                            glassTextPrimary={glassTextPrimary}
                            glassTextSecondary={glassTextSecondary}
                            isGlass={isGlass}
                            CAT_LABELS={CAT_LABELS}
                        />
                    </div>
                </div>
            )}

            {/* VIEW: SUPER & FRESH */}
            {filter === 'super_fresh' && (
                <div className="space-y-3">
                    <div className={`p-4 rounded-2xl border shadow-sm ${glassClass}`}>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-bold uppercase opacity-50">Resumen Supermercado</p>
                            <span className="font-mono font-bold text-sm">{showMoney(superEffective)}</span>
                        </div>
                        <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden flex">
                            <div className="h-full bg-blue-500" style={{ width: `${superProjected > 0 ? (superSpent/superProjected)*100 : 0}%`}}></div>
                        </div>
                        <p className="text-[10px] text-right mt-1 opacity-60">Gastado: {showMoney(superSpent)} / Proyectado: {showMoney(superProjected)}</p>
                    </div>
                    <div className={`p-4 rounded-2xl border shadow-sm ${glassClass}`}>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-bold uppercase opacity-50">Resumen Feria</p>
                            <span className="font-mono font-bold text-sm">{showMoney(freshEffective)}</span>
                        </div>
                        <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden flex">
                            <div className="h-full bg-emerald-500" style={{ width: `${freshProjected > 0 ? (freshSpent/freshProjected)*100 : 0}%`}}></div>
                        </div>
                        <p className="text-[10px] text-right mt-1 opacity-60">Gastado: {showMoney(freshSpent)} / Proyectado: {showMoney(freshProjected)}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
