import React, { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useSavings } from '../../context/SavingsContext';
import SavingsGoalForm from './SavingsGoalForm';
import SavingsGoalView from './SavingsGoalView';
import { useFinancial } from '../../context/FinancialContext';
import { useUI } from '../../context/UIContext';
import { formatInputNumber, parseInputNumber } from '../../utils';

const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export default function SavingsGoal() {
    const { isGlass, privacyMode } = useUI();
    const { savingsTransactions, savingsGoal, goalLoading, saveSavingsGoal, deleteSavingsGoal, posiciones, cauciones } = useSavings();
    const { dolarBlue } = useFinancial();

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', amount: '', imageUrl: '' });
    const [imageError, setImageError] = useState(false);
    const [saving, setSaving] = useState(false);

    // Calcula el total general consolidado en ARS (posiciones + cauciones)
    const totalARS = useMemo(() => {
        const rate = dolarBlue || 1000;
        let totalUSD = 0;
        (posiciones || []).forEach(pos => {
            totalUSD += pos.valorActualUSD || 0;
        });
        (cauciones || []).filter(c => c.estado !== 'vencida' && !c.liquidada).forEach(c => {
            totalUSD += c.valorActualUSD || 0;
        });
        return totalUSD * rate;
    }, [posiciones, cauciones, dolarBlue]);

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
        if (!form.name) return;
        const parsedAmt = parseFloat(String(form.amount).replace(/\./g, '').replace(',', '.'));
        if (isNaN(parsedAmt) || parsedAmt <= 0) {
            alert('Por favor ingresá un monto objetivo mayor a cero.');
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
        } catch (e) {
            console.error(e);
            alert('No se pudo guardar el objetivo. Intentá de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿Eliminar el objetivo?')) return;
        setSaving(true);
        try {
            await deleteSavingsGoal();
            setEditing(false);
        } catch (e) {
            console.error(e);
            alert('Error al eliminar el objetivo.');
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
            handleDelete={handleDelete}
            saving={saving}
            openEdit={openEdit}
            isGlass={isGlass}
            cardBg={cardBg}
            textColor={textColor}
        />
    );
}
