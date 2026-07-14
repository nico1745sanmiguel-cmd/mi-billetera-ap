import React, { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Plus, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { subscribeToNotes, addNote, deleteNote } from '../../../repositories/notesRepository';
import { useNotes } from '../../../context/NotesContext';
import { POST_IT_SKINS } from '../../Notes/NotesSettings';

export default function FloatingNotes({ user }) {
    const [notes, setNotes] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const { settings } = useNotes();

    const currentSkin = POST_IT_SKINS.find(s => s.id === settings?.postItSkin) || POST_IT_SKINS[0];
    const isGlass = currentSkin.id === 'glass';

    useEffect(() => {
        if (!user?.uid) return;
        const unsubscribe = subscribeToNotes(user.uid, (data) => {
            // Filter only pinned notes or notes without the property (backward compatibility)
            const pinnedNotes = data.filter(note => note.isPinned !== false);
            // Sort by createdAt
            const sorted = pinnedNotes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            setNotes(sorted);
        });
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const handleOpenNotes = () => {
            setIsAdding(true);
            setTimeout(() => {
                if (inputRef.current) inputRef.current.focus();
            }, 100);
        };
        window.addEventListener('openNotes', handleOpenNotes);
        return () => window.removeEventListener('openNotes', handleOpenNotes);
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;
        
        await addNote({
            userId: user.uid,
            text: inputValue.trim(),
            checked: false,
            isPinned: true
        });
        setInputValue('');
        setIsAdding(false);
    };

    const handleCheck = async (id) => {
        await deleteNote(id);
        if (notes.length <= 1) {
            setIsAdding(false);
        }
    };

    const handleMore = () => {
        setIsAdding(false);
        navigate('/notes');
    };

    const isVisible = notes.length > 0 || isAdding;

    // Define colors dynamically based on skin
    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const mutedTextColor = isGlass ? 'text-white/70' : 'text-gray-600';
    const borderColor = isGlass ? 'border-white/20' : `border-[${currentSkin.border}]`;
    const bgColor = isGlass ? 'rgba(255,255,255,0.1)' : currentSkin.color;

    return (
        <AnimatePresence>
            {isVisible && (
                <m.div
                drag
                dragMomentum={false}
                initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: -2 }}
                exit={{ opacity: 0, scale: 0.8, rotate: -5 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                ref={containerRef}
                className={`fixed top-24 right-4 sm:right-10 z-40 w-64 md:w-72 shadow-xl p-4 flex flex-col cursor-grab active:cursor-grabbing ${isGlass ? 'backdrop-blur-md' : ''}`}
                style={{
                        backgroundColor: bgColor,
                        boxShadow: '3px 5px 15px rgba(0,0,0,0.2)',
                        borderBottomRightRadius: '20px 10px',
                        border: isGlass ? '1px solid rgba(255,255,255,0.2)' : 'none',
                        fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif' // A bit handwritten feel
                    }}
                >
                    {/* Pin/tape visual detail */}
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-10 h-3 bg-red-400/80 -rotate-2 opacity-80" />

                    <div className={`flex justify-between items-center mb-3 border-b pb-1 ${borderColor}`}>
                        <h3 className={`font-bold text-lg ${textColor}`}>
                            Para hacer...
                        </h3>
                        <button aria-label="Ver todas" onClick={handleMore} className={`text-xs flex items-center gap-1 hover:opacity-80 transition-opacity ${mutedTextColor}`}>
                            Más <ExternalLink size={12} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-60 mb-2 no-scrollbar space-y-2">
                        <AnimatePresence>
                            {notes.map(note => (
                                <m.div 
                                    key={note.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex items-start gap-2 group"
                                >
                                    <button aria-label="Acción" 
                                        onClick={() => handleCheck(note.id)}
                                        className={`mt-1 w-5 h-5 border-2 rounded flex items-center justify-center shrink-0 transition-colors ${isGlass ? 'border-white/50 hover:bg-white/20' : 'border-gray-800/40 hover:bg-black/10'}`}
                                    >
                                        <Check size={14} className={`${textColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
                                    </button>
                                    <span className={`${textColor} leading-tight pt-0.5`}>
                                        {note.text}
                                    </span>
                                </m.div>
                            ))}
                        </AnimatePresence>
                        {notes.length === 0 && (
                            <p className={`${mutedTextColor} text-sm italic`}>Sin tareas pendientes</p>
                        )}
                    </div>

                    <form onSubmit={handleAdd} className={`mt-auto border-t pt-2 flex items-center gap-1 ${borderColor}`}>
                        <input autoComplete="off" id="input-field" 
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Escribí acá..."
                            className={`flex-1 bg-transparent border-none outline-none text-sm placeholder:opacity-50 ${textColor}`}
                        />
                        <button aria-label="Acción" type="submit" disabled={!inputValue.trim()} className={`${textColor} hover:opacity-100 opacity-70 disabled:opacity-30 transition-opacity`}>
                            <Plus size={20} />
                        </button>
                    </form>
                </m.div>
            )}
        </AnimatePresence>
    );
}
