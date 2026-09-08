const fs = require('fs');
const xlsx = require('xlsx');

function parseBalanz() {
    const wb = xlsx.readFile('ahorros/movimientos.xlsx');
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
    
    // Saltamos el header
    const rows = data.slice(1);
    const result = [];

    for (const row of rows) {
        if (!row || row.length === 0) continue;

        const descripcion = row[0] || '';
        const ticker = row[1] || '';
        const tipoInstrumento = row[2] || '';
        const concertacion = row[3] || '';
        const cantidadRaw = row[4] || 0;
        const precioRaw = row[5] || 0;
        const liquidacion = row[6] || '';
        const monedaRaw = row[7] || '';
        const importeRaw = row[8] || 0;

        if (!descripcion && !concertacion) continue;

        let tipo = '';
        if (descripcion.toUpperCase().includes('COMPRA')) tipo = 'compra';
        else if (descripcion.toUpperCase().includes('VENTA')) tipo = 'venta';
        else if (descripcion.toUpperCase().includes('RECIBO DE COBRO')) tipo = 'deposito';
        else if (descripcion.toUpperCase().includes('COMPROBANTE DE PAGO')) tipo = 'extraccion';
        else if (descripcion.toUpperCase().includes('PAGO DE DIVIDENDOS')) tipo = 'deposito';
        else continue; // Podría haber otros, los ignoramos por ahora

        let especie = ticker;
        if (!especie) {
            especie = monedaRaw.toUpperCase().includes('PESOS') ? 'ARS' : 'USD';
        }

        let monedaPrecio = monedaRaw.toUpperCase().includes('PESOS') ? 'ARS' : 'USD';
        
        let cantidad = 0;
        let precioUnitario = 1;

        if (tipo === 'compra' || tipo === 'venta') {
            cantidad = Math.abs(cantidadRaw);
            precioUnitario = Math.abs(precioRaw);
        } else if (tipo === 'deposito' || tipo === 'extraccion') {
            cantidad = Math.abs(importeRaw);
            precioUnitario = 1;
        }

        let fecha = new Date(concertacion);
        if (isNaN(fecha.getTime())) {
            // fallback
            fecha = new Date();
        }

        result.push({
            tipo,
            cartera: 'Balanz',
            especie,
            cantidad,
            precioUnitario,
            monedaPrecio,
            fecha: fecha.toISOString(),
            nota: descripcion
        });
    }

    fs.writeFileSync('ahorros/balanz_parsed_transactions_safe.json', JSON.stringify(result, null, 2), 'utf-8');
    console.log(`Saved ${result.length} transactions.`);
}

parseBalanz();
