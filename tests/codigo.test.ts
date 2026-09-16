import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generarCodigo, hashearCodigo, verificarCodigo } from "@/lib/codigo";
import { LONGITUD_CODIGO } from "@/lib/contrato-api";

const REPETICIONES = 200;

describe("código de 5 dígitos", () => {
  it("siempre genera exactamente 5 dígitos", () => {
    for (let intento = 0; intento < REPETICIONES; intento += 1) {
      assert.match(generarCodigo(), new RegExp(`^\\d{${LONGITUD_CODIGO}}$`));
    }
  });

  it("nunca guarda el código en claro", async () => {
    const codigo = generarCodigo();
    const hash = await hashearCodigo(codigo);
    assert.notEqual(hash, codigo);
    assert.ok(!hash.includes(codigo));
  });

  it("verifica el código correcto y rechaza cualquier otro", async () => {
    const codigo = "04821";
    const hash = await hashearCodigo(codigo);
    assert.equal(await verificarCodigo(codigo, hash), true);
    assert.equal(await verificarCodigo("48210", hash), false);
  });
});
