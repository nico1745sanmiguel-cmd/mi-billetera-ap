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

## Follow-up — 2026-09-10T23:18:40Z

Requested team: Equipo de 3 especialistas:
- 🕵️♂️ AGENTE QA: usar modelo flash (Auditor de Seguridad)
- 🛠️ AGENTE DEV: usar modelo pro (Desarrollador Firebase)
- 🔍 AGENTE REVIEWER: usar modelo pro (Verificador Final)

Auditoría integral de seguridad y blindaje de reglas de Firebase en "Mi Billetera" (React + Vite + Firebase), garantizando estricto aislamiento de datos entre usuarios y verificación de fugas de credenciales.

Working directory: c:\Users\Nico\.gemini\antigravity\scratch\mi-billetera-ap
Integrity mode: development

## Requirements

### R1. Auditoría de Seguridad e Informe de Vulnerabilidades (QA - Flash)
- Analizar `firestore.rules`, `firebase.json` y `functions/index.js`.
- Identificar colecciones o rutas donde los datos de un usuario puedan ser leídos, modificados o eliminados por otro, o donde no se exija autenticación (`request.auth != null`).
- Verificar que en el código cliente y archivos de configuración no existan llaves privadas de servicio ni secretos sensibles expuestos.
- Generar un informe estructurado de vulnerabilidades con impacto y ubicación exacta, sin modificar código fuente.

### R2. Corrección y Blindaje de Reglas (DEV - Pro)
- Implementar las correcciones necesarias en `firestore.rules` y `functions/`.
- Garantizar que cada regla exija autenticación obligatoria y restrinja el acceso exclusivamente al propietario del recurso (`request.auth.uid == userId` o validación correspondiente según la estructura del documento).
- Notificar al Agente Reviewer con el detalle de los cambios aplicados.

### R3. Validación y Aprobación Final (REVIEWER - Pro)
- Revisar exhaustivamente las reglas y funciones corregidas.
- Validar que el endurecimiento de la seguridad no rompa el flujo legítimo de lectura y escritura del usuario sobre sus propios datos en la aplicación cliente.
- Emitir la aprobación final técnica o requerir ajustes específicos.

## Acceptance Criteria

### Aislamiento de Datos y Autenticación
- [ ] Ninguna colección ni documento de usuario puede ser leído o modificado sin sesión activa (`request.auth != null`).
- [ ] Cada usuario puede acceder única y exclusivamente a sus propios registros (`request.auth.uid == userId`).
- [ ] No existen reglas permisivas globales (como `allow read, write: if true;` o lectura pública no intencionada).

### Seguridad de Credenciales y Backend
- [ ] No hay llaves privadas de Service Account ni variables de entorno sensibles commiteadas o expuestas al bundle de frontend.
- [ ] Las Cloud Functions en `functions/index.js` validan contexto de autenticación en llamadas invocables (Callable / HTTP).

### Continuidad Operativa
- [ ] La estructura de reglas respeta las consultas reales que hace la aplicación React para no bloquear la UX del usuario.

## Follow-up — 2026-09-10T23:59:44Z

# Teamwork Project Prompt

Requested team: Equipo de 3 especialistas (QA Inspector [flash], DEV Frontend/CSS [flash], REVIEWER Diseñador Líder [inherit])

Auditar y refinar el Sistema de Diseño y los componentes UX/UI base de "Mi Billetera" (React, Vite, Tailwind CSS), garantizando una experiencia financiera sobria, moderna y premium con plena responsividad móvil (sin desbordes ni touch targets diminutos) y coherencia de estados interactivos y de carga.

Working directory: z:\Mi billetera
Integrity mode: development

## Requested Team & Workflow

1. 🕵️♂️ AGENTE QA — UX Inspector (flash):
   - Audita estilos globales (index.css, tailwind.config.js), botones, modales, inputs y tarjetas (`src/Components/UI/*` y componentes comunes).
   - Revisa responsividad en pantallas chicas (celular): desbordes horizontales, touch targets menores a 44x44px, textos con contraste insuficiente o ilegibles.
   - Detecta incoherencias de paleta, falta de contraste o estados de carga (spinners / skeletons) ausentes o toscos.
   - Emite un reporte técnico detallado al Dev. NO modifica código directamente.

2. 🛠️ AGENTE DEV — Frontend & CSS Specialist (flash):
   - Toma el reporte del QA y ajusta los componentes base de UI y la configuración de estilos.
   - Asegura una estética financiera "Premium": sobria, moderna, sin bordes toscos, espaciados consistentes, feedback háptico/visual en hover/active/focus.
   - Mantiene la compatibilidad y no rompe lógica funcional ni imports.

3. 🔍 AGENTE REVIEWER — Diseñador Líder (inherit):
   - Audita el diff y los cambios introducidos por el Dev.
   - Valida que la estructura visual no se haya roto y que se cumpla la estética premium solicitada.
   - Da el veredicto final.

## Requirements

### R1. Auditoría exhaustiva de componentes base y estilos globales
Inspeccionar `tailwind.config.js`, `index.css` y los componentes en `src/Components/UI/` (botones, tarjetas GlassCard, modales ConfirmDialog, estados de carga Skeleton/LoadingState, Inputs). Identificar desalineaciones de color, falta de variantes consistentes, contrastes pobres y áreas no responsivas.

### R2. Refactorización y estandarización UI/UX base
Implementar mejoras en los componentes base para garantizar touch targets mínimos de 44px en móviles, variantes claras (primary, secondary, danger, ghost), estados focus/active visibles y elegantes, skeletons pulidos y una paleta financiera oscura/clara sin elementos estridentes ni placeholders genéricos.

### R3. Preservación funcional y verificación de compilación
Garantizar que no existan errores de sintaxis, variables de Tailwind rotas ni imports quebrados en Vite. El proyecto debe compilar limpiamente (`npm run build`).

## Acceptance Criteria

### UX & Responsividad Móvil
- [ ] Todos los botones e inputs interactivos en pantallas móviles tienen un área de toque accesible (mínimo 44x44px o padding suficiente).
- [ ] No existen desbordes horizontales (`overflow-x` no deseado) causados por componentes base o modales en anchos de pantalla reducidos (360px - 414px).
- [ ] Los estados de carga (skeletons / spinners) existen y están armonizados con la paleta de la aplicación.

### Estética Financiera Premium
- [ ] Jerarquía tipográfica definida y sobria, con contrastes de texto que cumplan legibilidad sin saturación innecesaria.
- [ ] Modales y diálogos de confirmación estilizados con efectos modernos (glassmorphism sutil, bordes suaves, backdrop blur coherente).

### Estabilidad del Código
- [ ] El comando de compilación del proyecto se ejecuta exitosamente sin errores de Tailwind o JSX.
- [ ] Los componentes existentes que consumen `Components/UI` mantienen su contrato de props y funcionamiento.

## Follow-up — 2026-09-11T01:58:01Z

# Teamwork Project Prompt — Draft

> Goal: Poner a punto el módulo Freshmarket en Mi Billetera con validaciones, UX de carga, listas vacías y robustez en CRUD.
> Requested team: 🕵️♂️ AGENTE QA (flash), 🛠️ AGENTE DEV (pro), 🔍 AGENTE REVIEWER (inherit)

Poner a punto y robustecer el módulo Freshmarket de "Mi Billetera", auditando y corrigiendo validaciones en formularios, estados de carga/esqueletos, estados vacíos y manejo de montos/fechas.

Working directory: z:\Mi billetera
Integrity mode: development

## Requirements

### R1. Auditoría y Robustez de Flujos de Negocio (QA)
Auditar el flujo completo de Freshmarket (`FreshShop.jsx`, `PlannerSection.jsx`, `TripCard.jsx`):
- Creación, edición, eliminación y filtrado de gastos/ítems por fecha y categoría.
- Detección de casos borde: montos negativos, montos en cero o no numéricos, campos de nombre/nota vacíos, fechas inválidas o fuera de rango, y errores al sincronizar con Firestore.
- Verificación de estados vacíos ("Sin movimientos aún" o feedback visual correspondiente) y estados de carga (`loading`, skeletons/spinners).

### R2. Correcciones de Desarrollo y Experiencia de Usuario (DEV)
- Validaciones consistentes antes de enviar o persistir datos en `freshRepository`.
- Mensajes de error claros, comprensibles y accionables para el usuario (toasts/alertas contextuales).
- Skeletons o spinners en cargas asíncronas para evitar saltos visuales o pantallas congeladas.
- Prevención de montos negativos sin control y protección contra entradas malformadas.

### R3. Control de Calidad y No Regresión (REVIEWER)
- Verificación cruzada de cada fallo reportado por QA contra las correcciones implementadas por DEV.
- Asegurar que no se introduzcan regresiones de estado, bugs de renderizado ni degradación en la estética Glassmorphic/UI existente.

## Acceptance Criteria

### Formularios y Validaciones
- [ ] No es posible ingresar ni guardar montos negativos, nulos o cadenas no numéricas en creación ni en edición rápida de total (`TripCard`).
- [ ] La fecha de ítems y compras no permite valores vacíos ni formatos inválidos.
- [ ] Los nombres de nuevas categorías o notas de gastos no se pueden guardar en blanco o con solo espacios.

### Feedback Visual y UX
- [ ] Se muestran estados de carga (skeletons/spinners) mientras `freshItems` o las categorías están cargando.
- [ ] Cuando una categoría no tiene movimientos, se muestra un estado vacío amigable e instructivo ("Sin movimientos aún" o similar con icono).
- [ ] Los mensajes de error al usuario son claros, pedagógicos y sin tecnicismos crudos.

### Integridad y Rendimiento
- [ ] Cero regresiones en el cálculo de totales por categoría y presupuesto mensual.
- [ ] Sincronización limpia con Firestore sin llamadas redundantes o errores en consola.

## 2026-09-11T15:12:27Z

# Teamwork Project Prompt

> Requested team: 🕵️♂️ AGENTE QA (flash), 🛠️ AGENTE DEV (pro), 🔍 AGENTE REVIEWER (inherit)

Poner a punto de forma robusta y con UX premium el flujo de Purchase (gastos/compras) en "Mi Billetera", incluyendo validaciones estrictas, manejo de errores, estados de carga y gestión de transacciones.

Working directory: z:\Mi billetera

## Requirements

### R1. Robustez en Carga y Validación de Compras (NewPurchase)
- Validación de montos (impedir negativos, ceros, valores no numéricos).
- Manejo de errores en UI (reemplazar alert() nativo por toasts/mensajes en pantalla integrados con el diseño Glassmorphism).
- Skeletons y estados de carga claros mientras se guardan o leen datos.
- Preselección y validación de tarjeta cuando el tipo de gasto es "Crédito".

### R2. Flujo Completo de Transacciones (CRUD & Filtros)
- Identificar y cubrir las operaciones de creación, edición, borrado y filtrado de transacciones (por fecha y categoría).
- Soporte en CardsContext para actualización y eliminación segura de movimientos.
- Estados vacíos informativos ("Sin movimientos aún") amigables para el usuario.

### R3. Flujo Multi-Agente Secuencial
- **Agente QA (Flash)**: Auditoría exhaustiva de casos borde (negativos, vacíos, fechas inválidas, filtros rotos). Entrega informe sin modificar código.
- **Agente Dev (Pro)**: Implementación de validaciones, mensajes de error UX y estados de carga.
- **Agente Reviewer (Inherit)**: Verificación contra el reporte de QA, asegurando cero regresiones.

## Acceptance Criteria

### Validaciones y UX
- [ ] No es posible ingresar montos negativos, vacíos o inválidos en NewPurchase.
- [ ] No existen alert() nativos; todos los avisos se muestran mediante toasts o mensajes inline con diseño consistente.
- [ ] Las operaciones asíncronas muestran feedback visual inmediato (spinners/skeletons).

### Integridad de Datos
- [ ] Las transacciones se guardan saneadas en Firestore/Context sin campos corruptos.
- [ ] Los estados vacíos están presentes y estilizados cuando no hay registros.

## 2026-09-12T21:13:32Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Equipo de 3 especialistas (QA flash, DEV pro, REVIEWER pro)

Auditoría exhaustiva, limpieza y optimización para el pase a producción de la Progressive Web App (PWA) "Mi Billetera".

Working directory: z:\Mi billetera
Integrity mode: development

## Roles Solicitados
- 🕵️♂️ AGENTE QA (Auditor de Release - modelo Flash): Audita PWA (manifest, service worker, offline UX), ejecuta linter y detecta archivos basura o temporales. Solo lectura, no modifica archivos.
- 🛠️ AGENTE DEV (Build Engineer - modelo Pro): Resuelve advertencias del linter, elimina código muerto y archivos temporales, optimiza Vite (code splitting, compresión) y asegura compatibilidad PWA.
- 🔍 AGENTE REVIEWER (Director Técnico - modelo Pro): Ejecuta el build final, verifica cero errores y confirma si la app está lista para deploy.

## Requirements

### R1. Auditoría de Release y PWA (QA)
Auditar `public/manifest.json` (nombre, descripción, iconos, theme_color, background_color, display), `public/sw.js` y verificar la experiencia sin conexión (banner o notificación de pérdida de red). Ejecutar el linter para documentar todas las advertencias/errores e inventariar los archivos residuales de desarrollo (scripts temporales, logs, reportes). Reportar hallazgos sin realizar modificaciones.

### R2. Refactorización, Limpieza y Optimización de Build (DEV)
Corregir los errores y advertencias detectados por el linter sin romper funcionalidad. Eliminar código muerto, logs de depuración (`console.log` innecesarios), comentarios obsoletos y los archivos residuales de test o reportes temporales generados durante el desarrollo. Configurar la optimización de empaquetado en Vite (`vite.config.js` / manualChunks, code splitting, compresión o lazy loading de rutas/dependencias pesadas como `recharts`, `pdfjs-dist`) asegurando que los meta tags y cabeceras PWA sean plenamente funcionales en Android e iOS.

### R3. Certificación Técnica y Build de Producción (REVIEWER)
Ejecutar el proceso de verificación final. Correr la compilación de producción (`npm run build`) comprobando que termine con código de salida exitoso (0), sin errores de TypeScript/JSX y sin advertencias críticas de empaquetado. Validar la integridad estructural de la PWA y emitir el dictamen final documentado: "App lista para deploy".

## Acceptance Criteria

### Limpieza de Código y Linter
- [ ] `npm run lint` se ejecuta y finaliza con 0 errores.
- [ ] Se eliminan del repositorio los archivos residuales de desarrollo en la raíz (ej: `inputs_full.txt`, `react-doctor-*.txt`, `report_test.json`, `fixA11y.mjs`, `parse_balanz.cjs`, `test-reparto-e2e.js`).
- [ ] No quedan llamadas de `console.log` de depuración en los componentes productivos de `src/`.

### Configuración PWA y Experiencia de Usuario (UX/UI)
- [ ] `manifest.json` cuenta con todas las propiedades requeridas para instalación (`name`, `short_name`, `icons`, `start_url`, `display: standalone`, colores de tema).
- [ ] Existe manejo de estado offline perceptible y elegante para el usuario cuando se pierde la conexión.
- [ ] `index.html` incluye las etiquetas meta necesarias para viewport, `apple-touch-icon`, y soporte para navegadores móviles.

### Build y Rendimiento (Vite)
- [ ] `npm run build` compila con éxito en verde (`exit code 0`).
- [ ] Se implementa división de código (code splitting/lazy loading) evitando un bundle monolítico gigante para dependencias pesadas (ej: `recharts`, `firebase`, `pdfjs-dist`).
- [ ] El Director Técnico emite un reporte final de confirmación técnica para deploy.
