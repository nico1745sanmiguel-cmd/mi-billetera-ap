/**
 * constants.js
 * Todas las constantes de configuración de la app en un solo lugar.
 * Si querés cambiar un valor, lo cambiás acá, no tenés que buscar en todo el código.
 */

// ─── FEATURES ────────────────────────────────────────────────────────────────
/**
 * Activa el sistema de hogar compartido (household).
 * Cuando es false, cada usuario solo ve sus propios datos.
 */
export const ENABLE_HOUSEHOLD = true;

// ─── TIMEOUTS ────────────────────────────────────────────────────────────────
/**
 * Cuántos milisegundos esperar antes de mostrar el botón "Recargar"
 * si la app no termina de cargar (conexión lenta).
 */
export const SLOW_CONNECTION_TIMEOUT_MS = 8000;

/**
 * Cuántos milisegundos esperar antes de mostrar el loading skeleton
 * cuando no hay caché disponible.
 */
export const LOADING_DELAY_MS = 500;

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
/**
 * Cantidad máxima de items a mostrar en la Agenda del Dashboard.
 */
export const AGENDA_MAX_ITEMS = 3;

/**
 * Orden por defecto de los widgets del dashboard.
 * El usuario puede reordenarlos con drag & drop, y su orden se guarda en localStorage.
 */
export const DEFAULT_WIDGET_ORDER = ['target', 'savings_summary', 'split_summary', 'cards', 'agenda', 'super_actions'];

/**
 * Día del mes a partir del cual un vencimiento se considera "urgente"
 * y se muestra con alerta roja en el dashboard.
 */
export const CRITICAL_DUE_DAY_THRESHOLD = 5;

// ─── HOUSEHOLD ───────────────────────────────────────────────────────────────
/**
 * Longitud del código de invitación al hogar.
 */
export const INVITE_CODE_LENGTH = 6;

// ─── PROYECCIONES ────────────────────────────────────────────────────────────
/**
 * Cuántos meses hacia el futuro proyectar deuda de tarjetas.
 */
export const PROJECTION_MONTHS = 6;

// ─── UI ──────────────────────────────────────────────────────────────────────
/**
 * Nombre de usuario que se muestra como fallback si el usuario no tiene displayName.
 */
export const DEFAULT_USER_NAME = 'Usuario';

/**
 * Colores del tema oscuro (glass mode) — usados para la meta tag theme-color.
 */
export const THEME_COLOR_GLASS = '#0f0c29';
export const THEME_COLOR_LIGHT = '#ffffff';

// ─── LOGOS DE TARJETAS ───────────────────────────────────────────────────────
/**
 * Mapa de palabras clave → rutas de logos de redes de tarjetas.
 * Mantener en minúsculas. Se compara con card.name.toLowerCase().
 */
export const CARD_LOGO_MAP = [
    { keywords: ['visa'],               path: '/logos/visa.png' },
    { keywords: ['master', 'mastercard'],path: '/logos/mastercard.png' },
    { keywords: ['amex', 'american'],   path: '/logos/amex.png' },
];

// ─── COLECCIONES DE FIRESTORE ────────────────────────────────────────────────
// Centralizar los nombres de colecciones evita typos y facilita una futura migración de backend.
export const COLLECTIONS = {
    USERS:            'users',
    HOUSEHOLDS:       'households',
    CARDS:            'cards',
    TRANSACTIONS:     'transactions',
    SUPERMARKET:      'supermarket_items',
    SERVICES:         'services',
    FRESH_PURCHASES:  'fresh_purchases',
    PLANNER_CATEGORIES: 'planner_categories',
    CONTRIBUTIONS:    'contributions',
    SAVINGS_TRANSACTIONS: 'savings_transactions',
};

// ─── CACHE KEYS ───────────────────────────────────────────────────────────────
export const CACHE_KEYS = {
    CARDS:        'cards',
    TRANSACTIONS: 'transactions',
    SUPER_ITEMS:  'superItems',
    SERVICES:     'services',
    FRESH_ITEMS:  'freshItems',
    PLANNER_CATEGORIES: 'plannerCategories',
    WIDGET_ORDER: 'widget_order',
    GLASS_MODE:   'glass_mode',
    SAVINGS_TRANSACTIONS: 'savingsTransactions',
};
