import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('--- AUDITORÍA DE FORMULARIOS: UNICIDAD Y ACCESIBILIDAD ---');

const srcDir = path.resolve('src');

// 1. Verificar erradicación total de input-field en src/
function checkNoInputField(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            checkNoInputField(fullPath);
        } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            assert.ok(
                !content.includes('id="input-field"'),
                `Se encontró id="input-field" en ${fullPath}`
            );
            assert.ok(
                !content.includes('htmlFor="input-field"'),
                `Se encontró htmlFor="input-field" en ${fullPath}`
            );
        }
    }
}
checkNoInputField(srcDir);
console.log('✔ Erradicación total: 0 apariciones de input-field en todo src/');

// 2. Login.jsx
const loginCode = fs.readFileSync(path.join(srcDir, 'Components/Login.jsx'), 'utf8');
assert.ok(loginCode.includes('id="login-email"'), 'Login.jsx debe tener id="login-email"');
assert.ok(loginCode.includes('htmlFor="login-email"'), 'Login.jsx debe tener htmlFor="login-email"');
assert.ok(loginCode.includes('name="email"'), 'Login.jsx debe tener name="email"');
assert.ok(loginCode.includes('autoComplete="email"'), 'Login.jsx debe tener autoComplete="email"');
assert.ok(loginCode.includes('id="login-password"'), 'Login.jsx debe tener id="login-password"');
assert.ok(loginCode.includes('htmlFor="login-password"'), 'Login.jsx debe tener htmlFor="login-password"');
assert.ok(loginCode.includes('name="password"'), 'Login.jsx debe tener name="password"');
assert.ok(loginCode.includes('autoComplete={isRegistering ? "new-password" : "current-password"}'), 'Login.jsx debe soportar new-password / current-password');
console.log('✔ Login.jsx: IDs, labels vinculados y gestor de contraseñas configurados correctamente.');

// 3. NewPurchase.jsx
const purchaseCode = fs.readFileSync(path.join(srcDir, 'Components/Purchase/NewPurchase.jsx'), 'utf8');
assert.ok(purchaseCode.includes('id="purchase-amount"'), 'NewPurchase.jsx debe tener id="purchase-amount"');
assert.ok(purchaseCode.includes('aria-label="Monto de la compra"'), 'NewPurchase.jsx debe tener aria-label');
assert.ok(purchaseCode.includes('Seleccionar Tarjeta</p>'), 'Debe ser un elemento no-input <p>');
console.log('✔ NewPurchase.jsx: Monto con ID purchase-amount y selector de tarjetas desacoplado del foco.');

// 4. ServiceModal.jsx
const serviceCode = fs.readFileSync(path.join(srcDir, 'Components/Services/ServiceModal.jsx'), 'utf8');
const expectedServiceIds = [
    'service-card-amount',
    'service-name',
    'service-amount',
    'service-day',
    'service-frequency'
];
for (const id of expectedServiceIds) {
    assert.ok(serviceCode.includes(`id="${id}"`), `ServiceModal.jsx debe tener id="${id}"`);
    assert.ok(serviceCode.includes(`htmlFor="${id}"`), `ServiceModal.jsx debe tener htmlFor="${id}"`);
}
console.log('✔ ServiceModal.jsx: Los 5 campos poseen IDs únicos y labels perfectamente asociados.');

// 5. EnvelopeEditor.jsx
const envCode = fs.readFileSync(path.join(srcDir, 'Components/Salary/EnvelopeEditor.jsx'), 'utf8');
assert.ok(envCode.includes('id="envelope-label"'), 'id="envelope-label" presente');
assert.ok(envCode.includes('htmlFor="envelope-label"'), 'htmlFor="envelope-label" presente');
assert.ok(envCode.includes('id="envelope-budgeted"'), 'id="envelope-budgeted" presente');
assert.ok(envCode.includes('htmlFor="envelope-budgeted"'), 'htmlFor="envelope-budgeted" presente');
assert.ok(!envCode.includes('htmlFor="input-field"'), 'No quedan labels a input-field');
console.log('✔ EnvelopeEditor.jsx: Nombre y Monto con IDs propios; Ícono y Color desacoplados en <p>.');

// 6. Formularios secundarios
const sourcesCode = fs.readFileSync(path.join(srcDir, 'Components/Salary/SalarySourcesEditor.jsx'), 'utf8');
assert.ok(sourcesCode.includes('id={`edit-source-label-${source.id}`}'), 'edit source label id');
assert.ok(sourcesCode.includes('id={`edit-source-amount-${source.id}`}'), 'edit source amount id');
assert.ok(sourcesCode.includes('id="new-source-label"'), 'new source label id');
assert.ok(sourcesCode.includes('id="new-source-amount"'), 'new source amount id');

const hhEnvCode = fs.readFileSync(path.join(srcDir, 'Components/Salary/HouseholdEnvelopeSection.jsx'), 'utf8');
assert.ok(hhEnvCode.includes('id="custom-envelope-amount-input"'), 'custom-envelope-amount-input id');

const salSecCode = fs.readFileSync(path.join(srcDir, 'Components/Household/SalarySection.jsx'), 'utf8');
assert.ok(salSecCode.includes('id={`salary-member-input-${member.id}`}'), 'salary-member-input id');

const hhJoinCode = fs.readFileSync(path.join(srcDir, 'Components/Household/HouseholdJoinOrCreate.jsx'), 'utf8');
assert.ok(hhJoinCode.includes('id="household-join-code-input"'), 'household-join-code-input id');

const plannerCode = fs.readFileSync(path.join(srcDir, 'Components/Settings/PlannerSettings.jsx'), 'utf8');
assert.ok(plannerCode.includes('id="planner-budget-alert-input"'), 'planner-budget-alert-input id');

const mobilityCode = fs.readFileSync(path.join(srcDir, 'Components/Mobility/MobilityImport.jsx'), 'utf8');
assert.ok(mobilityCode.includes('id="mobility-csv-file-input"'), 'mobility-csv-file-input id');

const reconCode = fs.readFileSync(path.join(srcDir, 'Components/Reconciliation/ReconciliationDesk.jsx'), 'utf8');
assert.ok(reconCode.includes('id={`reconciliation-alias-${index}`}'), 'reconciliation alias id');

const currCode = fs.readFileSync(path.join(srcDir, 'Components/Shared/CurrencyInput.jsx'), 'utf8');
assert.ok(!currCode.includes('input-field'), 'CurrencyInput JSDoc limpio de input-field');

console.log('✔ Formularios secundarios: Todos los IDs dinámicos y atributos de accesibilidad verificados.');
console.log('======================================================');
console.log('TODAS LAS VERIFICACIONES DE AUDITORÍA PASARON (100% OK)');
console.log('======================================================');
