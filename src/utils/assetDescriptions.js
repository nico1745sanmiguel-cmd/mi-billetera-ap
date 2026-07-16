export const assetDescriptions = {
    // Bonos Argentinos
    'AL30': 'Bono de la República Argentina en dólares step-up con vencimiento en 2030. Emitido bajo ley local, es uno de los títulos más líquidos y utilizados para la operatoria de Dólar MEP.',
    'AL30D': 'Bono AL30 cotizado en dólares (Dólar MEP). Permite comprar o vender el bono directamente con dólares billete.',
    'AL30C': 'Bono AL30 cotizado en dólares cable (Dólar CCL). Utilizado para transferir divisas al exterior.',
    'GD30': 'Bono de la República Argentina en dólares step-up con vencimiento en 2030, emitido bajo ley extranjera (Global). Suele tener un diferencial de precio respecto al AL30 por la legislación.',
    'GD30D': 'Bono GD30 cotizado en dólares billete (MEP).',
    'GD30C': 'Bono GD30 cotizado en dólares cable (CCL).',
    'AE38': 'Bono de la República Argentina en dólares step-up 2038.',
    'GD35': 'Bono Global de la República Argentina en dólares step-up 2035.',
    'TX26': 'Bono del Tesoro Nacional en pesos ajustado por CER (inflación) con vencimiento en 2026.',
    'TX28': 'Bono del Tesoro Nacional en pesos ajustado por CER (inflación) con vencimiento en 2028.',
    'TV24': 'Bono del Tesoro Nacional vinculado al dólar estadounidense (Dollar Linked) con vencimiento en 2024.',
    
    // Acciones y Cedears
    'AAPL': 'Apple Inc. (CEDEAR/Acción). Empresa tecnológica multinacional estadounidense que diseña, desarrolla y vende electrónica de consumo, software y servicios.',
    'MSFT': 'Microsoft Corp. (CEDEAR/Acción). Compañía tecnológica multinacional, desarrolladora del sistema operativo Windows, la suite Office y servicios en la nube (Azure).',
    'GOOGL': 'Alphabet Inc. (CEDEAR/Acción). Empresa matriz de Google, líder mundial en motores de búsqueda, publicidad digital y servicios tecnológicos.',
    'AMZN': 'Amazon.com, Inc. (CEDEAR/Acción). Corporación estadounidense de comercio electrónico y servicios de computación en la nube en todos los niveles.',
    'TSLA': 'Tesla, Inc. (CEDEAR/Acción). Empresa estadounidense que diseña, fabrica y vende automóviles eléctricos, componentes para la propulsión de vehículos eléctricos y baterías domésticas.',
    'MELI': 'MercadoLibre Inc. (CEDEAR/Acción). Plataforma de comercio electrónico y servicios financieros líder en América Latina.',
    'SPY': 'SPDR S&P 500 ETF Trust (CEDEAR/ETF). Fondo cotizado que busca replicar el rendimiento del índice S&P 500, compuesto por las 500 empresas más grandes de Estados Unidos.',
    'QQQ': 'Invesco QQQ Trust (CEDEAR/ETF). ETF que replica el índice Nasdaq-100, conformado por las principales compañías tecnológicas y no financieras de EE. UU.',
    'KO': 'The Coca-Cola Company (CEDEAR/Acción). Corporación multinacional estadounidense de bebidas.',
    'YPFD': 'YPF S.A. Principal empresa de energía de Argentina, dedicada a la exploración, explotación, destilación, distribución y producción de petróleo y gas.',
    'GGAL': 'Grupo Financiero Galicia S.A. Uno de los principales grupos financieros del sector privado en Argentina.',
    'BMA': 'Banco Macro S.A. Banco de capitales privados nacionales de Argentina, con amplia red de sucursales en el interior del país.',
    'PAMP': 'Pampa Energía S.A. Empresa líder del sector energético en Argentina, participa en la generación, transmisión y distribución de electricidad, y en la exploración y producción de gas.',
    'CEPU': 'Central Puerto S.A. Una de las empresas de generación eléctrica más grandes de Argentina.',
    'TXAR': 'Ternium Argentina S.A. Principal empresa productora de aceros planos en Argentina.',
    'ALUA': 'Aluar Aluminio Argentino S.A. Única empresa productora de aluminio primario en Argentina.',
    
    // Criptomonedas
    'BTC': 'Bitcoin. La primera criptomoneda descentralizada, impulsada por tecnología blockchain. Suele considerarse reserva de valor o "oro digital".',
    'ETH': 'Ethereum. Plataforma descentralizada que permite la creación de contratos inteligentes y aplicaciones descentralizadas (dApps).',
    'USDT': 'Tether. Criptomoneda estable (Stablecoin) que busca mantener paridad 1 a 1 con el dólar estadounidense.',
    'USDC': 'USD Coin. Stablecoin vinculada al dólar estadounidense, conocida por su transparencia y auditorías regulares.',
    'DAI': 'Dai. Stablecoin descentralizada vinculada al dólar estadounidense, respaldada por un conjunto de otras criptomonedas como colateral.',
    'BNB': 'Binance Coin. Criptomoneda oficial del ecosistema de Binance, utilizada para pagar comisiones en la plataforma y participar en diversos servicios.',
    'SOL': 'Solana. Plataforma blockchain de alto rendimiento diseñada para albergar aplicaciones descentralizadas y escalables.',
    'ADA': 'Cardano. Plataforma blockchain de prueba de participación (Proof of Stake) enfocada en la sostenibilidad y escalabilidad.',
    
    // Monedas
    'USD': 'Dólar Estadounidense. Moneda de reserva mundial.',
    'ARS': 'Peso Argentino. Moneda de curso legal de la República Argentina.',
    'EUR': 'Euro. Moneda oficial de la eurozona.'
};

export const getAssetDescription = (ticker) => {
    if (!ticker) return 'Información no disponible.';
    
    const upperTicker = ticker.toUpperCase();
    
    // Búsqueda directa en el diccionario
    if (assetDescriptions[upperTicker]) {
        return assetDescriptions[upperTicker];
    }

    // Reglas de inferencia
    if (upperTicker.startsWith('AL') || upperTicker.startsWith('GD')) {
        return `Bono Soberano (${upperTicker}). Título de deuda emitido por el Estado.`;
    }
    
    if (upperTicker.length === 4 && upperTicker.endsWith('D')) {
        return `Especie cotizada en Dólar MEP (${upperTicker}).`;
    }
    
    if (upperTicker.length === 4 && upperTicker.endsWith('C')) {
        return `Especie cotizada en Dólar Cable o CCL (${upperTicker}).`;
    }
    
    if (upperTicker.endsWith('USDT') || upperTicker.endsWith('BUSD')) {
        return `Par de criptomoneda contra Stablecoin (${upperTicker}).`;
    }

    return `Activo financiero (${upperTicker}). No se encontró una descripción detallada en la base de datos para este ticker. Podría tratarse de un Cedear, Acción local, Bono u Obligación Negociable.`;
};
