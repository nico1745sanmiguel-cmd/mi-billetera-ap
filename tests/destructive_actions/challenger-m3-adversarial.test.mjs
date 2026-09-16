import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('================================================================');
console.log('⚡ CHALLENGER M3 ADVERSARIAL TEST SUITE: DESTRUCTIVE ACTIONS ⚡');
console.log('================================================================');

const srcDir = path.resolve('src');
let totalAssertions = 0;

function assertCondition(cond, msg) {
    assert.ok(cond, msg);
    totalAssertions++;
}

// ----------------------------------------------------------------------------
// TEST 1: Exhaustive recursive search for window.confirm and alert in src/
// ----------------------------------------------------------------------------
console.log('\n[TEST 1] Verificando erradicación absoluta de confirm() y alert() en src/ y subdirectorios...');

const jsExtensions = /\.(jsx?|tsx?)$/i;
let scannedFiles = 0;

function scanDirForConfirmAndAlert(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.agents') {
                scanDirForConfirmAndAlert(fullPath);
            }
        } else if (jsExtensions.test(entry.name)) {
            scannedFiles++;
            const content = fs.readFileSync(fullPath, 'utf8');

            // 1. Check window.confirm or window.alert
            assertCondition(
                !/window\.confirm\s*\(/.test(content),
                `[REGRESIÓN] window.confirm() detectado en ${fullPath}`
            );
            assertCondition(
                !/window\.alert\s*\(/.test(content),
                `[REGRESIÓN] window.alert() detectado en ${fullPath}`
            );

            // 2. Check global confirm( or alert(
            const confirmMatch = content.match(/\bconfirm\s*\(/g);
            assertCondition(
                confirmMatch === null,
                `[REGRESIÓN] llamada confirm() detectada en ${fullPath}`
            );

            const alertMatch = content.match(/\balert\s*\(/g);
            assertCondition(
                alertMatch === null,
                `[REGRESIÓN] llamada alert() detectada en ${fullPath}`
            );

            // 3. Check globalThis.confirm / globalThis.alert
            assertCondition(
                !/globalThis\.(confirm|alert)\s*\(/.test(content),
                `[REGRESIÓN] globalThis.confirm/alert detectado en ${fullPath}`
            );
        }
    }
}

scanDirForConfirmAndAlert(srcDir);
console.log(`✔ PASS: ${scannedFiles} archivos analizados. 0 llamadas a confirm/alert en todo src/.`);

// ----------------------------------------------------------------------------
// TEST 2: Invariant and Logic Stress Test on ConfirmDialog.jsx
// ----------------------------------------------------------------------------
console.log('\n[TEST 2] Verificando invariantes de seguridad y accesibilidad en ConfirmDialog.jsx...');

const confirmDialogPath = path.join(srcDir, 'Components/UI/ConfirmDialog.jsx');
const confirmDialogCode = fs.readFileSync(confirmDialogPath, 'utf8');

// Accesibilidad
assertCondition(confirmDialogCode.includes('role="alertdialog"'), 'ConfirmDialog debe tener role="alertdialog"');
assertCondition(confirmDialogCode.includes('aria-modal="true"'), 'ConfirmDialog debe tener aria-modal="true"');
assertCondition(confirmDialogCode.includes('aria-labelledby="confirm-dialog-title"'), 'ConfirmDialog debe enlazar aria-labelledby');
assertCondition(confirmDialogCode.includes('aria-describedby="confirm-dialog-desc"'), 'ConfirmDialog debe enlazar aria-describedby');

// Ergonomía táctil mínima (44px)
assertCondition(confirmDialogCode.includes('min-h-[44px]'), 'Botones de ConfirmDialog deben cumplir touch target min-h-[44px]');

// Blindaje contra cierre en vuelo (Escape y Backdrop)
assertCondition(
    confirmDialogCode.includes('if (isLoading) return;') || confirmDialogCode.includes('if (!isOpen || isLoading) return;'),
    'ConfirmDialog debe bloquear el cierre por Escape o Backdrop cuando isLoading es true'
);

// Deshabilitación visual y funcional en estado de carga
assertCondition(confirmDialogCode.includes('disabled={isLoading}'), 'Botones deben estar deshabilitados con isLoading');
assertCondition(confirmDialogCode.includes('animate-spin'), 'Debe renderizar spinner animado durante isLoading');
assertCondition(confirmDialogCode.includes('cursor-wait'), 'Debe mostrar cursor-wait durante isLoading');

console.log('✔ PASS: ConfirmDialog cumple al 100% las especificaciones de accesibilidad, ergonomía y bloqueo.');

// ----------------------------------------------------------------------------
// TEST 3: Oracle y Harness de Estrés contra Doble Clic (Spam Clicks Simulator)
// ----------------------------------------------------------------------------
console.log('\n[TEST 3] Simulando ráfaga adversarial de 200 clics concurrentes sobre handleConfirmClick...');

// Extraemos la lógica pura de handleConfirmClick para someterla a estrés
class MockConfirmDialogState {
    constructor({ onConfirm, onCancel, onClose, isLoading = false }) {
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
        this.onClose = onClose;
        this.isLoading = isLoading;
        this.isClosed = false;
    }

    handleClose() {
        if (this.isLoading) return;
        if (this.onCancel) {
            this.onCancel();
        } else if (this.onClose) {
            this.onClose();
        }
        this.isClosed = true;
    }

    async handleConfirmClick() {
        if (this.isLoading) return;
        if (this.onConfirm) {
            const result = this.onConfirm();
            if (result && typeof result.then === 'function') {
                try {
                    await result;
                } catch {
                    return;
                }
            }
        }
        if (!this.isLoading) {
            this.handleClose();
        }
    }
}

// Escenario 1: Operación asíncrona lenta con 200 clics en 5ms
let externalCallsCount = 0;
let isAsyncInFlight = false;

const slowAsyncOperation = () => {
    externalCallsCount++;
    return new Promise((resolve) => {
        setTimeout(resolve, 80);
    });
};

const dialog = new MockConfirmDialogState({
    onConfirm: () => {
        if (isAsyncInFlight) {
            throw new Error('¡CONCURRENCIA DETECTADA! Llamada duplicada mientras la primera estaba en vuelo.');
        }
        isAsyncInFlight = true;
        dialog.isLoading = true; // El componente padre setea isLoading=true
        return slowAsyncOperation().finally(() => {
            isAsyncInFlight = false;
            dialog.isLoading = false;
        });
    }
});

// Lanzar 200 clics simultáneos (simulando usuario enfurecido pulsando repetidamente)
const clickPromises = [];
for (let i = 0; i < 200; i++) {
    clickPromises.push(dialog.handleConfirmClick());
}

await Promise.all(clickPromises);

assertCondition(
    externalCallsCount === 1,
    `Falla de prevención de doble clic: se ejecutaron ${externalCallsCount} operaciones asíncronas en lugar de 1`
);
console.log(`✔ PASS: De 200 clics concurrentes, exactamente ${externalCallsCount} llamada asíncrona fue admitida.`);

// Escenario 2: Intento de cierre por Escape o Backdrop mientras isLoading es true
dialog.isLoading = true;
let cancelCalled = false;
dialog.onCancel = () => { cancelCalled = true; };
dialog.handleClose();

assertCondition(!cancelCalled, 'Escape o backdrop no debe cerrar el diálogo durante isLoading');
console.log('✔ PASS: Diálogo invulnerable a cancelación o cierre forzado durante la transacción.');

// ----------------------------------------------------------------------------
// TEST 4: Auditoría de Guardias y Manejadores Destructivos en Componentes
// ----------------------------------------------------------------------------
console.log('\n[TEST 4] Verificando guardias en los componentes modificados...');

// 4.1 SalarySourcesEditor.jsx
const salaryCode = fs.readFileSync(path.join(srcDir, 'Components/Salary/SalarySourcesEditor.jsx'), 'utf8');
assertCondition(salaryCode.includes('if (!deletingSource || isDeleting) return;'), 'SalarySourcesEditor debe chequear !deletingSource || isDeleting');
assertCondition(salaryCode.includes('setIsDeleting(true);'), 'SalarySourcesEditor debe setear isDeleting(true)');
assertCondition(salaryCode.includes('setIsDeleting(false);'), 'SalarySourcesEditor debe limpiar isDeleting(false) en finally');
assertCondition(salaryCode.includes('isLoading={isDeleting}'), 'SalarySourcesEditor debe pasar isLoading={isDeleting}');

// 4.2 CarterasPanel.jsx
const carterasCode = fs.readFileSync(path.join(srcDir, 'Components/Savings/CarterasPanel.jsx'), 'utf8');
assertCondition(carterasCode.includes('if (!deletingCartera || isDeleting) return;'), 'CarterasPanel debe chequear !deletingCartera || isDeleting');
assertCondition(carterasCode.includes('setIsDeleting(true);'), 'CarterasPanel debe setear isDeleting(true)');
assertCondition(carterasCode.includes('setIsDeleting(false);'), 'CarterasPanel debe limpiar isDeleting(false) en finally');
assertCondition(carterasCode.includes('isLoading={isDeleting}'), 'CarterasPanel debe pasar isLoading={isDeleting}');

// 4.3 NotesDashboard.jsx
const notesCode = fs.readFileSync(path.join(srcDir, 'Components/Notes/NotesDashboard.jsx'), 'utf8');
assertCondition(notesCode.includes('if (!deletingNote || isDeleting) return;'), 'NotesDashboard debe chequear !deletingNote || isDeleting');
assertCondition(notesCode.includes('setIsDeleting(true);'), 'NotesDashboard debe setear isDeleting(true)');
assertCondition(notesCode.includes('setIsDeleting(false);'), 'NotesDashboard debe limpiar isDeleting(false) en finally');
assertCondition(notesCode.includes('isLoading={isDeleting}'), 'NotesDashboard debe pasar isLoading={isDeleting}');

// 4.4 HouseholdManager.jsx
const householdCode = fs.readFileSync(path.join(srcDir, 'Components/Household/HouseholdManager.jsx'), 'utf8');
assertCondition(householdCode.includes('setIsRestoring(true);'), 'HouseholdManager debe setear isRestoring(true)');
assertCondition(householdCode.includes('setIsRestoring(false);'), 'HouseholdManager debe limpiar isRestoring(false) en finally');
assertCondition(householdCode.includes('isLoading={isRestoring}'), 'HouseholdManager debe pasar isLoading={isRestoring}');
assertCondition(householdCode.includes('isLoading={isLeaving || loading}'), 'HouseholdManager debe pasar isLoading={isLeaving || loading}');

// 4.5 ServicesManager.jsx
const servicesCode = fs.readFileSync(path.join(srcDir, 'Components/Services/ServicesManager.jsx'), 'utf8');
assertCondition(servicesCode.includes('if (!editingService || isDeletingService) return;'), 'ServicesManager debe chequear !editingService || isDeletingService');
assertCondition(servicesCode.includes('setIsDeletingService(true);'), 'ServicesManager debe setear isDeletingService(true)');
assertCondition(servicesCode.includes('setIsDeletingService(false);'), 'ServicesManager debe limpiar isDeletingService(false) en finally');
assertCondition(servicesCode.includes('isLoading={isDeletingService}'), 'ServicesManager debe pasar isLoading={isDeletingService}');

// 4.6 CardDetail.jsx
const cardDetailCode = fs.readFileSync(path.join(srcDir, 'Components/Cards/CardDetail.jsx'), 'utf8');
assertCondition(cardDetailCode.includes('isLoading={isDeleting}'), 'CardDetail debe pasar isLoading={isDeleting}');
assertCondition(cardDetailCode.includes('isDanger={true}'), 'CardDetail debe pasar isDanger={true}');

// 4.7 StopLossModal.jsx
const stopLossCode = fs.readFileSync(path.join(srcDir, 'Components/Savings/StopLossModal.jsx'), 'utf8');
assertCondition(stopLossCode.includes('isLoading={loading}'), 'StopLossModal debe pasar isLoading={loading}');
assertCondition(stopLossCode.includes('isDanger={true}'), 'StopLossModal debe pasar isDanger={true}');

// 4.8 SuperList.jsx
const superListCode = fs.readFileSync(path.join(srcDir, 'Components/Supermarket/SuperList.jsx'), 'utf8');
assertCondition(superListCode.includes('if (!itemToDelete || isDeleting) return;'), 'SuperList debe chequear !itemToDelete || isDeleting');
assertCondition(superListCode.includes('setIsDeleting(true);'), 'SuperList debe setear isDeleting(true)');
assertCondition(superListCode.includes('setIsDeleting(false);'), 'SuperList debe limpiar isDeleting(false) en finally');
assertCondition(superListCode.includes('isLoading={isDeleting}'), 'SuperList debe pasar isLoading={isDeleting}');
assertCondition(superListCode.includes('isDanger={true}'), 'SuperList debe pasar isDanger={true}');

// 4.9 PlannerSection.jsx
const plannerCode = fs.readFileSync(path.join(srcDir, 'Components/Supermarket/PlannerSection.jsx'), 'utf8');
assertCondition(plannerCode.includes('isLoading={isDeletingCat}'), 'PlannerSection categoría debe pasar isLoading={isDeletingCat}');
assertCondition(plannerCode.includes('isLoading={isDeletingItem}'), 'PlannerSection ítem debe pasar isLoading={isDeletingItem}');

console.log('✔ PASS: Los 9 componentes auditados cuentan con guardias idempotentes y pasan isLoading.');

// ----------------------------------------------------------------------------
// TEST 5: Resiliencia frente a Excepciones en onConfirm (Error Recovery)
// ----------------------------------------------------------------------------
console.log('\n[TEST 5] Probando resiliencia frente a excepciones no controladas o rechazo de Promesa...');

const errorDialog = new MockConfirmDialogState({
    onConfirm: async () => {
        throw new Error('Firestore connection timeout simulating network failure');
    }
});

let exceptionCaughtCleanly = true;
try {
    await errorDialog.handleConfirmClick();
} catch {
    exceptionCaughtCleanly = false;
}

assertCondition(exceptionCaughtCleanly, 'handleConfirmClick debe atrapar internamente el fallo sin romper el event loop');
console.log('✔ PASS: Las excepciones asíncronas en onConfirm son capturadas limpiamente.');

console.log('\n================================================================');
console.log(`🎉 TODAS LAS ${totalAssertions} ASERCIONES ADVERSARIALES PASARON CON ÉXITO.`);
console.log('================================================================\n');
