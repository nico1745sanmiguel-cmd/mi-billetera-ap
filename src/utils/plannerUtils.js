import { CACHE_KEYS } from '../config/constants';
import { getCache } from './cache';

const DEFAULT_PLANNER_SETTINGS = {
    compactView: false,
    hideCompleted: false,
    initialState: 'default', // 'default', 'expanded', 'collapsed'
    sortBy: 'date', // 'date', 'price_desc', 'alpha'
    budgetAlert: 0
};

export const getPlannerSettings = () => {
    return getCache(CACHE_KEYS.PLANNER_SETTINGS) || DEFAULT_PLANNER_SETTINGS;
};

export const subscribeToPlannerSettings = (callback) => {
    window.addEventListener('plannerSettingsChanged', callback);
    return () => window.removeEventListener('plannerSettingsChanged', callback);
};
