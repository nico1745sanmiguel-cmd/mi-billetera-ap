/**
 * tests/reparto/repartoContracts.mjs
 * Oráculo Canónico y Especificación de Contratos para Grupo Familiar y Reparto de Gastos
 * 
 * Actúa como la fuente autoritativa de verdad matemática conforme a PROJECT.md,
 * ORIGINAL_REQUEST.md y los reportes de auditoría de Explorers (fam_1, fam_2, fam_3).
 * 
 * Funciones exportadas:
 * 1. sanitizarMonto(valor)
 * 2. getLatestSalary(salaryHistory)
 * 3. calcularProporciones(members, splitMode) [Hare-Niemeyer / Largest Remainder]
 * 4. calcularAportesExactos(total, proporciones) [Sin drift monetario]
 * 5. obtenerTotalGastosCompartidos(servicios, tarjetas, supermercado, frescos, efectivo)
 * 6. calcularLiquidacionNeta(miembros, gastosCompartidos, aportesManuales, splitMode)
 */

// ─── 1. SANITIZACIÓN MONETARIA ────────────────────────────────────────────────
export const sanitizarMonto = (valor) => {
    if (valor === null || valor === undefined) return 0;
    if (typeof valor === 'number') {
        if (isNaN(valor) || !isFinite(valor) || valor < 0) return 0;
        return valor;
    }
    if (typeof valor !== 'string') return 0;

    let clean = valor.trim();
    if (!clean) return 0;

    // Detectar si tiene signo negativo
    if (clean.includes('-')) return 0;

    // Remover símbolo de moneda, espacios y caracteres no numéricos excepto puntos y comas
    clean = clean.replace(/[^0-9.,]/g, '');
    if (!clean) return 0;

    // Manejo de formato argentino (puntos para miles, comas para decimales)
    if (clean.includes('.') && clean.includes(',')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
    } else if ((clean.match(/\./g) || []).length > 1) {
        clean = clean.replace(/\./g, '');
    }

    const num = parseFloat(clean);
    if (isNaN(num) || !isFinite(num) || num < 0) return 0;
    return num;
};

// ─── 2. OBTENCIÓN SEGURA DE SUELDO RECIENTE ───────────────────────────────────
export const getLatestSalary = (salaryHistory) => {
    if (!salaryHistory || !Array.isArray(salaryHistory) || salaryHistory.length === 0) {
        return 0;
    }

    // Filtrar entradas válidas y ordenar de forma segura sin toSorted (retrocompatible)
    const validEntries = salaryHistory.filter(entry => entry && typeof entry === 'object');
    if (validEntries.length === 0) return 0;

    const sorted = [...validEntries].sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeB - timeA;
    });

    const latest = sorted[0];
    return sanitizarMonto(latest?.amount);
};

// ─── 3. CÁLCULO DE PROPORCIONES (LARGEST REMAINDER / HARE-NIEMEYER) ───────────
export const calcularProporciones = (members, splitMode = 'proportional') => {
    if (!members || !Array.isArray(members) || members.length === 0) {
        return [];
    }

    const withSalary = members.map(m => {
        const salary = getLatestSalary(m.salaryHistory);
        return {
            uid: m.uid,
            displayName: m.displayName || 'Integrante',
            photoURL: m.photoURL || null,
            salary
        };
    });

    const N = withSalary.length;

    // Caso 1 miembro: 100%
    if (N === 1) {
        return [{
            ...withSalary[0],
            proportion: 1.0,
            percentage: 100.0,
            hasIncompleteSalaries: false
        }];
    }

    // Comprobar si todos tienen salario > 0 en modo proporcional
    const allHaveSalary = withSalary.every(m => m.salary > 0);
    const totalSalary = withSalary.reduce((sum, m) => sum + m.salary, 0);

    const isProportional = (splitMode === 'proportional' || splitMode === 'proporcional') && allHaveSalary && totalSalary > 0;
    const hasIncompleteSalaries = (splitMode === 'proportional' || splitMode === 'proporcional') && (!allHaveSalary || totalSalary === 0);

    if (!isProportional) {
        // Modo Equitativo o Fallback por datos incompletos
        const equalProp = 1 / N;

        // Distribución Largest Remainder para porcentajes a 1 decimal (escala 1000 décimas)
        const targetTenths = 1000;
        const exactTenths = targetTenths / N;
        const baseTenths = Math.floor(exactTenths);
        const remainderPool = targetTenths - (baseTenths * N);

        return withSalary.map((m, index) => {
            let memberTenths = baseTenths;
            if (index < remainderPool) {
                memberTenths += 1;
            }
            return {
                ...m,
                proportion: equalProp,
                percentage: memberTenths / 10,
                hasIncompleteSalaries
            };
        });
    }

    // Modo Proporcional por Ingresos con Largest Remainder
    const targetTenths = 1000; // 100.0% = 1000 décimas
    const allocations = withSalary.map((m, idx) => {
        const rawProp = m.salary / totalSalary;
        const exactT = rawProp * targetTenths;
        const floorT = Math.floor(exactT);
        const rem = exactT - floorT;
        return {
            idx,
            member: m,
            rawProp,
            floorT,
            rem
        };
    });

    const totalFloor = allocations.reduce((sum, a) => sum + a.floorT, 0);
    const diff = targetTenths - totalFloor;

    // Ordenar por residuo descendente (con desempate por índice)
    const sortedByRem = [...allocations].sort((a, b) => b.rem - a.rem || a.idx - b.idx);
    for (let i = 0; i < diff; i++) {
        sortedByRem[i].floorT += 1;
    }

    // Restaurar orden original y armar resultado
    return allocations.map(a => ({
        ...a.member,
        proportion: a.rawProp,
        percentage: a.floorT / 10,
        hasIncompleteSalaries: false
    }));
};

// ─── 4. CÁLCULO DE APORTES EXACTOS (SIN DRIFT NI CENTAVOS PERDIDOS) ────────────
export const calcularAportesExactos = (total, proporciones) => {
    const cleanTotal = sanitizarMonto(total);

    if (!proporciones || !Array.isArray(proporciones) || proporciones.length === 0 || cleanTotal === 0) {
        return (proporciones || []).map(p => ({
            uid: p.uid,
            displayName: p.displayName,
            proportion: p.proportion || 0,
            percentage: p.percentage || 0,
            aporte: 0
        }));
    }

    // Largest Remainder para asignación monetaria entera (ARS)
    const target = Math.round(cleanTotal);
    const allocations = proporciones.map((p, idx) => {
        const prop = typeof p.proportion === 'number' ? p.proportion : 0;
        const exact = target * prop;
        const base = Math.floor(exact);
        const rem = exact - base;
        return {
            idx,
            item: p,
            base,
            rem
        };
    });

    const sumBase = allocations.reduce((sum, a) => sum + a.base, 0);
    const diff = target - sumBase;

    // Distribuir el sobrante/diferencia a los miembros con mayor resto decimal
    const sorted = [...allocations].sort((a, b) => b.rem - a.rem || a.idx - b.idx);
    for (let i = 0; i < diff; i++) {
        sorted[i].base += 1;
    }

    return allocations.map(a => ({
        uid: a.item.uid,
        displayName: a.item.displayName,
        proportion: a.item.proportion,
        percentage: a.item.percentage,
        aporte: a.base
    }));
};

// ─── 5. SELECTOR UNIFICADO DE GASTOS COMPARTIDOS ──────────────────────────────
export const obtenerTotalGastosCompartidos = (
    servicios = [],
    tarjetas = [],
    supermercado = [],
    frescos = [],
    efectivo = []
) => {
    const sumArray = (arr, extractor) => {
        if (!Array.isArray(arr)) return 0;
        return arr.reduce((acc, item) => {
            if (!item) return acc;
            const val = extractor ? extractor(item) : (item.amount || item.monthlyInstallment || item.debt || item.currentDebt || item.total || 0);
            return acc + sanitizarMonto(val);
        }, 0);
    };

    const serviciosTotal = sumArray(servicios, s => s.amount || s.monthlyInstallment || 0);
    const tarjetasTotal = sumArray(tarjetas, t => t.monthlyInstallment || t.amount || t.currentDebt || t.debt || 0);
    const supermercadoTotal = sumArray(supermercado, m => {
        if (m.amount) return m.amount;
        if (m.price && m.quantity) return m.price * m.quantity;
        return m.price || 0;
    });
    const frescosTotal = sumArray(frescos, f => f.amount || f.price || 0);
    const efectivoTotal = sumArray(efectivo, e => e.amount || 0);

    const total = serviciosTotal + tarjetasTotal + supermercadoTotal + frescosTotal + efectivoTotal;

    return {
        total,
        breakdown: {
            servicios: serviciosTotal,
            tarjetas: tarjetasTotal,
            supermercado: supermercadoTotal,
            frescos: frescosTotal,
            efectivo: efectivoTotal
        }
    };
};

// ─── 6. LIQUIDACIÓN NETA Y COMPENSACIONES CRUZADAS ─────────────────────────────
export const calcularLiquidacionNeta = (
    miembros,
    gastosCompartidos = [],
    aportesManuales = [],
    splitMode = 'proportional'
) => {
    if (!miembros || !Array.isArray(miembros) || miembros.length === 0) {
        return {
            totalGastos: 0,
            proporciones: [],
            balances: [],
            transferencias: []
        };
    }

    const effectiveMode = typeof splitMode === 'string' ? splitMode : (splitMode?.splitMode || 'proportional');
    const proporciones = calcularProporciones(miembros, effectiveMode);

    // Calcular total de gastos compartidos
    const totalGastos = (gastosCompartidos || []).reduce((acc, g) => acc + sanitizarMonto(g?.amount), 0);
    const cuotasExactas = calcularAportesExactos(totalGastos, proporciones);

    // Mapear balances por integrante
    const balances = miembros.map(m => {
        const cuotaInfo = cuotasExactas.find(c => c.uid === m.uid);
        const totalDebe = cuotaInfo ? cuotaInfo.aporte : 0;

        // Gastos pagados directamente por este miembro
        const pagadoEnGastos = (gastosCompartidos || [])
            .filter(g => g && g.paidByUid === m.uid)
            .reduce((acc, g) => acc + sanitizarMonto(g.amount), 0);

        // Aportes manuales transferidos / ingresados a la caja común
        const pagadoManual = (aportesManuales || [])
            .filter(a => a && a.uid === m.uid)
            .reduce((acc, a) => acc + sanitizarMonto(a.amount), 0);

        const totalPagado = pagadoEnGastos + pagadoManual;
        const saldoNeto = totalPagado - totalDebe;

        let rol = 'al_dia';
        if (saldoNeto > 0) rol = 'acreedor';
        else if (saldoNeto < 0) rol = 'deudor';

        return {
            uid: m.uid,
            displayName: m.displayName || 'Integrante',
            totalPagado,
            totalDebe,
            saldoNeto,
            rol
        };
    });

    // Algoritmo Greedy de Simplificación de Transferencias
    const deudores = balances
        .filter(b => b.saldoNeto < 0)
        .map(b => ({ uid: b.uid, displayName: b.displayName, debt: Math.abs(b.saldoNeto) }))
        .sort((a, b) => b.debt - a.debt);

    const acreedores = balances
        .filter(b => b.saldoNeto > 0)
        .map(b => ({ uid: b.uid, displayName: b.displayName, credit: b.saldoNeto }))
        .sort((a, b) => b.credit - a.credit);

    const transferencias = [];
    let dIdx = 0;
    let aIdx = 0;

    while (dIdx < deudores.length && aIdx < acreedores.length) {
        const deudor = deudores[dIdx];
        const acreedor = acreedores[aIdx];

        const monto = Math.min(deudor.debt, acreedor.credit);

        if (monto > 0) {
            transferencias.push({
                fromUid: deudor.uid,
                fromName: deudor.displayName,
                toUid: acreedor.uid,
                toName: acreedor.displayName,
                amount: Math.round(monto)
            });
        }

        deudor.debt -= monto;
        acreedor.credit -= monto;

        if (deudor.debt <= 0.001) dIdx++;
        if (acreedor.credit <= 0.001) aIdx++;
    }

    return {
        totalGastos,
        proporciones,
        balances,
        transferencias
    };
};
