import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('--- AUDITORÍA AUTOMATIZADA: ACCIONES DESTRUCTIVAS Y CONFIRMACIONES ---');

const srcDir = path.resolve('src');

// 1. Verificar erradicación total de alert() y confirm() en todo src/
function checkNoNativeAlertOrConfirm(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            checkNoNativeAlertOrConfirm(fullPath);
        } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Chequear confirm( excepto si fuera un identificador seguro
            const confirmMatches = content.match(/\bconfirm\s*\(/g);
            assert.strictEqual(
                confirmMatches,
                null,
                `Se detectó llamada a confirm() en ${fullPath}`
            );

            // Chequear alert(
            const alertMatches = content.match(/\balert\s*\(/g);
            assert.strictEqual(
                alertMatches,
                null,
                `Se detectó llamada a alert() en ${fullPath}`
            );
        }
    }
}
checkNoNativeAlertOrConfirm(srcDir);
console.log('✔ Erradicación total: 0 llamadas a alert() o confirm() en todo src/');

// 2. SalarySourcesEditor.jsx
const salaryCode = fs.readFileSync(path.join(srcDir, 'Components/Salary/SalarySourcesEditor.jsx'), 'utf8');
assert.ok(salaryCode.includes("import ConfirmDialog from '../UI/ConfirmDialog'"), 'SalarySourcesEditor debe importar ConfirmDialog');
assert.ok(salaryCode.includes('deletingSource'), 'SalarySourcesEditor debe tener estado deletingSource');
assert.ok(salaryCode.includes('isDeleting'), 'SalarySourcesEditor debe tener estado isDeleting');
assert.ok(salaryCode.includes('setDeletingSource(source)'), 'El botón eliminar debe activar setDeletingSource');
assert.ok(salaryCode.includes('isLoading={isDeleting}'), 'ConfirmDialog en SalarySourcesEditor debe pasar isLoading');
assert.ok(salaryCode.includes('isDanger={true}'), 'ConfirmDialog en SalarySourcesEditor debe pasar isDanger');
console.log('✔ SalarySourcesEditor.jsx: ConfirmDialog con isLoading e isDanger implementado correctamente.');

// 3. CarterasPanel.jsx
const carterasCode = fs.readFileSync(path.join(srcDir, 'Components/Savings/CarterasPanel.jsx'), 'utf8');
assert.ok(carterasCode.includes("import ConfirmDialog from '../UI/ConfirmDialog'"), 'CarterasPanel debe importar ConfirmDialog');
assert.ok(carterasCode.includes('deletingCartera'), 'CarterasPanel debe tener estado deletingCartera');
assert.ok(carterasCode.includes('isDeleting'), 'CarterasPanel debe tener estado isDeleting');
assert.ok(carterasCode.includes('setDeletingCartera(cartera)'), 'El botón papelera debe activar setDeletingCartera');
assert.ok(carterasCode.includes('isLoading={isDeleting}'), 'ConfirmDialog en CarterasPanel debe pasar isLoading');
assert.ok(carterasCode.includes('isDanger={true}'), 'ConfirmDialog en CarterasPanel debe pasar isDanger');
console.log('✔ CarterasPanel.jsx: ConfirmDialog con isLoading e isDanger implementado correctamente.');

// 4. NotesDashboard.jsx
const notesCode = fs.readFileSync(path.join(srcDir, 'Components/Notes/NotesDashboard.jsx'), 'utf8');
assert.ok(notesCode.includes("import ConfirmDialog from '../UI/ConfirmDialog'"), 'NotesDashboard debe importar ConfirmDialog');
assert.ok(notesCode.includes('deletingNote'), 'NotesDashboard debe tener estado deletingNote');
assert.ok(notesCode.includes('isDeleting'), 'NotesDashboard debe tener estado isDeleting');
assert.ok(notesCode.includes('setDeletingNote(note)'), 'Los botones papelera deben activar setDeletingNote');
assert.ok(notesCode.includes('isLoading={isDeleting}'), 'ConfirmDialog en NotesDashboard debe pasar isLoading');
assert.ok(notesCode.includes('isDanger={true}'), 'ConfirmDialog en NotesDashboard debe pasar isDanger');
console.log('✔ NotesDashboard.jsx: ConfirmDialog con isLoading e isDanger en notas activas y completadas.');

// 5. HouseholdManager.jsx
const householdCode = fs.readFileSync(path.join(srcDir, 'Components/Household/HouseholdManager.jsx'), 'utf8');
assert.ok(!householdCode.includes('window.confirm'), 'HouseholdManager no debe usar window.confirm');
assert.ok(!householdCode.includes('alert('), 'HouseholdManager no debe usar alert()');
assert.ok(householdCode.includes('isRestoreOpen'), 'HouseholdManager debe gestionar isRestoreOpen');
assert.ok(householdCode.includes('isRestoring'), 'HouseholdManager debe gestionar isRestoring');
assert.ok(householdCode.includes('isLoading={isRestoring}'), 'Modal de restaurar debe pasar isLoading={isRestoring}');
assert.ok(householdCode.includes('isLoading={isLeaving || loading}'), 'Modal de salir debe pasar isLoading');
console.log('✔ HouseholdManager.jsx: Erradicación de confirm/alert y modales protegidos con isLoading.');

// 6. ServicesManager.jsx
const servicesCode = fs.readFileSync(path.join(srcDir, 'Components/Services/ServicesManager.jsx'), 'utf8');
assert.ok(!servicesCode.includes('alert('), 'ServicesManager no debe usar alert()');
assert.ok(servicesCode.includes('isDeletingService'), 'ServicesManager debe gestionar isDeletingService');
assert.ok(servicesCode.includes('isLoading={isDeletingService}'), 'ConfirmDialog en ServicesManager debe pasar isLoading={isDeletingService}');
console.log('✔ ServicesManager.jsx: Erradicación de alert() y ConfirmDialog protegido con isLoading.');

// 7. CardDetail.jsx
const cardDetailCode = fs.readFileSync(path.join(srcDir, 'Components/Cards/CardDetail.jsx'), 'utf8');
assert.ok(cardDetailCode.includes('isLoading={isDeleting}'), 'CardDetail ConfirmDialog debe pasar isLoading={isDeleting}');
console.log('✔ CardDetail.jsx: ConfirmDialog enriquecido con isLoading={isDeleting}.');

// 8. StopLossModal.jsx
const stopLossCode = fs.readFileSync(path.join(srcDir, 'Components/Savings/StopLossModal.jsx'), 'utf8');
assert.ok(stopLossCode.includes('isLoading={loading}'), 'StopLossModal ConfirmDialog debe pasar isLoading={loading}');
assert.ok(stopLossCode.includes('isDanger={true}'), 'StopLossModal ConfirmDialog debe pasar isDanger={true}');
console.log('✔ StopLossModal.jsx: ConfirmDialog enriquecido con isLoading e isDanger.');

// 9. SuperList.jsx
const superListCode = fs.readFileSync(path.join(srcDir, 'Components/Supermarket/SuperList.jsx'), 'utf8');
assert.ok(superListCode.includes('isLoading={isDeleting}'), 'SuperList ConfirmDialog debe pasar isLoading={isDeleting}');
assert.ok(superListCode.includes('isDanger={true}'), 'SuperList ConfirmDialog debe pasar isDanger={true}');
console.log('✔ SuperList.jsx: ConfirmDialog enriquecido con isLoading e isDanger.');

// 10. PlannerSection.jsx
const plannerCode = fs.readFileSync(path.join(srcDir, 'Components/Supermarket/PlannerSection.jsx'), 'utf8');
assert.ok(plannerCode.includes('isLoading={isDeletingCat}'), 'PlannerSection categoría debe pasar isLoading={isDeletingCat}');
assert.ok(plannerCode.includes('isLoading={isDeletingItem}'), 'PlannerSection ítem debe pasar isLoading={isDeletingItem}');
console.log('✔ PlannerSection.jsx: ConfirmDialogs enriquecidos con isLoading para categorías e ítems.');

console.log('\n========================================');
console.log('🎉 TODOS LOS TESTS DE AUDITORÍA PASARON CON ÉXITO');
console.log('========================================\n');
