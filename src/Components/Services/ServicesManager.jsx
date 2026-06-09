import React, { useState, useMemo, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, setDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { Star, Pencil, CalendarDays, User, Split, ChevronDown, ChevronUp } from 'lucide-react';
import { formatMoney, formatInputNumber, parseInputNumber } from '../../utils';
import { calcularProporciones, getLatestSalary } from '../../utils/salaryUtils';

// ─────────────────────────────────────────────────────
// Subcomponente: Panel de Reparto del Mes
// ─────────────────────────────────────────────────────
function RepartoPanel({ allItems, householdId, currentUid, isGlass, showMoney }) {
    const [open, setOpen] = useState(false);
    const [proporciones, setProporciones] = useState([]);
    const [loadingProps, setLoadingProps] = useState(false);

    // Solo tiene sentido si hay hogar
    const sharedItems = useMemo(() => allItems.filter(i => i.isShared !== false), [allItems]);
    const grandTotal = useMemo(() => sharedItems.reduce((acc, i) => acc + (i.amount || 0), 0), [sharedItems]);

    useEffect(() => {
        if (!householdId || !open) return;
        const loadProps = async () => {
            setLoadingProps(true);
            try {
                const hhSnap = await getDoc(doc(db, 'households', householdId));
                if (!hhSnap.exists()) return;
                const memberIds = hhSnap.data().members || [];
                const snaps = await Promise.all(memberIds.map(uid => getDoc(doc(db, 'users', uid))));
                const members = snaps.map(s => s.exists() ? { uid: s.id, ...s.data() } : { uid: s.id, displayName: '?', salaryHistory: [] });
                setProporciones(calcularProporciones(members));
            } catch (e) { console.error(e); }
            finally { setLoadingProps(false); }
        };
        loadProps();
    }, [householdId, open]);

    if (!householdId || sharedItems.length === 0) return null;

    const allHaveProportions = proporciones.length > 0;

    return (
        <div className={`rounded-3xl border overflow-hidden transition-all ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
            {/* Header colapsable */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between p-5 text-left"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isGlass ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                        <Split size={18} />
                    </div>
                    <div>
                        <p className={`font-bold text-sm ${isGlass ? 'text-white' : 'text-gray-800'}`}>Reparto del Mes</p>
                        <p className={`text-[10px] ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>
                            {sharedItems.length} concepto{sharedItems.length !== 1 ? 's' : ''} compartidos · {showMoney(grandTotal)}
                        </p>
                    </div>
                </div>
                {open
                    ? <ChevronUp size={16} className={isGlass ? 'text-white/40' : 'text-gray-400'} />
                    : <ChevronDown size={16} className={isGlass ? 'text-white/40' : 'text-gray-400'} />
                }
            </button>

            {/* Cuerpo */}
            {open && (
                <div className="px-4 pb-5 space-y-3">

                    {loadingProps && (
                        <p className={`text-xs text-center animate-pulse ${isGlass ? 'text-gray-400' : 'text-gray-400'}`}>Calculando proporciones...</p>
                    )}

                    {/* Cabecera de columnas */}
                    {allHaveProportions && !loadingProps && (
                        <div className="flex items-center gap-2 px-1 mb-1">
                            <div className="flex-1"/>
                            {proporciones.map(p => (
                                <div key={p.uid} className="w-24 text-center">
                                    <p className={`text-[10px] font-bold truncate ${isGlass ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {p.uid === currentUid ? 'Vos' : (p.displayName?.split(' ')[0] || '?')}
                                    </p>
                                    <p className={`text-[9px] ${isGlass ? 'text-indigo-300' : 'text-indigo-500'}`}>{p.percentage}%</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Fila por concepto */}
                    {sharedItems.map((item) => {
                        return (
                            <div key={item.id} className={`rounded-2xl p-3 border ${isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center gap-2">
                                    {/* Día */}
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                        item.isPaid
                                            ? (isGlass ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700')
                                            : (isGlass ? 'bg-white/10 text-white/60' : 'bg-white text-gray-500 border border-gray-200')
                                    }`}>
                                        {item.day}
                                    </div>
                                    {/* Nombre */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold truncate ${
                                            item.isPaid
                                                ? (isGlass ? 'text-green-300 line-through' : 'text-green-700 line-through')
                                                : (isGlass ? 'text-white' : 'text-gray-800')
                                        }`}>
                                            {item.name}
                                        </p>
                                        <p className={`text-[10px] font-mono ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {showMoney(item.amount)}
                                        </p>
                                    </div>
                                    {/* Columnas proporcionales */}
                                    {allHaveProportions && proporciones.map(p => {
                                        const aporte = Math.round(item.amount * p.proportion);
                                        const esYo = p.uid === currentUid;
                                        return (
                                            <div key={p.uid} className={`w-24 text-center px-1 py-1.5 rounded-xl ${
                                                esYo
                                                    ? (isGlass ? 'bg-indigo-500/15 text-indigo-200' : 'bg-indigo-50 text-indigo-700')
                                                    : (isGlass ? 'bg-white/5 text-gray-300' : 'bg-white text-gray-600 border border-gray-100')
                                            }`}>
                                                <p className={`text-xs font-mono font-bold`}>{showMoney(aporte)}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* Totales */}
                    {allHaveProportions && !loadingProps && (
                        <div className={`flex items-center gap-2 p-3 rounded-2xl border-t-2 ${isGlass ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'}`}>
                            <div className="flex-1">
                                <p className={`text-xs font-bold uppercase ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>Total compartido</p>
                                <p className={`text-sm font-mono font-bold ${isGlass ? 'text-white' : 'text-gray-900'}`}>{showMoney(grandTotal)}</p>
                            </div>
                            {proporciones.map(p => {
                                const myTotal = Math.round(grandTotal * p.proportion);
                                const esYo = p.uid === currentUid;
                                return (
                                    <div key={p.uid} className={`w-24 text-center px-2 py-2 rounded-xl font-bold ${
                                        esYo
                                            ? (isGlass ? 'bg-indigo-600/40 text-indigo-200' : 'bg-indigo-600 text-white')
                                            : (isGlass ? 'bg-white/10 text-gray-300' : 'bg-white text-gray-700 border border-gray-200')
                                    }`}>
                                        <p className="text-xs font-mono">{showMoney(myTotal)}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!allHaveProportions && !loadingProps && (
                        <p className={`text-xs text-center py-2 ${isGlass ? 'text-gray-500' : 'text-gray-400'}`}>
                            Cargá los sueldos en Grupo Familiar para ver el reparto proporcional.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ServicesManager({ services = [], cards = [], transactions = [], currentDate, privacyMode, isGlass, householdId, freshItems = [], plannerCategories = [] }) {
    const [viewMode, setViewMode] = useState('list');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);

    const [form, setForm] = useState({ name: '', amount: '', day: '', frequency: 'Mensual', isShared: true });

    // Helper para privacidad
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

    // 1. CLAVE DEL MES
    const currentMonthKey = useMemo(() => {
        if (!currentDate) return '';
        return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }, [currentDate]);

    const frequencyMap = { 'Mensual': 1, 'Bimestral': 2, 'Trimestral': 3, 'Semestral': 6, 'Anual': 12 };

    // 2. LÓGICA DE DIAS RESTANTES ⏳
    const getStatusLabel = (day, isPaid) => {
        if (isPaid) return { text: 'Pagado', color: isGlass ? 'text-green-300 bg-green-500/20 border-green-500/30' : 'text-green-600 bg-green-100 border-green-200' };

        const today = new Date();
        // Creamos la fecha de vencimiento basada en el mes que estamos MIRANDO en la app
        const due = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

        // Reseteamos horas para comparar solo días
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);

        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return { text: 'Vence Hoy', color: isGlass ? 'text-orange-300 bg-orange-500/20 border-orange-500/30 animate-pulse' : 'text-orange-600 bg-orange-100 border-orange-200 animate-pulse' };
        if (diffDays === 1) return { text: 'Vence Mañana', color: isGlass ? 'text-blue-300 bg-blue-500/20 border-blue-500/30' : 'text-blue-600 bg-blue-100 border-blue-200' };
        if (diffDays > 0) return { text: `Faltan ${diffDays} días`, color: isGlass ? 'text-white/50 bg-white/5 border-white/10' : 'text-gray-500 bg-gray-100 border-gray-200' };

        return { text: `Venció hace ${Math.abs(diffDays)} días`, color: isGlass ? 'text-red-300 bg-red-500/20 border-red-500/30' : 'text-red-600 bg-red-100 border-red-200' };
    };

    // 3. TARJETAS
    const cardServices = useMemo(() => {
        const targetMonthVal = currentDate.getFullYear() * 12 + currentDate.getMonth();

        return cards.map(c => {
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

            if (debt === 0 && manualAmount === undefined) return null;

            const isPaid = c.paidPeriods?.includes(currentMonthKey);

            return {
                id: c.id,
                name: c.name,
                amount: debt,
                day: c.dueDay || 10,
                isPaid,
                type: 'card',
                bank: c.bank,
                frequency: 'Mensual',
                isManual: manualAmount !== undefined,
                isShared: c.isShared
            };
        }).filter(Boolean);
    }, [cards, transactions, currentMonthKey, currentDate]);

    // 4. UNIFICAR Y ORDENAR
    const allItems = useMemo(() => {
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

        const regularServices = activeServices.map(s => ({
            ...s,
            type: 'service',
            isPaid: s.paidPeriods?.includes(currentMonthKey)
        }));

        return [...regularServices, ...cardServices].sort((a, b) => {
            if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
            return a.day - b.day;
        });
    }, [services, cardServices, currentMonthKey, currentDate]);

    // 5. GRÁFICO MAREA
    const weeklyData = useMemo(() => {
        const weeks = [{ t: 0, p: 0, label: 'Sem 1' }, { t: 0, p: 0, label: 'Sem 2' }, { t: 0, p: 0, label: 'Sem 3' }, { t: 0, p: 0, label: 'Sem 4' }];
        allItems.forEach(item => {
            const day = parseInt(item.day);
            let index = 0;
            if (day > 23) index = 3;
            else if (day > 15) index = 2;
            else if (day > 7) index = 1;
            weeks[index].t += item.amount;
            if (item.isPaid) weeks[index].p += item.amount;
        });
        const maxVal = Math.max(...weeks.map(w => w.t), 1);
        return weeks.map(w => ({ total: w.t, paid: w.p, heightTotal: (w.t / maxVal) * 100, percentFilled: w.t > 0 ? (w.p / w.t) * 100 : 0, label: w.label }));
    }, [allItems]);

    // HANDLERS
    const openModal = (item = null) => {
        if (item) {
            setEditingService(item);
            setForm({
                name: item.name,
                amount: item.amount,
                day: item.day,
                frequency: item.frequency || 'Mensual',
                isShared: item.isShared !== undefined ? item.isShared : true
            });
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
                await setDoc(cardRef, { 
                    monthlyStatements: { [currentMonthKey]: { totalDue: Number(form.amount) } },
                    adjustments: { [currentMonthKey]: Number(form.amount) } 
                }, { merge: true });
            } else {
                const data = {
                    name: form.name,
                    amount: Number(form.amount),
                    day: Number(form.day) || 10,
                    frequency: form.frequency,
                    userId: auth.currentUser.uid,
                    // Household Data
                    ...(householdId && {
                        householdId: householdId,
                        ownerId: auth.currentUser.uid,
                        isShared: form.isShared // Services follow the switch value
                    })
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
                await updateDoc(cardRef, { 
                    [`adjustments.${currentMonthKey}`]: deleteField(),
                    [`monthlyStatements.${currentMonthKey}.totalDue`]: deleteField()
                });
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
            // Notificar al hogar
            if (householdId && auth.currentUser) {
                try {
                    const { serverTimestamp } = await import('firebase/firestore');
                    await addDoc(collection(db, 'households', householdId, 'notifications'), {
                        type: 'payment',
                        itemName: item.name,
                        amount: item.amount,
                        dueDate: item.day,
                        itemType: item.type, // 'card' o 'service'
                        paidByUid: auth.currentUser.uid,
                        paidByName: auth.currentUser.displayName || 'Alguien',
                        createdAt: serverTimestamp(),
                        readBy: [auth.currentUser.uid] // Ya leído por quien pagó
                    });
                } catch(e) { console.error("Error saving notification", e); }
            }
        }
    };

    const currentUid = auth.currentUser?.uid;

    // 6. DATOS PARA CALENDARIO
    const calendarDays = useMemo(() => {
        if (!currentDate) return [];
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Dom) a 6 (Sab)
        const firstDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Ajustar Lunes=0, Dom=6

        const grid = [];
        for (let i = 0; i < firstDayIndex; i++) grid.push(null);
        for (let i = 1; i <= daysInMonth; i++) grid.push(i);
        
        while (grid.length % 7 !== 0) grid.push(null);
        
        return grid;
    }, [currentDate]);

    // Mapa de colores de categorías del planificador
    const PLANNER_COLOR_MAP = {
        blue:   { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   glBg: 'bg-blue-500/20',   glText: 'text-blue-200',   glBorder: 'border-blue-500/30' },
        purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', glBg: 'bg-purple-500/20', glText: 'text-purple-200', glBorder: 'border-purple-500/30' },
        orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', glBg: 'bg-orange-500/20', glText: 'text-orange-200', glBorder: 'border-orange-500/30' },
        pink:   { bg: 'bg-pink-100',   text: 'text-pink-700',   border: 'border-pink-200',   glBg: 'bg-pink-500/20',   glText: 'text-pink-200',   glBorder: 'border-pink-500/30' },
        green:  { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  glBg: 'bg-green-500/20',  glText: 'text-green-200',  glBorder: 'border-green-500/30' },
        red:    { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    glBg: 'bg-red-500/20',    glText: 'text-red-200',    glBorder: 'border-red-500/30' },
    };
    const DEFAULT_PLANNER_COLORS = { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', glBg: 'bg-teal-500/20', glText: 'text-teal-200', glBorder: 'border-teal-500/30' };

    // Mapa id de categoría → colorName
    const allPlannerCats = useMemo(() => {
        const defaults = [
            { id: 'verduleria', colorName: 'green' },
            { id: 'carniceria', colorName: 'red' },
        ];
        return [...defaults, ...plannerCategories];
    }, [plannerCategories]);

    const catColorMap = useMemo(() => {
        const map = {};
        allPlannerCats.forEach(c => { map[c.id] = c.colorName; });
        return map;
    }, [allPlannerCats]);

    const calendarItemsByDay = useMemo(() => {
        const map = {};
        // Items de servicios/tarjetas (por día de vencimiento)
        allItems.forEach(item => {
            const d = parseInt(item.day);
            if (!map[d]) map[d] = [];
            map[d].push({ ...item, itemKind: 'payment' });
        });
        // Items del planificador (por fecha exacta, solo del mes actual)
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        freshItems
            .filter(fi => fi.month === monthKey && fi.date)
            .forEach(fi => {
                const day = parseInt(fi.date.split('-')[2]);
                if (!day || day < 1 || day > 31) return;
                if (!map[day]) map[day] = [];
                const colorName = catColorMap[fi.category] || 'green';
                map[day].push({ ...fi, itemKind: 'planner', colorName });
            });
        return map;
    }, [allItems, freshItems, currentDate, catColorMap]);

    const daysOfWeek = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    return (
        <div className="space-y-6 animate-fade-in pb-24">
            <div className="flex justify-between items-center px-2">
                <div><h2 className={`text-xl font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Calendario</h2><p className={`text-xs font-bold uppercase ${isGlass ? 'text-indigo-300' : 'text-indigo-600'}`}>{currentDate.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}</p></div>
                <div className="flex items-center gap-2">
                    <div className={`hidden sm:flex items-center rounded-xl p-1 ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                        <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? (isGlass ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-900 shadow-sm') : (isGlass ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900')}`}>Lista</button>
                        <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'calendar' ? (isGlass ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-900 shadow-sm') : (isGlass ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900')}`}>Mes</button>
                    </div>
                    <button onClick={() => openModal()} className={`text-xs px-4 py-2 rounded-2xl font-bold shadow-md flex items-center gap-1 active:scale-95 transition-transform ${isGlass ? 'bg-white text-indigo-900 hover:bg-indigo-50' : 'bg-gray-900 text-white hover:bg-black'}`}><span>+</span> Nuevo Fijo</button>
                </div>
            </div>
            
            {/* Switch para mobile */}
            <div className={`sm:hidden flex items-center rounded-xl p-1 mx-2 ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                <button onClick={() => setViewMode('list')} className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? (isGlass ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-900 shadow-sm') : (isGlass ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900')}`}>Lista</button>
                <button onClick={() => setViewMode('calendar')} className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'calendar' ? (isGlass ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-900 shadow-sm') : (isGlass ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900')}`}>Mes</button>
            </div>

            {/* PANEL DE REPARTO */}
            <RepartoPanel
                allItems={allItems}
                householdId={householdId}
                currentUid={currentUid}
                isGlass={isGlass}
                showMoney={showMoney}
            />

            {/* GRÁFICO MAREA */}
            <div className={`p-6 rounded-[30px] text-white shadow-lg border relative overflow-hidden ${isGlass ? 'bg-white/5 border-white/10' : 'bg-[#0f172a] border-gray-800'}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[60px] opacity-10 pointer-events-none"></div>
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Marea Semanal</p>
                    <div className="flex gap-3 text-[10px]"><span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-gray-700 rounded-full"></div> Pendiente</span><span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_5px_rgba(74,222,128,0.5)]"></div> Pagado</span></div>
                </div>
                <div className="flex items-end justify-between h-40 gap-4 px-2 relative z-10">
                    {weeklyData.map((week, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-3 group relative h-full justify-end">
                            <div className={`absolute -top-10 transition-all duration-300 transform ${week.total > 0 ? 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0' : 'hidden'}`}><div className="bg-white text-gray-900 text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">{showMoney(week.paid)} / {showMoney(week.total)}</div><div className="w-2 h-2 bg-white rotate-45 mx-auto -mt-1"></div></div>
                            {week.percentFilled >= 100 && week.total > 0 && <div className="absolute -top-8 animate-bounce z-20 drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]"><Star size={20} className="text-yellow-400 fill-current" /></div>}
                            <div className="w-full bg-gray-800/50 rounded-t-lg relative flex items-end overflow-hidden transition-all duration-500" style={{ height: `${week.heightTotal}%` }}><div className={`w-full transition-all duration-1000 ease-out relative ${week.percentFilled >= 100 ? 'bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.4)]' : 'bg-green-500/80'}`} style={{ height: `${week.percentFilled}%` }}><div className="absolute top-0 left-0 right-0 h-[1px] bg-white/50"></div></div></div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${week.percentFilled >= 100 && week.total > 0 ? 'text-green-400' : 'text-gray-500'}`}>{week.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* VISTAS: LISTA O CALENDARIO */}
            {viewMode === 'list' ? (
                <div className="space-y-3 animate-fade-in">
                    {allItems.map((item) => {
                        const status = getStatusLabel(item.day, item.isPaid);

                        return (
                            <div key={item.id} className={`p-4 rounded-3xl border transition-all duration-300 group ${isGlass
                                ? (item.isPaid ? 'bg-green-900/10 border-green-500/20 opacity-60' : 'bg-white/5 border-white/10 hover:bg-white/10')
                                : (item.isPaid ? 'border-green-200 bg-green-50/30 opacity-75' : 'bg-white border-gray-100 hover:border-blue-300 shadow-sm hover:shadow-md')
                                }`}>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">

                                        {/* CAJA DEL DÍA */}
                                        <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-xs font-bold transition-colors border ${item.isPaid
                                            ? (isGlass ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-green-100 text-green-700 border-green-200')
                                            : (isGlass ? 'bg-white/10 text-white border-white/5' : 'bg-gray-50 text-gray-600 border-gray-100')
                                            }`}>
                                            <span className="text-lg leading-none">{item.day}</span>
                                            <span className="text-[8px] uppercase opacity-70">Vence</span>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className={`font-bold text-sm transition-all ${item.isPaid
                                                    ? (isGlass ? 'text-green-300 line-through decoration-green-500' : 'text-green-800 line-through decoration-green-500')
                                                    : (isGlass ? 'text-white' : 'text-gray-800')
                                                    }`}>
                                                    {item.name}
                                                </p>

                                                {/* ETIQUETA: Identificador de Privado */}
                                                {householdId && item.isShared === false && <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border flex items-center gap-1 ${isGlass ? 'bg-gray-500/20 text-gray-300 border-gray-500/30' : 'bg-gray-100 text-gray-700 border-gray-300'}`}><User size={10} /> Privado</span>}

                                                {/* ETIQUETA: Si es tarjeta, solo mostramos el ícono de edición manual si aplica, pero ya no repetimos el banco si es redundante */}
                                                {item.type === 'card' && item.isManual && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold border bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-1">Ajustado <Pencil size={10} /></span>}

                                                {!item.isPaid && (
                                                    <button onClick={(e) => { e.stopPropagation(); openModal(item); }} className={`p-1 rounded-full transition-colors opacity-0 group-hover:opacity-100 ${isGlass ? 'text-white/30 hover:text-blue-300 hover:bg-white/10' : 'text-gray-300 hover:text-blue-500 hover:bg-blue-50'}`}>
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                )}
                                            </div>

                                            {/* LEYENDA DE ESTADO (Vence en X días / Pagado) */}
                                            <div className="mt-1">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.color}`}>
                                                    {status.text}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right flex items-center gap-4">
                                        <p className={`font-mono font-bold transition-colors ${item.isPaid ? 'text-green-500' : (isGlass ? 'text-white' : 'text-gray-900')}`}>{showMoney(item.amount)}</p>
                                        <button onClick={() => togglePaid(item)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-90 ${item.isPaid ? 'bg-green-500 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)] rotate-0' : (isGlass ? 'border-white/20 bg-transparent hover:border-blue-400 rotate-180' : 'border-gray-200 hover:border-blue-400 rotate-180 bg-white')}`}>
                                            {item.isPaid && <svg className="w-5 h-5 text-white animate-fade-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {allItems.length === 0 && <div className={`flex flex-col items-center justify-center p-10 text-center border-2 border-dashed rounded-[30px] ${isGlass ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}><CalendarDays size={40} className="mb-2 opacity-50 mx-auto" /><p className={`text-sm font-medium ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Nada pendiente para {currentDate.toLocaleString('es-AR', { month: 'long' })}.</p></div>}
                </div>
            ) : (
                <div className={`p-4 rounded-[30px] border animate-fade-in ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
                        {daysOfWeek.map(d => (
                            <div key={d} className={`text-center text-[10px] font-bold uppercase tracking-wider ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 md:gap-2">
                        {calendarDays.map((day, idx) => {
                            if (!day) return <div key={`empty-${idx}`} className={`rounded-2xl border min-h-[70px] md:min-h-[90px] ${isGlass ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'} opacity-30`} />;
                            
                            const dayItems = calendarItemsByDay[day] || [];
                            
                            const todayDate = new Date();
                            const isToday = todayDate.getDate() === day && todayDate.getMonth() === currentDate.getMonth() && todayDate.getFullYear() === currentDate.getFullYear();
                            
                            return (
                                <div key={day} className={`min-h-[80px] md:min-h-[100px] rounded-2xl border p-1.5 md:p-2 flex flex-col transition-all overflow-hidden ${isToday ? (isGlass ? 'bg-indigo-500/20 border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-indigo-50 border-indigo-300 shadow-sm') : (isGlass ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-100 hover:border-gray-300')}`}>
                                    <div className={`text-[10px] md:text-xs font-bold mb-1.5 flex justify-center items-center w-5 h-5 md:w-6 md:h-6 rounded-full ${isToday ? (isGlass ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white') : (isGlass ? 'text-white/70' : 'text-gray-600')}`}>
                                        {day}
                                    </div>
                                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar pb-1">
                                        {dayItems.map(item => {
                                            if (item.itemKind === 'planner') {
                                                const pColors = PLANNER_COLOR_MAP[item.colorName] || DEFAULT_PLANNER_COLORS;
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className={`text-[9px] md:text-[10px] px-1.5 py-1 rounded-lg flex flex-col border ${
                                                            item.completed
                                                                ? (isGlass ? 'bg-white/5 border-white/10 text-white/30 line-through' : 'bg-gray-50 border-gray-200 text-gray-400 line-through')
                                                                : (isGlass ? `${pColors.glBg} ${pColors.glText} ${pColors.glBorder}` : `${pColors.bg} ${pColors.text} ${pColors.border}`)
                                                        }`}
                                                        title={`📋 ${item.note || 'Sin nota'}${item.total > 0 ? ' — ' + showMoney(item.total) : ''}`}
                                                    >
                                                        <span className="truncate font-bold leading-tight">📋 {item.note || 'Sin nota'}</span>
                                                        {item.total > 0 && <span className="font-mono text-[8px] opacity-80 mt-0.5">{showMoney(item.total)}</span>}
                                                    </div>
                                                );
                                            }
                                            // Item de pago (servicio / tarjeta)
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => openModal(item)}
                                                    className={`text-[9px] md:text-[10px] px-1.5 py-1 rounded-lg cursor-pointer transition-transform active:scale-95 flex flex-col ${
                                                        item.isPaid
                                                            ? (isGlass ? 'bg-green-500/10 text-green-400/50 line-through border border-green-500/20' : 'bg-green-50 text-green-600/60 line-through border border-green-100')
                                                            : (isGlass ? 'bg-indigo-500/30 text-indigo-100 border border-indigo-500/50 hover:bg-indigo-500/40' : 'bg-indigo-100 text-indigo-800 border border-indigo-200 hover:bg-indigo-200')
                                                    }`}
                                                    title={`${item.name} - ${showMoney(item.amount)}`}
                                                >
                                                    <span className="truncate font-bold leading-tight">{item.name}</span>
                                                    <span className="font-mono text-[8px] opacity-80 mt-0.5">{showMoney(item.amount)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-end sm:items-center justify-center animate-fade-in">
                    <div className={`w-full max-w-sm rounded-t-[30px] sm:rounded-[30px] p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto ${isGlass ? 'bg-[#1a1b4b] border border-white/10' : 'bg-white'}`}>
                        <div className={`flex justify-between items-center mb-6 border-b pb-4 sticky top-0 z-10 ${isGlass ? 'border-white/10 bg-[#1a1b4b]' : 'border-gray-100 bg-white'}`}>
                            <h3 className={`text-lg font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>{editingService?.type === 'card' ? `Ajustar Resumen ${editingService.bank}` : (editingService ? 'Editar' : 'Nuevo Fijo')}</h3>
                            <button onClick={() => setIsModalOpen(false)} className={`p-2 rounded-full transition-colors ${isGlass ? 'text-white/50 hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100'}`}>✕</button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-5 pb-6">
                            
                            {/* Toggle Compartir */}
                            {householdId && (!editingService || editingService.type !== 'card') && (
                                <div className={`p-3 rounded-xl flex items-center justify-between ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-100'}`}>
                                  <div>
                                    <p className={`text-sm font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Compartir en Hogar</p>
                                    <p className={`text-[10px] ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>Visible para el reparto proporcional</p>
                                  </div>
                                  <button type="button" onClick={() => setForm(f => ({ ...f, isShared: !f.isShared }))} className={`w-12 h-7 rounded-full transition-colors relative focus:outline-none ${form.isShared ? 'bg-indigo-600' : 'bg-gray-400'}`}>
                                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${form.isShared ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                  </button>
                                </div>
                            )}

                            {editingService?.type === 'card' ? (
                                <div className="bg-blue-900/30 p-4 rounded-2xl border border-blue-500/30">
                                    <p className="text-xs text-blue-300 mb-2 font-medium">Ingresa el monto exacto de tu resumen final. Esto reemplazará la suma automática.</p>
                                    <label className="block text-xs font-bold text-blue-200 uppercase mb-1">Monto Final ($)</label>
                                    <input type="tel" className={`w-full p-4 border rounded-xl outline-none font-bold text-center text-xl focus:ring-4 ${isGlass ? 'bg-black/20 border-white/10 text-white focus:ring-blue-500/20' : 'bg-white border-blue-200 text-gray-800 focus:ring-blue-100'}`} placeholder="0" value={formatInputNumber(form.amount)} onChange={e => setForm({ ...form, amount: parseInputNumber(e.target.value) })} autoFocus />
                                </div>
                            ) : (
                                <>
                                    <div><label className={`block text-xs font-bold uppercase mb-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Nombre</label><input className={`w-full p-4 border rounded-2xl outline-none font-bold ${isGlass ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`} placeholder="Ej: Internet..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className={`block text-xs font-bold uppercase mb-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Monto ($)</label><input type="tel" className={`w-full p-4 border rounded-2xl outline-none font-bold text-center ${isGlass ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`} placeholder="0" value={formatInputNumber(form.amount)} onChange={e => setForm({ ...form, amount: parseInputNumber(e.target.value) })} /></div>
                                        <div><label className={`block text-xs font-bold uppercase mb-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Día Venc.</label><input type="number" max="31" className={`w-full p-4 border rounded-2xl outline-none font-bold text-center ${isGlass ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`} placeholder="10" value={form.day} onChange={e => setForm({ ...form, day: e.target.value })} /></div>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold uppercase mb-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Frecuencia</label>
                                        <div className="relative">
                                            <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} className={`w-full p-4 border rounded-xl outline-none font-bold text-sm appearance-none ${isGlass ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                                <option>Mensual</option><option>Bimestral</option><option>Trimestral</option><option>Semestral</option><option>Anual</option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="pt-4 flex gap-3">
                                {editingService && (
                                    <button type="button" onClick={handleDelete} className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-colors border border-red-500/20">
                                        {editingService.type === 'card' ? 'Volver a Automático' : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                                    </button>
                                )}
                                <button type="submit" className={`flex-1 font-bold rounded-2xl py-4 shadow-lg active:scale-95 transition-transform text-lg ${isGlass ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-gray-900 text-white hover:bg-black'}`}>{editingService ? (editingService.type === 'card' ? 'Confirmar Monto' : 'Actualizar') : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}