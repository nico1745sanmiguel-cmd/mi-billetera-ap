import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

const THEME_OPTIONS = [
    { key: 'light',  label: 'Día',     Icon: Sun     },
    { key: 'dark',   label: 'Noche',   Icon: Moon    },
    { key: 'system', label: 'Sistema', Icon: Monitor },
];

const ThemeSelector = ({ theme, setTheme, isGlass }) => {
    return (
        <div className="mt-6 flex items-center justify-center">
            <div className={`relative flex items-center p-1 rounded-full gap-1 ${
                isGlass
                    ? 'bg-white/10 border border-white/10'
                    : 'bg-gray-100 border border-gray-200'
            }`}>
                {THEME_OPTIONS.map(({ key, label, Icon }) => {
                    const isActive = theme === key;
                    return (
                        <button aria-label="Acción" type="button"
                            key={key}
                            onClick={() => setTheme(key)}
                            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
                                isActive
                                    ? isGlass
                                        ? 'bg-white/20 text-white shadow-lg shadow-black/20'
                                        : 'bg-white text-gray-800 shadow-md shadow-gray-200'
                                    : isGlass
                                        ? 'text-white/40 hover:text-white/70'
                                        : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <Icon
                                size={13}
                                className={`transition-colors duration-300 ${
                                    isActive && key === 'light'  ? 'text-amber-500' :
                                    isActive && key === 'dark'   ? 'text-indigo-400' :
                                    isActive && key === 'system' ? 'text-emerald-400' : ''
                                }`}
                            />
                            <span>{label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ThemeSelector;
