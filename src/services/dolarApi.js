export const getDolarBlue = async () => {
    try {
        const response = await fetch('https://dolarapi.com/v1/dolares/blue');
        if (!response.ok) {
            throw new Error(`Error fetching Dolar Blue: ${response.status}`);
        }
        const data = await response.json();
        return data; // { compra, venta, casa, nombre, moneda, fechaActualizacion }
    } catch (e) {
        console.warn('DolarAPI cache error:', e);
        return null;
    }
};
