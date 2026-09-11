import React, { useState, useMemo, useRef, useEffect } from 'react';
import { auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Loader2, Camera, Check, Trash2, Copy, Plus, Sparkles } from 'lucide-react';
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
} from '../../repositories/supermarketRepository';
import { useUI } from '../../context/UIContext';
import { analyzePurchaseFrequency } from '../../utils/purchasePrediction';
import SupermarketAddInput from './SupermarketAddInput';
import SuperListItem from './SuperListItem';
import SuperListSuggestions from './SuperListSuggestions';
import ConfirmDialog from '../UI/ConfirmDialog';

// FORMATOS
const formatInputCurrency = (val) => val ? '$ ' + Number(val).toLocaleString('es-AR') : '';
const parseCurrencyInput = (val) => val.replace(/\D/g, '');

const handleToggle = async (item) => {
    try {
        await toggleSuperChecked(item.id, !item.checked);
    } catch (err) {
        console.error('Error al cambiar estado del ítem:', err);
    }
};

const handleUpdatePrice = async (item, rawValue) => {
    try {
        const numericValue = parseCurrencyInput(rawValue);
        await updateSuperPrice(item.id, numericValue);
    } catch (err) {
        console.error('Error al actualizar precio:', err);
    }
};

export default function SuperList() {
    const { currentDate, isGlass } = useUI();
    const navigate = useNavigate();
    const { userData } = useAuth();
    const householdId = userData?.householdId;
    const { superItems: items, loading } = useSupermarket();
    
    // ESTADO PARA ENFOCAR EL NUEVO ÍTEM AUTOMÁTICAMENTE
    const [lastAddedId, setLastAddedId] = useState(null);
    // ESTADO LETRAS 📜
    const [activeLetter, setActiveLetter] = useState(null);
    const itemsRefs = useRef({});
    
    // CONFIRM DIALOG
    const [itemToDelete, setItemToDelete] = useState(null);

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

    const confirmDelete = async () => {
        if (itemToDelete) {
            try {
                await deleteSuperItem(itemToDelete);
                showToast('Producto eliminado');
            } catch (err) {
                console.error('Error al eliminar producto:', err);
                showToast('Error al eliminar producto');
            } finally {
                setItemToDelete(null);
            }
        }
    };

    // 1. CLAVE DEL MES (MÁQUINA DEL TIEMPO ⏳)
    const currentMonthKey = useMemo(() => formatMonthKey(currentDate), [currentDate]);

    // 2. LISTA FILTRADA Y ORDENADA
    const monthlyList = useMemo(() => {
        return items
            .filter(item => item.month === currentMonthKey)
            .sort((a, b) => {
                if (a.checked !== b.checked) return a.checked ? 1 : -1;
                return (a.name || '').localeCompare(b.name || '');
            });
    }, [items, currentMonthKey]);

    // Navegación alfabética segura (click/touch directo)
    const handleLetterClick = (letter) => {
        // react-doctor-disable-next-line react-doctor/no-impure-state-updater
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

    // PREDICCIÓN DE COMPRAS INTELIGENTE 🧠
    const prediction = useMemo(() => {
        return calculatePurchasePredictions(items, currentMonthKey);
    }, [items, currentMonthKey]);

    // Auto-agregar ítems de frecuencia regular en un mes vacío (solo si no es un mes histórico pasado)
    const autoAddRunRef = useRef(new Set());
    useEffect(() => {
        if (!currentMonthKey || !auth.currentUser) return;
        if (monthlyList.length > 0) return;          // ya hay ítems este mes
        if (prediction.auto.length === 0) return;    // sin predicciones automáticas
        if (autoAddRunRef.current.has(currentMonthKey)) return; // ya corrió

        const today = new Date();
        const realCurrentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        if (currentMonthKey < realCurrentMonthKey) return; // no generar compras ficticias en el pasado

        autoAddRunRef.current.add(currentMonthKey);

        const promises = prediction.auto.map(item =>
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
                    isShared: true,
                }),
            })
        );
        Promise.all(promises)
            .then(() => showToast(`🛒 ${prediction.auto.length} ítems agregados automáticamente`))
            .catch(err => console.error('Error en auto-add:', err));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentMonthKey, monthlyList.length, prediction.auto]);

    // Estado para la tarjeta de sugerencias
    const [selectedSuggestions, setSelectedSuggestions] = useState({});
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isAddingSuggestions, setIsAddingSuggestions] = useState(false);

    // Resetear selección cuando cambia el mes o aparecen nuevas sugerencias
    useEffect(() => {
        const initial = {};
        prediction.suggestions.forEach(s => { initial[s.name.toLowerCase()] = true; });
        setSelectedSuggestions(initial);
        setShowSuggestions(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentMonthKey, prediction.suggestions.length]);

    const handleConfirmSuggestions = async () => {
        if (!auth.currentUser) return;
        const toAdd = prediction.suggestions.filter(s => selectedSuggestions[s.name.toLowerCase()]);
        if (toAdd.length === 0) { setShowSuggestions(false); return; }
        setIsAddingSuggestions(true);
        try {
            await Promise.all(toAdd.map(item =>
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
                        isShared: true,
                    }),
                })
            ));
            showToast(`✅ ${toAdd.length} sugerencias agregadas`);
        } catch (err) {
            console.error(err);
        } finally {
            setIsAddingSuggestions(false);
            setShowSuggestions(false);
        }
    };

    // 3. AUTO-SCROLL Y FOCO AL AGREGAR 🎯
    useEffect(() => {
        let timerId;
        if (lastAddedId && itemsRefs.current[lastAddedId]) {
            // Scrollear hasta el elemento
            itemsRefs.current[lastAddedId].scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Enfocar el input de precio del nuevo item
            const priceInputEl = itemsRefs.current[lastAddedId].querySelector('input[type="tel"]');
            if (priceInputEl) {
                timerId = setTimeout(() => priceInputEl.focus(), 300);
            }
            setLastAddedId(null);
        }
        
        return () => {
            if (timerId) clearTimeout(timerId);
        };
    }, [monthlyList, lastAddedId]);

    // 4. CÁLCULOS
    const totals = useMemo(() => {
        const estimated = monthlyList.reduce((acc, i) => acc + ((Number(i.price) || 0) * (Number(i.quantity) || 1)), 0);
        const real = monthlyList.reduce((acc, i) => i.checked ? acc + ((Number(i.price) || 0) * (Number(i.quantity) || 1)) : acc, 0);
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

    // --- HANDLERS ---
    const handleAdd = async (itemName) => {
        if (!itemName || !auth.currentUser) return;
        try {
            const docRef = await addSuperItem({
                name: itemName,
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
            showToast('Agregado', async () => {
                try {
                    await deleteSuperItem(docRef.id);
                } catch (e) {
                    console.error('Error al deshacer:', e);
                }
            });
        } catch (error) {
            console.error('Error al agregar ítem:', error);
            showToast('Error al agregar el ítem');
        }
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
            <ConfirmDialog 
                isOpen={!!itemToDelete} 
                onClose={() => setItemToDelete(null)} 
                onConfirm={confirmDelete} 
                title="Eliminar producto" 
                message="¿Estás seguro que querés eliminar este producto de la lista?" 
            />

            {/* 1. TOAST GLOBAL (Portal-like, arriba de todo) */}
            <div className={`fixed top-4 left-0 right-0 flex justify-center transition-all duration-300 z-[100] pointer-events-none ${toast ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                <div className={`shadow-2xl backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-3 text-sm font-bold pointer-events-auto border ${isGlass ? 'bg-black/40 text-white border-white/20' : 'bg-gray-900 text-white border-gray-700/50'}`}>
                    <span>{toast?.message}</span>
                    {toast?.undoAction && (
                        <button
                            aria-label="Deshacer última acción"
                            type="button"
                            onClick={handleUndo}
                            className="text-yellow-400 hover:text-yellow-300 uppercase tracking-wider ml-2 text-xs font-bold p-1"
                        >
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
                            <div className="flex flex-wrap gap-2 items-center">
                                <button
                                    aria-label="Escanear ticket de compra"
                                    type="button" 
                                    onClick={() => navigate('/scanner')}
                                    className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-2xl uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-sm ${isGlass ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30' : 'bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200'}`}
                                >
                                    <Camera size={16} />
                                    Escanear
                                </button>
                                <button
                                    aria-label="Exportar lista para análisis de IA"
                                    type="button"
                                    onClick={handleExportToAI}
                                    className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-2xl uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-sm ${isGlass ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30' : 'bg-indigo-100 text-indigo-700 border border-indigo-200 hover:bg-indigo-200'}`}
                                >
                                    <Copy size={16} />
                                    Exportar a IA
                                </button>
                            </div>
                        </div>
                        <p className={`text-xs font-bold uppercase mt-1 capitalize ${isGlass ? 'text-purple-300' : 'text-purple-600'}`}>
                            Lista de {(currentDate || new Date()).toLocaleString('es-AR', { month: 'long' })}
                        </p>
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
                    {[...new Set(monthlyList.flatMap(i => !i.checked && i.name ? [(i.name[0] || '?').toUpperCase()] : []))].sort().map(letter => (
                        <button
                            aria-label={`Filtrar por letra ${letter}`}
                            key={letter}
                            type="button"
                            onClick={() => handleLetterClick(letter)}
                            className={`snap-center flex-shrink-0 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-sm font-bold transition-all transform active:scale-90 ${activeLetter === letter ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30' : (isGlass ? 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/5' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200/50')} `}
                        >
                            {letter}
                        </button>
                    ))}
                </div>
            </div>

            <div className="animate-fade-in pb-32">
                {/* ESPACIADOR PARA EL HEADER FIXED */}
                <div className="h-[200px]"></div>

                {/* LISTA DE ITEMS CON SCROLLBAR 📜 */}
                <div className="flex relative">
                <div className="flex-1 space-y-3 pb-40">
                    {loading ? (
                        <div className="space-y-3 animate-pulse">
                            <div className={`h-24 rounded-3xl ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-gray-200'}`} />
                            <div className={`h-24 rounded-3xl ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-gray-200'}`} />
                            <div className={`h-24 rounded-3xl ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-gray-200'}`} />
                        </div>
                    ) : (
                        monthlyList.map((item) => {
                            const history = getPriceHistory(item.name, item.price);
                            const subtotal = item.price * item.quantity;

                            return (
                                <SuperListItem 
                                    key={item.id}
                                    item={item}
                                    history={history}
                                    subtotal={subtotal}
                                    isGlass={isGlass}
                                    itemsRefs={itemsRefs}
                                    handleToggle={handleToggle}
                                    setItemToDelete={setItemToDelete}
                                    handleUpdateQuantity={handleUpdateQuantity}
                                    lastAddedId={lastAddedId}
                                    focusedItemId={focusedItemId}
                                    handleUpdatePrice={handleUpdatePrice}
                                    handlePriceFocus={handlePriceFocus}
                                    handlePriceBlur={handlePriceBlur}
                                />
                            );
                        })
                    )}

                    {!loading && monthlyList.length === 0 && prediction.auto.length === 0 && (
                        <div className={`text-center py-10 ${isGlass ? 'text-white' : 'text-gray-800'} animate-fade-in`}>
                            <ShoppingCart size={48} className={`mx-auto mb-4 ${isGlass ? 'opacity-50' : 'opacity-70'}`} />
                            <p className={`text-lg font-bold ${isGlass ? 'opacity-90' : 'opacity-100'}`}>Carrito vacío</p>
                            <p className={`text-sm mt-1 mb-6 ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>
                                Aún no hay compras para {(currentDate || new Date()).toLocaleString('es-AR', { month: 'long' })}
                            </p>
                            <p className={`text-xs ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Agregá cosas usando la barra de abajo</p>
                        </div>
                    )}

                    {/* TARJETA DE SUGERENCIAS INTELIGENTES */}
                    {showSuggestions && prediction.suggestions.length > 0 && (
                        <SuperListSuggestions 
                            prediction={prediction}
                            selectedSuggestions={selectedSuggestions}
                            setSelectedSuggestions={setSelectedSuggestions}
                            setShowSuggestions={setShowSuggestions}
                            handleConfirmSuggestions={handleConfirmSuggestions}
                            isAddingSuggestions={isAddingSuggestions}
                            isGlass={isGlass}
                        />
                    )}
                </div>


            </div>
            </div>

            {/* INPUT ADD — FIXED BOTTOM */}
            <SupermarketAddInput onAdd={handleAdd} />
        </>
    );
}