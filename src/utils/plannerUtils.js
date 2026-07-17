import { CACHE_KEYS } from '../config/constants';
import { getCache } from './cache';

export const getPlannerSettings = () => {
    return getCache(CACHE_KEYS.PLANNER_SETTINGS) || {
        compactView: false,
        hideCompleted: false,
        initialState: 'default', // 'default', 'expanded', 'collapsed'
        sortBy: 'date', // 'date', 'price_desc', 'alpha'
        budgetAlert: 0
    };
};

export const subscribeToPlannerSettings = (callback) => {
    window.addEventListener('plannerSettingsChanged', callback);
    return () => window.removeEventListener('plannerSettingsChanged', callback);
};
