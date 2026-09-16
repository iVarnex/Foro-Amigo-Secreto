import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  actualizarFichaSchema,
  codigoSchema,
  crearComentarioSchema,
  crearFichaSchema,
  editarComentarioComoAdminSchema,
  editarFichaComoAdminSchema,
  listarComentariosSchema,
  listarFichasSchema,
  LIMITE_COMENTARIOS_POR_PAGINA,
  LIMITE_FICHAS_POR_PAGINA,
  LIMITE_MAXIMO_COMENTARIOS_POR_PAGINA,
  LIMITE_MAXIMO_FICHAS_POR_PAGINA,
} from "@/lib/validaciones";

describe("validación de fichas", () => {
  it("recorta el texto y deja las alergias vacías como cadena vacía", () => {
    const resultado = crearFichaSchema.safeParse({
      nombre: "  María G.  ",
      gustos: " café, libros ",
    });
    assert.equal(resultado.success, true);
    assert.deepEqual(resultado.data, {
      nombre: "María G.",
      gustos: "café, libros",
      no_gustos: "",
      alergias: "",
    });
  });

  it("rechaza el nombre vacío con un mensaje por campo", () => {
    const resultado = crearFichaSchema.safeParse({ nombre: "   ", gustos: "x" });
    assert.equal(resultado.success, false);
    assert.equal(resultado.error?.issues[0]?.path[0], "nombre");
  });

  it("exige el código al actualizar", () => {
    const resultado = actualizarFichaSchema.safeParse({
      nombre: "María",
      gustos: "café",
    });
    assert.equal(resultado.success, false);
  });
});

describe("validación del código", () => {
  it("acepta cinco dígitos, incluidos los ceros a la izquierda", () => {
    assert.equal(codigoSchema.safeParse("04821").success, true);
  });

  it("rechaza longitudes distintas y caracteres no numéricos", () => {
    assert.equal(codigoSchema.safeParse("1234").success, false);
    assert.equal(codigoSchema.safeParse("123456").success, false);
    assert.equal(codigoSchema.safeParse("abcde").success, false);
  });
});

describe("validación de comentarios", () => {
  it("convierte el autor vacío en anónimo (null)", () => {
    const resultado = crearComentarioSchema.safeParse({
      ficha_id: "3f1a1f4c-2a2b-4c4d-8e8f-1a2b3c4d5e6f",
      autor_nombre: "   ",
      contenido: "¿Chocolate oscuro?",
    });
    assert.equal(resultado.success, true);
    assert.equal(resultado.data?.autor_nombre, null);
  });

  it("rechaza un ficha_id que no es uuid", () => {
    const resultado = crearComentarioSchema.safeParse({
      ficha_id: "1 OR 1=1",
      contenido: "hola",
    });
    assert.equal(resultado.success, false);
  });
});

describe("paginación del listado", () => {
  it("aplica el límite por defecto", () => {
    const resultado = listarFichasSchema.safeParse({});
    assert.equal(resultado.data?.limite, LIMITE_FICHAS_POR_PAGINA);
    assert.equal(resultado.data?.desplazamiento, 0);
  });

  it("rechaza límites fuera de rango que vengan del cliente", () => {
    assert.equal(listarFichasSchema.safeParse({ limite: "0" }).success, false);
    assert.equal(
      listarFichasSchema.safeParse({
        limite: String(LIMITE_MAXIMO_FICHAS_POR_PAGINA + 1),
      }).success,
      false,
    );
    assert.equal(
      listarFichasSchema.safeParse({ desplazamiento: "-1" }).success,
      false,
    );
  });

  it("aplica los mismos topes al listado de comentarios del panel", () => {
    assert.equal(
      listarComentariosSchema.safeParse({}).data?.limite,
      LIMITE_COMENTARIOS_POR_PAGINA,
    );
    assert.equal(
      listarComentariosSchema.safeParse({
        limite: String(LIMITE_MAXIMO_COMENTARIOS_POR_PAGINA + 1),
      }).success,
      false,
    );
  });
});

describe("validación de la edición como admin", () => {
  it("acepta la edición de una ficha sin pedir el código", () => {
    const resultado = editarFichaComoAdminSchema.safeParse({
      nombre: "María G.",
      gustos: "café",
    });
    assert.equal(resultado.success, true);
    assert.ok(!("codigo" in (resultado.data ?? {})));
  });

  it("sigue exigiendo los mismos límites de texto que el flujo anónimo", () => {
    assert.equal(
      editarFichaComoAdminSchema.safeParse({ nombre: "", gustos: "café" })
        .success,
      false,
    );
    assert.equal(
      editarComentarioComoAdminSchema.safeParse({ contenido: "   " }).success,
      false,
    );
  });

  it("ignora cualquier campo extra que mande el cliente", () => {
    const resultado = editarComentarioComoAdminSchema.safeParse({
      contenido: "moderado",
      codigo: "12345",
    });
    assert.equal(resultado.success, true);
    assert.deepEqual(resultado.data, { contenido: "moderado" });
  });
});
