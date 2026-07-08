import React, { useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { m } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DraggableFAB() {
    const navigate = useNavigate();
    const isDragging = useRef(false);

    // Initial position based on screen size: bottom right
    const initialY = typeof window !== 'undefined' ? window.innerHeight - 100 : 500;
    const initialX = typeof window !== 'undefined' ? window.innerWidth - 80 : 300;

    return (
        <m.div
            drag
            dragMomentum={false}
            onDragStart={() => { isDragging.current = true; }}
            onDragEnd={() => {
                setTimeout(() => { isDragging.current = false; }, 150);
            }}
            onClick={() => {
                if (!isDragging.current) {
                    navigate('/purchase');
                }
            }}
            initial={{ x: initialX, y: initialY }}
            dragConstraints={{ left: 0, right: typeof window !== 'undefined' ? window.innerWidth - 60 : 300, top: 0, bottom: typeof window !== 'undefined' ? window.innerHeight - 60 : 500 }}
            className="fixed top-0 left-0 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.3)] cursor-grab active:cursor-grabbing active:scale-95 transition-transform bg-gradient-to-br from-purple-500 to-indigo-600 text-white border border-white/20 hover:shadow-purple-500/50 hover:shadow-[0_8px_30px_rgb(168,85,247,0.4)]"
        >
            <Plus size={28} className="drop-shadow-md" />
        </m.div>
    );
}
