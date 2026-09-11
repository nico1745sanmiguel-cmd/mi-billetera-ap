import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import Button from '../UI/Button';

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
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-5xl mx-auto items-center">
                <div className={`flex-1 rounded-[24px] flex items-center px-4 border focus-within:border-purple-500 transition-all shadow-sm ${isGlass ? 'bg-white/10 border-white/10 focus-within:bg-white/20' : 'bg-gray-100 border-transparent focus-within:bg-white'}`}>
                    <input
                        autoComplete="off"
                        id="supermarket-add-input"
                        aria-label="Nombre del producto a agregar"
                        type="text"
                        className={`w-full min-h-[44px] bg-transparent outline-none text-sm font-bold py-2.5 ${isGlass ? 'text-white placeholder-white/30' : 'text-gray-800'}`}
                        placeholder="¿Qué falta comprar?"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                    />
                </div>
                <Button
                    type="submit"
                    variant="primary"
                    disabled={!newItem.trim()}
                    aria-label="Agregar producto a la lista"
                    className="!w-12 !h-12 !min-h-[48px] !min-w-[48px] !rounded-[24px] !p-0 !bg-purple-600 hover:!bg-purple-700 !shadow-purple-500/20 shrink-0"
                >
                    <Plus size={24} />
                </Button>
            </form>
        </div>
    );
}
