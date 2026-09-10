# Original User Request

## Initial Request — 2026-09-10T11:54:44Z

This is a single self-contained fix; keep it small and focused. Auditoría, corrección de bugs y optimización UX/UI de la sección "Mis Tarjetas" en Mi Billetera.

Working directory: z:\Mi billetera
Integrity mode: development

## Requirements

### R1. Auditoría QA y Corrección por Dev Senior
El equipo (QA Experto + Dev Senior de 10+ años de experiencia) debe realizar ciclos de revisión y corrección en la sección "Mis Tarjetas", detectando fallos lógicos, errores de estado y casos de borde en los flujos de agregar, editar, eliminar y visualizar tarjetas.

### R2. Seguridad Práctica para App Personal
Revisar el almacenamiento local/remoto de datos de tarjetas y sanitizar inputs para evitar exposición innecesaria de información o corrupción de estado en la base de datos personal.

### R3. Refinamiento UX/UI Premium
Optimizar visual y funcionalmente la sección "Mis Tarjetas" garantizando estados de carga (spinners/skeletons), manejo claro de errores y un diseño responsivo alineado con los estándares UX de la app.

## Acceptance Criteria

### Funcionalidad y Estabilidad
- [ ] Flujos de creación, modificación, eliminación y listado de tarjetas libres de bugs.
- [ ] Control de errores y estados de carga bien integrados.

### Seguridad
- [ ] Sin logs expuestos ni sanitización faltante en formulario de tarjetas.

### UX/UI
- [ ] Interfaz pulida, moderna y responsivo con feedback inmediato al usuario.

## Follow-up — 2026-09-10T13:00:00Z

Revisión, auditoría y optimización integral del módulo de Movilidad (`src/Components/Mobility` y `src/context/MobilityContext.jsx`) de la aplicación personal "mi-billetera-ap".

Working directory: z:\Mi billetera
Integrity mode: development

Requested team: Un desarrollador Senior con 10 años de experiencia y un QA experto trabajando en conjunto. El QA prueba y busca debilidades, y el Dev Senior las corrige de manera profesional.

## Requirements

### R1. Auditoría de Código y Corrección de Bugs (QA + Dev)
El equipo de QA identificará fallos de flujo, estados inconsistentes, errores de renderizado o excepciones no capturadas en la sección de Movilidad. El Dev Senior corregirá cada hallazgo manteniendo la solidez del código.

### R2. Optimización UX/UI y Rendimiento
Refinar la experiencia de usuario y la interfaz visual del módulo de Movilidad acorde a estándares premium (re-renders innecesarios, responsividad, animaciones y fluidez de interacción).

### R3. Seguridad Sanitaria para App Personal
Revisar posibles vulnerabilidades o baches groseros de seguridad (manejo de datos sensibles en almacenamiento local, sanitización básica de entradas, fugas de memoria o validaciones de importación de datos).

## Acceptance Criteria

### Funcionalidad y Estabilidad
- [ ] Cero excepciones no capturadas o errores en consola durante el flujo completo de movilidad (agregar, editar, historial, importación, estadísticas).
- [ ] Validación correcta de formularios e importación de datos.

### Calidad de Código y UX
- [ ] Interfaz limpia, fluida y con UX/UI cuidada sin baches estéticos ni retardos de respuesta.
- [ ] Compilación y build limpios sin errores de bundling.

## Follow-up — 2026-09-10T18:00:00Z

Un desarrollador Senior (10+ años de experiencia) y un QA Experto trabajan en conjunto auditando, detectando debilidades/bugs y optimizando la sección de Grupo Familiar y Reparto de Gastos de la app personal "Mi Billetera". El QA reporta fallas y casos borde, mientras el Dev los soluciona manteniendo altos estándares de calidad y UX/UI.

Working directory: c:\Users\Nico\.gemini\antigravity\scratch\mi-billetera-ap
Integrity mode: development

## Requirements

### R1. Auditoría QA y Corrección de Bugs en Reparto de Gastos
- Revisar y probar exhaustivamente los componentes RepartoPanel.jsx, SharedExpensesDashboard.jsx, HouseholdManager.jsx y widgets/contextos relacionados (SalaryContext.jsx, salaryUtils.js).
- Corregir cualquier error en cálculos de distribución de gastos (equitativa o proporcional por salarios), actualización de saldos, división de servicios o deudas entre miembros de la familia.

### R2. Seguridad Práctica y Resiliencia en App Personal
- Asegurar validaciones rigurosas en la entrada de datos: prevenir cantidades negativas no deseadas, entradas vacías, NaN, división por cero al calcular proporciones salariales, y estados inconsistentes si un miembro o gasto se borra.
- Garantizar que la app maneje errores de forma elegante sin romper la interfaz (crashes de React).

### R3. Optimización de UX/UI y Claridad de Balances
- Mejorar la legibilidad de la interfaz: visualización clara de quién le debe a quién, totales compartidos, filtros por miembro o fecha y feedback visual inmediato tras cada cambio.
- Mantener una experiencia de usuario fluida, limpia y con un acabado visual premium acorde al resto de la aplicación.

## Verification Plan

### Automated Verification
- Ejecutar npm run build para asegurar que el empaquetado del proyecto no contenga errores de sintaxis o compilación TypeScript/JSX.
- Ejecutar npm run lint para garantizar limpieza de código y ausencia de variables no utilizadas o reglas violadas.

### Manual & QA Inspection
- Simulación por parte del QA de casos límite: salarios en cero, 0 miembros en el grupo, montos decimales complejos, eliminación de miembros con gastos pendientes y cambio rápido de pestañas/filtros.

## Acceptance Criteria

### Estabilidad y Corrección Funcional
- [ ] No hay errores en consola ni cierres inesperados (React crash) durante el flujo de creación, edición y cálculo de reparto de gastos.
- [ ] Los cálculos de balance entre integrantes ("quién debe a quién" y saldos netos) concuerdan exactamente con las operaciones matemáticas esperadas.

### Robustez y Manejo de Bordes
- [ ] La interfaz bloquea o maneja limpiamente valores inválidos (como salarios nulos/cero en repartos proporcionales o montos vacíos).
- [ ] Si un miembro o servicio se modifica o elimina, la vista de reparto actualiza adecuadamente los saldos sin dejar referencias huérfanas.

### Calidad de Código y UX
- [ ] El proyecto compila limpiamente mediante npm run build.
- [ ] La UI de la sección de Grupo Familiar y Reparto presenta un diseño limpio, intuitivo y sin inconsistencias visuales.
