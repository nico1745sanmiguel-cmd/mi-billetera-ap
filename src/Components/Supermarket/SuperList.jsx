import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Loader2, Camera, Check, Trash2, Copy, Plus } from 'lucide-react';
import { formatMoney } from '../../utils';
import { formatMonthKey } from '../../utils/cardDebtUtils';
import { useSupermarket } from '../../context/SupermarketContext';
import { useAuth } from '../../context/AuthContext';
import {
    addSuperItem,
    deleteSuperItem,
    updateSuperPrice,
    updateSuperQuantity,
    toggleSuperChecked,
    updateSuperFields,
} from '../../repositories/supermarketRepository';
import { useUI } from '../../context/UIContext';

export default function SuperList() {
    const { currentDate, isGlass } = useUI();
    const navigate = useNavigate();
    const { userData } = useAuth();
    const householdId = userData?.householdId;
    const { superItems: items } = useSupermarket();
    const [newItem, setNewItem] = useState('');

    // ESTADO PARA ENFOCAR EL NUEVO ÍTEM AUTOMÁTICAMENTE
    const [lastAddedId, setLastAddedId] = useState(null);
    // ESTADO LETRAS 📜
    const [activeLetter, setActiveLetter] = useState(null);
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

    // 1. CLAVE DEL MES (MÁQUINA DEL TIEMPO ⏳)
    const currentMonthKey = useMemo(() => formatMonthKey(currentDate), [currentDate]);

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

    // Navegación alfabética segura (click/touch directo)
    const handleLetterClick = (letter) => {
        setActiveLetter(letter);
        const target = monthlyList.find(i => i.name && i.name.toUpperCase().startsWith(letter) && !i.checked);
        if (target && itemsRefs.current[target.id]) {
            const element = itemsRefs.current[target.id];
            // 170px para compensar el header más grande (con el nuevo chip slider)
            const y = element.getBoundingClientRect().top + window.scrollY - 170; 
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
        setTimeout(() => setActiveLetter(null), 1000);
    };

    // 2.5 LISTA DEL MES ANTERIOR (PARA COPIAR AL NUEVO MES)
    const lastMonthItems = useMemo(() => {
        if (!items || items.length === 0) return [];
        // Buscar meses anteriores al actual
        const pastMonths = [...new Set(items.map(i => i.month).filter(m => m && m < currentMonthKey))].sort().reverse();
        if (pastMonths.length === 0) return [];
        
        const lastM = pastMonths[0]; // El mes más reciente con items
        const pastItems = items.filter(i => i.month === lastM);
        
        // Evitar duplicados por nombre
        const uniqueNames = new Set();
        const toCopy = [];
        for (const item of pastItems) {
            const normalized = (item.name || '').trim().toLowerCase();
            if (!uniqueNames.has(normalized)) {
                uniqueNames.add(normalized);
                toCopy.push(item);
            }
        }
        return toCopy.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [items, currentMonthKey]);

    const [isCopying, setIsCopying] = useState(false);

    const handleCopyPreviousMonth = async () => {
        if (!lastMonthItems.length || !auth.currentUser) return;
        setIsCopying(true);
        try {
            const promises = lastMonthItems.map(item =>
                addSuperItem({
                    name: item.name,
                    price: item.price || 0,
                    quantity: item.quantity || 1,
                    checked: false,
                    userId: auth.currentUser.uid,
                    month: currentMonthKey,
                    ...(householdId && {
                        householdId,
                        ownerId: auth.currentUser.uid,
                        isShared: true
                    })
                })
            );
            await Promise.all(promises);
            showToast(`¡Lista copiada! (${promises.length} ítems)`);
        } catch (error) {
            console.error(error);
            showToast('Error al copiar');
        } finally {
            setIsCopying(false);
        }
    };

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
            const docRef = await addSuperItem({
                name: newItem,
                price: 0,
                quantity: 1,
                checked: false,
                userId: auth.currentUser.uid,
                month: currentMonthKey,
                ...(householdId && {
                    householdId,
                    ownerId: auth.currentUser.uid,
                    isShared: true
                })
            });
            setLastAddedId(docRef.id);
            setNewItem('');
            showToast(`Agregado: ${newItem}`, async () => {
                await deleteSuperItem(docRef.id);
            });
        } catch (error) { console.error(error); }
    };

    const handleToggle = async (item) => {
        await toggleSuperChecked(item.id, !item.checked);
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Borrar item?')) await deleteSuperItem(id);
    };

    // --- HANDLERS PRECIO Y CONFIRMACIÓN ---
    // Ref para guardar el estado original antes de editar (para Undo y lógica de cambios)
    const editingItemRef = useRef(null);
    const [focusedItemId, setFocusedItemId] = useState(null);

    const handlePriceFocus = (item) => {
        editingItemRef.current = {
            id: item.id,
            initialPrice: item.price,
            initialChecked: item.checked
        };
        setFocusedItemId(item.id);
    };

    const handleUpdatePrice = async (item, rawValue) => {
        const numericValue = parseCurrencyInput(rawValue);
        await updateSuperPrice(item.id, numericValue);
    };

    const handlePriceBlur = async (item) => {
        if (!editingItemRef.current || editingItemRef.current.id !== item.id) return;
        const { initialPrice } = editingItemRef.current;
        const currentPrice = item.price;
        setFocusedItemId(null);

        if (currentPrice !== initialPrice) {
            showToast('Precio actualizado', async () => {
                await updateSuperPrice(item.id, initialPrice);
            });
        }
        editingItemRef.current = null;
    };

    const handleUpdateQuantity = async (item, delta) => {
        const oldQty = item.quantity;
        const newQty = Math.max(1, item.quantity + delta);
        if (oldQty === newQty) return;
        await updateSuperQuantity(item.id, newQty);
        showToast('Cantidad modificada', async () => {
            await updateSuperQuantity(item.id, oldQty);
        });
    };

    const handleExportToAI = () => {
        const checkedItems = monthlyList.filter(item => item.checked);
        if (checkedItems.length === 0) {
            showToast('No hay ítems comprados para exportar');
            return;
        }

        let exportText = 'producto\tcantidad\tprecio\tsubtotal\ttotal\n';
        
        checkedItems.forEach(item => {
            const subtotal = item.price * item.quantity;
            exportText += `${item.name}\t${item.quantity}\t${item.price}\t${subtotal}\t\n`;
        });
        
        exportText += `\t\t\tTOTAL\t${totals.real}`;

        navigator.clipboard.writeText(exportText).then(() => {
            showToast('¡Copiado para IA!');
        }).catch(err => {
            console.error('Error al copiar: ', err);
            showToast('Error al copiar');
        });
    };

    return (
        <>
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

            {/* HEADER FIXED (Siempre visible arriba) */}
            <div className={`fixed top-[64px] left-0 right-0 z-40 pt-4 pb-4 mb-2 transition-all shadow-sm px-6 border-b ${isGlass ? 'bg-[#0f0c29]/95 border-white/10 text-white backdrop-blur-md' : 'bg-[#f3f4f6]/95 border-gray-200/50 text-gray-800 backdrop-blur-sm'}`}>
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className={`text-xl font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Supermercado</h2>
                            <div className="flex flex-col gap-1 items-start">
                                    <button 
                                        onClick={() => navigate('/scanner')}
                                        className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 shadow-sm ${isGlass ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-700 border border-purple-200'}`}
                                    >
                                        <Camera size={12} />
                                        Escanear
                                    </button>
                                <button
                                    onClick={handleExportToAI}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 shadow-sm ${isGlass ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'}`}
                                >
                                    <Copy size={12} />
                                    Exportar a IA
                                </button>
                            </div>
                        </div>
                        <p className={`text-xs font-bold uppercase mt-1 ${isGlass ? 'text-purple-300' : 'text-purple-600'}`}>Lista de {currentDate.toLocaleString('es-AR', { month: 'long' })}</p>
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

                {/* ÍNDICE ALFABÉTICO (Chips horizontales seguros) */}
                <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                <div className="flex gap-2 overflow-x-auto mt-4 pb-1 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {[...new Set(monthlyList.filter(i => !i.checked && i.name).map(i => (i.name[0] || '?').toUpperCase()))].sort().map(letter => (
                        <button
                            key={letter}
                            type="button"
                            onClick={() => handleLetterClick(letter)}
                            className={`snap-center flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all transform active:scale-90 ${activeLetter === letter ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30' : (isGlass ? 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/5' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200/50')} `}
                        >
                            {letter}
                        </button>
                    ))}
                </div>
            </div>

            <div className="animate-fade-in pb-32">
                {/* ESPACIADOR PARA EL HEADER FIXED */}
                <div className="h-[180px]"></div>

                {/* LISTA DE ITEMS CON SCROLLBAR 📜 */}
                <div className="flex relative">
                <div className="flex-1 space-y-3 pb-40">
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
                                        {item.checked && <Check size={16} className="text-white" strokeWidth={3} />}
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
                                    <Trash2 size={16} />
                                </button>

                                <div className="flex gap-3 pl-9">
                                    <div className={`flex items-center rounded-2xl border h-10 ${isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                        <button onClick={() => handleUpdateQuantity(item, -1)} className={`w-8 h-full flex items-center justify-center rounded-l-2xl transition-colors text-lg font-bold ${isGlass ? 'text-white/50 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-200'}`}>-</button>
                                        <span className={`w-8 text-center text-sm font-bold ${isGlass ? 'text-white' : 'text-gray-700'}`}>{item.quantity}</span>
                                        <button onClick={() => handleUpdateQuantity(item, 1)} className={`w-8 h-full flex items-center justify-center rounded-r-2xl transition-colors text-lg font-bold ${isGlass ? 'text-white/50 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-200'}`}>+</button>
                                    </div>
                                    <div className={`flex-1 rounded-2xl flex items-center px-3 border transition-all duration-150 h-10 ${
                                        lastAddedId === item.id
                                            ? 'border-purple-400 ring-2 ring-purple-100 bg-white'
                                            : focusedItemId === item.id
                                                ? (isGlass ? 'border-purple-400/60 ring-1 ring-purple-400/30 bg-purple-500/10' : 'border-purple-400 ring-2 ring-purple-100 bg-purple-50')
                                                : (isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200')
                                    }`}>
                                        <input
                                            type="tel"
                                            className={`w-full bg-transparent outline-none text-sm font-bold text-right transition-colors duration-150 ${item.checked ? 'text-purple-700' : (isGlass ? 'text-white' : 'text-gray-800')}`}
                                            value={item.price ? formatInputCurrency(item.price) : ''}
                                            onChange={(e) => handleUpdatePrice(item, e.target.value)}
                                            onFocus={(e) => { handlePriceFocus(item); e.target.select(); }}
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
                        <div className={`text-center py-10 ${isGlass ? 'text-white' : 'text-gray-800'} animate-fade-in`}>
                            <ShoppingCart size={48} className={`mx-auto mb-4 ${isGlass ? 'opacity-50' : 'opacity-70'}`} />
                            <p className={`text-lg font-bold ${isGlass ? 'opacity-90' : 'opacity-100'}`}>Carrito vacío</p>
                            <p className={`text-sm mt-1 mb-6 ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>Aún no hay compras para {currentDate.toLocaleString('es-AR', { month: 'long' })}</p>
                            
                            {lastMonthItems.length > 0 ? (
                                <button 
                                    onClick={handleCopyPreviousMonth}
                                    disabled={isCopying}
                                    className={`mx-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold shadow-lg transition-all transform active:scale-95 ${isGlass ? 'bg-white text-purple-900 border border-white/20 hover:bg-gray-100' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                                >
                                    {isCopying ? (
                                        <Loader2 size={20} className="animate-spin flex-shrink-0" />
                                    ) : (
                                        <Copy size={20} className="flex-shrink-0" />
                                    )}
                                    {isCopying ? 'Armando carrito...' : `Traer ${lastMonthItems.length} ítems del último carrito`}
                                </button>
                            ) : (
                                <p className={`text-xs ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Agregá cosas usando la barra de abajo</p>
                            )}
                        </div>
                    )}
                </div>


            </div>

            {/* INPUT ADD — FIXED BOTTOM */}
            <div className={`fixed bottom-[64px] left-0 right-0 px-4 py-3 border-t z-40 ${isGlass ? 'bg-[#0f0c29]/95 border-white/10 backdrop-blur-md' : 'bg-white/95 border-gray-100 backdrop-blur-sm'}`}>
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
                        <Plus size={24} />
                    </button>
                </form>
            </div>
        </>
    );
}