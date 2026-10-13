import React, { memo } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useUIState, useUIDispatch } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import UserMenu from '../Dashboard/UserMenu';
import { isModuleEnabled } from '../../utils/modulesUtils';

const getFormattedDate = (date) => {
    if (!date) return '';
    const options = { month: 'long', year: 'numeric' };
    const text = date.toLocaleDateString('es-AR', options).replace(' de ', ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
};

function DesktopDashboardHeader({
    unreadNotifsCount,
    onLogout,
    setIsNotificationsOpen,
    setIsSkinsOpen,
}) {
    const { isGlass, privacyMode, currentDate } = useUIState();
    const { changeMonth, setPrivacyMode } = useUIDispatch();
    const { user } = useAuth();

    return (
        <div
            className={`hidden md:flex sticky top-0 z-40 -mx-4 items-center justify-between gap-4 px-6 py-3 border-b transition-colors duration-300 ${
                isGlass
                    ? 'bg-[#0f0c29]/90 backdrop-blur-md text-white border-white/10 shadow-lg shadow-black/20'
                    : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-gray-800 dark:text-white border-gray-100 dark:border-slate-800 shadow-sm'
            }`}
        >

            {/* ── Saludo ─────────────────────────────── */}
            <div className="flex flex-col min-w-0">
                <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                        isGlass ? 'text-white/50' : 'text-gray-400 dark:text-white/50'
                    }`}
                >
                    Tu Panel
                </span>
                <h1 className="text-base font-bold leading-tight truncate">
                    Hola, {user?.displayName?.split(' ')[0] || 'Usuario'} 👋
                </h1>
            </div>

            {/* ── Selector de mes ─────────────────────── */}
            <div
                className={`flex items-center rounded-2xl p-0.5 min-h-[44px] transition-colors ${
                    isGlass
                        ? 'bg-white/10 border border-white/10 text-white'
                        : 'bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-white border border-gray-100 dark:border-slate-700'
                }`}
            >
                <button
                    aria-label="Mes anterior"
                    type="button"
                    onClick={() => changeMonth(-1)}
                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        isGlass
                            ? 'text-white/80 hover:bg-white/10'
                            : 'text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                >
                    <ChevronLeft size={18} strokeWidth={2.5} />
                </button>
                <span className="font-bold text-sm capitalize select-none px-2 min-w-[130px] text-center">
                    {getFormattedDate(currentDate)}
                </span>
                <button
                    aria-label="Mes siguiente"
                    type="button"
                    onClick={() => changeMonth(1)}
                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        isGlass
                            ? 'text-white/80 hover:bg-white/10'
                            : 'text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                >
                    <ChevronRight size={18} strokeWidth={2.5} />
                </button>
            </div>

            {/* ── Acciones derecha ────────────────────── */}
            <div className="flex items-center gap-2">
                {/* Botón privacidad */}
                <button
                    aria-label={privacyMode ? 'Mostrar datos sensibles' : 'Ocultar datos sensibles'}
                    type="button"
                    onClick={() => setPrivacyMode(!privacyMode)}
                    className={`min-h-[44px] min-w-[44px] p-2 rounded-xl flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        privacyMode
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                            : isGlass
                            ? 'text-white/60 hover:text-white hover:bg-white/10'
                            : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400'
                    }`}
                >
                    {privacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>

                {/* UserMenu */}
                <UserMenu
                    unreadNotifsCount={unreadNotifsCount}
                    onLogout={onLogout}
                    setIsNotificationsOpen={setIsNotificationsOpen}
                    setIsSkinsOpen={setIsSkinsOpen}
                    isModuleEnabled={isModuleEnabled}
                />
            </div>
        </div>
    );
}

export default memo(DesktopDashboardHeader);
