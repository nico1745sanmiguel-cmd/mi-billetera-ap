import { getCache } from './cache';
import { CACHE_KEYS } from '../config/constants';

export const loadModules = () => {
    return getCache(CACHE_KEYS.ENABLED_MODULES, {});
};

export const isModuleEnabled = (moduleId) => {
    return loadModules()[moduleId] === true;
};
