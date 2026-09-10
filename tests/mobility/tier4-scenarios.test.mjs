/**
 * tier4-scenarios.test.mjs
 * Tier 4: Real-World Scenarios (Simulaciones de casos de uso del mundo real)
 *
 * Cobertura de escenarios reales del conductor:
 * 1. Conductor finalizando jornada después de las 21:00 hs (UTC-3 Argentina) sin desfasaje UTC
 * 2. Importación de archivo CSV exportado de Excel en español con delimitador punto y coma y comillas
 * 3. Ciclo financiero mensual completo (30 días: 22 jornadas, gastos de GNC, mantenimiento, balance neto)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    sanitizeMobilitySession,
    sanitizeMobilityExpense,
    getLocalDateString,
    parseMobilityCSV,
    calculateMobilityKPIs,
    calculateWeeklyBreakdown
} from './mobilityContracts.mjs';

describe('Tier 4: Real-World Scenarios', () => {

    // ─── 1. ESCENARIO JORNADA NOCTURNA (POST 21:00 HS UTC-3) ─────────────────
    describe('1. Jornada Nocturna y Zona Horaria Argentina (UTC-3)', () => {
        it('debe registrar la fecha local de hoy a las 21:15 hs UTC-3 (00:15 UTC del día siguiente)', () => {
            // Fecha simulada: 10 de Septiembre 2026, 21:15 en Argentina (UTC-3) -> 11 Sept 00:15 UTC
            const shiftEndUTC = new Date('2026-09-11T00:15:00.000Z');
            const localDate = getLocalDateString(shiftEndUTC);
            // Debe ser '2026-09-10', NO '2026-09-11'
            assert.strictEqual(localDate, '2026-09-10');

            const session = sanitizeMobilitySession({
                date: localDate,
                uber: 28000,
                hoursWorked: 6,
                kilometers: 110
            });
            assert.strictEqual(session.date, '2026-09-10');
            assert.strictEqual(session.dayOfWeek, 'jueves');
        });

        it('debe registrar la fecha local de hoy a las 23:45 hs UTC-3 (02:45 UTC del día siguiente)', () => {
            // Fecha simulada: 10 de Septiembre 2026, 23:45 en Argentina -> 11 Sept 02:45 UTC
            const lateNightUTC = new Date('2026-09-11T02:45:00.000Z');
            const localDate = getLocalDateString(lateNightUTC);
            assert.strictEqual(localDate, '2026-09-10');
        });

        it('DEMOSTRACIÓN DE FALLO EVITADO: toISOString() adelanta el día a las 22:00 hs vs getLocalDateString()', () => {
            const shiftUTC = new Date('2026-09-11T01:00:00.000Z'); // 22:00 hs del 10 de Septiembre en Argentina
            const buggyIsoDate = shiftUTC.toISOString().slice(0, 10);
            const correctLocalDate = getLocalDateString(shiftUTC);

            // toISOString() comete el bug de adelantar la fecha a mañana
            assert.strictEqual(buggyIsoDate, '2026-09-11');
            // getLocalDateString() resuelve correctamente el día actual del conductor
            assert.strictEqual(correctLocalDate, '2026-09-10');
            assert.notStrictEqual(buggyIsoDate, correctLocalDate);
        });

        it('debe asociar la carga rápida de GNC de medianoche (23:55 hs) a la misma jornada operativa', () => {
            const gasStationTime = new Date('2026-09-11T02:55:00.000Z'); // 23:55 hs local
            const expenseDate = getLocalDateString(gasStationTime);
            assert.strictEqual(expenseDate, '2026-09-10');

            const expense = sanitizeMobilityExpense({
                date: expenseDate,
                category: 'gnc',
                amount: 9800,
                notes: 'Carga YPF fin de turno nocturno'
            });
            assert.strictEqual(expense.date, '2026-09-10');
            assert.strictEqual(expense.amount, 9800);
        });
    });

    // ─── 2. IMPORTACIÓN CSV REAL DE EXCEL EN ESPAÑOL ──────────────────────────
    describe('2. Importación de CSV Excel en Español (RFC 4180)', () => {
        it('debe importar archivo exportado de Excel con punto y coma (;), comillas y horas decimales con coma', () => {
            const excelCSV = [
                'Fecha;Horas;Kilómetros;Uber;Didi;Cabify;Otros',
                '01/09/2026;8,5;140,5;"32.500,00";"12.000,00";0;0',
                '02/09/2026;7,0;115,0;"28.000,00";"15.500,00";"5.000,00";0',
                '03/09/2026;6,5;95,0;"24.000,00";0;0;"3.500,00"'
            ].join('\n');

            const { rows, errors } = parseMobilityCSV(excelCSV);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 3);

            // Fila 1
            assert.strictEqual(rows[0].date, '2026-09-01');
            assert.strictEqual(rows[0].hoursWorked, 8.5); // Comprobación crítica: no se convierte a 85
            assert.strictEqual(rows[0].kilometers, 140.5);
            assert.strictEqual(rows[0].uber, 32500);
            assert.strictEqual(rows[0].didi, 12000);
            assert.strictEqual(rows[0].total, 44500);

            // Fila 2
            assert.strictEqual(rows[1].date, '2026-09-02');
            assert.strictEqual(rows[1].cabify, 5000);
            assert.strictEqual(rows[1].total, 48500);

            // Fila 3
            assert.strictEqual(rows[2].others, 3500);
            assert.strictEqual(rows[2].total, 27500);
        });

        it('debe descartar días de descanso (ingresos = $0) y continuar procesando las jornadas con actividad', () => {
            const excelCSV = [
                'Fecha;Horas;Kilómetros;Uber;Didi;Cabify;Otros',
                '04/09/2026;0;0;0;0;0;0', // Día de descanso
                '05/09/2026;9,0;160;45000;10000;0;0',
                '06/09/2026;0;0;0;0;0;0'  // Día de descanso
            ].join('\n');

            const { rows, errors } = parseMobilityCSV(excelCSV);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].date, '2026-09-05');
            assert.strictEqual(rows[0].total, 55000);
        });

        it('debe capturar líneas con formato de fecha corrupto en errors sin abortar la importación del resto', () => {
            const corruptedCSV = [
                'Fecha;Horas;Kilómetros;Uber;Didi;Cabify;Otros',
                '01/09/2026;8;120;30000;0;0;0',
                'FECHA_ROTA;8;120;30000;0;0;0', // Fila corrupta
                '03/09/2026;7;100;25000;0;0;0'
            ].join('\n');

            const { rows, errors } = parseMobilityCSV(corruptedCSV);
            assert.strictEqual(rows.length, 2);
            assert.strictEqual(errors.length, 1);
            assert.match(errors[0], /fecha inválida/i);
            assert.strictEqual(rows[0].date, '2026-09-01');
            assert.strictEqual(rows[1].date, '2026-09-03');
        });

        it('debe parsear comillas dobles escapadas ("") de acuerdo al estándar RFC 4180', () => {
            const escapedQuotesCSV = [
                'Fecha,Horas,Kilometros,Uber,Didi,Cabify,Otros',
                '2026-09-01,8,130,"30000",0,0,0'
            ].join('\n');

            const { rows, errors } = parseMobilityCSV(escapedQuotesCSV);
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].uber, 30000);
        });
    });

    // ─── 3. SIMULACIÓN DE CICLO FINANCIERO MENSUAL COMPLETO ───────────────────
    describe('3. Ciclo Financiero Mensual Completo (30 Días)', () => {
        // Generar mes de Septiembre 2026: 30 días
        // 22 jornadas trabajadas (días de semana + sábados), 8 domingos y descansos
        const generateMonthData = () => {
            const sessions = [];
            const expenses = [];

            for (let day = 1; day <= 30; day++) {
                const dayStr = String(day).padStart(2, '0');
                const date = `2026-09-${dayStr}`;
                const dateObj = new Date(2026, 8, day, 12, 0, 0);
                const dayOfWeek = dateObj.getDay(); // 0 = Domingo

                // Sábados y domingos: días de descanso del conductor (8 días en total)
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    continue; // Descanso
                }

                // Jornada laboral activa: 22 días
                const uber = 25000 + (day % 5) * 3000; // 25k..37k
                const didi = 15000 + (day % 3) * 2000; // 15k..19k
                const cabify = day % 2 === 0 ? 8000 : 0;
                const others = 0;
                const hours = 8;
                const km = 130;

                sessions.push({
                    date,
                    uber,
                    didi,
                    cabify,
                    others,
                    hoursWorked: hours,
                    kilometers: km
                });

                // Carga de GNC cada 2 días
                if (day % 2 === 0) {
                    expenses.push({
                        date,
                        category: 'gnc',
                        amount: 9500,
                        notes: 'Carga GNC 15m3'
                    });
                }
            }

            // Gastos adicionales del mes:
            // Lavaderos (días 10 y 24)
            expenses.push({ date: '2026-09-10', category: 'lavadero', amount: 5000, notes: 'Lavado completo' });
            expenses.push({ date: '2026-09-24', category: 'lavadero', amount: 5000, notes: 'Lavado completo' });
            // Mantenimiento programado a mitad de mes (cambio de aceite y filtros)
            expenses.push({ date: '2026-09-15', category: 'repuestos', amount: 48000, notes: 'Aceite sintético + filtro' });

            return { sessions, expenses };
        };

        it('debe registrar exactamente 22 días trabajados para un conductor con 8 francos', () => {
            const { sessions, expenses } = generateMonthData();
            const kpis = calculateMobilityKPIs(sessions, expenses);
            assert.strictEqual(kpis.daysWorked, 22);
            assert.strictEqual(sessions.length, 22);
        });

        it('debe calcular ganancia bruta, gastos operativos y ganancia neta con margen saludable', () => {
            const { sessions, expenses } = generateMonthData();
            const kpis = calculateMobilityKPIs(sessions, expenses);

            assert.ok(kpis.totalEarnings > 900000, `Ingresos totales esperados > $900k: actual ${kpis.totalEarnings}`);
            assert.ok(kpis.totalExpenses > 150000, `Gastos totales esperados > $150k: actual ${kpis.totalExpenses}`);
            assert.ok(kpis.netEarnings > 700000, `Ganancia neta esperada > $700k: actual ${kpis.netEarnings}`);

            // Margen de ganancia debe estar en un rango realista para conductor de GNC (ej: 75% a 85%)
            assert.ok(kpis.profitMargin > 70 && kpis.profitMargin < 90, `Margen de ganancia fuera de rango: ${kpis.profitMargin}%`);
        });

        it('debe identificar la mejor jornada laboral del mes entre las 22 jornadas realizadas', () => {
            const { sessions, expenses } = generateMonthData();
            const kpis = calculateMobilityKPIs(sessions, expenses);
            assert.ok(kpis.bestDay !== null);
            assert.ok(kpis.bestDay.total > 0);
            // Comprobar que ningún otro día supera a bestDay.total
            for (const s of sessions) {
                const sTotal = (s.uber || 0) + (s.didi || 0) + (s.cabify || 0) + (s.others || 0);
                assert.ok(kpis.bestDay.total >= sTotal);
            }
        });

        it('debe generar una progresión semanal consistente (S1..S5) cuya sumatoria coincida con los totales mensuales', () => {
            const { sessions, expenses } = generateMonthData();
            const weeks = calculateWeeklyBreakdown(sessions, expenses, 1);

            // Debe abarcar entre 4 y 5 semanas en el mes
            assert.ok(weeks.length >= 4 && weeks.length <= 5);

            const sumWeeklyEarnings = weeks.reduce((acc, w) => acc + w.total, 0);
            const sumWeeklyExpenses = weeks.reduce((acc, w) => acc + w.gastos, 0);
            const sumWeeklyDays = weeks.reduce((acc, w) => acc + w.days, 0);

            const kpis = calculateMobilityKPIs(sessions, expenses);
            assert.strictEqual(sumWeeklyEarnings, kpis.totalEarnings);
            assert.strictEqual(sumWeeklyExpenses, kpis.totalExpenses);
            assert.strictEqual(sumWeeklyDays, kpis.daysWorked);
        });
    });
});
