import { getCache, setCache } from './cache';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

// Diccionario manual para mapear tickets locales con nombres en CoinGecko
// Para activos que sabemos que son crypto.
const CRYPTO_MAP = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'USDT': 'tether',
    'USDC': 'usd-coin',
    'DAI': 'dai',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'ADA': 'cardano',
    'DOT': 'polkadot'
};

/**
 * Obtiene el precio de una lista de especies
 * Devuelve un diccionario { [especie]: precioUSD }
 * 
 * Estrategia:
 * 1. Cache en memoria
 * 2. Si es crypto (matchea mapa), busca en CoinGecko
 * 3. Si no es crypto, busca en Data912 (CEDEARs o Acciones) en pesos y convierte a USD
 */
export const fetchAssetPrices = async (especies, dolarBlue) => {
    const result = {};
    const toFetchCoinGecko = [];
    const toFetchData912 = [];

    const now = Date.now();

    // 1. Revisar cache y separar por tipo
    for (const esp of especies) {
        const cacheKey = `price_${esp}`;
        const cached = getCache(cacheKey, null);
        
        if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
            result[esp] = cached.price;
            continue;
        }

        if (CRYPTO_MAP[esp]) {
            toFetchCoinGecko.push(esp);
        } else {
            toFetchData912.push(esp);
        }
    }

    // 2. Fetch CoinGecko
    if (toFetchCoinGecko.length > 0) {
        try {
            const ids = toFetchCoinGecko.map(e => CRYPTO_MAP[e]).join(',');
            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
            const data = await res.json();
            
            for (const esp of toFetchCoinGecko) {
                const id = CRYPTO_MAP[esp];
                if (data[id] && data[id].usd) {
                    const price = data[id].usd;
                    result[esp] = price;
                    setCache(`price_${esp}`, { price, timestamp: now });
                }
            }
        } catch (error) {
            console.error('Error fetching CoinGecko:', error);
        }
    }

    // 3. Fetch Data912
    if (toFetchData912.length > 0 && dolarBlue) {
        try {
            // Data912 tiene dos endpoints: live/arg_cedears y live/arg_stocks
            // Para no hacer requests separados por especie, hacemos un fetch general de ambos y armamos un mapa
            
            // CEDEARS
            let cedearsData = [];
            try {
                const resC = await fetch('https://data912.com/live/arg_cedears');
                if (resC.ok) cedearsData = await resC.json();
            } catch (e) { console.error('Error fetching Data912 CEDEARs', e); }

            // ACCIONES
            let stocksData = [];
            try {
                const resS = await fetch('https://data912.com/live/arg_stocks');
                if (resS.ok) stocksData = await resS.json();
            } catch (e) { console.error('Error fetching Data912 Stocks', e); }

            const priceMapARS = {};
            // El array viene como [{ ticker: "AAPL", price: 15000 }, ...] o similar dependiendo de la estructura exacta.
            // Asumiendo formato de data912: [{ticker, price, ...}, ...]
            const processData = (list) => {
                if (Array.isArray(list)) {
                    list.forEach(item => {
                        // Data912 returns { symbol: "AAPL", c: 15000, ... }
                        if (item.symbol && item.c) {
                            // Limpiar posibles sufijos si vinieran
                            const cleanTicker = item.symbol.replace('.BA', '').toUpperCase();
                            priceMapARS[cleanTicker] = parseFloat(item.c);
                        }
                    });
                }
            };
            
            processData(cedearsData);
            processData(stocksData);

            // Mapear los solicitados
            for (const esp of toFetchData912) {
                const cleanEsp = esp.toUpperCase();
                if (priceMapARS[cleanEsp]) {
                    const priceARS = priceMapARS[cleanEsp];
                    const priceUSD = priceARS / dolarBlue; // Convertir a USD usando el blue
                    result[esp] = priceUSD;
                    setCache(`price_${esp}`, { price: priceUSD, timestamp: now });
                }
            }

        } catch (error) {
            console.error('Error fetching Data912:', error);
        }
    }

    return result;
};
