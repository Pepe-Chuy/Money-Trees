/**
 * Pruebas de pin.js: PBKDF2, registro del PIN y reglas de bloqueo.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  pbkdf2, createPinRecord, verifyPin, isValidPin, lockoutDelayMs, shouldRelock,
  bytesToBase64, base64ToBytes,
} from '../src/core/pin.js';

/** Bytes -> hexadecimal, para comparar con los vectores publicados. */
const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

describe('pbkdf2', () => {
  it('coincide con el vector de prueba oficial (RFC 7914, sección 11)', async () => {
    // PBKDF2-HMAC-SHA256(P="passwd", S="salt", c=1): primeros 32 bytes del resultado publicado.
    const out = await pbkdf2('passwd', new TextEncoder().encode('salt'), 1, 256);
    assert.equal(toHex(out), '55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc');
  });
});

describe('createPinRecord / verifyPin', () => {
  // Pocas iteraciones para que la prueba sea rápida; la lógica es la misma.
  const ITER = 1000;

  it('acepta el PIN correcto y rechaza los demás', async () => {
    const record = await createPinRecord('4821', ITER);
    assert.equal(await verifyPin('4821', record), true);
    assert.equal(await verifyPin('4820', record), false);
    assert.equal(await verifyPin('48210', record), false);
    assert.equal(await verifyPin('', record), false);
  });

  it('nunca guarda el PIN en claro y usa sal distinta cada vez', async () => {
    const a = await createPinRecord('123456', ITER);
    const b = await createPinRecord('123456', ITER);
    assert.ok(!JSON.stringify(a).includes('123456'));
    assert.notEqual(a.salt, b.salt);
    assert.notEqual(a.hash, b.hash); // mismo PIN, sal distinta -> hash distinto
    assert.equal(a.length, 6);
    assert.equal(a.iterations, ITER);
  });

  it('rechaza crear un PIN con formato inválido', async () => {
    await assert.rejects(createPinRecord('12a4', ITER));
  });
});

describe('isValidPin', () => {
  it('solo de 4 a 6 dígitos', () => {
    assert.equal(isValidPin('1234'), true);
    assert.equal(isValidPin('123456'), true);
    assert.equal(isValidPin('123'), false);
    assert.equal(isValidPin('1234567'), false);
    assert.equal(isValidPin('12 34'), false);
    assert.equal(isValidPin(1234), false);
  });
});

describe('lockoutDelayMs', () => {
  it('sin espera en los primeros 4 fallos, luego se duplica con tope de 15 min', () => {
    assert.equal(lockoutDelayMs(0), 0);
    assert.equal(lockoutDelayMs(4), 0);
    assert.equal(lockoutDelayMs(5), 30_000);
    assert.equal(lockoutDelayMs(6), 60_000);
    assert.equal(lockoutDelayMs(7), 120_000);
    assert.equal(lockoutDelayMs(20), 15 * 60_000);
  });
});

describe('shouldRelock', () => {
  it('bloquea solo si pasó el tiempo configurado', () => {
    assert.equal(shouldRelock(null, 1_000_000, 60_000), false); // nunca se ocultó
    assert.equal(shouldRelock(1_000_000, 1_059_999, 60_000), false);
    assert.equal(shouldRelock(1_000_000, 1_060_000, 60_000), true);
    assert.equal(shouldRelock(1_000_000, 1_000_000, 0), true); // 0 = siempre
  });
});

describe('base64', () => {
  it('ida y vuelta con todos los valores de byte', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    assert.deepEqual(base64ToBytes(bytesToBase64(bytes)), bytes);
  });
});
