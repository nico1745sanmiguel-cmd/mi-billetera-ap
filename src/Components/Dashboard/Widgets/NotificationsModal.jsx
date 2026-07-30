import React, { useState, useEffect } from 'react';
import { Bell, X, Wallet, CheckCheck, Loader2, FlaskConical } from 'lucide-react';
import { formatMoney } from '../../../utils';
import { messaging, db } from '../../../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export default function NotificationsModal({ notifications, user, privacyMode, setIsNotificationsOpen, handleMarkAsRead, showToast, householdId }) {
    const [isPushLoading, setIsPushLoading] = useState(false);
    const [isTestLoading, setIsTestLoading] = useState(false);

    // ── Manejo de mensajes en PRIMER PLANO ───────────────────────────────────
    // Cuando la app está abierta, FCM no muestra notificaciones del sistema
    // automáticamente. Este handler las muestra igual usando la Notification API.
    useEffect(() => {
        if (!messaging) return;
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('[FCM] Mensaje en primer plano recibido:', payload);
            if (Notification.permission === 'granted') {
                const { title, body } = payload.notification || {};
                if (title) {
                    new Notification(title, {
                        body: body || '',
                        icon: '/icon-192.webp',
                        badge: '/icon-192.webp',
                    });
                }
            }
        });
        return () => unsubscribe();
    }, []);

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

    // ── Botón de PRUEBA ───────────────────────────────────────────────────────
    // Crea un documento real en Firestore → dispara la Cloud Function →
    // la Cloud Function envía el push por FCM → llega como notificación del sistema.
    // Para probar: hacé clic, luego minimizá o cerrá el navegador.
    const handleTestNotification = async () => {
        if (!householdId) {
            showToast("No se encontró el ID del hogar.", "error");
            return;
        }
        try {
            setIsTestLoading(true);
            await addDoc(collection(db, 'households', householdId, 'notifications'), {
                type: 'payment',
                itemName: '🧪 Notificación de Prueba',
                amount: 0,
                dueDate: '-',
                itemType: 'test',
                paidByUid: user.uid,
                paidByName: user.displayName || 'Vos',
                createdAt: serverTimestamp(),
                readBy: [],
            });
            showToast("¡Prueba enviada! Minimizá el navegador para verla.", "success");
        } catch (error) {
            console.error("Error al enviar notificación de prueba:", error);
            showToast("Error al enviar la prueba.", "error");
        } finally {
            setIsTestLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-start justify-center p-4 pt-10 sm:pt-16 animate-fade-in" onClick={() => setIsNotificationsOpen(false)}>
            <div className="relative w-full max-w-md max-h-[85vh] bg-[#f3f4f6] dark:bg-[#1a1b4b] p-6 rounded-3xl shadow-2xl animate-scale-in flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Bell className="text-indigo-500" /> Notificaciones
                    </h3>
                    <button aria-label="Acción" type="button" onClick={() => setIsNotificationsOpen(false)} className="p-2 bg-gray-200 dark:bg-white/10 rounded-full text-gray-500 dark:text-white/50 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="mb-3 flex flex-col gap-2">
                    <button aria-label="Acción" type="button" 
                        onClick={handleEnablePush} 
                        disabled={isPushLoading}
                        className="w-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 py-3 px-4 rounded-xl font-bold text-sm hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPushLoading ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />} 
                        {isPushLoading ? 'Activando...' : 'Activar Notificaciones en el celular'}
                    </button>

                    <button aria-label="Acción" type="button"
                        onClick={handleTestNotification}
                        disabled={isTestLoading}
                        className="w-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 py-3 px-4 rounded-xl font-bold text-sm hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isTestLoading ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />}
                        {isTestLoading ? 'Enviando...' : 'Enviar notificación de prueba'}
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
