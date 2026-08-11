import { useMemo } from 'react';

export const useSavingsCalculations = (savingsTransactions = [], assetPrices = {}, stopLosses = {}, dolarBlue) => {
    
    // Calcular posiciones actuales (holdings)
    const posiciones = useMemo(() => {
        const result = {};

        // Bug fix: ordenar cronológicamente para que ventas parciales
        // siempre se procesen después de las compras correspondientes.
        const sorted = (savingsTransactions || []).toSorted((a, b) => {
            const dateA = new Date(a.fecha || a.createdAt?.toDate?.() || 0);
            const dateB = new Date(b.fecha || b.createdAt?.toDate?.() || 0);
            return dateA - dateB;
        });
        
        sorted.forEach(tx => {
            const { cartera, especie, tipo, cantidad, precioUnitario, monedaPrecio } = tx;
            const cant = parseFloat(cantidad) || 0;
            const precio = parseFloat(precioUnitario) || 0;
            
            const key = `${cartera}-${especie}`;
            if (!result[key]) {
                result[key] = {
                    cartera,
                    especie,
                    cantidad: 0,
                    inversionTotalUSD: 0,
                    operaciones: []
                };
            }

            const pos = result[key];
            const rate = dolarBlue || 1000;
            
            let valorOperacionUSD = 0;
            if (precio > 0) {
                if (monedaPrecio === 'ARS') valorOperacionUSD = (cant * precio) / rate;
                else if (monedaPrecio === 'USD') valorOperacionUSD = (cant * precio);
            }

            if (tipo === 'compra' || tipo === 'deposito' || tipo === 'ingreso') {
                pos.cantidad += cant;
                pos.inversionTotalUSD += valorOperacionUSD;
            } else if (tipo === 'venta' || tipo === 'retiro' || tipo === 'egreso') {
                if (pos.cantidad > 0) {
                    const proporcion = cant / pos.cantidad;
                    pos.inversionTotalUSD -= (pos.inversionTotalUSD * proporcion);
                }
                pos.cantidad -= cant;
            } else if (tipo === 'ajuste') {
                pos.cantidad += cant;
            } else if (tipo === 'cobro_cupon' || tipo === 'amortizacion') {
                // No modifican la cantidad del activo.
                // Acumulan el dinero efectivamente cobrado para el cálculo de TIR.
                pos.cobradoTotalUSD = (pos.cobradoTotalUSD || 0) + valorOperacionUSD;
            }
            pos.operaciones.push(tx);
        });

        const rate = dolarBlue || 1000;
        return Object.values(result).flatMap(pos => {
            if (pos.cantidad <= 0) return [];
            
            let currentPriceUSD = 0;
            let variacionDiaria = 0;
            
            if (pos.especie === 'USD') {
                currentPriceUSD = 1;
            } else if (pos.especie === 'ARS') {
                currentPriceUSD = 1 / rate;
            } else {
                const assetData = assetPrices[pos.especie];
                if (assetData && typeof assetData === 'object' && !Array.isArray(assetData)) {
                    currentPriceUSD = assetData.price || 0;
                    variacionDiaria = assetData.change || 0;
                } else {
                    currentPriceUSD = assetData || 0;
                }
            }
            
            const valorActualUSD = pos.cantidad * currentPriceUSD;
            const gananciaPérdidaUSD = valorActualUSD - pos.inversionTotalUSD;
            const gananciaPorcentaje = pos.inversionTotalUSD > 0 ? (gananciaPérdidaUSD / pos.inversionTotalUSD) * 100 : 0;

            const cobradoTotalUSD = pos.cobradoTotalUSD || 0;

            const stopData = stopLosses[pos.especie.toUpperCase()];

            return [{
                ...pos,
                precioActualUSD: currentPriceUSD,
                variacionDiaria,
                valorActualUSD,
                cobradoTotalUSD,
                gananciaPérdidaUSD,
                gananciaPorcentaje,
                stopLoss: stopData ? {
                    id: stopData.id,
                    precioCompra: stopData.precioCompra,
                    beta: stopData.beta,
                    maxPrecioRegistrado: stopData.maxPrecioRegistrado,
                    stopPrecio: stopData.stopPrecio,
                    alarmaActiva: stopData.alarmaActiva
                } : null
            }];
        });
    }, [savingsTransactions, assetPrices, dolarBlue, stopLosses]);

    // Calcular cauciones activas
    const cauciones = useMemo(() => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const rate = dolarBlue || 1000;

        return (savingsTransactions || [])
            .filter(tx => tx.tipo === 'caucion')
            .map(tx => {
                const fechaInicio = new Date(tx.fechaInicio);
                const fechaVencimiento = new Date(tx.fechaVencimiento);
                fechaVencimiento.setHours(0, 0, 0, 0);

                const plazo = tx.plazo || 1;
                const montoARS = parseFloat(tx.montoARS) || 0;
                const tna = parseFloat(tx.tna) || 0;

                // Días transcurridos desde el inicio (cap al plazo)
                const msTranscurridos = Math.max(0, hoy - fechaInicio);
                const diasTranscurridos = Math.min(Math.floor(msTranscurridos / 86400000), plazo);

                const interesAcumuladoARS = montoARS * (tna / 100 / 365) * diasTranscurridos;
                const valorActualARS = montoARS + interesAcumuladoARS;
                const valorActualUSD = valorActualARS / rate;

                // Estado
                let estado = 'activa';
                const diffMs = fechaVencimiento - hoy;
                if (diffMs < 0) estado = 'vencida';
                else if (diffMs === 0) estado = 'vence_hoy';

                const diasRestantes = Math.max(0, Math.ceil(diffMs / 86400000));

                return {
                    ...tx,
                    diasTranscurridos,
                    diasRestantes,
                    interesAcumuladoARS,
                    valorActualARS,
                    valorActualUSD,
                    estado
                };
            });
    }, [savingsTransactions, dolarBlue]);

    // Calcular Liquidez por Cartera (Dinero en caja)
    const liquidezPorCartera = useMemo(() => {
        const result = {};
        
        const sorted = (savingsTransactions || []).toSorted((a, b) => {
            const dateA = new Date(a.fecha || a.createdAt?.toDate?.() || 0);
            const dateB = new Date(b.fecha || b.createdAt?.toDate?.() || 0);
            return dateA - dateB;
        });

        sorted.forEach(tx => {
            const { cartera, tipo, especie, monedaPrecio } = tx;
            if (!cartera) return;

            if (!result[cartera]) {
                result[cartera] = { ARS: 0, USD: 0 };
            }

            const cant = parseFloat(tx.cantidad) || 0;
            const precio = parseFloat(tx.precioUnitario) || 0;
            const espUpper = especie?.toUpperCase();
            
            if (tipo === 'deposito' || tipo === 'ingreso') {
                if (espUpper === 'ARS') result[cartera].ARS += cant;
                else if (espUpper === 'USD') result[cartera].USD += cant;
            } else if (tipo === 'retiro' || tipo === 'egreso') {
                if (espUpper === 'ARS') result[cartera].ARS -= cant;
                else if (espUpper === 'USD') result[cartera].USD -= cant;
            } else if (tipo === 'compra') {
                const monto = cant * precio;
                if (monedaPrecio === 'ARS') result[cartera].ARS -= monto;
                else if (monedaPrecio === 'USD') result[cartera].USD -= monto;
            } else if (tipo === 'venta') {
                const monto = cant * precio;
                if (monedaPrecio === 'ARS') result[cartera].ARS += monto;
                else if (monedaPrecio === 'USD') result[cartera].USD += monto;
            } else if (tipo === 'cobro_cupon' || tipo === 'amortizacion') {
                const monto = precio; // En cobros guardamos el monto total en precioUnitario
                if (monedaPrecio === 'ARS') result[cartera].ARS += monto;
                else if (monedaPrecio === 'USD') result[cartera].USD += monto;
            } else if (tipo === 'caucion') {
                const montoARS = parseFloat(tx.montoARS) || 0;
                result[cartera].ARS -= montoARS;
            }
        });

        return result;
    }, [savingsTransactions]);

    return {
        posiciones,
        cauciones,
        liquidezPorCartera
    };
};
