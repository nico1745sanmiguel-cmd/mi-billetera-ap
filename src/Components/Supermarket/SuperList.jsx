import React, { useState, useMemo, useRef, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { formatMoney } from '../../utils';

export default function SuperList({ items = [], currentDate, isGlass, householdId }) {
    const [newItem, setNewItem] = useState('');

    // ESTADO PARA ENFOCAR EL NUEVO ÍTEM AUTOMÁTICAMENTE
    const [lastAddedId, setLastAddedId] = useState(null);
    // ESTADO SCROLLBAR 📜
    const [isScrolling, setIsScrolling] = useState(false);
    const [activeLetter, setActiveLetter] = useState(null);
    const scrollTimeout = useRef(null);
    const itemsRefs = useRef({});

    // TOAST STATE 🍞
    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);

    const showToast = (message, undoAction) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ message, undoAction });
        toastTimerRef.current = setTimeout(() => setToast(null), 3000);
    };

    const handleUndo = async () => {
        if (toast?.undoAction) {
            await toast.undoAction();
            setToast(null);
        }
    };

    // Detectar scroll global para mostrar la barra
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolling(true);
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
            scrollTimeout.current = setTimeout(() => setIsScrolling(false), 2000);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleTouchMove = (e) => {
        // Lógica para detectar qué letra está bajo el dedo
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element.dataset.letter) {
            e.preventDefault(); // Evitar scroll de pantalla
            const letter = element.dataset.letter;
            setActiveLetter(letter);

            // Scrollear a la sección
            const target = monthlyList.find(i => i.name && i.name.toUpperCase().startsWith(letter) && !i.checked);
            if (target && itemsRefs.current[target.id]) {
                itemsRefs.current[target.id].scrollIntoView({ behavior: 'auto', block: 'center' }); // Auto es más fluido para scrubbing
            }
        }
    };

    const handleTouchEnd = () => {
        setActiveLetter(null);
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        scrollTimeout.current = setTimeout(() => setIsScrolling(false), 2000);
    };

    // 1. CLAVE DEL MES (MÁQUINA DEL TIEMPO ⏳)
    const currentMonthKey = useMemo(() => {
        if (!currentDate) return '';
        return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }, [currentDate]);

    // 2. LISTA FILTRADA Y ORDENADA
    const monthlyList = useMemo(() => {
        const list = items.filter(item => {
            if (item.month) return item.month === currentMonthKey;
            // Compatibilidad con items viejos (si no tienen mes, asumen el actual real)
            const realNow = new Date();
            const realKey = `${realNow.getFullYear()}-${String(realNow.getMonth() + 1).padStart(2, '0')}`;
            return currentMonthKey === realKey;
        });

        // Orden: 1. Pendientes A-Z, 2. Comprados (Check) al fondo
        return list.sort((a, b) => {
            if (a.checked === b.checked) return (a.name || '').localeCompare(b.name || '');
            return a.checked ? 1 : -1;
        });
    }, [items, currentMonthKey]);

    // 3. AUTO-SCROLL Y FOCO AL AGREGAR 🎯
    useEffect(() => {
        if (lastAddedId && itemsRefs.current[lastAddedId]) {
            // Scrollear hasta el elemento
            itemsRefs.current[lastAddedId].scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Enfocar el input de precio del nuevo item
            const priceInputEl = itemsRefs.current[lastAddedId].querySelector('input[type="tel"]');
            if (priceInputEl) {
                setTimeout(() => priceInputEl.focus(), 300);
            }
            setLastAddedId(null);
        }
    }, [monthlyList, lastAddedId]);

    // 4. CÁLCULOS
    const totals = useMemo(() => {
        const estimated = monthlyList.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        const real = monthlyList.filter(i => i.checked).reduce((acc, i) => acc + (i.price * i.quantity), 0);
        const count = monthlyList.length;
        const checkedCount = monthlyList.filter(i => i.checked).length;
        return { estimated, real, count, checkedCount };
    }, [monthlyList]);

    // 5. HISTORIAL DE PRECIOS 📉
    const getPriceHistory = (itemName, currentPrice) => {
        if (!itemName) return null;
        const history = items
            .filter(i => i.name && i.name.trim().toLowerCase() === itemName.trim().toLowerCase() && i.checked && i.month !== currentMonthKey)
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        if (history.length === 0) return null;
        const lastPrice = history[0].price;
        const diff = currentPrice - lastPrice;
        return { lastPrice, diff };
    };

    // FORMATOS
    const formatInputCurrency = (val) => val ? '$ ' + Number(val).toLocaleString('es-AR') : '';
    const parseCurrencyInput = (val) => val.replace(/\D/g, '');



    // --- HANDLERS ---
    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newItem || !auth.currentUser) return;

        try {
            const docRef = await addDoc(collection(db, 'supermarket_items'), {
                name: newItem,
                price: 0, // Precio por defecto 0
                quantity: 1, // Cantidad por defecto 1
                checked: false,
                userId: auth.currentUser.uid,
                month: currentMonthKey,
                createdAt: new Date().toISOString(),
                // Household logic
                ...(householdId && {
                    householdId: householdId,
                    ownerId: auth.currentUser.uid,
                    isShared: true // Supermarket items are shared by default
                })
            });

            setLastAddedId(docRef.id); // Guardamos ID para el auto-focus
            setNewItem('');

            showToast(`Agregado: ${newItem}`, async () => {
                await deleteDoc(docRef);
            });
        } catch (error) { console.error(error); }
    };

    const handleToggle = async (item) => {
        const itemRef = doc(db, 'supermarket_items', item.id);
        await updateDoc(itemRef, { checked: !item.checked });
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Borrar item?")) await deleteDoc(doc(db, 'supermarket_items', id));
    };

    // --- HANDLERS PRECIO Y CONFIRMACIÓN ---
    // Ref para guardar el estado original antes de editar (para Undo y lógica de cambios)
    const editingItemRef = useRef(null);

    const handlePriceFocus = (item) => {
        editingItemRef.current = {
            id: item.id,
            initialPrice: item.price,
            initialChecked: item.checked
        };
    };

    const handleUpdatePrice = async (item, rawValue) => {
        const numericValue = parseCurrencyInput(rawValue);
        const itemRef = doc(db, 'supermarket_items', item.id);

        // Solo actualizamos el precio en tiempo real, SIN cambiar el check
        await updateDoc(itemRef, { price: Number(numericValue) });
    };

    const handlePriceBlur = async (item) => {
        // Al salir del input (Blur o Enter), verificamos si hay que marcarlo como comprado
        // La regla es: Si tiene precio > 0 y NO estaba checkeado, lo marcamos.

        if (!editingItemRef.current || editingItemRef.current.id !== item.id) return;

        const { initialPrice, initialChecked } = editingItemRef.current;
        const currentPrice = item.price; // El precio ya está actualizado en DB por el onChange
        const itemRef = doc(db, 'supermarket_items', item.id);

        // CASO 1: Auto-Check (Estaba sin check y ahora tiene precio)
        if (!item.checked && currentPrice > 0) {
            await updateDoc(itemRef, { checked: true });

            showToast("Marcado como comprado", async () => {
                // Undo: volver a precio original y des-checkear
                await updateDoc(itemRef, { price: initialPrice, checked: initialChecked });
            });
        }
        // CASO 2: Solo cambió el precio (Ya estaba checkeado o sigue en 0)
        else if (currentPrice !== initialPrice) {
            showToast("Precio actualizado", async () => {
                await updateDoc(itemRef, { price: initialPrice });
            });
        }

        editingItemRef.current = null; // Limpiar ref
    };

    const handleUpdateQuantity = async (item, delta) => {
        const oldQty = item.quantity;
        const newQty = Math.max(1, item.quantity + delta);
        if (oldQty === newQty) return;

        const itemRef = doc(db, 'supermarket_items', item.id);
        await updateDoc(itemRef, { quantity: newQty });

        showToast("Cantidad modificada", async () => {
            await updateDoc(itemRef, { quantity: oldQty });
        });
    };


    return (
        <div className="animate-fade-in pb-32">

            {/* 1. TOAST GLOBAL (Portal-like, arriba de todo) */}
            <div className={`fixed top-4 left-0 right-0 flex justify-center transition-all duration-300 z-[100] pointer-events-none ${toast ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                <div className={`shadow-2xl backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-3 text-sm font-bold pointer-events-auto border ${isGlass ? 'bg-black/40 text-white border-white/20' : 'bg-gray-900 text-white border-gray-700/50'}`}>
                    <span>{toast?.message}</span>
                    {toast?.undoAction && (
                        <button onClick={handleUndo} className="text-yellow-400 hover:text-yellow-300 uppercase tracking-wider ml-2 text-xs">
                            Deshacer
                        </button>
                    )}
                </div>
            </div>

            {/* 2. LUPA DE LETRA GIGANTE (iOS Style) */}
            <div className={`fixed right-12 top-1/2 -translate-y-1/2 w-16 h-16 backdrop-blur rounded-full flex items-center justify-center text-3xl font-bold shadow-xl z-50 transition-all duration-200 pointer-events-none ${activeLetter ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-50 translate-x-4'} ${isGlass ? 'bg-white/10 text-white' : 'bg-gray-200/90 text-gray-800'}`}>
                {activeLetter}
            </div>

            {/* HEADER STICKY (Siempre visible arriba) */}
            <div className={`sticky top-0 z-30 pt-2 pb-3 mb-2 transition-all shadow-sm -mx-4 px-6 border-b ${isGlass ? 'bg-[#0f0c29]/95 border-white/10 text-white backdrop-blur-md' : 'bg-[#f3f4f6]/95 border-gray-200/50 text-gray-800 backdrop-blur-sm'}`}>
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <h2 className={`text-xl font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Supermercado</h2>
                        <p className={`text-xs font-bold uppercase ${isGlass ? 'text-purple-300' : 'text-purple-600'}`}>Lista de {currentDate.toLocaleString('es-AR', { month: 'long' })}</p>
                    </div>
                    <div className="text-right">
                        {/* Lógica Visual: Si hay algo checkeado es "En Carrito", si no es "Presupuesto" */}
                        <p className={`text-[10px] uppercase font-bold ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                            {totals.checkedCount > 0 ? 'En Carrito' : 'Presupuesto'}
                        </p>
                        <p className={`text-2xl font-bold ${totals.checkedCount > 0 ? (isGlass ? 'text-white' : 'text-gray-900') : (isGlass ? 'text-white/40' : 'text-gray-400')}`}>
                            {formatMoney(totals.checkedCount > 0 ? totals.real : totals.estimated)}
                        </p>
                    </div>
                </div>

                {/* BARRA DE PROGRESO */}
                <div className={`p-1 rounded-full shadow-inner border flex items-center gap-2 ${isGlass ? 'bg-black/20 border-white/5' : 'bg-white border-gray-100'}`}>
                    <div className={`flex-1 h-1.5 rounded-full overflow-hidden relative ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                        <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${totals.estimated > 0 ? (totals.real / totals.estimated) * 100 : 0}%` }}></div>
                    </div>
                    <span className={`text-[9px] font-bold min-w-[50px] text-right ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>{totals.checkedCount}/{totals.count}</span>
                </div>
            </div>

            {/* LISTA DE ITEMS CON SCROLLBAR 📜 */}
            <div className="flex relative">
                <div className="flex-1 space-y-3 pb-32">
                    {monthlyList.map((item) => {
                        const history = getPriceHistory(item.name, item.price);
                        const subtotal = item.price * item.quantity;

                        return (
                            <div
                                key={item.id}
                                ref={el => itemsRefs.current[item.id] = el}
                                className={`flex flex-col p-3 rounded-3xl border transition-all duration-500 ${item.checked
                                    ? (isGlass ? 'bg-purple-900/20 border-purple-500/20 opacity-60 order-last' : 'bg-purple-50 border-purple-100 opacity-60 order-last')
                                    : (isGlass ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-100 shadow-sm')
                                    }`}
                            >
                                {/* FILA 1: Check, Nombre, Subtotal */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div onClick={() => handleToggle(item)} className={`w-6 h-6 rounded-xl border-2 flex-shrink-0 flex items-center justify-center cursor-pointer transition-colors ${item.checked ? 'bg-purple-500 border-purple-500' : (isGlass ? 'border-white/20 bg-transparent' : 'border-gray-300 bg-white')}`}>
                                        {item.checked && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-bold text-sm truncate ${item.checked ? 'line-through decoration-purple-400' : ''} ${isGlass ? 'text-white' : 'text-gray-800'}`}>{item.name}</p>
                                        {subtotal > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${isGlass ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-500'}`}>Sub: {formatMoney(subtotal)}</span>}
                                    </div>

                                    {/* Comparación de Historial */}
                                    {history && item.price > 0 && (
                                        <p className="text-[10px] flex items-center gap-1">
                                            <span className={`${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Antes: {formatMoney(history.lastPrice)}</span>
                                            {history.diff !== 0 && (
                                                <span className={`font-bold ${history.diff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                    ({history.diff > 0 ? '+' : ''}{formatMoney(history.diff)})
                                                </span>
                                            )}
                                        </p>
                                    )}
                                </div>
                                <button onClick={() => handleDelete(item.id)} className={`p-1 ${isGlass ? 'text-white/20 hover:text-red-400' : 'text-gray-300 hover:text-red-500'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>

                                <div className="flex gap-3 pl-9">
                                    <div className={`flex items-center rounded-2xl border h-10 ${isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                        <button onClick={() => handleUpdateQuantity(item, -1)} className={`w-8 h-full flex items-center justify-center rounded-l-2xl transition-colors text-lg font-bold ${isGlass ? 'text-white/50 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-200'}`}>-</button>
                                        <span className={`w-8 text-center text-sm font-bold ${isGlass ? 'text-white' : 'text-gray-700'}`}>{item.quantity}</span>
                                        <button onClick={() => handleUpdateQuantity(item, 1)} className={`w-8 h-full flex items-center justify-center rounded-r-2xl transition-colors text-lg font-bold ${isGlass ? 'text-white/50 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-200'}`}>+</button>
                                    </div>
                                    <div className={`flex-1 rounded-2xl flex items-center px-3 border transition-colors h-10 ${lastAddedId === item.id ? 'border-purple-400 ring-2 ring-purple-100 bg-white' : (isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200')}`}>
                                        <input
                                            type="tel"
                                            className={`w-full bg-transparent outline-none text-sm font-bold text-right ${item.checked ? 'text-purple-700' : (isGlass ? 'text-white' : 'text-gray-800')}`}
                                            value={item.price ? formatInputCurrency(item.price) : ''}
                                            onChange={(e) => handleUpdatePrice(item, e.target.value)}
                                            onFocus={() => handlePriceFocus(item)}
                                            onBlur={() => handlePriceBlur(item)}
                                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                            enterKeyHint="done"
                                            placeholder="$ 0"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {monthlyList.length === 0 && (
                        <div className={`text-center py-10 ${isGlass ? 'opacity-30' : 'opacity-50'}`}>
                            <span className="text-4xl">🛒</span>
                            <p className="text-sm font-bold mt-2">Lista vacía</p>
                            <p className="text-xs">Agrega cosas para {currentDate.toLocaleString('es-AR', { month: 'long' })}</p>
                        </div>
                    )}
                </div>

                {/* BARRA LATERAL ALFABÉTICA DINÁMICA (TOUCH) */}
                <div
                    className={`w-8 flex flex-col items-center justify-center fixed right-0 top-32 bottom-24 z-40 transition-all duration-300 ${isScrolling || activeLetter ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}
                    onTouchStart={() => setIsScrolling(true)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className={`backdrop-blur-sm rounded-l-xl py-2 shadow-sm border-y border-l flex flex-col gap-0.5 max-h-full overflow-hidden w-6 ${isGlass ? 'bg-white/10 border-white/10' : 'bg-white/50 border-gray-100'}`}>
                        {[...new Set(monthlyList.filter(i => !i.checked && i.name).map(i => (i.name[0] || '?').toUpperCase()))].sort().map(letter => (
                            <div
                                key={letter}
                                data-letter={letter}
                                className={`text-[9px] font-bold text-center h-[18px] flex items-center justify-center shrink-0 w-full select-none ${isGlass ? 'text-white/60' : 'text-gray-500'}`}
                            >
                                {letter}
                            </div>
                        ))}
                    </div>
                </div>
            </div >

            {/* INPUT ADD FLOTANTE (Simplificado) */}
            < div className={`fixed bottom-0 left-0 right-0 p-4 border-t md:relative md:border-0 md:bg-transparent md:p-0 z-20 ${isGlass ? 'bg-[#0f0c29] border-white/10' : 'bg-white border-gray-100'}`
            }>
                <form onSubmit={handleAdd} className="flex gap-2 max-w-5xl mx-auto">
                    <div className={`flex-1 rounded-[30px] flex items-center px-4 border focus-within:border-purple-500 transition-all shadow-sm ${isGlass ? 'bg-white/10 border-white/10 focus-within:bg-white/20' : 'bg-gray-100 border-transparent focus-within:bg-white'}`}>
                        <input
                            type="text"
                            className={`w-full bg-transparent outline-none text-sm font-bold py-3 ${isGlass ? 'text-white placeholder-white/30' : 'text-gray-800'}`}
                            placeholder="¿Qué falta comprar?"
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!newItem}
                        className="bg-purple-600 text-white w-12 h-12 rounded-[24px] flex items-center justify-center shadow-lg shadow-purple-200 active:scale-95 disabled:opacity-50 transition-all flex-shrink-0"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                </form>
            </div >

        </div >
    );
}