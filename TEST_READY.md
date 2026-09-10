# TEST_READY: Módulo de Movilidad (Automated Test Suite)

**Estado de la Suite**: `READY` (100% de tests aprobados, código de salida 0)  
**Fecha de Publicación**: 2026-09-10  
**Autor**: `test_writer_1` (Test Architect & QA Specialist)  
**Comando de Ejecución Maestro**:  
```bash
node tests/mobility/runAllTests.mjs
```

---

## 1. Resumen Ejecutivo de Cobertura

La suite de pruebas automatizadas para el módulo de Movilidad ha sido implementada íntegramente utilizando Node.js nativo (`node:test` y `node:assert/strict`) con arquitectura ESM (.mjs), eliminando dependencias externas pesadas y garantizando ejecución instantánea y determinista en cualquier entorno.

| Nivel | Archivo de Prueba | Tests | Estado | Alcance y Capacidades Validadas |
|---|---|:---:|:---:|---|
| **Tier 1: Feature Coverage** | `tests/mobility/tier1-features.test.mjs` | **25** | `PASSED` | Sanitización de jornadas y gastos, parser `parseAmount`, rentabilidad neta, margen y KPIs operativos. |
| **Tier 2: Boundary & Corner Cases** | `tests/mobility/tier2-boundaries.test.mjs` | **35** | `PASSED` | Valores vacíos, `undefined`, protección anti-`NaN`/`Infinity`, números negativos, fin de mes (bisiestos), RFC 4180 y lotes Firestore > 500. |
| **Tier 3: Cross-Feature Interactions** | `tests/mobility/tier3-interactions.test.mjs` | **20** | `PASSED` | Jornadas multiplataforma (Uber, DiDi, Cabify, Otros), interacción ingresos vs gastos, desglose semanal y eficiencia h/km. |
| **Tier 4: Real-World Scenarios** | `tests/mobility/tier4-scenarios.test.mjs` | **12** | `PASSED` | Turnos nocturnos post 21hs (UTC-3), importación CSV Excel en español con punto y coma (;) y ciclo mensual completo de 30 días. |
| **TOTAL GENERAL** | **4 Tiers + Runner Maestro** | **92** | **100% PASS** | **Tiempo total de ejecución: ~1.45s** |

---

## 2. Catálogo Detallado de Pruebas por Nivel

### Tier 1: Feature Coverage (25 tests)
- **Sanitización de Jornadas (`sanitizeMobilitySession`)**:
  - Suma de 4 plataformas (`total = uber + didi + cabify + others`).
  - Cálculo de `earningsPerHour` y `earningsPerKm` redondeado a 2 decimales.
  - Protección de división por cero cuando horas o km son 0.
  - Derivación automática del día de la semana en español (`jueves`, etc.).
  - Supresión de propiedades `undefined` y limpieza de inyecciones invisibles.
- **Sanitización de Gastos (`sanitizeMobilityExpense`)**:
  - Saneamiento completo de fecha, categoría, monto y notas.
  - Categoría por defecto (`varios`) si no se provee o es vacía.
  - Parsing de cadenas de moneda formateadas (`"$ 15.450,50"`).
  - Bloqueo de montos negativos forzados a 0.
  - Recorte seguro de notas extensas a 200 caracteres.
- **Parser Monetario (`parseAmount`)**:
  - Integrales y decimales estándar.
  - Formato argentino con separador de miles por punto (`85.000` -> 85000).
  - Formato con coma decimal y miles (`1.250.000,50` -> 1250000.5).
  - Símbolos de moneda y espacios (`"$ 35.000 ARS"`).
  - Retorno de 0 para negativos, nulos, undefined y cadenas corruptas.
- **Rentabilidad Neta y Margen de Ganancia**:
  - Beneficio positivo y margen porcentual exacto (`ingresos > gastos`).
  - Margen del 100% ante cero gastos.
  - Punto de equilibrio con margen 0% (`ingresos == gastos`).
  - Margen negativo y déficit ante gastos superiores a ingresos.
  - Prevención de división por cero ante 0 ingresos con gastos.
- **KPIs Operativos**:
  - Días trabajados calculados exclusivamente a partir de jornadas (gastos no suman días).
  - Promedio diario (`totalEarnings / daysWorked`).
  - Identificación determinista de la mejor jornada (`bestDay`).
  - Promedios ponderados de eficiencia horaria y por kilómetro.
  - Desglose consolidado por plataforma.

### Tier 2: Boundary & Corner Cases (35 tests)
- **Valores Vacíos**: Objetos vacíos `{}` generan defaults seguros; tipos null o no-objeto lanzan excepciones controladas; arrays y cadenas vacías retornan 0 o colecciones vacías.
- **Valores Undefined**: Eliminación sistemática de claves con valor `undefined`; soporte de campos opcionales ausentes; fecha por defecto ante `date: undefined`.
- **Protección Anti-NaN e Infinity**: `parseAmount(NaN)` e `Infinity` devuelven 0; división por cero en fórmulas de rendimiento previene `Infinity` o `NaN`.
- **Valores Negativos**: Forzado estricto a 0 para ingresos, gastos, horas y kilómetros negativos.
- **Fronteras de Calendario y Fin de Mes**:
  - 31 de Marzo a Febrero seguro: ajusta a 28 de Febrero en años comunes y a 29 en bisiestos (evita el bug de avance a 2 o 3 de Marzo).
  - 31 de Mayo a 30 de Abril.
  - Retroceso de año en Enero (15 Ene -> 15 Dic anterior, 31 Ene -> 31 Dic anterior).
- **Delimitadores CSV y RFC 4180**:
  - Autodetección de delimitador `,` y `;` (Excel en español).
  - Comas dentro de comillas (ej: `"35,000.50"`).
  - Filas vacías o con ceros descartadas.
  - Errores sintácticos aislados sin abortar el resto del archivo.
- **Particionamiento en Chunks (Límite Firestore 500 operaciones)**:
  - 400 docs -> 1 lote.
  - 501 docs -> 2 lotes (400 y 101) garantizando `<= 500`.
  - 1000 docs -> 3 lotes (400, 400, 200).
  - Límite superior forzado a 500 ante peticiones excesivas.
  - Manejo de lote unitario.

### Tier 3: Cross-Feature Interactions (20 tests)
- **Multiplataforma**: Aislamiento y consolidación de cuota de mercado entre Uber, DiDi, Cabify y Otros; primacía de la suma de plataformas frente a totales arbitrarios.
- **Ingresos vs Gastos**: Días con déficit puntual dentro de meses rentables; acumulación por categoría de gasto (`gnc`, `nafta`, `repuestos`, `lavadero`); meses en déficit por reparaciones de taller; meses con gastos fijos y 0 ingresos.
- **Desglose Semanal (`calculateWeeklyBreakdown`)**:
  - **Aislamiento crítico de días**: Se verificó exhaustivamente que registrar múltiples gastos en una semana NO incrementa los días trabajados.
  - Semanas con solo gastos reflejan `days: 0`, `total: 0`, `net: -gastos`.
  - Ajuste dinámico ante cambio de inicio de semana (`Lunes=1` vs `Domingo=0`).
  - Orden cronológico garantizado independientemente del orden de inserción.
- **Eficiencia Operativa**: Jornadas urbanas congestionadas (muchas horas, pocos km) vs autopista (pocas horas, muchos km); promedios globales ponderados.

### Tier 4: Real-World Scenarios (12 tests)
- **Turnos Nocturnos post 21:00 hs (UTC-3 Argentina)**:
  - Fin de turno a las 21:15 UTC-3 (00:15 UTC del día siguiente) registra la fecha local argentina correcta (`YYYY-MM-DD`).
  - Fin de turno a las 23:45 UTC-3 (02:45 UTC del día siguiente) no salta al día siguiente.
  - Carga de GNC a medianoche (23:55 UTC-3) queda vinculada a la jornada en curso.
- **Importación Real de Excel en Español**:
  - Archivos con punto y coma (`;`), comillas y decimales con coma (`8,5` horas se preserva en 8.5 y no muta a 85).
  - Descarte automático de francos y captura no fatal de filas corruptas.
- **Ciclo Mensual Completo (30 Días)**:
  - Simulación de conductor profesional con 22 jornadas y 8 francos (fines de semana).
  - 11 cargas de GNC intercaladas cada 2 días, 2 lavaderos y 1 service mayor de aceite/filtro.
  - Reconciliación de sumatorias: la suma de semanas S1..S5 coincide exactamente con los totales mensuales (`total`, `gastos`, `daysWorked`).

---

## 3. Checklist de Verificación para Agentes Implementadores y Reviewers

- [x] Arnés de pruebas ejecutable con Node nativo sin dependencias externas (`node tests/mobility/runAllTests.mjs`).
- [x] Código de salida `0` ante éxito y `1` ante fallo.
- [x] 100% de tests unitarios y de integración aprobados (92/92).
- [x] Verificación de blindaje de Firestore ante operaciones masivas (> 500 docs).
- [x] Verificación de la corrección del cómputo de días trabajados (los gastos no suman días).
- [x] Verificación de preservación de decimales en importación CSV (horas y montos).
- [x] Verificación de zona horaria local argentina para jornadas nocturnas.
