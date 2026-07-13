import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useUI } from '../../context/UIContext';

export default function SupermarketAddInput({ onAdd }) {
    const { isGlass } = useUI();
    const [newItem, setNewItem] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newItem.trim()) {
            onAdd(newItem.trim());
            setNewItem('');
        }
    };

    return (
        <div className={`fixed bottom-0 left-0 right-0 px-4 py-3 border-t z-40 ${isGlass ? 'bg-[#0f0c29]/95 border-white/10 backdrop-blur-md' : 'bg-white/95 border-gray-100 backdrop-blur-sm'}`}>
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-5xl mx-auto">
                <div className={`flex-1 rounded-[30px] flex items-center px-4 border focus-within:border-purple-500 transition-all shadow-sm ${isGlass ? 'bg-white/10 border-white/10 focus-within:bg-white/20' : 'bg-gray-100 border-transparent focus-within:bg-white'}`}>
                    <input autoComplete="off" id="input-field"
                        type="text"
                        className={`w-full bg-transparent outline-none text-sm font-bold py-3 ${isGlass ? 'text-white placeholder-white/30' : 'text-gray-800'}`}
                        placeholder="¿Qué falta comprar?"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                    />
                </div>
                <button aria-label="Acción"
                    type="submit"
                    disabled={!newItem}
                    className="bg-purple-600 text-white w-12 h-12 rounded-[24px] flex items-center justify-center shadow-lg shadow-purple-200 active:scale-95 disabled:opacity-50 transition-all flex-shrink-0"
                >
                    <Plus size={24} />
                </button>
            </form>
        </div>
    );
}
