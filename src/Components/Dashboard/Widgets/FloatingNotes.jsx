import React, { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Plus, Check } from 'lucide-react';
import { subscribeToNotes, addNote, deleteNote } from '../../../repositories/notesRepository';

export default function FloatingNotes({ user }) {
    const [notes, setNotes] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!user?.uid) return;
        const unsubscribe = subscribeToNotes(user.uid, (data) => {
            // Sort by createdAt
            const sorted = data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            setNotes(sorted);
        });
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const handleOpenNotes = () => {
            setIsAdding(true);
            // Pequeño timeout para asegurar que el input se renderice antes de hacer focus
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
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
            checked: false
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

    // Si hay notas, siempre se muestra. Si no hay, solo se muestra si isAdding es true.
    const isVisible = notes.length > 0 || isAdding;

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
                className="fixed top-24 right-4 sm:right-10 z-40 w-64 md:w-72 shadow-xl p-4 flex flex-col cursor-grab active:cursor-grabbing"
                style={{
                        backgroundColor: '#fef3c7', // amber-100 / light yellow post-it
                        boxShadow: '3px 5px 15px rgba(0,0,0,0.2)',
                        borderBottomRightRadius: '20px 10px',
                        fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif' // A bit handwritten feel
                    }}
                >
                    {/* Pin/tape visual detail */}
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-10 h-3 bg-red-400/80 -rotate-2 opacity-80" />

                    <h3 className="text-amber-900 font-bold mb-3 text-lg border-b border-amber-300/50 pb-1">
                        Para hacer...
                    </h3>

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
                                    <button 
                                        onClick={() => handleCheck(note.id)}
                                        className="mt-1 w-5 h-5 border-2 border-amber-700/50 rounded flex items-center justify-center shrink-0 hover:bg-amber-300 transition-colors"
                                    >
                                        <Check size={14} className="text-amber-900 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                    <span className="text-amber-900 leading-tight pt-0.5">
                                        {note.text}
                                    </span>
                                </m.div>
                            ))}
                        </AnimatePresence>
                        {notes.length === 0 && (
                            <p className="text-amber-700/60 text-sm italic">Sin tareas pendientes</p>
                        )}
                    </div>

                    <form onSubmit={handleAdd} className="mt-auto border-t border-amber-300/50 pt-2 flex items-center gap-1">
                        <input 
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Escribí acá..."
                            className="flex-1 bg-transparent border-none outline-none text-amber-900 placeholder-amber-700/50 text-sm"
                        />
                        <button type="submit" disabled={!inputValue.trim()} className="text-amber-700 hover:text-amber-900 disabled:opacity-50 transition-colors">
                            <Plus size={20} />
                        </button>
                    </form>
                </m.div>
            )}
        </AnimatePresence>
    );
}
