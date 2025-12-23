/**
 * Generates a consistent HSL color based on a string (e.g., user name).
 */
export const stringToColor = (string) => {
    if (!string) return '#808080';
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${hash % 360}, 60%, 50%)`; // Consistent color with good saturation
};

/**
 * Extracts initials from a display name (e.g., "Juan Perez" -> "JP")
 */
export const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
};

/**
 * Returns a complete avatar object with color and initials.
 */
export const getAvatarData = (user) => {
    const name = user?.displayName || user?.email || 'Usuario';
    return {
        initials: getInitials(name),
        color: stringToColor(name),
        photoURL: user?.photoURL
    };
};
