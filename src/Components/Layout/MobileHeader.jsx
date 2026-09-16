import React, { useState, useEffect, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home as HomeIcon, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useUIState, useUIDispatch } from '../../context/UIContext';

// Formateador de fecha para el header móvil
const getFormattedDate = (date) => {
    if (!date) return '';
    const options = { month: 'long', year: 'numeric' };
    const text = date.toLocaleDateString('es-AR', options).replace(' de ', ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
};

function MobileHeader() {
    const { isGlass, privacyMode, currentDate } = useUIState();
    const { setPrivacyMode, changeMonth } = useUIDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    // Estado local para visibilidad del header según scroll
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);

    useEffect(() => {
        let lastScrollY = window.scrollY;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > 50) {
                if (currentScrollY > lastScrollY) {
                    setIsHeaderVisible(false);
                } else {
                    setIsHeaderVisible(true);
                }
            } else {
                setIsHeaderVisible(true);
            }
            lastScrollY = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isHomeActive = location.pathname === '/dashboard' || location.pathname === '/';

    return (
        <div className={`md:hidden px-4 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] pb-2.5 shadow-sm sticky top-0 z-40 flex items-center justify-between gap-2 transition-all duration-300 ${
            isGlass
                ? 'bg-[#0f0c29]/90 backdrop-blur-md text-white border-b border-white/5'
                : 'bg-white dark:bg-slate-900/90 text-gray-800 dark:text-white border-b border-gray-100 dark:border-slate-800'
        } ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
            <button
                aria-label="Ir al inicio"
                type="button"
                onClick={() => navigate('/dashboard')}
                className={`min-h-[44px] min-w-[44px] p-2 rounded-xl flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isHomeActive
                        ? (isGlass ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600')
                        : (isGlass ? 'bg-transparent text-white/60' : 'bg-gray-100 text-gray-500')
                }`}
            >
                <HomeIcon size={24} />
            </button>

            {/* SELECTOR DE MES */}
            <div className={`flex-1 flex items-center justify-between rounded-2xl p-0.5 min-h-[44px] max-w-[200px] transition-colors ${
                isGlass ? 'bg-white/10 border border-white/10 text-white' : 'bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-white'
            }`}>
                <button
                    aria-label="Mes anterior"
                    type="button"
                    onClick={() => changeMonth(-1)}
                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        isGlass ? 'text-white/80 hover:bg-white/10' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                >
                    <ChevronLeft size={18} strokeWidth={2.5} />
                </button>
                <span className="font-bold text-sm capitalize select-none px-1">{getFormattedDate(currentDate)}</span>
                <button
                    aria-label="Mes siguiente"
                    type="button"
                    onClick={() => changeMonth(1)}
                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        isGlass ? 'text-white/80 hover:bg-white/10' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                >
                    <ChevronRight size={18} strokeWidth={2.5} />
                </button>
            </div>

            <div className="flex gap-1">
                {/* BOTÓN PRIVACIDAD */}
                <button
                    aria-label={privacyMode ? "Mostrar datos sensibles" : "Ocultar datos sensibles"}
                    type="button"
                    onClick={() => setPrivacyMode(!privacyMode)}
                    className={`min-h-[44px] min-w-[44px] p-2 rounded-xl flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        privacyMode
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400'
                    }`}
                >
                    {privacyMode ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
            </div>
        </div>
    );
}

export default memo(MobileHeader);
