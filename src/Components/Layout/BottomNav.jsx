import React, { memo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, CalendarDays, Plus, TrendingUp, Puzzle } from 'lucide-react';
import { useUIState } from '../../context/UIContext';

function BottomNav() {
    const { isGlass } = useUIState();
    const navigate = useNavigate();
    const location = useLocation();
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const handler = () => forceUpdate(n => n + 1);
        window.addEventListener('storage', handler);
        window.addEventListener('modulesChanged', handler);
        return () => {
            window.removeEventListener('storage', handler);
            window.removeEventListener('modulesChanged', handler);
        };
    }, []);

    const currentPath = location.pathname;

    // En la vista de escáner de tickets se oculta para no tapar el disparador de cámara
    if (currentPath === '/scanner') {
        return null;
    }

    const navItems = [
        {
            id: 'dashboard',
            path: '/dashboard',
            label: 'Inicio',
            icon: Home,
            isActive: currentPath === '/dashboard' || currentPath === '/',
        },
        {
            id: 'services',
            path: '/services_manager',
            label: 'Servicios',
            icon: CalendarDays,
            isActive: currentPath === '/services_manager',
        },
        {
            id: 'purchase',
            path: '/purchase',
            label: 'Cargar',
            icon: Plus,
            isCenter: true,
            isActive: currentPath === '/purchase',
        },
        {
            id: 'savings',
            path: '/savings',
            label: 'Ahorro',
            icon: TrendingUp,
            isActive: currentPath.startsWith('/savings'),
        },
        {
            id: 'modules',
            path: '/settings_modules',
            label: 'Módulos',
            icon: Puzzle,
            isActive: currentPath.startsWith('/settings_modules'),
        },
    ];

    return (
        <nav
            aria-label="Navegación inferior móvil"
            className={`md:hidden fixed bottom-0 left-0 right-0 z-40 transition-colors duration-300 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] pt-1.5 px-3 border-t shadow-[0_-4px_20px_rgba(0,0,0,0.06)] ${
                isGlass
                    ? 'bg-[#0f0c29]/95 backdrop-blur-xl border-white/10 text-white'
                    : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-200'
            }`}
        >
            <div className="max-w-md mx-auto flex items-center justify-around gap-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = item.isActive;

                    if (item.isCenter) {
                        return (
                            <button
                                key={item.id}
                                type="button"
                                aria-label={item.label}
                                aria-current={active ? 'page' : undefined}
                                onClick={() => navigate(item.path)}
                                className={`min-h-[44px] min-w-[44px] -mt-3 flex flex-col items-center justify-center rounded-2xl px-3 py-1 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-md ${
                                    active
                                        ? 'bg-blue-600 text-white ring-2 ring-blue-400/50'
                                        : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
                                }`}
                            >
                                <Icon size={22} strokeWidth={2.6} />
                                <span className="text-[10px] font-bold tracking-tight leading-none mt-0.5">
                                    {item.label}
                                </span>
                            </button>
                        );
                    }

                    return (
                        <button
                            key={item.id}
                            type="button"
                            aria-label={item.label}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => navigate(item.path)}
                            className={`min-h-[44px] min-w-[44px] flex-1 flex flex-col items-center justify-center rounded-xl py-1 px-1 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                active
                                    ? (isGlass
                                        ? 'text-white font-bold bg-white/15'
                                        : 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/60')
                                    : (isGlass
                                        ? 'text-white/60 hover:text-white hover:bg-white/5'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-slate-800/60')
                            }`}
                        >
                            <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                            <span className="text-[10px] font-medium tracking-tight leading-none mt-1">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

export default memo(BottomNav);
