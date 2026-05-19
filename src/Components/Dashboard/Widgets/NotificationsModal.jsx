import React from 'react';
import { Bell, X, Wallet, CheckCheck } from 'lucide-react';
import { formatMoney } from '../../../utils';

export default function NotificationsModal({ notifications, user, privacyMode, setIsNotificationsOpen, handleMarkAsRead }) {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-end sm:items-center justify-center animate-fade-in" onClick={() => setIsNotificationsOpen(false)}>
            <div className="w-full max-w-md bg-[#f3f4f6] dark:bg-[#1a1b4b] rounded-t-[30px] sm:rounded-[30px] p-6 pb-12 shadow-2xl animate-slide-up max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Bell className="text-indigo-500" /> Notificaciones
                    </h3>
                    <button onClick={() => setIsNotificationsOpen(false)} className="p-2 bg-gray-200 dark:bg-white/10 rounded-full text-gray-500 dark:text-white/50 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {(!notifications || notifications.length === 0) ? (
                        <div className="text-center py-10 opacity-50">
                            <Bell size={40} className="mx-auto mb-3" />
                            <p className="font-bold text-gray-600 dark:text-white">No hay notificaciones</p>
                        </div>
                    ) : (
                        notifications.map(n => {
                            const isRead = n.readBy?.includes(user?.uid);
                            return (
                                <div key={n.id} className={`p-4 rounded-2xl border transition-all ${isRead ? 'bg-white/60 dark:bg-white/5 border-gray-200 dark:border-white/5 opacity-70' : 'bg-white dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-500/30 shadow-md'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-xl mt-1 ${isRead ? 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/40' : 'bg-indigo-50 dark:bg-indigo-500/30 text-indigo-600 dark:text-indigo-300'}`}>
                                            <Wallet size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm ${isRead ? 'text-gray-600 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{n.paidByName}</span> acaba de pagar <span className="font-bold">{n.itemName}</span> que vencía el día {n.dueDate}
                                            </p>
                                            <p className={`text-xl font-mono font-bold mt-1 ${isRead ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                                {privacyMode ? '****' : formatMoney(n.amount)}
                                            </p>
                                            <div className="text-[10px] text-gray-400 dark:text-white/40 mt-3 flex justify-between items-center border-t border-gray-100 dark:border-white/5 pt-2">
                                                <span>{new Date(n.createdAt?.toMillis() || Date.now()).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                {!isRead && (
                                                    <button 
                                                        onClick={() => handleMarkAsRead(n.id)}
                                                        className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-500/20 rounded-lg transition-colors active:scale-95"
                                                    >
                                                        <CheckCheck size={12} /> Marcar leído
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
