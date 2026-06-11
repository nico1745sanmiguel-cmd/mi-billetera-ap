import { Folder, Wrench, Car, Gift, Home as HomeIcon, Plane, GraduationCap, Heart, Palette, LayoutList } from 'lucide-react';

export const AVAILABLE_ICONS = {
    Folder, Wrench, Car, Gift, Home: HomeIcon, Plane, GraduationCap, Heart, Palette, LayoutList
};

export const AVAILABLE_COLORS = {
    blue: {
        glassColors: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
        lightColors: 'bg-blue-50 border-blue-200 text-blue-700',
        headerGlass: 'from-blue-900/40 to-indigo-900/20 border-blue-500/20',
        headerLight: 'from-blue-50 to-indigo-50 border-blue-200',
        accentGlass: 'bg-blue-500/20 text-blue-300',
        accentLight: 'bg-blue-100 text-blue-700',
        btnGlass: 'bg-blue-500 hover:bg-blue-400 shadow-blue-500/30',
        btnLight: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
    },
    purple: {
        glassColors: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
        lightColors: 'bg-purple-50 border-purple-200 text-purple-700',
        headerGlass: 'from-purple-900/40 to-fuchsia-900/20 border-purple-500/20',
        headerLight: 'from-purple-50 to-fuchsia-50 border-purple-200',
        accentGlass: 'bg-purple-500/20 text-purple-300',
        accentLight: 'bg-purple-100 text-purple-700',
        btnGlass: 'bg-purple-500 hover:bg-purple-400 shadow-purple-500/30',
        btnLight: 'bg-purple-600 hover:bg-purple-700 shadow-purple-200',
    },
    orange: {
        glassColors: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
        lightColors: 'bg-orange-50 border-orange-200 text-orange-700',
        headerGlass: 'from-orange-900/40 to-amber-900/20 border-orange-500/20',
        headerLight: 'from-orange-50 to-amber-50 border-orange-200',
        accentGlass: 'bg-orange-500/20 text-orange-300',
        accentLight: 'bg-orange-100 text-orange-700',
        btnGlass: 'bg-orange-500 hover:bg-orange-400 shadow-orange-500/30',
        btnLight: 'bg-orange-600 hover:bg-orange-700 shadow-orange-200',
    },
    pink: {
        glassColors: 'bg-pink-500/10 border-pink-500/20 text-pink-300',
        lightColors: 'bg-pink-50 border-pink-200 text-pink-700',
        headerGlass: 'from-pink-900/40 to-rose-900/20 border-pink-500/20',
        headerLight: 'from-pink-50 to-rose-50 border-pink-200',
        accentGlass: 'bg-pink-500/20 text-pink-300',
        accentLight: 'bg-pink-100 text-pink-700',
        btnGlass: 'bg-pink-500 hover:bg-pink-400 shadow-pink-500/30',
        btnLight: 'bg-pink-600 hover:bg-pink-700 shadow-pink-200',
    },
    green: {
        glassColors: 'bg-green-500/10 border-green-500/20 text-green-300',
        lightColors: 'bg-green-50 border-green-200 text-green-700',
        headerGlass: 'from-green-900/40 to-emerald-900/20 border-green-500/20',
        headerLight: 'from-green-50 to-emerald-50 border-green-200',
        accentGlass: 'bg-green-500/20 text-green-300',
        accentLight: 'bg-green-100 text-green-700',
        btnGlass: 'bg-green-500 hover:bg-green-400 shadow-green-500/30',
        btnLight: 'bg-green-600 hover:bg-green-700 shadow-green-200',
    },
    red: {
        glassColors: 'bg-red-500/10 border-red-500/20 text-red-300',
        lightColors: 'bg-red-50 border-red-200 text-red-700',
        headerGlass: 'from-red-900/40 to-rose-900/20 border-red-500/20',
        headerLight: 'from-red-50 to-rose-50 border-red-200',
        accentGlass: 'bg-red-500/20 text-red-300',
        accentLight: 'bg-red-100 text-red-700',
        btnGlass: 'bg-red-500 hover:bg-red-400 shadow-red-500/30',
        btnLight: 'bg-red-600 hover:bg-red-700 shadow-red-200',
    }
};

export const DEFAULT_CATEGORIES = [
    {
        id: 'verduleria',
        label: 'Verdulería',
        iconName: 'Leaf',
        colorName: 'green',
        isDefault: true
    },
    {
        id: 'carniceria',
        label: 'Carnicería / Freezer',
        iconName: 'Beef',
        colorName: 'red',
        isDefault: true
    }
];
