import { useState, useEffect } from 'react';

export default function useDolar() {
  const [dolarData, setDolarData] = useState({ blue: 0, mep: 0, loading: true });

  useEffect(() => {
    const fetchDolar = async () => {
      try {
        const response = await fetch('https://dolarapi.com/v1/dolares');
        const data = await response.json();
        
        const blue = data.find(d => d.casa === 'blue');
        const mep = data.find(d => d.casa === 'bolsa');

        setDolarData({
            blue: blue ? blue.venta : 1200, // Fallback por si falla
            mep: mep ? mep.venta : 1200,
            loading: false
        });
      } catch (error) {
        console.error("Error al obtener dolar:", error);
        setDolarData({ blue: 1200, mep: 1200, loading: false }); // Fallback seguro
      }
    };

    fetchDolar();
  }, []);

  return dolarData;
}