import { CACHE_KEYS } from '../config/constants';
import { getCache } from './cache';

const DEFAULT_PLANNER_SETTINGS = {
    compactView: false,
    hideCompleted: false,
    initialState: 'default', // 'default', 'expanded', 'collapsed'
    sortBy: 'date', // 'date', 'price_desc', 'alpha'
    budgetAlert: 0
};

let cachedSettings = null;

export const getPlannerSettings = () => {
    const current = getCache(CACHE_KEYS.PLANNER_SETTINGS) || DEFAULT_PLANNER_SETTINGS;
    if (!cachedSettings || JSON.stringify(cachedSettings) !== JSON.stringify(current)) {
        cachedSettings = current;
    }
    return cachedSettings;
};

export const subscribeToPlannerSettings = (callback) => {
    window.addEventListener('plannerSettingsChanged', callback);
    return () => window.removeEventListener('plannerSettingsChanged', callback);
};
