import React, { useRef, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { m, AnimatePresence } from 'framer-motion';
import { Plus, Receipt, StickyNote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isModuleEnabled } from '../../../utils/modulesUtils';

export default function DraggableFAB() {
    const navigate = useNavigate();
    const isDragging = useRef(false);
    const [menuOpen, setMenuOpen] = useState(false);

    // Initial position based on screen size: bottom right
    const initialY = typeof window !== 'undefined' ? window.innerHeight - 100 : 500;
    const initialX = typeof window !== 'undefined' ? window.innerWidth - 80 : 300;

    const handleClick = () => {
        if (isDragging.current) return;
        if (isModuleEnabled('notes')) {
            setMenuOpen(!menuOpen);
        } else {
            navigate('/purchase');
        }
    };

    const handleNewExpense = (e) => {
        e.stopPropagation();
        setMenuOpen(false);
        navigate('/purchase');
    };

    const handleNewNote = (e) => {
        e.stopPropagation();
        setMenuOpen(false);
        window.dispatchEvent(new CustomEvent('openNotes'));
    };

    return (
        <m.div
            drag
            dragMomentum={false}
            onDragStart={() => { isDragging.current = true; setMenuOpen(false); }}
            onDragEnd={() => {
                setTimeout(() => { isDragging.current = false; }, 150);
            }}
            initial={{ x: initialX, y: initialY }}
            dragConstraints={{ left: 0, right: typeof window !== 'undefined' ? window.innerWidth - 60 : 300, top: 0, bottom: typeof window !== 'undefined' ? window.innerHeight - 60 : 500 }}
            className="fixed top-0 left-0 z-50 flex flex-col items-center justify-end"
            style={{ width: 56, height: 56 }}
        >
            <AnimatePresence>
                {menuOpen && (
                    <m.div 
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.8 }}
                        className="absolute bottom-full mb-3 flex flex-col gap-2 items-end right-0 pointer-events-auto"
                    >
                        <button aria-label="Acción" type="button" onClick={handleNewNote} className="flex items-center gap-2 bg-yellow-300 text-yellow-900 px-4 py-2 rounded-full shadow-lg font-bold whitespace-nowrap active:scale-95 transition-transform border border-yellow-400">
                            Nueva Nota <StickyNote size={18} />
                        </button>
                        <button aria-label="Acción" type="button" onClick={handleNewExpense} className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-full shadow-lg font-bold whitespace-nowrap active:scale-95 transition-transform border border-white/20">
                            Nuevo Gasto <Receipt size={18} />
                        </button>
                    </m.div>
                )}
            </AnimatePresence>
            <button aria-label="Acción" type="button"
                onClick={handleClick}
                className="w-14 h-14 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex items-center justify-center cursor-grab active:cursor-grabbing active:scale-95 transition-transform bg-gradient-to-br from-purple-500 to-indigo-600 text-white border border-white/20 hover:shadow-purple-500/50 hover:shadow-[0_8px_30px_rgb(168,85,247,0.4)] pointer-events-auto"
            >
                <m.div animate={{ rotate: menuOpen ? 45 : 0 }}>
                    <Plus size={28} className="drop-shadow-md" />
                </m.div>
            </button>
        </m.div>
    );
}
