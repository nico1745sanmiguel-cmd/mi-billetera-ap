import React, { useState, useMemo, useRef, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { formatMoney } from '../../utils';

export default function SuperList({ items = [], currentDate }) {
    const [newItem, setNewItem] = useState('');

    // ESTADO PARA ENFOCAR EL NUEVO ÍTEM AUTOMÁTICAMENTE
    const [lastAddedId, setLastAddedId] = useState(null);
    // ESTADO SCROLLBAR 📜
    const [isScrolling, setIsScrolling] = useState(false);
    const [activeLetter, setActiveLetter] = useState(null);
    const scrollTimeout = useRef(null);

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
            const target = monthlyList.find(i => i.name.toUpperCase().startsWith(letter) && !i.checked);
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


    return (
        <div className="animate-fade-in pb-32">

            {/* 1. TOAST GLOBAL (Portal-like, arriba de todo) */}
            <div className={`fixed top-4 left-0 right-0 flex justify-center transition-all duration-300 z-[100] pointer-events-none ${toast ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                <div className="bg-gray-900 shadow-2xl backdrop-blur-md text-white px-6 py-3 rounded-full flex items-center gap-3 text-sm font-bold pointer-events-auto border border-gray-700/50">
                    <span>{toast?.message}</span>
                    {toast?.undoAction && (
                        <button onClick={handleUndo} className="text-yellow-400 hover:text-yellow-300 uppercase tracking-wider ml-2 text-xs">
                            Deshacer
                        </button>
                    )}
                </div>
            </div>

            {/* 2. LUPA DE LETRA GIGANTE (iOS Style) */}
            <div className={`fixed right-12 top-1/2 -translate-y-1/2 w-16 h-16 bg-gray-200/90 backdrop-blur text-gray-800 rounded-full flex items-center justify-center text-3xl font-bold shadow-xl z-50 transition-all duration-200 pointer-events-none ${activeLetter ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-50 translate-x-4'}`}>
                {activeLetter}
            </div>

            {/* HEADER STICKY (Siempre visible arriba) */}
            <div className="sticky top-0 z-30 bg-[#f3f4f6]/95 backdrop-blur-sm pt-2 pb-3 mb-2 transition-all shadow-sm -mx-4 px-6 border-b border-gray-200/50">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Supermercado</h2>
                        <p className="text-xs text-purple-600 font-bold uppercase">Lista de {currentDate.toLocaleString('es-AR', { month: 'long' })}</p>
                    </div>
                    <div className="text-right">
                        {/* Lógica Visual: Si hay algo checkeado es "En Carrito", si no es "Presupuesto" */}
                        <p className="text-[10px] text-gray-400 uppercase font-bold">
                            {totals.checkedCount > 0 ? 'En Carrito' : 'Presupuesto'}
                        </p>
                        <p className={`text-2xl font-bold ${totals.checkedCount > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                            {formatMoney(totals.checkedCount > 0 ? totals.real : totals.estimated)}
                        </p>
                    </div>
                </div>

                {/* BARRA DE PROGRESO */}
                <div className="bg-white p-1 rounded-full shadow-inner border border-gray-100 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden relative">
                        <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${totals.estimated > 0 ? (totals.real / totals.estimated) * 100 : 0}%` }}></div>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 min-w-[50px] text-right">{totals.checkedCount}/{totals.count}</span>
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
                                className={`flex flex-col p-3 rounded-xl border transition-all duration-500 ${item.checked ? 'bg-purple-50 border-purple-100 opacity-60 order-last' : 'bg-white border-gray-100 shadow-sm'}`}
                            >
                                {/* FILA 1: Check, Nombre, Subtotal */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div onClick={() => handleToggle(item)} className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center cursor-pointer transition-colors ${item.checked ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white'}`}>
                                        {item.checked && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className={`font-bold text-sm text-gray-800 truncate ${item.checked ? 'line-through decoration-purple-400' : ''}`}>{item.name}</p>
                                            {subtotal > 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono font-bold">Sub: {formatMoney(subtotal)}</span>}
                                        </div>

                                        {/* Comparación de Historial */}
                                        {history && item.price > 0 && (
                                            <p className="text-[10px] flex items-center gap-1">
                                                <span className="text-gray-400">Antes: {formatMoney(history.lastPrice)}</span>
                                                {history.diff !== 0 && (
                                                    <span className={`font-bold ${history.diff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                        ({history.diff > 0 ? '+' : ''}{formatMoney(history.diff)})
                                                    </span>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                    <button onClick={() => handleDelete(item.id)} className="text-gray-300 hover:text-red-500 p-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>

                                {/* FILA 2: Controles de Cantidad y Precio */}
                                <div className="flex gap-3 pl-9">
                                    <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-10">
                                        <button onClick={() => handleUpdateQuantity(item, -1)} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 active:bg-gray-300 rounded-l-lg transition-colors text-lg font-bold">-</button>
                                        <span className="w-8 text-center text-sm font-bold text-gray-700">{item.quantity}</span>
                                        <button onClick={() => handleUpdateQuantity(item, 1)} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 active:bg-gray-300 rounded-r-lg transition-colors text-lg font-bold">+</button>
                                    </div>
                                    <div className={`flex-1 bg-gray-50 rounded-lg flex items-center px-3 border transition-colors h-10 ${lastAddedId === item.id ? 'border-purple-400 ring-2 ring-purple-100 bg-white' : 'border-gray-200'}`}>
                                        <input
                                            type="tel"
                                            className={`w-full bg-transparent outline-none text-sm font-bold text-right ${item.checked ? 'text-purple-700' : 'text-gray-800'}`}
                                            value={item.price ? formatInputCurrency(item.price) : ''}
                                            onChange={(e) => handleUpdatePrice(item, e.target.value)}
                                            placeholder="$ 0"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {monthlyList.length === 0 && (
                        <div className="text-center py-10 opacity-50">
                            <span className="text-4xl">🛒</span>
                            <p className="text-sm font-bold text-gray-400 mt-2">Lista vacía</p>
                            <p className="text-xs text-gray-400">Agrega cosas para {currentDate.toLocaleString('es-AR', { month: 'long' })}</p>
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
                    <div className="bg-white/50 backdrop-blur-sm rounded-l-xl py-2 shadow-sm border-y border-l border-gray-100 flex flex-col gap-0.5 max-h-full overflow-hidden w-6">
                        {[...new Set(monthlyList.filter(i => !i.checked).map(i => i.name[0].toUpperCase()))].sort().map(letter => (
                            <div
                                key={letter}
                                data-letter={letter}
                                className="text-[9px] font-bold text-gray-500 text-center h-[18px] flex items-center justify-center shrink-0 w-full select-none"
                            >
                                {letter}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* INPUT ADD FLOTANTE (Simplificado) */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 md:relative md:border-0 md:bg-transparent md:p-0 z-20">
                <form onSubmit={handleAdd} className="flex gap-2 max-w-5xl mx-auto">
                    <div className="flex-1 bg-gray-100 rounded-xl flex items-center px-4 border border-transparent focus-within:border-purple-500 focus-within:bg-white transition-all shadow-sm">
                        <input
                            type="text"
                            className="w-full bg-transparent outline-none text-sm font-bold text-gray-800 py-3"
                            placeholder="¿Qué falta comprar?"
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!newItem}
                        className="bg-purple-600 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200 active:scale-95 disabled:opacity-50 transition-all flex-shrink-0"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                </form>
            </div>

        </div>
    );
}