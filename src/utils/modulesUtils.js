import { getCache } from './cache';
import { CACHE_KEYS } from '../config/constants';

let memCache = null;

if (typeof window !== 'undefined') {
    window.addEventListener('modulesChanged', () => {
        memCache = null;
    });
}

export const loadModules = () => {
    if (memCache) return memCache;
    memCache = getCache(CACHE_KEYS.ENABLED_MODULES, {});
    return memCache;
};

export const isModuleEnabled = (moduleId) => {
    return loadModules()[moduleId] === true;
};
