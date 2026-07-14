import React, { useState } from 'react';
import { Settings, Save, Plus, X } from 'lucide-react';
import { useNotes } from '../../context/NotesContext';
import { useUIDispatch } from '../../context/UIContext';

export const POST_IT_SKINS = [
    { id: 'amber', label: 'Amarillo Clásico', color: '#fef3c7', border: '#fcd34d' },
    { id: 'rose', label: 'Rosa Neón', color: '#ffe4e6', border: '#fda4af' },
    { id: 'mint', label: 'Menta Fresca', color: '#d1fae5', border: '#6ee7b7' },
    { id: 'cyan', label: 'Cielo Azul', color: '#cffafe', border: '#67e8f9' },
    { id: 'glass', label: 'Transparente (Glass)', color: 'transparent', border: 'rgba(255,255,255,0.2)' },
];

export const NOTES_SKINS = [
    { id: 'dark', label: 'Oscuro Elegante', bg: 'bg-gray-900', text: 'text-white' },
    { id: 'light', label: 'Claro Minimalista', bg: 'bg-gray-50', text: 'text-gray-900' },
    { id: 'glass', label: 'Efecto Vidrio', bg: 'bg-white/10 backdrop-blur-xl', text: 'text-white' },
];

export default function NotesSettings({ isGlass, onBack }) {
    const { settings, updateSettings } = useNotes();
    const { showToast } = useUIDispatch();

    const [postItSkin, setPostItSkin] = useState(settings.postItSkin);
    const [notesSkin, setNotesSkin] = useState(settings.notesSkin);
    const [categories, setCategories] = useState(settings.categories);
    const [newCategory, setNewCategory] = useState('');

    const handleAddCategory = () => {
        if (!newCategory.trim()) return;
        if (categories.includes(newCategory.trim())) {
            showToast('Esa categoría ya existe', 'warning');
            return;
        }
        setCategories([...categories, newCategory.trim()]);
        setNewCategory('');
    };

    const handleRemoveCategory = (cat) => {
        setCategories(categories.filter(c => c !== cat));
    };

    const handleSave = () => {
        updateSettings({
            postItSkin,
            notesSkin,
            categories
        });
        showToast('Configuración de notas guardada con éxito', 'success');
        if (onBack) onBack();
    };

    const containerCls = isGlass 
        ? "bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-xl"
        : "bg-white border border-gray-200 text-gray-800 shadow-lg";

    const labelCls = `block text-sm font-bold mb-2 ${isGlass ? 'text-white/80' : 'text-gray-600'}`;

    return (
        <div className={`rounded-3xl p-6 ${containerCls} w-full max-w-2xl mx-auto space-y-8 animate-fade-in`}>
            <div className="flex justify-between items-center border-b border-gray-500/20 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-xl">
                        <Settings size={24} />
                    </div>
                    <h2 className="text-xl font-bold">Ajustes de Notas Rápidas</h2>
                </div>
                {onBack && (
                    <button aria-label="Cerrar" onClick={onBack} className="p-2 hover:bg-gray-500/20 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="space-y-6">
                {/* SKIN DEL POST-IT FRONTAL */}
                <div>
                    <div className={labelCls}>Estilo del Post-it Frontal</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {POST_IT_SKINS.map(skin => (
                            <button aria-label={`Seleccionar ${skin.label}`} key={skin.id} type="button"
                                onClick={() => setPostItSkin(skin.id)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all border-2 ${postItSkin === skin.id ? 'border-blue-500 scale-105 shadow-md' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: skin.id === 'glass' ? 'rgba(255,255,255,0.1)' : skin.color, backdropFilter: skin.id === 'glass' ? 'blur(10px)' : 'none' }}
                            >
                                <span className={`text-xs font-bold text-center mt-2 ${skin.id === 'glass' || skin.id === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                                    {skin.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* SKIN DE NOTAS INTERNAS */}
                <div>
                    <div className={labelCls}>Tema de la Vista Ampliada (Keep)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {NOTES_SKINS.map(skin => (
                            <button aria-label={`Seleccionar ${skin.label}`} key={skin.id} type="button"
                                onClick={() => setNotesSkin(skin.id)}
                                className={`p-4 rounded-xl transition-all border-2 flex items-center justify-center ${skin.bg} ${notesSkin === skin.id ? 'border-blue-500 scale-105' : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'}`}
                            >
                                <span className={`font-bold ${skin.text}`}>{skin.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* CATEGORÍAS */}
                <div>
                    <div className={labelCls}>Categorías de Notas</div>
                    <div className="flex gap-2 mb-3">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                            placeholder="Nueva categoría..."
                            className={`flex-1 rounded-xl p-3 outline-none transition-all ${isGlass ? 'bg-black/20 text-white placeholder-white/50 border border-white/10 focus:border-white/30' : 'bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}`}
                        />
                        <button aria-label="Agregar categoría" onClick={handleAddCategory} className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2 font-medium shadow-md shadow-blue-500/20">
                            <Plus size={18} />
                            <span className="hidden sm:inline">Agregar</span>
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                        {categories.map((cat) => (
                            <div key={cat} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${isGlass ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                {cat}
                                <button aria-label="Eliminar" onClick={() => handleRemoveCategory(cat)} className="text-red-400 hover:text-red-500 transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        {categories.length === 0 && (
                            <p className={`text-sm italic ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>Sin categorías configuradas.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-500/20 flex justify-end">
                <button aria-label="Guardar" onClick={handleSave} className="w-full sm:w-auto px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-500/30">
                    <Save size={20} />
                    Guardar Cambios
                </button>
            </div>
        </div>
    );
}
