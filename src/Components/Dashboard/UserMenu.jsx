import React, { useState } from 'react';
import { Users, LogOut, Bell, Puzzle, MoreVertical, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserMenu = ({
    user,
    unreadNotifsCount,
    onLogout,
    setIsNotificationsOpen,
    setIsSkinsOpen,
    isModuleEnabled
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <div className="relative z-50">
            <button aria-label="Acción" 
                type="button" 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="relative bg-gray-50 text-gray-500 dark:bg-white/10 dark:text-white/70 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/20 transition-colors dark:backdrop-blur-md dark:border dark:border-white/5"
            >
                <MoreVertical size={20} />
                {unreadNotifsCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-[10px] w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#1a1b4b]"></span>
                )}
            </button>

            {isMenuOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1a1b4b] rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40 border border-gray-100 dark:border-white/10 overflow-hidden z-50 origin-top-right transition-all animate-fade-in">
                        <div className="p-2 flex flex-col gap-1">
                            {isModuleEnabled('household') && (
                                <button aria-label="Acción" type="button" onClick={() => { navigate('/household'); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/20 dark:hover:text-blue-300 rounded-xl transition-colors">
                                    <div className="bg-blue-100/50 dark:bg-blue-500/20 p-1.5 rounded-lg text-blue-500 dark:text-blue-300"><Users size={16} /></div>
                                    Miembros
                                </button>
                            )}
                            <button aria-label="Acción" type="button" onClick={() => { setIsNotificationsOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-300 rounded-xl transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-100/50 dark:bg-indigo-500/20 p-1.5 rounded-lg text-indigo-500 dark:text-indigo-300">
                                        <Bell size={16} className={unreadNotifsCount > 0 ? "animate-pulse" : ""} />
                                    </div>
                                    Notificaciones
                                </div>
                                {unreadNotifsCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{unreadNotifsCount}</span>
                                )}
                            </button>
                            <button aria-label="Acción" type="button" onClick={() => { navigate('/settings_modules'); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/20 dark:hover:text-violet-300 rounded-xl transition-colors">
                                <div className="bg-violet-100/50 dark:bg-violet-500/20 p-1.5 rounded-lg text-violet-500 dark:text-violet-300"><Puzzle size={16} /></div>
                                Módulos
                            </button>
                            <button aria-label="Acción" type="button" onClick={() => { setIsSkinsOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300 rounded-xl transition-colors">
                                <div className="bg-emerald-100/50 dark:bg-emerald-500/20 p-1.5 rounded-lg text-emerald-500 dark:text-emerald-300"><Palette size={16} /></div>
                                Skins
                            </button>
                            <div className="h-px bg-gray-100 dark:bg-white/10 my-1 mx-2"></div>
                            <button aria-label="Acción" type="button" onClick={() => { onLogout(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-300 rounded-xl transition-colors">
                                <div className="bg-red-100/50 dark:bg-red-500/20 p-1.5 rounded-lg text-red-500 dark:text-red-300"><LogOut size={16} /></div>
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default UserMenu;
