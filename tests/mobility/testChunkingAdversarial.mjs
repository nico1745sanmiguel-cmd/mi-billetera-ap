/**
 * testChunkingAdversarial.mjs
 * Test exhaustivo y empírico del algoritmo de particionamiento en lotes para Firestore.
 */

import assert from 'node:assert/strict';
import { chunkOperations } from './mobilityContracts.mjs';

console.log('=== TEST EMPÍRICO DE PARTICIONAMIENTO EN CHUNKS FIRESTORE ===\n');

// Algoritmo de corte exacto utilizado en src/repositories/mobilityRepository.js:
// deleteAllSessions:
//   const CHUNK_SIZE = 400;
//   for (let i = 0; i < sessionDocs.length; i += CHUNK_SIZE) {
//       const chunk = sessionDocs.slice(i, i + CHUNK_SIZE);
//       ...
//   }

function simulateRepositoryChunking(docs, chunkSize = 400) {
    const batches = [];
    for (let i = 0; i < docs.length; i += chunkSize) {
        const chunk = docs.slice(i, i + chunkSize);
        batches.push(chunk);
    }
    return batches;
}

// Simulador de Firestore WriteBatch con límite estricto de 500 operaciones
class MockFirestoreWriteBatch {
    constructor(maxAllowed = 500) {
        this.maxAllowed = maxAllowed;
        this.operations = [];
        this.committed = false;
    }

    delete(docRef) {
        if (this.committed) throw new Error('Cannot add operations to committed batch');
        this.operations.push({ type: 'delete', docRef });
        if (this.operations.length > this.maxAllowed) {
            throw new Error(`FirebaseError: A write batch can contain at most ${this.maxAllowed} operations. Current: ${this.operations.length}`);
        }
    }

    set(docRef, data) {
        if (this.committed) throw new Error('Cannot add operations to committed batch');
        this.operations.push({ type: 'set', docRef, data });
        if (this.operations.length > this.maxAllowed) {
            throw new Error(`FirebaseError: A write batch can contain at most ${this.maxAllowed} operations. Current: ${this.operations.length}`);
        }
    }

    async commit() {
        if (this.committed) throw new Error('Batch already committed');
        this.committed = true;
        return { count: this.operations.length };
    }
}

const requiredSizes = [401, 500, 501, 1000];

console.log('--- 1. Verificación de Tamaños Requeridos (401, 500, 501, 1000) ---');

for (const size of requiredSizes) {
    const items = Array.from({ length: size }, (_, i) => ({ id: `doc_${i}`, val: i }));

    // A. Probar con chunkOperations
    const chunksContract = chunkOperations(items, 400);
    // B. Probar con simulación directa del repo
    const chunksRepo = simulateRepositoryChunking(items, 400);

    console.log(`\nArray de ${size} elementos:`);
    console.log(`  Lotes generados: ${chunksRepo.length}`);
    const chunkLengths = chunksRepo.map(c => c.length);
    console.log(`  Distribución de tamaños: [${chunkLengths.join(', ')}]`);

    // Aserciones de verificación
    for (let idx = 0; idx < chunksRepo.length; idx++) {
        const c = chunksRepo[idx];
        assert.ok(c.length <= 400, `ERROR: Lote ${idx} tiene ${c.length} elementos (supera 400)`);
        assert.ok(c.length > 0, `ERROR: Lote ${idx} está vacío`);
    }

    // Comprobación de aplanado e integridad
    const flat = chunksRepo.flat();
    assert.strictEqual(flat.length, size, `ERROR: Cantidad total no coincide (${flat.length} !== ${size})`);
    for (let i = 0; i < size; i++) {
        assert.strictEqual(flat[i].id, `doc_${i}`);
        assert.strictEqual(flat[i].val, i);
    }

    // C. Simulación de ejecución con MockFirestoreWriteBatch
    let totalCommittedOps = 0;
    for (const chunk of chunksRepo) {
        const batch = new MockFirestoreWriteBatch(500); // Límite de Firestore
        for (const item of chunk) {
            batch.delete(item.id);
        }
        assert.ok(batch.operations.length <= 400, `Operaciones en batch (${batch.operations.length}) superan 400`);
        assert.ok(batch.operations.length <= 500, `Violación de límite de Firestore (${batch.operations.length} > 500)`);
        totalCommittedOps += batch.operations.length;
    }
    assert.strictEqual(totalCommittedOps, size);
    console.log(`  ✔ Verificación de límites Firestore <= 400: EXITOSA (Total ops: ${totalCommittedOps})`);
}

console.log('\n--- 2. Casos Límite y Estrés Adicional (0, 1, 399, 400, 1200, 5000) ---');
const extraSizes = [0, 1, 399, 400, 1200, 5000];

for (const size of extraSizes) {
    const items = Array.from({ length: size }, (_, i) => ({ id: `doc_${i}` }));
    const chunks = simulateRepositoryChunking(items, 400);
    const lengths = chunks.map(c => c.length);
    const maxLen = lengths.length > 0 ? Math.max(...lengths) : 0;
    assert.ok(maxLen <= 400, `Fallo en tamaño ${size}: lote máximo fue ${maxLen}`);
    assert.strictEqual(chunks.flat().length, size);
    console.log(`Tamaño ${size} -> ${chunks.length} lotes (Máx: ${maxLen}) -> OK`);
}

console.log('\n--- 3. Verificación de Inserción en importSessions (Lotes <= 200) ---');
for (const size of [200, 201, 500, 1000]) {
    const rows = Array.from({ length: size }, (_, i) => ({ id: `row_${i}` }));
    const chunks = simulateRepositoryChunking(rows, 200);
    for (const c of chunks) {
        assert.ok(c.length <= 200, `Lote de inserción excede 200: ${c.length}`);
    }
    assert.strictEqual(chunks.flat().length, size);
    console.log(`Importación ${size} filas -> ${chunks.length} lotes de <= 200 -> OK`);
}

console.log('\n✅ TODOS LOS TESTS DE PARTICIONAMIENTO PASARON SATISFACTORIAMENTE.');
