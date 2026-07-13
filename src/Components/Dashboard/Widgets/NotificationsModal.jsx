import React, { useState } from 'react';
import { Bell, X, Wallet, CheckCheck, Loader2 } from 'lucide-react';
import { formatMoney } from '../../../utils';
import { messaging, db } from '../../../firebase';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function NotificationsModal({ notifications, user, privacyMode, setIsNotificationsOpen, handleMarkAsRead, showToast }) {
    const [isPushLoading, setIsPushLoading] = useState(false);

    const handleEnablePush = async () => {
        if (!messaging) {
            showToast("Tu navegador no soporta notificaciones Push.", "error");
            return;
        }

        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            showToast("Falta configurar la clave VAPID de notificaciones.", "error");
            return;
        }

        try {
            setIsPushLoading(true);
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                const token = await getToken(messaging, { vapidKey });
                if (token) {
                    // Guardar el token en el perfil del usuario
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                        fcmTokens: arrayUnion(token)
                    });
                    showToast("¡Notificaciones Push activadas con éxito!", "success");
                }
            } else {
                showToast("Permiso denegado para notificaciones.", "error");
            }
        } catch (error) {
            console.error("Error al habilitar notificaciones push:", error);
            showToast("Hubo un error al activar las notificaciones.", "error");
        } finally {
            setIsPushLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex justify-end animate-fade-in" onClick={() => setIsNotificationsOpen(false)}>
            <div className="w-full sm:w-[400px] h-full bg-[#f3f4f6] dark:bg-[#1a1b4b] p-6 shadow-2xl animate-slide-in-right flex flex-col border-l border-white/10" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Bell className="text-indigo-500" /> Notificaciones
                    </h3>
                    <button aria-label="Acción" type="button" onClick={() => setIsNotificationsOpen(false)} className="p-2 bg-gray-200 dark:bg-white/10 rounded-full text-gray-500 dark:text-white/50 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="mb-4">
                    <button aria-label="Acción" type="button" 
                        onClick={handleEnablePush} 
                        disabled={isPushLoading}
                        className="w-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 py-3 px-4 rounded-xl font-bold text-sm hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPushLoading ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />} 
                        {isPushLoading ? 'Activando...' : 'Activar Notificaciones en el celular'}
                    </button>
                </div>
                
                <div className="overflow-y-auto space-y-3 pr-2 custom-scrollbar flex-1">
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
                                                <span>{n.createdAt ? new Date(n.createdAt.toMillis()).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : 'Reciente'}</span>
                                                {!isRead && (
                                                    <button aria-label="Acción" type="button" 
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
