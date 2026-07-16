import { getCache, setCache } from './cache';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

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

const LOCAL_BROKERS = ['balanz', 'iol', 'invertironline', 'bull', 'cocos', 'ppi', 'inviu', 'ahorros', 'banco', 'galicia', 'santander', 'bbva', 'macro', 'brubank'];
const INTL_BROKERS = ['nexo', 'binance', 'etoro', 'hapi', 'interactive', 'lemon', 'belo', 'buenbit', 'kucoin', 'okx', 'bybit'];

/**
 * Obtiene el precio de una lista de especies
 * Devuelve un diccionario { [especie]: precioUSD }
 * 
 * Estrategia:
 * 1. Cache en memoria
 * 2. Si es crypto (matchea mapa), busca en CoinGecko
 * 3. Si no es crypto, busca en Data912 (CEDEARs o Acciones) en pesos y convierte a USD
 */
export const fetchAssetPrices = async (especiesWithCarteras, dolarBlue) => {
    const result = {};
    const toFetchCoinGecko = [];
    const toFetchData912 = [];
    const toFetchYahoo = [];

    const now = Date.now();

    // 1. Revisar cache y separar por tipo
    for (const esp of Object.keys(especiesWithCarteras)) {
        const cacheKey = `price_${esp}`;
        const cached = getCache(cacheKey, null);
        
        if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
            result[esp] = { price: cached.price, change: cached.change || 0 };
            continue;
        }

        if (CRYPTO_MAP[esp]) {
            toFetchCoinGecko.push(esp);
        } else {
            // Verificar si la cartera sugiere que es un activo del exterior
            const carteras = Array.from(especiesWithCarteras[esp] || []);
            let isIntl = false;
            let isLocal = false;
            
            for (const c of carteras) {
                const lowerC = c.toLowerCase();
                if (LOCAL_BROKERS.some(lb => lowerC.includes(lb))) isLocal = true;
                if (INTL_BROKERS.some(ib => lowerC.includes(ib))) isIntl = true;
            }

            // Verificar si es un bono local argentino (ej: AL30, TX26, GD30D)
            const isBond = /^[a-zA-Z]{2,4}\d{2}[a-zA-Z]?$/.test(esp);

            // Si es un bono, lo mandamos a Data912 directo.
            if (isBond) {
                toFetchData912.push(esp);
            }
            // Si sabemos que es internacional y no hay indicios de que sea local, omitimos Data912
            // y usamos Yahoo Finance para buscar el precio de la accion en origen.
            else if (!isIntl || isLocal) {
                toFetchData912.push(esp);
            } else {
                toFetchYahoo.push(esp);
            }
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
                    const change = data[id].usd_24h_change || 0;
                    result[esp] = { price, change };
                    setCache(`price_${esp}`, { price, change, timestamp: now });
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

            // BONOS
            let bondsData = [];
            try {
                const resB = await fetch('https://data912.com/live/arg_bonds');
                if (resB.ok) bondsData = await resB.json();
            } catch (e) { console.error('Error fetching Data912 Bonds', e); }

            const priceMapARS = {};
            const processData = (list) => {
                if (Array.isArray(list)) {
                    list.forEach(item => {
                        if (item.symbol && item.c) {
                            const cleanTicker = item.symbol.replace('.BA', '').toUpperCase();
                            const price = parseFloat(item.c);
                            const change = item.pct_change ? parseFloat(item.pct_change) : 0;
                            priceMapARS[cleanTicker] = { price, change };
                        }
                    });
                }
            };
            
            processData(cedearsData);
            processData(stocksData);
            processData(bondsData);

            for (const esp of toFetchData912) {
                const cleanEsp = esp.toUpperCase();
                if (priceMapARS[cleanEsp]) {
                    let { price: priceARS, change } = priceMapARS[cleanEsp];
                    
                    const isBond = /^[a-zA-Z]{2,4}\d{2}[a-zA-Z]?$/.test(cleanEsp);
                    if (isBond) {
                        priceARS = priceARS / 100;
                        const isUSDQuote = cleanEsp.endsWith('D') || cleanEsp.endsWith('C');
                        if (isUSDQuote) {
                            result[esp] = { price: priceARS, change };
                            setCache(`price_${esp}`, { price: priceARS, change, timestamp: now });
                            continue;
                        }
                    }

                    const priceUSD = priceARS / dolarBlue; 
                    result[esp] = { price: priceUSD, change };
                    setCache(`price_${esp}`, { price: priceUSD, change, timestamp: now });
                }
            }

        } catch (error) {
            console.error('Error fetching Data912:', error);
        }
    }

    // 4. Fetch Yahoo Finance a través de Cloud Function para acciones internacionales (US Stocks)
    if (toFetchYahoo.length > 0) {
        try {
            const fetchYahooFn = httpsCallable(functions, 'fetchYahooFinance');
            const res = await fetchYahooFn({ symbols: toFetchYahoo });
            const data = res.data || {};
            
            for (const esp of toFetchYahoo) {
                if (data[esp]) {
                    const priceData = data[esp];
                    const price = typeof priceData === 'object' ? parseFloat(priceData.price) : parseFloat(priceData);
                    const change = typeof priceData === 'object' ? parseFloat(priceData.change) : 0;
                    result[esp] = { price, change };
                    setCache(`price_${esp}`, { price, change, timestamp: now });
                }
            }
        } catch (error) {
            console.error('Error fetching Yahoo Finance via Cloud Function:', error);
        }
    }

    return result;
};
