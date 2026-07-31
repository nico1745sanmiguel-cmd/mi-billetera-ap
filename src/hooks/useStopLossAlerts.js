import { useEffect, useRef } from 'react';
import { useSavings } from '../context/SavingsContext';
import { useAuth } from '../context/AuthContext';
import { isStopLossTriggered } from '../utils/stopLossService';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Registro de alertas notificadas recientemente para evitar spam (throttle de 15 minutos)
const alertedCooldowns = {};
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutos

/**
 * Hook que monitorea precios en tiempo real y, cuando un activo toca su Stop Loss,
 * guarda una notificación en la colección 'households/{id}/notifications' de Firestore.
 * Esa colección es la misma que usa el sistema de notificaciones existente (la campana del header),
 * con FCM. De esta forma NO hay sistema duplicado.
 *
 * También emite un sonido de alerta audible usando la Web Audio API del browser.
 */
export function useStopLossAlerts() {
    const { posiciones, stopLosses } = useSavings();
    const { user, userData } = useAuth();
    const lastPosicionesRef = useRef([]);

    useEffect(() => {
        if (!posiciones || posiciones.length === 0 || !stopLosses || Object.keys(stopLosses).length === 0) return;
        if (!user) return;

        // Evitar disparar alertas en la primera carga mientras se están calculando los precios
        if (lastPosicionesRef.current.length === 0) {
            lastPosicionesRef.current = posiciones;
            return;
        }

        const householdId = userData?.householdId;

        posiciones.forEach(pos => {
            const stopData = stopLosses[pos.especie.toUpperCase()];
            if (!stopData || !stopData.alarmaActiva) return;

            const currentPrice = pos.precioActualUSD;
            const stopPrice = stopData.stopPrecio;

            if (currentPrice > 0 && stopPrice > 0 && isStopLossTriggered(currentPrice, stopPrice)) {
                const key = `${pos.cartera}-${pos.especie}`.toUpperCase();
                const now = Date.now();

                // Verificar si está en cooldown para no spammear
                if (!alertedCooldowns[key] || (now - alertedCooldowns[key] > COOLDOWN_MS)) {
                    alertedCooldowns[key] = now;

                    // ── 1. Guardar en la colección de notificaciones de Firestore (sistema existente) ──
                    saveFirestoreNotification(user, householdId, pos.especie, pos.cartera, currentPrice, stopPrice);

                    // ── 2. Emitir sonido de alerta ──
                    playAlarmSound();
                }
            }
        });

        lastPosicionesRef.current = posiciones;
    }, [posiciones, stopLosses, user, userData]);
}

/**
 * Guarda una notificación de Stop Loss en la colección 'households/{id}/notifications',
 * que es la misma que usa el sistema existente de la campana del header.
 * Si el usuario no tiene householdId (es individual), la guarda bajo 'users/{uid}/notifications'.
 */
async function saveFirestoreNotification(user, householdId, especie, cartera, currentPrice, stopPrice) {
    try {
        const payload = {
            type: 'stop_loss',
            especie,
            cartera,
            currentPrice,
            stopPrice,
            // Campos compatibles con el formato del sistema existente
            itemName: especie,
            amount: currentPrice,
            paidByUid: user.uid,
            paidByName: 'Sistema T — Stop Loss',
            createdAt: serverTimestamp(),
            readBy: [] // Sin marcar como leído, así aparece como nueva
        };

        if (householdId) {
            await addDoc(collection(db, 'households', householdId, 'notifications'), payload);
        } else {
            // Fallback para usuarios sin hogar compartido
            await addDoc(collection(db, 'users', user.uid, 'notifications'), payload);
        }
    } catch (e) {
        console.error('[StopLossAlerts] Error al guardar notificación en Firestore:', e);
    }
}

/**
 * Emite dos pitidos agudos mediante la Web Audio API del browser.
 * Funciona sin permisos adicionales; solo requiere que el usuario haya interactuado con la página.
 */
function playAlarmSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        const playBeep = (time, freq, duration) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = freq;

            gainNode.gain.setValueAtTime(0.15, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.start(time);
            oscillator.stop(time + duration);
        };

        const now = audioCtx.currentTime;
        playBeep(now, 880, 0.15);
        playBeep(now + 0.25, 880, 0.15);
    } catch (e) {
        console.warn('[StopLossAlerts] AudioContext no disponible:', e);
    }
}
