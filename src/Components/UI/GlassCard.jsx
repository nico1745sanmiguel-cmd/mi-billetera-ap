import React from 'react';

const GlassCard = ({ children, className = '', onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`
        relative overflow-hidden
        bg-white/10 
        backdrop-blur-md 
        border border-white/20 
        shadow-lg 
        rounded-3xl 
        text-white
        transition-all duration-300
        ${onClick ? 'cursor-pointer active:scale-95 hover:bg-white/20' : ''}
        ${className}
      `}
        >
            {/* Brillo Superior (Reflejo de luz) */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

            {/* Contenido */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};

export default GlassCard;
