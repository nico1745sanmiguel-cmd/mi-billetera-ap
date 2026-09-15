import React, { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useSavings } from '../../context/SavingsContext';
import SavingsGoalForm from './SavingsGoalForm';
import SavingsGoalView from './SavingsGoalView';
import ConfirmDialog from '../UI/ConfirmDialog';
import { useFinancial } from '../../context/FinancialContext';
import { useUI } from '../../context/UIContext';

const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export default function SavingsGoal() {
    const { isGlass, privacyMode, showToast } = useUI();
    const { savingsGoal, goalLoading, saveSavingsGoal, deleteSavingsGoal, posiciones, cauciones, liquidezPorCartera } = useSavings();
    const { dolarBlue } = useFinancial();

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', amount: '', imageUrl: '' });
    const [imageError, setImageError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

    // Calcula el total general consolidado en ARS (posiciones + cauciones + liquidez)
    const totalARS = useMemo(() => {
        const rate = dolarBlue || 1000;
        let totalUSD = 0;
        (posiciones || []).forEach(pos => {
            totalUSD += pos.valorActualUSD || 0;
        });
        (cauciones || []).filter(c => c.estado !== 'vencida' && !c.liquidada).forEach(c => {
            totalUSD += c.valorActualUSD || 0;
        });
        Object.values(liquidezPorCartera || {}).forEach(liq => {
            totalUSD += (liq.USD || 0) + ((liq.ARS || 0) / rate);
        });
        return totalUSD * rate;
    }, [posiciones, cauciones, liquidezPorCartera, dolarBlue]);

    const goalAmount = savingsGoal ? (parseFloat(savingsGoal.amount) || 0) : 0;
    const progress = savingsGoal && goalAmount > 0 ? Math.min(100, Math.max(0, (totalARS / goalAmount) * 100)) : 0;
    const remaining = savingsGoal && goalAmount > 0 ? Math.max(0, goalAmount - totalARS) : 0;
    const isComplete = goalAmount > 0 && progress >= 100;

    const formatCurrency = (amount) => {
        if (privacyMode) return '****';
        return arsFormatter.format(amount);
    };

    const openEdit = () => {
        setForm({
            name: savingsGoal?.name || '',
            amount: savingsGoal?.amount || '',
            imageUrl: savingsGoal?.imageUrl || '',
        });
        setImageError(false);
        setEditing(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.name.trim()) {
            showToast('Ingresá un nombre para el objetivo', 'error');
            return;
        }
        const parsedAmt = parseFloat(String(form.amount).replace(/\./g, '').replace(',', '.'));
        if (isNaN(parsedAmt) || parsedAmt <= 0) {
            showToast('Por favor ingresá un monto objetivo mayor a cero.', 'error');
            return;
        }
        setSaving(true);
        try {
            await saveSavingsGoal({
                name: form.name.trim(),
                amount: parsedAmt,
                imageUrl: form.imageUrl.trim(),
            });
            setEditing(false);
            showToast('Objetivo guardado exitosamente', 'success');
        } catch (e) {
            console.error(e);
            showToast('No se pudo guardar el objetivo. Intentá de nuevo.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClick = () => {
        setIsConfirmDeleteOpen(true);
    };

    const handleConfirmDelete = async () => {
        setSaving(true);
        try {
            await deleteSavingsGoal();
            setEditing(false);
            setIsConfirmDeleteOpen(false);
            showToast('Objetivo eliminado correctamente', 'success');
        } catch (e) {
            console.error(e);
            showToast('Error al eliminar el objetivo.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => setEditing(false);

    // ─── Estilos compartidos ───────────────────────────────────────────────────
    const cardBg = isGlass
        ? 'bg-white/10 backdrop-blur-md border border-white/20'
        : 'bg-white shadow-lg border border-gray-100';
    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const inputClass = isGlass
        ? 'bg-white/10 text-white placeholder-white/30 border border-white/20 focus:border-amber-400/60'
        : 'bg-gray-50 text-gray-800 placeholder-gray-400 border border-gray-200 focus:border-amber-400 focus:bg-white';

    // ─── Loading ───────────────────────────────────────────────────────────────
    if (goalLoading && !savingsGoal) {
        return (
            <div className={`rounded-3xl p-6 flex items-center justify-center gap-3 ${cardBg}`}>
                <Loader2 size={20} className="animate-spin text-amber-400" />
                <span className={`text-sm font-semibold ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Cargando objetivo...</span>
            </div>
        );
    }

    // ─── FORMULARIO (crear/editar) ─────────────────────────────────────────────
    if (!savingsGoal || editing) {
        return (
            <SavingsGoalForm
                form={form}
                setForm={setForm}
                imageError={imageError}
                setImageError={setImageError}
                savingsGoal={savingsGoal}
                handleSave={handleSave}
                handleCancel={handleCancel}
                saving={saving}
                isGlass={isGlass}
                cardBg={cardBg}
                textColor={textColor}
                inputClass={inputClass}
            />
        );
    }

    // ─── VISTA DE OBJETIVO ─────────────────────────────────────────────────────
    const hasImage = savingsGoal.imageUrl && !imageError;

    return (
        <>
            <SavingsGoalView
                savingsGoal={savingsGoal}
                isComplete={isComplete}
                hasImage={hasImage}
                imageError={imageError}
                setImageError={setImageError}
                progress={progress}
                privacyMode={privacyMode}
                formatCurrency={formatCurrency}
                totalARS={totalARS}
                goalAmount={goalAmount}
                remaining={remaining}
                handleDelete={handleDeleteClick}
                saving={saving}
                openEdit={openEdit}
                isGlass={isGlass}
                cardBg={cardBg}
                textColor={textColor}
            />

            <ConfirmDialog
                isOpen={isConfirmDeleteOpen}
                title="¿Eliminar Objetivo?"
                message="¿Estás seguro de que querés eliminar tu objetivo financiero? Podrás registrar uno nuevo en cualquier momento."
                confirmText="Eliminar Objetivo"
                cancelText="Cancelar"
                isDanger={true}
                isLoading={saving}
                onConfirm={handleConfirmDelete}
                onCancel={() => setIsConfirmDeleteOpen(false)}
            />
        </>
    );
}
