# TEST_INFRA: Arquitectura del Arnés de Pruebas Automatizadas

**Módulo**: Grupo Familiar y Reparto de Gastos  
**Aplicación**: Mi Billetera (`mi-billetera-ap`)  
**Fecha**: 2026-09-10  
**Autor**: QA Lead & Test Architect (`test_writer_fam_1`)  
**Entorno de Ejecución**: Node.js v24.13.1 nativo (ESM, `node:test`, `node:assert/strict`)

---

## 1. Arquitectura del Arnés de Pruebas

El arnés de pruebas E2E automatizadas para el módulo de Grupo Familiar y Reparto de Gastos fue diseñado con el objetivo de proporcionar una verificación rigurosa, determinista y de alta velocidad (<4 segundos de ejecución total) sin depender de librerías externas pesadas ni herramientas de navegador.

```
mi-billetera-ap/
├── test-reparto-e2e.js              # Punto de entrada maestro en la raíz
├── tests/
│   └── reparto/
│       ├── repartoContracts.mjs    # Oráculo canónico y contratos matemáticos
│       ├── tier1-features.test.mjs  # Tier 1: Cobertura de funcionalidades
│       ├── tier2-boundaries.test.mjs# Tier 2: Casos límite y corner cases
│       ├── tier3-combinations.test.mjs # Tier 3: Combinaciones cruzadas
│       ├── tier4-scenarios.test.mjs # Tier 4: Escenarios reales de hogares
│       └── runAllTests.mjs          # Orquestador con reporter ejecutivo
├── TEST_INFRA.md                    # Este documento de arquitectura
└── TEST_READY.md                    # Certificación de suite lista (exit code 0)
```

### Componentes Clave:
1. **Oráculo Canónico (`repartoContracts.mjs`)**:
   - Actúa como la fuente autoritativa de verdad matemática conforme a `PROJECT.md` y `ORIGINAL_REQUEST.md`.
   - Implementa el algoritmo de **Mayor Resto (*Largest Remainder* / Hare-Niemeyer)** para cuotas monetarias enteras y porcentajes a 1 decimal sumando exactamente $100.0\%$.
   - Provee el motor de **Liquidación Neta** y el algoritmo *Greedy* de simplificación de deudas (máximo $N-1$ transferencias directas).
   - Unifica la lectura de gastos compartidos en 5 categorías (servicios, tarjetas, supermercado, frescos, efectivo).
2. **Aislamiento e Independencia**:
   - Cada prueba es autocontenida y no depende del orden de ejecución ni de mutación de estado global.
   - Datos de entrada sanitizados contra valores negativos, strings maliciosos, `NaN` e `Infinity`.

---

## 2. Desglose de Pruebas por Tier

| Nivel | Archivo de Prueba | Casos | Estado | Alcance y Capacidades Validadas |
|---|---|:---:|:---:|---|
| **Tier 1: Feature Coverage** | `tests/reparto/tier1-features.test.mjs` | **30** | `PASSED` | Proporciones salariales, cuotas Largest Remainder sin drift, suma 100%, selector unificado de 5 categorías, balances netos de acreedores/deudores y transferencias. |
| **Tier 2: Boundary & Corner Cases** | `tests/reparto/tier2-boundaries.test.mjs` | **40** | `PASSED` | 0 miembros, 1 miembro, 3+ miembros, sueldos en 0, asimetría extrema ($5.000.000 vs $0), división por 0, gastos en 0, inputs negativos, `NaN`/`Infinity` y formatos con coma/punto. |
| **Tier 3: Cross-Feature Combinations** | `tests/reparto/tier3-combinations.test.mjs` | **12** | `PASSED` | Modalidad Equitativo vs Proporcional, compensaciones cruzadas (servicios vs tarjetas vs súper), aportes manuales a caja común, superávit y cancelación circular de deudas. |
| **Tier 4: Real-World Scenarios** | `tests/reparto/tier4-scenarios.test.mjs` | **5** | `PASSED` | Escenarios realistas de hogares en Argentina: pareja 65/35 con liquidación Mercado Pago, roommates en Palermo, desempleo temporal con absorción, pozo en efectivo y mes inflacionario ($777.067). |
| **TOTAL** | **Suite Completa (Tiers 1 a 4)** | **87** | **100% PASS** | **Tiempo total: ~3.2 segundos** |

---

## 3. Catálogo Detallado de Cobertura

### Tier 1: Feature Coverage (30 pruebas)
- **1. Proporciones Salariales**: Sueldos iguales (50/50), asimétricos (60/40), escalonados en 3 miembros (50/30/20), miembro único (100%) y resolución por fecha ISO más reciente.
- **2. Aportes Exactos sin Drift**: Total divisible ($100 al 50/50), total impar ($101 sin crear ni perder dinero), 3 miembros ($1.000 $\to$ 334, 333, 333), proporción asimétrica ($10.003 $\to$ 6002 y 4001) y 4 miembros ($77.777 $\to$ suma 77.777).
- **3. Suma de Porcentajes 100.0%**: 3 miembros equitativos (33.4%, 33.3%, 33.3%), 6 miembros, 7 miembros, sueldos impares complejos (1.111.111, 2.222.222, 3.333.333) y 5 miembros arbitrarios.
- **4. Selector Unificado de Gastos**: Servicios + Tarjetas, Supermercado + Frescos, Efectivo, Desglose 5 categorías y tolerancia a nulos.
- **5. Balances Netos**: Pago 100% por un integrante, pagos exactos (ambos al día), pagos asimétricos cruzados, 3 miembros y conservación monetaria ($\sum \text{saldos} = 0$).
- **6. Transferencias de Liquidación**: 2 miembros (1 transferencia directa), 3 miembros (2 deudores a 1 acreedor), 1 deudor a 2 acreedores, suma de transferencias = deuda neta y cero transferencias si están al día.

### Tier 2: Boundary & Corner Cases (40 pruebas)
- **1. 0 miembros**: Array vacío `[]`, `null`, `undefined`, inputs corruptos, `calcularAportesExactos` con 0 miembros y retorno de estructuras seguras.
- **2. 1 miembro**: Sueldo positivo (100%), sueldo cero (100%), gasto asignado al 100%, pagos propios (0 transferencias) y gastos impagos sin transferencias huérfanas.
- **3. 3+ miembros**: 3 miembros 100.0%, 5 miembros 20.0%, 10 miembros con gasto complejo, 4 miembros con transferencias mínimas y 8 miembros con números impares.
- **4. Sueldos en cero**: Salarios en 0 activan `hasIncompleteSalaries: true` y fallback equitativo, historial vacío, strings `"0"`, modo equitativo explícito no activa alerta, y pareja con 1 sueldo en $0 y otro en $1.000.000.
- **5. Salarios asimétricos extremos**: $5.000.000 vs $0 (fallback seguro), 100 a 1 ($10M vs $100k $\to$ 99% vs 1%), hiper asimetría ($50M vs $1), 3 miembros ($20M, $500k, $500k) y gasto mínimo de $10 en 99/1 sin drift.
- **6. División por cero y gasto 0**: Gasto 0, gasto negativo saneado a 0, gastos compartidos vacíos, selector sin argumentos y suma de sueldos 0 sin `Infinity` ni `NaN`.
- **7. Negativos, NaN e Infinity**: `sanitizarMonto(-500000)`, `NaN`, `Infinity`, strings con signo menos, sueldos negativos y gastos infinitos saneados.
- **8. Decimales complejos y formatos**: Formato argentino (`"1.250.000,50"`), símbolo de moneda y texto (`"$ 85.400,00 ARS"`), decimal simple (`"35,99"`), consolidación con decimales y redondeo de aportes.

### Tier 3: Cross-Feature Combinations (12 pruebas)
- **3.1**: Modalidad Equitativa ignora deliberadamente sueldos cargados.
- **3.2**: Modo Proporcional 70/30 con pagos invertidos (el de menor sueldo pagó más) genera saldo deudor exacto para el de mayor ingreso.
- **3.3**: Compensación cruzada de servicios ($60k) vs tarjetas ($140k).
- **3.4**: Liquidación con aportes manuales adicionales a caja común.
- **3.5**: Transición dinámica entre modo Equitativo y Proporcional en el mismo mes.
- **3.6**: Consolidación simultánea de las 5 categorías de gastos.
- **3.7**: Cancelación de deudas circulares en 3 personas (resolución directa sin triangulaciones).
- **3.8**: Micro-tickets múltiples de supermercado vs pago único grande de tarjeta.
- **3.9**: Aporte manual previo que cubre el 100% de la cuota teórica.
- **3.10**: Aumento de sueldo a mitad de mes actualiza proporciones reactivamente.
- **3.11**: Hogar de 4 con 1 integrante sin ingresos (estudiante) aplica fallback 25% con alerta.
- **3.12**: Superávit de caja común con aportes adelantados.

### Tier 4: Real-World Scenarios (5 escenarios)
- **Escenario 1**: Convivencia en pareja (Nico y Cami) con ingresos 65% ($1.300.000) y 35% ($700.000). Total gastos compartidos $750.000 (Edenor, Metrogas, AySA, Movistar Fibra, Visa Santander, Mastercard BBVA, Coto, verdulería y carnicería). Transferencia final de liquidación por Mercado Pago: $88.300 de Nico a Cami.
- **Escenario 2**: Tres compañeros de departamento en Palermo en modo equitativo (alquiler $600k, wifi $45k, súper $105k). Dos deudores compensan al inquilino que pagó el alquiler con transferencias directas.
- **Escenario 3**: Pareja con ingreso cero temporal por desempleo y absorción compensatoria mediante aportes manuales.
- **Escenario 4**: Finanzas del hogar con pozo común en efectivo (caja chica física) y tarjetas de crédito.
- **Escenario 5**: Cierre de mes inflacionario argentino con cifra impar ($777.067) al peso exacto, verificando cuotas de $466.240 y $310.827 con conservación absoluta sin pérdida de $1.

---

## 4. Instrucciones de Ejecución

Para ejecutar la suite completa:
```bash
node test-reparto-e2e.js
```
o alternativamente:
```bash
node tests/reparto/runAllTests.mjs
```

Para correr tiers individuales:
```bash
node --test tests/reparto/tier1-features.test.mjs
node --test tests/reparto/tier2-boundaries.test.mjs
node --test tests/reparto/tier3-combinations.test.mjs
node --test tests/reparto/tier4-scenarios.test.mjs
```
