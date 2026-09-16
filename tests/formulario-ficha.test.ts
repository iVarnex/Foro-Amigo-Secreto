import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

/**
 * `useRouter` de "next/navigation" exige montarse dentro del App Router real.
 * Se sustituye el módulo entero (requiere --experimental-test-module-mocks,
 * agregado al script "test") en vez de renderizar dentro de un Provider,
 * porque el contexto que expone Next para esto vive en una ruta interna
 * ("next/dist/shared/lib/...") no pensada como API pública.
 *
 * El mock se registra una sola vez, a nivel de módulo, antes de importar
 * FormularioFicha: una vez que un módulo queda cargado con la versión real
 * de "next/navigation", volver a mockear no cambia su binding ya resuelto.
 */
const navegacion = { push: mock.fn() };
mock.module("next/navigation", {
  namedExports: { useRouter: () => navegacion },
});

const { FormularioFicha } = await import("@/components/formulario-ficha");

function simularFetchDeCreacion(respuesta: Response) {
  const fetchOriginal = globalThis.fetch;
  const fetchSimulado = mock.fn<typeof fetch>(async () => respuesta);
  globalThis.fetch = fetchSimulado;
  return {
    fetchSimulado,
    restaurar: () => {
      globalThis.fetch = fetchOriginal;
    },
  };
}

describe("formulario de creación de ficha (render real)", () => {
  afterEach(() => {
    cleanup();
    navegacion.push.mock.resetCalls();
  });

  it("publica la ficha y muestra el código de 5 dígitos una sola vez", async () => {
    const { fetchSimulado, restaurar } = simularFetchDeCreacion(
      Response.json(
        { ficha: { id: "ficha-1" }, codigo: "48219" },
        { status: 201 },
      ),
    );

    render(createElement(FormularioFicha));

    fireEvent.change(screen.getByLabelText("Tu nombre"), {
      target: { value: "María" },
    });
    fireEvent.change(screen.getByLabelText("Me gusta"), {
      target: { value: "café, libros de misterio" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publicar ficha" }));

    const codigo = await screen.findByText("48219");
    assert.equal(screen.getAllByText("48219").length, 1);
    assert.equal(fetchSimulado.mock.callCount(), 1);

    const [url, opciones] = fetchSimulado.mock.calls[0].arguments;
    assert.ok(opciones);
    assert.equal(url, "/api/fichas");
    assert.equal(opciones.method, "POST");
    assert.deepEqual(JSON.parse(opciones.body as string), {
      nombre: "María",
      gustos: "café, libros de misterio",
      no_gustos: "",
      alergias: "",
    });
    assert.equal(codigo.textContent, "48219");

    fireEvent.click(screen.getByRole("button", { name: "Entendido, listo" }));
    assert.equal(navegacion.push.mock.callCount(), 1);
    assert.equal(navegacion.push.mock.calls[0].arguments[0], "/fichas/ficha-1");

    restaurar();
  });

  it("muestra el error del servidor sin publicar la ficha cuando la validación falla", async () => {
    const { fetchSimulado, restaurar } = simularFetchDeCreacion(
      Response.json(
        {
          error: {
            tipo: "VALIDACION",
            mensaje: "Revisa los campos marcados.",
            campos: { nombre: ["El nombre es obligatorio."] },
          },
        },
        { status: 400 },
      ),
    );

    render(createElement(FormularioFicha));

    fireEvent.change(screen.getByLabelText("Me gusta"), {
      target: { value: "café" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publicar ficha" }));

    await screen.findByText("El nombre es obligatorio.");
    assert.equal(screen.queryByText(/¡Ficha creada!/), null);
    assert.equal(fetchSimulado.mock.callCount(), 1);

    restaurar();
  });
});
