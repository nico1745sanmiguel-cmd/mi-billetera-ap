import React, { useState, useMemo } from 'react';
import { db, auth } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useCards } from '../../context/CardsContext';
import { useSupermarket } from '../../context/SupermarketContext';
import { useServices } from '../../context/ServicesContext';
import { collection, addDoc, deleteDoc, doc, updateDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { formatMoney } from '../../utils';
import { isModuleEnabled } from '../../utils/modulesUtils';
import { useUI } from '../../context/UIContext';

import RepartoPanel from './RepartoPanel';
import ServiceModal from './ServiceModal';
import MareaSemanal from './MareaSemanal';
import ServicesList from './ServicesList';
import ServicesCalendarView from './ServicesCalendarView';

const frequencyMap = { 'Mensual': 1, 'Bimestral': 2, 'Trimestral': 3, 'Semestral': 6, 'Anual': 12 };

const PLANNER_COLOR_MAP = {
    blue:   { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   glBg: 'bg-blue-500/20',   glText: 'text-blue-200',   glBorder: 'border-blue-500/30' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', glBg: 'bg-purple-500/20', glText: 'text-purple-200', glBorder: 'border-purple-500/30' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', glBg: 'bg-orange-500/20', glText: 'text-orange-200', glBorder: 'border-orange-500/30' },
    pink:   { bg: 'bg-pink-100',   text: 'text-pink-700',   border: 'border-pink-200',   glBg: 'bg-pink-500/20',   glText: 'text-pink-200',   glBorder: 'border-pink-500/30' },
    green:  { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  glBg: 'bg-green-500/20',  glText: 'text-green-200',  glBorder: 'border-green-500/30' },
    red:    { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    glBg: 'bg-red-500/20',    glText: 'text-red-200',    glBorder: 'border-red-500/30' },
};
const DEFAULT_PLANNER_COLORS = { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', glBg: 'bg-teal-500/20', glText: 'text-teal-200', glBorder: 'border-teal-500/30' };

const daysOfWeek = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Gestor principal de Servicios y Gastos Fijos.
 * Coordine la visualización de la lista de servicios, la distribución de gastos
 * y el calendario de vencimientos, conectando todos los sub-componentes.
 * 
 * @param {Object} props
 * @param {Function} props.onBack - Callback para regresar a la vista anterior.
 * @returns {JSX.Element}
 */
export default function ServicesManager() {
    const { currentDate, privacyMode, isGlass } = useUI();
    const { userData } = useAuth();
    const householdId = userData?.householdId;
    const { cards, transactions } = useCards();
    const { services } = useServices();
    const { freshItems, plannerCategories } = useSupermarket();
    
    const [viewMode, setViewMode] = useState('list');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);

    const [form, setForm] = useState({ name: '', amount: '', day: '', frequency: 'Mensual', isShared: true });

    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

    const currentMonthKey = useMemo(() => {
        if (!currentDate) return '';
        return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }, [currentDate]);

    const getStatusLabel = (day, isPaid) => {
        if (isPaid) return { text: 'Pagado', color: isGlass ? 'text-green-300 bg-green-500/20 border-green-500/30' : 'text-green-600 bg-green-100 border-green-200' };

        const today = new Date();
        const due = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);

        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return { text: 'Vence Hoy', color: isGlass ? 'text-orange-300 bg-orange-500/20 border-orange-500/30 animate-pulse' : 'text-orange-600 bg-orange-100 border-orange-200 animate-pulse' };
        if (diffDays === 1) return { text: 'Vence Mañana', color: isGlass ? 'text-blue-300 bg-blue-500/20 border-blue-500/30' : 'text-blue-600 bg-blue-100 border-blue-200' };
        if (diffDays > 0) return { text: `Faltan ${diffDays} días`, color: isGlass ? 'text-white/50 bg-white/5 border-white/10' : 'text-gray-500 bg-gray-100 border-gray-200' };

        return { text: `Venció hace ${Math.abs(diffDays)} días`, color: isGlass ? 'text-red-300 bg-red-500/20 border-red-500/30' : 'text-red-600 bg-red-100 border-red-200' };
    };

    const cardServices = useMemo(() => {
        const targetMonthVal = currentDate.getFullYear() * 12 + currentDate.getMonth();

        return cards.flatMap(c => {
            const manualAmount = c.monthlyStatements?.[currentMonthKey]?.totalDue ?? c.adjustments?.[currentMonthKey];
            let debt = 0;
            if (manualAmount !== undefined) {
                debt = manualAmount;
            } else {
                debt = transactions
                    .filter(t => t.cardId === c.id && t.type !== 'cash')
                    .reduce((acc, t) => {
                        const tDate = new Date(t.date);
                        const tLocal = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
                        const startMonthVal = tLocal.getFullYear() * 12 + tLocal.getMonth();
                        const endMonthVal = startMonthVal + (t.installments || 1);
                        if (targetMonthVal >= startMonthVal && targetMonthVal < endMonthVal) {
                            return acc + Number(t.monthlyInstallment);
                        }
                        return acc;
                    }, 0);
            }

            if (debt === 0 && manualAmount === undefined) return [];

            const isPaid = c.paidPeriods?.includes(currentMonthKey);

            return [{ id: c.id, name: c.name, amount: debt, day: c.dueDay || 10, isPaid, type: 'card', bank: c.bank, frequency: 'Mensual', isManual: manualAmount !== undefined, isShared: c.isShared }];
        });
    }, [cards, transactions, currentMonthKey, currentDate]);

    const allItems = useMemo(() => {
        if (!isModuleEnabled('agenda')) return [];
        const activeServices = services.filter(s => {
            if (!s.frequency || s.frequency === 'Mensual') return true;
            if (!s.firstDueMonth) return true;
            const interval = frequencyMap[s.frequency] || 1;
            const [startYear, startMonth] = s.firstDueMonth.split('-').map(Number);
            const targetYear = currentDate.getFullYear();
            const targetMonth = currentDate.getMonth() + 1;
            const diffMonths = ((targetYear - startYear) * 12) + (targetMonth - startMonth);
            if (diffMonths < 0) return false;
            return diffMonths % interval === 0;
        });

        const regularServices = activeServices.map(s => ({ ...s, type: 'service', isPaid: s.paidPeriods?.includes(currentMonthKey) }));

        return [...regularServices, ...cardServices].sort((a, b) => {
            if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
            return a.day - b.day;
        });
         
    }, [services, cardServices, currentMonthKey, currentDate]);

    const weeklyData = useMemo(() => {
        const weeks = [{ t: 0, p: 0, label: 'Sem 1' }, { t: 0, p: 0, label: 'Sem 2' }, { t: 0, p: 0, label: 'Sem 3' }, { t: 0, p: 0, label: 'Sem 4' }];
        allItems.forEach(item => {
            const day = parseInt(item.day);
            let index = 0;
            if (day > 23) index = 3; else if (day > 15) index = 2; else if (day > 7) index = 1;
            weeks[index].t += item.amount;
            if (item.isPaid) weeks[index].p += item.amount;
        });
        const maxVal = Math.max(...weeks.map(w => w.t), 1);
        return weeks.map(w => ({ total: w.t, paid: w.p, heightTotal: (w.t / maxVal) * 100, percentFilled: w.t > 0 ? (w.p / w.t) * 100 : 0, label: w.label }));
    }, [allItems]);

    const openModal = (item = null) => {
        if (item) {
            setEditingService(item);
            setForm({ name: item.name, amount: item.amount, day: item.day, frequency: item.frequency || 'Mensual', isShared: item.isShared !== undefined ? item.isShared : true });
        } else {
            setEditingService(null);
            setForm({ name: '', amount: '', day: '', frequency: 'Mensual', isShared: true });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.amount || !auth.currentUser) return;
        try {
            if (editingService && editingService.type === 'card') {
                const cardRef = doc(db, 'cards', editingService.id);
                await setDoc(cardRef, { monthlyStatements: { [currentMonthKey]: { totalDue: Number(form.amount) } }, adjustments: { [currentMonthKey]: Number(form.amount) } }, { merge: true });
            } else {
                const data = {
                    name: form.name, amount: Number(form.amount), day: Number(form.day) || 10, frequency: form.frequency, userId: auth.currentUser.uid,
                    ...(householdId && { householdId: householdId, ownerId: auth.currentUser.uid, isShared: form.isShared })
                };
                if (editingService) {
                    await updateDoc(doc(db, 'services', editingService.id), data);
                } else {
                    await addDoc(collection(db, 'services'), { ...data, paidPeriods: [], firstDueMonth: currentMonthKey });
                }
            }
            setIsModalOpen(false);
        } catch (error) { alert("Error al guardar"); console.error(error); }
    };

    const handleDelete = async () => {
        if (editingService.type === 'card') {
            if (window.confirm("¿Quitar ajuste manual?")) {
                const { deleteField } = await import('firebase/firestore');
                const cardRef = doc(db, 'cards', editingService.id);
                await updateDoc(cardRef, { [`adjustments.${currentMonthKey}`]: deleteField(), [`monthlyStatements.${currentMonthKey}.totalDue`]: deleteField() });
                setIsModalOpen(false);
            }
            return;
        }
        if (window.confirm("¿Eliminar servicio?")) {
            await deleteDoc(doc(db, 'services', editingService.id));
            setIsModalOpen(false);
        }
    };

    const togglePaid = async (item) => {
        const collectionName = item.type === 'card' ? 'cards' : 'services';
        const ref = doc(db, collectionName, item.id);
        if (item.isPaid) {
            await updateDoc(ref, { paidPeriods: arrayRemove(currentMonthKey) });
        } else {
            await updateDoc(ref, { paidPeriods: arrayUnion(currentMonthKey) });
            if (householdId && auth.currentUser) {
                try {
                    const { serverTimestamp } = await import('firebase/firestore');
                    await addDoc(collection(db, 'households', householdId, 'notifications'), {
                        type: 'payment', itemName: item.name, amount: item.amount, dueDate: item.day, itemType: item.type, paidByUid: auth.currentUser.uid, paidByName: auth.currentUser.displayName || 'Alguien', createdAt: serverTimestamp(), readBy: [auth.currentUser.uid]
                    });
                } catch(e) { console.error("Error saving notification", e); }
            }
        }
    };

    const currentUid = auth.currentUser?.uid;

    const calendarDays = useMemo(() => {
        if (!currentDate) return [];
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); 
        const firstDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 
        const grid = [];
        for (let i = 0; i < firstDayIndex; i++) grid.push(null);
        for (let i = 1; i <= daysInMonth; i++) grid.push(i);
        while (grid.length % 7 !== 0) grid.push(null);
        return grid;
    }, [currentDate]);

    const allPlannerCats = useMemo(() => [...[{ id: 'verduleria', colorName: 'green' }, { id: 'carniceria', colorName: 'red' }], ...plannerCategories], [plannerCategories]);
    const catColorMap = useMemo(() => { const map = {}; allPlannerCats.forEach(c => { map[c.id] = c.colorName; }); return map; }, [allPlannerCats]);

    const calendarItemsByDay = useMemo(() => {
        const map = {};
        if (isModuleEnabled('agenda')) {
            allItems.forEach(item => { const d = parseInt(item.day); if (!map[d]) map[d] = []; map[d].push({ ...item, itemKind: 'payment' }); });
        }
        if (isModuleEnabled('planner')) {
            const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            freshItems.forEach(fi => {
                if (!(fi.month === monthKey && fi.date)) return;
                const day = parseInt(fi.date.split('-')[2]);
                if (!day || day < 1 || day > 31) return;
                if (!map[day]) map[day] = [];
                map[day].push({ ...fi, itemKind: 'planner', colorName: catColorMap[fi.category] || 'green' });
            });
        }
        return map;
    }, [allItems, freshItems, currentDate, catColorMap]);

    return (
        <div className="space-y-6 animate-fade-in pb-24">
            <div className="flex justify-between items-center px-2">
                <div><h2 className={`text-xl font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Calendario</h2><p className={`text-xs font-bold uppercase ${isGlass ? 'text-indigo-300' : 'text-indigo-600'}`}>{currentDate.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}</p></div>
                <div className="flex items-center gap-2">
                    <div className={`hidden sm:flex items-center rounded-xl p-1 ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                        <button aria-label="Acción" type="button" onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? (isGlass ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-900 shadow-sm') : (isGlass ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900')}`}>Lista</button>
                        <button aria-label="Acción" type="button" onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'calendar' ? (isGlass ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-900 shadow-sm') : (isGlass ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900')}`}>Mes</button>
                    </div>
                    <button aria-label="Acción" type="button" onClick={() => openModal()} className={`text-xs px-4 py-2 rounded-2xl font-bold shadow-md flex items-center gap-1 active:scale-95 transition-transform ${isGlass ? 'bg-white text-indigo-900 hover:bg-indigo-50' : 'bg-gray-900 text-white hover:bg-black'}`}><span>+</span> Nuevo Fijo</button>
                </div>
            </div>
            
            <div className={`sm:hidden flex items-center rounded-xl p-1 mx-2 ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                <button aria-label="Acción" type="button" onClick={() => setViewMode('list')} className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? (isGlass ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-900 shadow-sm') : (isGlass ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900')}`}>Lista</button>
                <button aria-label="Acción" type="button" onClick={() => setViewMode('calendar')} className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'calendar' ? (isGlass ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-900 shadow-sm') : (isGlass ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900')}`}>Mes</button>
            </div>

            {isModuleEnabled('household') && <RepartoPanel allItems={allItems} householdId={householdId} currentUid={currentUid} isGlass={isGlass} showMoney={showMoney} />}
            {isModuleEnabled('agenda') && <MareaSemanal weeklyData={weeklyData} isGlass={isGlass} showMoney={showMoney} />}

            {viewMode === 'list' ? (
                <ServicesList allItems={allItems} isGlass={isGlass} householdId={householdId} showMoney={showMoney} getStatusLabel={getStatusLabel} openModal={openModal} togglePaid={togglePaid} currentDate={currentDate} />
            ) : (
                <ServicesCalendarView daysOfWeek={daysOfWeek} calendarDays={calendarDays} calendarItemsByDay={calendarItemsByDay} currentDate={currentDate} isGlass={isGlass} PLANNER_COLOR_MAP={PLANNER_COLOR_MAP} DEFAULT_PLANNER_COLORS={DEFAULT_PLANNER_COLORS} showMoney={showMoney} openModal={openModal} />
            )}

            <ServiceModal isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} editingService={editingService} form={form} setForm={setForm} handleSave={handleSave} handleDelete={handleDelete} isGlass={isGlass} householdId={householdId} />
        </div>
    );
}