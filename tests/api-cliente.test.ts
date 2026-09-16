import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { pedirApi } from "@/lib/api-cliente";

const fetchOriginal = globalThis.fetch;

function simularFetch(respuesta: Response | Error) {
  globalThis.fetch = async () => {
    if (respuesta instanceof Error) throw respuesta;
    return respuesta;
  };
}

describe("cliente de la API", () => {
  afterEach(() => {
    globalThis.fetch = fetchOriginal;
  });

  it("devuelve el código cuando la ficha se crea", async () => {
    simularFetch(
      Response.json({ ficha: { id: "abc" }, codigo: "48219" }, { status: 201 }),
    );

    const resultado = await pedirApi<{ codigo: string }>("/api/fichas", {
      metodo: "POST",
      cuerpo: { nombre: "María" },
    });

    assert.equal(resultado.ok, true);
    assert.equal(resultado.ok && resultado.datos.codigo, "48219");
  });

  it("propaga el sobre de error del servidor sin inventar mensajes", async () => {
    simularFetch(
      Response.json(
        {
          error: {
            tipo: "CODIGO_INVALIDO",
            mensaje: "El código no coincide con el de esta ficha.",
          },
        },
        { status: 403 },
      ),
    );

    const resultado = await pedirApi("/api/fichas/abc", {
      metodo: "PATCH",
      cuerpo: { codigo: "00000" },
    });

    assert.equal(resultado.ok, false);
    assert.equal(!resultado.ok && resultado.error.tipo, "CODIGO_INVALIDO");
    assert.equal(
      !resultado.ok && resultado.error.mensaje,
      "El código no coincide con el de esta ficha.",
    );
  });

  it("convierte un fallo de red en un error mostrable en vez de lanzar", async () => {
    simularFetch(new TypeError("Failed to fetch"));

    const resultado = await pedirApi("/api/fichas", {
      metodo: "POST",
      cuerpo: {},
    });

    assert.equal(resultado.ok, false);
    assert.equal(!resultado.ok && resultado.error.tipo, "ERROR_INTERNO");
  });
});
