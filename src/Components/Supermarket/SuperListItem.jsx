import React from 'react';
import { Check, Trash2 } from 'lucide-react';
import { formatMoney } from '../../utils';

const formatInputCurrency = (val) => val ? '$ ' + Number(val).toLocaleString('es-AR') : '';

const SuperListItem = ({
    item, history, subtotal, isGlass, itemsRefs, 
    handleToggle, setItemToDelete, handleUpdateQuantity, 
    lastAddedId, focusedItemId, handleUpdatePrice, 
    handlePriceFocus, handlePriceBlur
}) => {
    return (
        <div
            ref={el => itemsRefs.current[item.id] = el}
            className={`flex flex-col p-3 rounded-3xl border transition-all duration-500 ${item.checked
                ? (isGlass ? 'bg-purple-900/20 border-purple-500/20 opacity-60 order-last' : 'bg-purple-50 border-purple-100 opacity-60 order-last')
                : (isGlass ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-100 shadow-sm')
                }`}
        >
            <div className="flex items-center gap-3 mb-2">
                <button
                    type="button"
                    role="checkbox"
                    aria-checked={item.checked}
                    aria-label={`Marcar ${item.name} como ${item.checked ? 'pendiente' : 'comprado'}`}
                    onClick={() => handleToggle(item)}
                    className="min-w-[44px] min-h-[44px] -m-2.5 flex items-center justify-center flex-shrink-0"
                >
                    <span className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-colors ${
                        item.checked 
                            ? 'bg-purple-500 border-purple-500' 
                            : (isGlass ? 'border-white/20 bg-transparent' : 'border-gray-300 bg-white')
                    }`}>
                        {item.checked && <Check size={16} className="text-white" strokeWidth={3} />}
                    </span>
                </button>
                <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${item.checked ? 'line-through decoration-purple-400' : ''} ${isGlass ? 'text-white' : 'text-gray-800'}`}>{item.name}</p>
                    {subtotal > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${isGlass ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-500'}`}>Sub: {formatMoney(subtotal)}</span>}
                </div>

                <div className="flex items-center gap-1">
                    {history && item.price > 0 && (
                        <p className="text-[10px] flex items-center gap-1 hidden sm:flex">
                            <span className={`${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Antes: {formatMoney(history.lastPrice)}</span>
                            {history.diff !== 0 && (
                                <span className={`font-bold ${history.diff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    ({history.diff > 0 ? '+' : ''}{formatMoney(history.diff)})
                                </span>
                            )}
                        </p>
                    )}
                    <button
                        aria-label={`Eliminar ${item.name} de la lista`}
                        type="button"
                        onClick={() => setItemToDelete(item.id)}
                        className={`min-w-[44px] min-h-[44px] -mr-1 flex items-center justify-center rounded-xl transition-colors ${
                            isGlass ? 'text-white/30 hover:text-red-400 hover:bg-white/5' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                        }`}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="flex gap-3 items-center">
                <div className={`flex items-center rounded-2xl border h-11 ${isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                    <button
                        aria-label={`Disminuir cantidad de ${item.name}`}
                        type="button"
                        onClick={() => handleUpdateQuantity(item, -1)}
                        className={`w-11 h-full flex items-center justify-center rounded-l-2xl transition-colors text-lg font-bold ${
                            isGlass ? 'text-white/50 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                        -
                    </button>
                    <span className={`min-w-[32px] text-center text-sm font-bold ${isGlass ? 'text-white' : 'text-gray-700'}`}>
                        {item.quantity}
                    </span>
                    <button
                        aria-label={`Aumentar cantidad de ${item.name}`}
                        type="button"
                        onClick={() => handleUpdateQuantity(item, 1)}
                        className={`w-11 h-full flex items-center justify-center rounded-r-2xl transition-colors text-lg font-bold ${
                            isGlass ? 'text-white/50 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                        +
                    </button>
                </div>
                <div className={`flex-1 rounded-2xl flex items-center px-3 border transition-all duration-150 h-11 ${
                    lastAddedId === item.id
                        ? 'border-purple-400 ring-2 ring-purple-100 bg-white'
                        : focusedItemId === item.id
                            ? (isGlass ? 'border-purple-400/60 ring-1 ring-purple-400/30 bg-purple-500/10' : 'border-purple-400 ring-2 ring-purple-100 bg-purple-50')
                            : (isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200')
                }`}>
                    <input
                        autoComplete="off"
                        id={`price-input-${item.id}`}
                        aria-label={`Precio de ${item.name}`}
                        type="tel"
                        className={`w-full bg-transparent outline-none text-sm font-bold text-right transition-colors duration-150 ${
                            item.checked ? 'text-purple-700' : (isGlass ? 'text-white' : 'text-gray-800')
                        }`}
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
};

export default SuperListItem;
