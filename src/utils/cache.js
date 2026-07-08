/**
 * cache.js
 * Utilidad para manejar localStorage de forma robusta.
 *
 * Ventajas sobre el acceso directo a localStorage:
 * - CACHE_VERSION: cambiar la versión invalida todos los caches viejos automáticamente.
 *   Útil cuando cambiás el schema de un objeto (agregás un campo, etc.).
 * - try/catch: evita crashes en iOS Safari (modo privado) donde localStorage puede estar bloqueado.
 * - TTL opcional: permite expirar datos stale después de N milisegundos.
 */

// 🔑 Cambiar este número invalida TODOS los caches viejos de los usuarios.
// Hacé eso cuando cambies el schema de alguna colección de Firestore.
export const CACHE_VERSION = 'v1';

/**
 * Lee un valor del cache local.
 * @param {string} key - Clave sin prefijo (ej: 'cards')
 * @param {*} defaultValue - Valor por defecto si no existe o está corrupto
 * @param {number|null} ttlMs - Tiempo de vida en ms (null = sin expiración)
 * @returns {*} El valor cacheado o defaultValue
 */
export const getCache = (key, defaultValue = [], ttlMs = null) => {
    try {
        const raw = localStorage.getItem(`${CACHE_VERSION}_${key}`);
        if (!raw) return defaultValue;

        const parsed = JSON.parse(raw);

        // Si tiene TTL, validar que no haya expirado
        if (ttlMs !== null && parsed.__cachedAt) {
            const age = Date.now() - parsed.__cachedAt;
            if (age > ttlMs) {
                localStorage.removeItem(`${CACHE_VERSION}_${key}`);
                return defaultValue;
            }
            return parsed.data ?? defaultValue;
        }

        // Si tiene el campo __cachedAt (formato nuevo), extraer data
        if (parsed && typeof parsed === 'object' && '__cachedAt' in parsed) {
            return parsed.data ?? defaultValue;
        }

        // Formato legacy (array directo): devolver tal cual
        return parsed ?? defaultValue;

    } catch (e) {
        console.error('Error reading cache:', e);
        return defaultValue;
    }
};

/**
 * Guarda un valor en el cache local.
 * @param {string} key - Clave sin prefijo
 * @param {*} data - Datos a guardar
 */
export const setCache = (key, data) => {
    try {
        localStorage.setItem(`${CACHE_VERSION}_${key}`, JSON.stringify({
            __cachedAt: Date.now(),
            data,
        }));
    } catch (e) {
        // Puede fallar si el localStorage está lleno (5MB limit) o en modo privado
        console.error(`[cache] No se pudo guardar "${key}":`, e);
    }
};

/**
 * Elimina todas las entradas de cache de versiones anteriores.
 * Útil para correr una sola vez al iniciar la app.
 */
export const cleanOldCaches = () => {
    try {
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            // Si empieza con "cache_" (formato viejo) o con una versión distinta a la actual
            if (k && (k.startsWith('cache_') || (k.includes('_') && !k.startsWith(CACHE_VERSION)))) {
                keysToDelete.push(k);
            }
        }
        keysToDelete.forEach(k => localStorage.removeItem(k));
    } catch {
        // Silencioso: no crítico
    }
};
