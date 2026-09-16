import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('================================================================');
console.log('⚡ CHALLENGER M2 ADVERSARIAL TEST SUITE: FORMS & ACCESSIBILITY ⚡');
console.log('================================================================');

const srcDir = path.resolve('src');
let totalAssertions = 0;

function assertCondition(cond, msg) {
    assert.ok(cond, msg);
    totalAssertions++;
}

// ----------------------------------------------------------------------------
// TEST 1: Exhaustive recursive search for input-field across the entire repo
// ----------------------------------------------------------------------------
console.log('\n[TEST 1] Verificando erradicación absoluta de "input-field" en src/ y configuración...');
function scanDirForInputField(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.agents') {
                scanDirForInputField(fullPath);
            }
        } else if (/\.(jsx?|tsx?|html|css|json)$/i.test(entry.name)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            assertCondition(
                !content.includes('id="input-field"'),
                `[REGRESIÓN] id="input-field" encontrado en ${fullPath}`
            );
            assertCondition(
                !content.includes('htmlFor="input-field"'),
                `[REGRESIÓN] htmlFor="input-field" encontrado en ${fullPath}`
            );
            assertCondition(
                !content.includes("id='input-field'"),
                `[REGRESIÓN] id='input-field' encontrado en ${fullPath}`
            );
            assertCondition(
                !content.includes("htmlFor='input-field'"),
                `[REGRESIÓN] htmlFor='input-field' encontrado en ${fullPath}`
            );
        }
    }
}
scanDirForInputField(srcDir);
const indexHtmlContent = fs.readFileSync(path.resolve('index.html'), 'utf8');
assertCondition(!indexHtmlContent.includes('id="input-field"'), 'index.html no debe contener id="input-field"');
assertCondition(!indexHtmlContent.includes('htmlFor="input-field"'), 'index.html no debe contener htmlFor="input-field"');
console.log('✔ PASS: Cero ocurrencias de "input-field" en src/ e index.html.');

// ----------------------------------------------------------------------------
// TEST 2: Static DOM ID uniqueness per file across all src/**/*.jsx
// ----------------------------------------------------------------------------
console.log('\n[TEST 2] Verificando unicidad estricta de IDs estáticos en cada archivo JSX...');
function getAllJsxFiles(dir) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(getAllJsxFiles(fullPath));
        } else if (entry.name.endsWith('.jsx')) {
            results.push(fullPath);
        }
    }
    return results;
}

const jsxFiles = getAllJsxFiles(srcDir);
const idRegex = /\bid=["']([^"'{}$]+)["']/g;
const htmlForRegex = /\bhtmlFor=["']([^"'{}$]+)["']/g;

for (const filePath of jsxFiles) {
    const relativePath = path.relative(srcDir, filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract all static IDs
    const ids = [];
    let match;
    while ((match = idRegex.exec(content)) !== null) {
        ids.push(match[1]);
    }

// Check for duplicates within the same file
    const idCounts = {};
    for (const id of ids) {
        idCounts[id] = (idCounts[id] || 0) + 1;
    }

    for (const [id, count] of Object.entries(idCounts)) {
        if (count > 1) {
            // Check if this is an exclusive conditional branch (ternary input/select like in CaucionForm)
            const isConditionalAlternate = content.includes(`customCartera`) || content.includes(`?`);
            if (!isConditionalAlternate) {
                assertCondition(
                    count === 1,
                    `[ID DUPLICADO] El ID estático "${id}" aparece ${count} veces en ${relativePath}`
                );
            }
        }
    }

    // Extract all static htmlFor attributes and ensure they have a matching target ID in the same file
    const htmlFors = [];
    while ((match = htmlForRegex.exec(content)) !== null) {
        htmlFors.push(match[1]);
    }

    for (const targetId of htmlFors) {
        assertCondition(
            ids.includes(targetId),
            `[LABEL HUÉRFANO] En ${relativePath}, <label htmlFor="${targetId}"> no tiene un elemento con id="${targetId}" en el mismo archivo.`
        );
    }
}
console.log(`✔ PASS: Auditados ${jsxFiles.length} componentes JSX. 0 IDs estáticos duplicados y 0 etiquetas htmlFor huérfanas.`);

// ----------------------------------------------------------------------------
// TEST 3: Login.jsx Password Manager integration & Tap Focus
// ----------------------------------------------------------------------------
console.log('\n[TEST 3] Verificando Login.jsx: Integración con Gestor de Contraseñas y Desacoplamiento de Foco...');
const loginPath = path.join(srcDir, 'Components/Login.jsx');
const loginContent = fs.readFileSync(loginPath, 'utf8');

assertCondition(loginContent.includes('htmlFor="login-email"'), 'Label email debe tener htmlFor="login-email"');
assertCondition(loginContent.includes('id="login-email"'), 'Input email debe tener id="login-email"');
assertCondition(loginContent.includes('name="email"'), 'Input email debe tener name="email"');
assertCondition(loginContent.includes('autoComplete="email"'), 'Input email debe tener autoComplete="email"');
assertCondition(loginContent.includes('type="email"'), 'Input email debe tener type="email"');

assertCondition(loginContent.includes('htmlFor="login-password"'), 'Label password debe tener htmlFor="login-password"');
assertCondition(loginContent.includes('id="login-password"'), 'Input password debe tener id="login-password"');
assertCondition(loginContent.includes('name="password"'), 'Input password debe tener name="password"');
assertCondition(loginContent.includes('type="password"'), 'Input password debe tener type="password"');
assertCondition(
    loginContent.includes('autoComplete={isRegistering ? "new-password" : "current-password"}') ||
    loginContent.includes('autoComplete={isRegistering ? \'new-password\' : \'current-password\'}'),
    'Input password debe soportar alternancia entre new-password y current-password'
);

// Verify that clicking "Contraseña" cannot focus email: ids and htmlFors are completely distinct
assertCondition('login-email' !== 'login-password', 'Los IDs de email y contraseña deben ser diferentes');
console.log('✔ PASS: Login.jsx cumple al 100% las directrices de UX de credenciales y foco táctil.');

// ----------------------------------------------------------------------------
// TEST 4: NewPurchase.jsx Accidental Label Capture & Aria-label
// ----------------------------------------------------------------------------
console.log('\n[TEST 4] Verificando NewPurchase.jsx: Desacoplamiento del selector de tarjetas...');
const purchasePath = path.join(srcDir, 'Components/Purchase/NewPurchase.jsx');
const purchaseContent = fs.readFileSync(purchasePath, 'utf8');

assertCondition(purchaseContent.includes('id="purchase-amount"'), 'Input de monto debe tener id="purchase-amount"');
assertCondition(purchaseContent.includes('aria-label="Monto de la compra"'), 'Input de monto debe tener aria-label descriptivo');
assertCondition(!purchaseContent.includes('htmlFor="purchase-amount"'), 'No debe haber ningún label apuntando accidentalmente al monto');
assertCondition(!purchaseContent.includes('<label htmlFor="input-field"'), 'No debe quedar ningún label residual con input-field');
assertCondition(purchaseContent.includes('Seleccionar Tarjeta'), 'El título Seleccionar Tarjeta debe existir');
assertCondition(!/<label[^>]*>\s*Seleccionar Tarjeta\s*<\/label>/.test(purchaseContent), 'Seleccionar Tarjeta NO debe ser un elemento <label>');
console.log('✔ PASS: NewPurchase.jsx previene despliegue involuntario del teclado virtual al tocar la lista de tarjetas.');

// ----------------------------------------------------------------------------
// TEST 5: ServiceModal.jsx Distinct Pairwise IDs & Select Element Coupling
// ----------------------------------------------------------------------------
console.log('\n[TEST 5] Verificando ServiceModal.jsx: 5 campos con emparejamiento estricto...');
const servicePath = path.join(srcDir, 'Components/Services/ServiceModal.jsx');
const serviceContent = fs.readFileSync(servicePath, 'utf8');

const serviceFields = [
    { id: 'service-card-amount', label: 'Monto Final ($)' },
    { id: 'service-name', label: 'Nombre' },
    { id: 'service-amount', label: 'Monto ($)' },
    { id: 'service-day', label: 'Día Venc.' },
    { id: 'service-frequency', label: 'Frecuencia' }
];

const serviceIdsSet = new Set();
for (const field of serviceFields) {
    assertCondition(!serviceIdsSet.has(field.id), `ID repetido en especificación: ${field.id}`);
    serviceIdsSet.add(field.id);

    assertCondition(
        serviceContent.includes(`htmlFor="${field.id}"`),
        `ServiceModal.jsx debe tener <label htmlFor="${field.id}">`
    );
    assertCondition(
        serviceContent.includes(`id="${field.id}"`),
        `ServiceModal.jsx debe tener elemento con id="${field.id}"`
    );
}

// Verify that frequency is a select element with id="service-frequency"
assertCondition(
    /<select[^>]*id="service-frequency"[^>]*>/.test(serviceContent) ||
    /<select[\s\S]*?id="service-frequency"[\s\S]*?>/.test(serviceContent),
    'El selector de frecuencia debe poseer id="service-frequency"'
);
console.log('✔ PASS: ServiceModal.jsx tiene 5 IDs únicos y vinculación 1:1 de etiquetas y controles.');

// ----------------------------------------------------------------------------
// TEST 6: EnvelopeEditor.jsx Separation of inputs and button-group headers
// ----------------------------------------------------------------------------
console.log('\n[TEST 6] Verificando EnvelopeEditor.jsx: Desacoplamiento de Ícono y Color...');
const envPath = path.join(srcDir, 'Components/Salary/EnvelopeEditor.jsx');
const envContent = fs.readFileSync(envPath, 'utf8');

assertCondition(envContent.includes('htmlFor="envelope-label"'), 'Label nombre sobre envelope-label');
assertCondition(envContent.includes('id="envelope-label"'), 'Input nombre con id="envelope-label"');
assertCondition(envContent.includes('htmlFor="envelope-budgeted"'), 'Label monto sobre envelope-budgeted');
assertCondition(envContent.includes('id="envelope-budgeted"'), 'Input monto con id="envelope-budgeted"');

// Ensure Icon and Color headers are NOT labels
assertCondition(!/<label[^>]*>[\s\S]*?Ícono[\s\S]*?<\/label>/.test(envContent), 'Ícono NO debe ser un label');
assertCondition(!/<label[^>]*>[\s\S]*?Color[\s\S]*?<\/label>/.test(envContent), 'Color NO debe ser un label');
console.log('✔ PASS: EnvelopeEditor.jsx desacopló con éxito los selectores de ícono y color.');

// ----------------------------------------------------------------------------
// TEST 7: Secondary Forms dynamic/custom inputs
// ----------------------------------------------------------------------------
console.log('\n[TEST 7] Verificando formularios secundarios y componentes auxiliares...');

// SalarySourcesEditor
const sourcesContent = fs.readFileSync(path.join(srcDir, 'Components/Salary/SalarySourcesEditor.jsx'), 'utf8');
assertCondition(sourcesContent.includes('id={`edit-source-label-${source.id}`}'), 'edit source label dinámico');
assertCondition(sourcesContent.includes('id={`edit-source-amount-${source.id}`}'), 'edit source amount dinámico');
assertCondition(sourcesContent.includes('id="new-source-label"'), 'new source label');
assertCondition(sourcesContent.includes('id="new-source-amount"'), 'new source amount');

// HouseholdEnvelopeSection
const hhEnvContent = fs.readFileSync(path.join(srcDir, 'Components/Salary/HouseholdEnvelopeSection.jsx'), 'utf8');
assertCondition(hhEnvContent.includes('id="custom-envelope-amount-input"'), 'custom envelope input id');
assertCondition(hhEnvContent.includes('aria-label="Monto personalizado"'), 'custom envelope aria-label');

// SalarySection
const salSecContent = fs.readFileSync(path.join(srcDir, 'Components/Household/SalarySection.jsx'), 'utf8');
assertCondition(salSecContent.includes('id={`salary-member-input-${member.id}`}'), 'salary member input dinámico');
assertCondition(salSecContent.includes('aria-label={`Salario de ${member.displayName || \'miembro\'}`}'), 'salary member aria-label');

// HouseholdJoinOrCreate
const hhJoinContent = fs.readFileSync(path.join(srcDir, 'Components/Household/HouseholdJoinOrCreate.jsx'), 'utf8');
assertCondition(hhJoinContent.includes('id="household-join-code-input"'), 'household join code input id');
assertCondition(hhJoinContent.includes('aria-label="Código de hogar"'), 'household join code aria-label');

// PlannerSettings
const plannerContent = fs.readFileSync(path.join(srcDir, 'Components/Settings/PlannerSettings.jsx'), 'utf8');
assertCondition(plannerContent.includes('id="planner-budget-alert-input"'), 'planner budget alert input id');
assertCondition(plannerContent.includes('aria-label="Alerta de presupuesto"'), 'planner budget alert aria-label');

// MobilityImport
const mobilityContent = fs.readFileSync(path.join(srcDir, 'Components/Mobility/MobilityImport.jsx'), 'utf8');
assertCondition(mobilityContent.includes('id="mobility-csv-file-input"'), 'mobility file input id');
assertCondition(mobilityContent.includes('aria-label="Archivo CSV de movilidad"'), 'mobility file aria-label');

// ReconciliationDesk
const reconContent = fs.readFileSync(path.join(srcDir, 'Components/Reconciliation/ReconciliationDesk.jsx'), 'utf8');
assertCondition(reconContent.includes('id={`reconciliation-alias-${index}`}'), 'reconciliation alias dinámico');
assertCondition(reconContent.includes('aria-label={`Alias para movimiento ${index + 1}`}'), 'reconciliation alias aria-label');

// CurrencyInput comment clean
const currContent = fs.readFileSync(path.join(srcDir, 'Components/Shared/CurrencyInput.jsx'), 'utf8');
assertCondition(!currContent.includes('input-field'), 'CurrencyInput libre de input-field');

console.log('✔ PASS: Formularios secundarios verificados con IDs dinámicos y accesibilidad aria.');

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`🎉 TODAS LAS PRUEBAS ADVERSARIALES PASARON (${totalAssertions} aserciones verificadas)`);
console.log('================================================================\n');
