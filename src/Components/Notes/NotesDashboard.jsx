import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
// eslint-disable-next-line no-unused-vars
import { m, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Pin, Check, X, Search, Tag, Settings } from 'lucide-react';
import { subscribeToNotes, addNote, deleteNote, updateNote } from '../../repositories/notesRepository';
import ConfirmDialog from '../UI/ConfirmDialog';
import Skeleton from '../UI/Skeleton';
import { useNotes } from '../../context/NotesContext';
import { useAuth } from '../../context/AuthContext';
import { useFinancial } from '../../context/FinancialContext';
import { useUIDispatch } from '../../context/UIContext';
import { NOTES_SKINS } from './constants';

const EditNoteModal = ({ note, categories, isGlass, onClose, onSave }) => {
    const [text, setText] = useState(note?.text || '');
    const [category, setCategory] = useState(note?.category || '');
    const [isPinned, setIsPinned] = useState(note ? note.isPinned !== false : false);

    const handleSave = (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSave({
            text: text.trim(),
            category: category || null,
            isPinned
        });
    };

    const containerCls = isGlass 
        ? "bg-[#0f0c29]/90 backdrop-blur-xl border border-white/20 text-white" 
        : "bg-white border border-gray-200 text-gray-800";
    
    const inputCls = isGlass 
        ? "w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white focus:border-blue-400 outline-none transition-colors placeholder:text-white/40" 
        : "w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 focus:border-blue-500 outline-none transition-colors";

    return (
        createPortal(
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <m.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl ${containerCls}`}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {note ? <Edit2 size={24} className="text-blue-500" /> : <Plus size={24} className="text-blue-500" />}
                        {note ? 'Editar Nota' : 'Nueva Nota'}
                    </h2>
                    <button aria-label="Cerrar" onClick={onClose} className="p-2 hover:bg-gray-500/20 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label htmlFor="note-content" className="block text-sm font-bold mb-1 opacity-80">Contenido</label>
                        <textarea
                            id="note-content"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Escribe tu nota aquí..."
                            rows={4}
                            className={inputCls}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label htmlFor="note-category" className="block text-sm font-bold mb-1 opacity-80">Categoría</label>
                        <div className="flex gap-2">
                            <select
                                id="note-category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className={`${inputCls} flex-1`}
                            >
                                <option value="">Sin Categoría</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="note-pinned"
                            checked={isPinned}
                            onChange={(e) => setIsPinned(e.target.checked)}
                            className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                        />
                        <label htmlFor="note-pinned" className="text-sm opacity-80 cursor-pointer">
                            Fijar en el widget de notas
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button aria-label="Cancelar" type="button" onClick={onClose} className="px-4 py-2 hover:bg-gray-500/10 rounded-xl transition-colors font-medium">
                            Cancelar
                        </button>
                        <button aria-label="Guardar" type="submit" disabled={!text.trim()} className="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/30">
                            Guardar
                        </button>
                    </div>
                </form>
            </m.div>
        </div>,
    document.body
)
    );
};

export default function NotesDashboard({ onBack }) {
    const { user, loadingUser } = useAuth();
    const { settings } = useNotes();
    const { showToast } = useUIDispatch();
    const navigate = useNavigate();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [currentNote, setCurrentNote] = useState(null);
    const [deletingNote, setDeletingNote] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const currentSkin = NOTES_SKINS.find(s => s.id === settings?.notesSkin) || NOTES_SKINS[0];
    const isGlass = currentSkin.id === 'glass';

    useEffect(() => {
        if (loadingUser) {
            setLoading(true);
            return;
        }
        if (!user?.uid) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const unsubscribe = subscribeToNotes(
            user.uid,
            (data) => {
                const sorted = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setNotes(sorted);
                setLoading(false);
            },
            (error) => {
                console.error("Error cargando notas:", error);
                setLoading(false);
                showToast('Error al cargar las notas', 'error');
            }
        );
        return () => unsubscribe();
    }, [user?.uid, loadingUser, showToast]);

    const handleSaveNote = async (data) => {
        try {
            if (currentNote) {
                await updateNote(currentNote.id, { ...currentNote, ...data });
                showToast('Nota actualizada', 'success');
            } else {
                await addNote({
                    userId: user.uid,
                    ...data,
                    checked: false
                });
                showToast('Nota creada', 'success');
            }
            setIsEditing(false);
            setCurrentNote(null);
        } catch {
            showToast('Error al guardar la nota', 'error');
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingNote || isDeleting) return;
        setIsDeleting(true);
        try {
            await deleteNote(deletingNote.id);
            showToast('Nota eliminada', 'success');
            setDeletingNote(null);
        } catch (error) {
            console.error("Error al eliminar nota:", error);
            showToast('Error al eliminar', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleTogglePin = async (note) => {
        try {
            await updateNote(note.id, { ...note, isPinned: note.isPinned === false ? true : false });
        } catch {
            showToast('Error al actualizar', 'error');
        }
    };

    const handleToggleCheck = async (note) => {
        try {
            await updateNote(note.id, { ...note, checked: !note.checked });
        } catch {
            showToast('Error al actualizar', 'error');
        }
    };

    const filteredNotes = notes.filter(n => {
        const matchesCategory = filterCategory === 'All' || (filterCategory === 'Sin Categoría' && !n.category) || n.category === filterCategory;
        const matchesSearch = n.text.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const uncompletedNotes = filteredNotes.filter(n => !n.checked);
    const completedNotes = filteredNotes.filter(n => n.checked);

    const containerCls = isGlass ? 'bg-transparent text-white' : (currentSkin.id === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900');
    const headerCls = isGlass ? 'bg-white/10 backdrop-blur-md border-b border-white/10' : (currentSkin.id === 'dark' ? 'bg-gray-800 border-b border-gray-700' : 'bg-white border-b border-gray-200 shadow-sm');
    const cardCls = isGlass ? 'bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/20' : (currentSkin.id === 'dark' ? 'bg-gray-800 border border-gray-700 hover:border-gray-600' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md');

    return (
        <div className={`min-h-[85vh] flex flex-col rounded-3xl overflow-hidden animate-fade-in ${containerCls}`}>
            {/* HEADER */}
            <div className={`p-4 sm:p-6 sticky top-0 z-10 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${headerCls}`}>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button aria-label="Volver" onClick={onBack} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-gray-500/10 hover:bg-gray-500/20 transition-all active:scale-95 shrink-0">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold leading-tight">Notas Rápidas</h1>
                        <p className="text-xs sm:text-sm opacity-70">Tus ideas y pendientes</p>
                    </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <button aria-label="Ajustes de Notas" onClick={() => navigate('/settings_modules/notes')} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-gray-500/10 hover:bg-gray-500/20 transition-all active:scale-95 shrink-0 transition-colors">
                        <Settings size={20} />
                    </button>
                    <div className="relative flex-1 sm:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                        <input 
                            type="text" 
                            placeholder="Buscar nota..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-9 pr-4 py-2 rounded-xl outline-none transition-colors text-sm ${isGlass ? 'bg-white/10 focus:bg-white/20 text-white placeholder:text-white/50' : (currentSkin.id === 'dark' ? 'bg-gray-700 focus:bg-gray-600 text-white' : 'bg-gray-100 focus:bg-gray-200 text-gray-800')}`}
                        />
                    </div>
                    <button aria-label="Nueva Nota" onClick={() => { setCurrentNote(null); setIsEditing(true); }} className="min-h-[44px] px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2 font-bold shadow-md shadow-blue-500/20 shrink-0">
                        <Plus size={18} /> <span className="hidden sm:inline">Nueva</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {/* CATEGORÍAS */}
                <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
                    <button aria-label="Filtrar todas" onClick={() => setFilterCategory('All')} className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap inline-flex items-center transition-colors ${filterCategory === 'All' ? 'bg-blue-500 text-white' : 'bg-gray-500/10 hover:bg-gray-500/20'}`}>
                        Todas
                    </button>
                    {settings.categories.map(cat => (
                        <button aria-label={`Filtrar por ${cat}`} key={cat} onClick={() => setFilterCategory(cat)} className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap inline-flex items-center transition-colors ${filterCategory === cat ? 'bg-blue-500 text-white' : 'bg-gray-500/10 hover:bg-gray-500/20'}`}>
                            {cat}
                        </button>
                    ))}
                    <button aria-label="Filtrar sin categoría" onClick={() => setFilterCategory('Sin Categoría')} className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap inline-flex items-center transition-colors ${filterCategory === 'Sin Categoría' ? 'bg-blue-500 text-white' : 'bg-gray-500/10 hover:bg-gray-500/20'}`}>
                        Sin Categoría
                    </button>
                </div>

                {/* GRID DE NOTAS PENDIENTES O SKELETON */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" role="status" aria-label="Cargando notas">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className={`rounded-2xl p-4 flex flex-col min-h-[160px] ${cardCls}`}>
                                <div className="flex justify-between items-center mb-3">
                                    <Skeleton type="text" className="w-20 h-4" />
                                    <Skeleton type="circle" className="w-5 h-5" />
                                </div>
                                <div className="space-y-2 flex-1">
                                    <Skeleton type="text" className="w-full h-4" />
                                    <Skeleton type="text" className="w-4/5 h-4" />
                                    <Skeleton type="text" className="w-2/3 h-4" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {uncompletedNotes.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                <AnimatePresence mode="popLayout">
                                    {uncompletedNotes.map(note => (
                                        <m.div 
                                            key={note.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className={`relative group rounded-2xl p-4 flex flex-col min-h-[160px] transition-all duration-300 ${cardCls}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                {note.category ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500">
                                                        <Tag size={10} /> {note.category}
                                                    </span>
                                                ) : <div />}
                                                <div className="flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button aria-label="Pinear" onClick={() => handleTogglePin(note)} className={`min-h-[44px] min-w-[44px] p-2 rounded-lg flex items-center justify-center transition-colors ${note.isPinned !== false ? 'text-blue-500 bg-blue-500/10' : 'hover:bg-gray-500/20'}`} title={note.isPinned !== false ? "Quitar del Post-it" : "Mostrar en Post-it"}>
                                                        <Pin size={16} className={note.isPinned !== false ? 'fill-current' : ''} />
                                                    </button>
                                                    <button aria-label="Editar" onClick={() => { setCurrentNote(note); setIsEditing(true); }} className="min-h-[44px] min-w-[44px] p-2 rounded-lg flex items-center justify-center hover:bg-gray-500/20 transition-colors text-yellow-500" title="Editar">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button aria-label="Eliminar" onClick={() => setDeletingNote(note)} className="min-h-[44px] min-w-[44px] p-2 rounded-lg flex items-center justify-center hover:bg-gray-500/20 transition-colors text-red-500" title="Eliminar">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex-1 flex items-start gap-2 mt-1">
                                                <button aria-label="Marcar como completada" onClick={() => handleToggleCheck(note)} className="min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 -ml-2 -mt-2 p-2">
                                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors hover:bg-green-500/20 ${isGlass || currentSkin.id === 'dark' ? 'border-gray-500' : 'border-gray-400'}`}>
                                                        <Check size={14} className="opacity-0 hover:opacity-100 text-green-500" />
                                                    </div>
                                                </button>
                                                <p className="text-sm whitespace-pre-wrap flex-1 leading-snug pt-1">{note.text}</p>
                                            </div>
                                        </m.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}

                        {filteredNotes.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                <Search size={48} className="mb-4" />
                                <p>No se encontraron notas.</p>
                            </div>
                        )}
                    </>
                )}

                {/* GRID DE NOTAS COMPLETADAS */}
                {completedNotes.length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-sm font-bold uppercase tracking-wider opacity-50 mb-4 px-2">Completadas</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 opacity-70">
                            <AnimatePresence mode="popLayout">
                                {completedNotes.map(note => (
                                    <m.div 
                                        key={note.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className={`relative group rounded-2xl p-4 flex flex-col min-h-[120px] transition-all duration-300 ${cardCls}`}
                                    >
                                        <div className="flex justify-end gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button aria-label="Eliminar" onClick={() => setDeletingNote(note)} className="min-h-[44px] min-w-[44px] p-2 rounded-lg flex items-center justify-center hover:bg-gray-500/20 transition-colors text-red-500" title="Eliminar">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="flex-1 flex items-start gap-2">
                                            <button aria-label="Desmarcar" onClick={() => handleToggleCheck(note)} className="min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 -ml-2 -mt-2 p-2">
                                                <div className="w-5 h-5 rounded-md bg-green-500 text-white flex items-center justify-center transition-colors">
                                                    <Check size={14} />
                                                </div>
                                            </button>
                                            <p className="text-sm whitespace-pre-wrap flex-1 line-through opacity-70 leading-snug pt-1">{note.text}</p>
                                        </div>
                                    </m.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isEditing && (
                    <EditNoteModal
                        key="edit-note-modal"
                        note={currentNote}
                        categories={settings.categories}
                        isGlass={isGlass}
                        onClose={() => setIsEditing(false)}
                        onSave={handleSaveNote}
                    />
                )}
            </AnimatePresence>

            <ConfirmDialog
                isOpen={Boolean(deletingNote)}
                title="¿Eliminar nota?"
                message={`¿Estás seguro de que deseas eliminar esta nota: "${deletingNote?.text?.slice(0, 45)}${deletingNote?.text?.length > 45 ? '...' : ''}"? Esta acción no se puede deshacer.`}
                confirmText={isDeleting ? "Eliminando..." : "Eliminar"}
                cancelText="Cancelar"
                isDanger={true}
                isLoading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => !isDeleting && setDeletingNote(null)}
            />
        </div>
    );
}
