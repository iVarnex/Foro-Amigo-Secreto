import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { GET as listarFichasHandler, POST as crearFichaHandler } from "@/app/api/fichas/route";
import {
  DELETE as borrarFichaHandler,
  GET as detalleFichaHandler,
  PATCH as editarFichaHandler,
} from "@/app/api/fichas/[id]/route";
import { POST as crearComentarioHandler } from "@/app/api/comentarios/route";
import {
  DELETE as borrarComentarioHandler,
  PATCH as editarComentarioHandler,
} from "@/app/api/comentarios/[id]/route";
import { getDb } from "@/db";
import { listarComentariosParaModeracion } from "@/db/queries";
import { comentarios, fichas } from "@/db/schema";

/**
 * Integración contra una base real: no se simula la base porque lo que se está
 * probando es justamente el esquema y las restricciones.
 * Se ejecuta solo si DATABASE_URL está configurada.
 */
const SIN_BASE = process.env.DATABASE_URL
  ? false
  : "requiere DATABASE_URL apuntando a una base de desarrollo";

const UUID_INEXISTENTE = "00000000-0000-4000-8000-000000000000";
const CODIGO_EQUIVOCADO = "00000";

const fichasCreadas: string[] = [];

function peticion(cuerpo: unknown, metodo = "POST") {
  return new Request("http://localhost/api", {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

function peticionGet() {
  return new Request("http://localhost/api");
}

function contexto(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function crearFichaDePrueba() {
  const respuesta = await crearFichaHandler(
    peticion({
      nombre: "María de prueba",
      gustos: "café, libros",
      no_gustos: "perfumes fuertes",
      alergias: "maní",
    }),
  );
  const datos = await respuesta.json();
  fichasCreadas.push(datos.ficha.id);
  return { estado: respuesta.status, ...datos };
}

describe("API de fichas", { skip: SIN_BASE }, () => {
  after(async () => {
    for (const id of fichasCreadas) {
      await getDb().delete(fichas).where(eq(fichas.id, id));
    }
  });

  it("POST /api/fichas crea la ficha y devuelve el código una sola vez", async () => {
    const creada = await crearFichaDePrueba();
    assert.equal(creada.estado, 201);
    assert.match(creada.codigo, /^\d{5}$/);
    assert.equal(creada.ficha.nombre, "María de prueba");
    assert.ok(!("codigo_hash" in creada.ficha));
  });

  it("POST /api/fichas rechaza la entrada inválida con 400 y errores por campo", async () => {
    const respuesta = await crearFichaHandler(
      peticion({ nombre: "", gustos: "" }),
    );
    const datos = await respuesta.json();
    assert.equal(respuesta.status, 400);
    assert.equal(datos.error.tipo, "VALIDACION");
    assert.ok(datos.error.campos.nombre);
  });

  it("GET /api/fichas lista las fichas con su conteo de comentarios", async () => {
    const creada = await crearFichaDePrueba();
    const respuesta = await listarFichasHandler(
      new Request("http://localhost/api/fichas"),
    );
    const datos = await respuesta.json();
    assert.equal(respuesta.status, 200);
    const encontrada = datos.fichas.find(
      (ficha: { id: string }) => ficha.id === creada.ficha.id,
    );
    assert.ok(encontrada);
    assert.equal(encontrada.total_comentarios, 0);
    assert.ok(!("codigo_hash" in encontrada));
  });

  it("GET /api/fichas rechaza un límite fuera de rango", async () => {
    const respuesta = await listarFichasHandler(
      new Request("http://localhost/api/fichas?limite=9999"),
    );
    assert.equal(respuesta.status, 400);
  });

  it("GET /api/fichas/[id] devuelve la ficha con sus comentarios y 404 si no existe", async () => {
    const creada = await crearFichaDePrueba();
    const respuesta = await detalleFichaHandler(
      peticionGet(),
      contexto(creada.ficha.id),
    );
    const datos = await respuesta.json();
    assert.equal(respuesta.status, 200);
    assert.equal(datos.ficha.id, creada.ficha.id);
    assert.deepEqual(datos.comentarios, []);

    const inexistente = await detalleFichaHandler(
      peticionGet(),
      contexto(UUID_INEXISTENTE),
    );
    assert.equal(inexistente.status, 404);
  });

  it("PATCH /api/fichas/[id] exige el código correcto", async () => {
    const creada = await crearFichaDePrueba();
    const cambios = {
      nombre: "María editada",
      gustos: "té",
      no_gustos: "",
      alergias: "ninguna",
    };

    const conCodigoMalo = await editarFichaHandler(
      peticion({ ...cambios, codigo: CODIGO_EQUIVOCADO }, "PATCH"),
      contexto(creada.ficha.id),
    );
    assert.equal(conCodigoMalo.status, 403);
    assert.equal((await conCodigoMalo.json()).error.tipo, "CODIGO_INVALIDO");

    const conCodigoBueno = await editarFichaHandler(
      peticion({ ...cambios, codigo: creada.codigo }, "PATCH"),
      contexto(creada.ficha.id),
    );
    assert.equal(conCodigoBueno.status, 200);
    assert.equal((await conCodigoBueno.json()).ficha.nombre, "María editada");
  });

  it("DELETE /api/fichas/[id] exige el código correcto", async () => {
    const creada = await crearFichaDePrueba();

    const conCodigoMalo = await borrarFichaHandler(
      peticion({ codigo: CODIGO_EQUIVOCADO }, "DELETE"),
      contexto(creada.ficha.id),
    );
    assert.equal(conCodigoMalo.status, 403);

    const conCodigoBueno = await borrarFichaHandler(
      peticion({ codigo: creada.codigo }, "DELETE"),
      contexto(creada.ficha.id),
    );
    assert.equal(conCodigoBueno.status, 200);

    const detalle = await detalleFichaHandler(
      peticionGet(),
      contexto(creada.ficha.id),
    );
    assert.equal(detalle.status, 404);
  });
});

describe("API de comentarios", { skip: SIN_BASE }, () => {
  after(async () => {
    for (const id of fichasCreadas) {
      await getDb().delete(fichas).where(eq(fichas.id, id));
    }
  });

  it("POST /api/comentarios crea el comentario y devuelve su propio código", async () => {
    const ficha = await crearFichaDePrueba();
    const respuesta = await crearComentarioHandler(
      peticion({
        ficha_id: ficha.ficha.id,
        autor_nombre: "",
        contenido: "¿Chocolate oscuro o con leche?",
      }),
    );
    const datos = await respuesta.json();
    assert.equal(respuesta.status, 201);
    assert.match(datos.codigo, /^\d{5}$/);
    assert.equal(datos.comentario.autor_nombre, null);
    assert.ok(!("codigo_hash" in datos.comentario));
  });

  it("POST /api/comentarios responde 404 si la ficha no existe", async () => {
    const respuesta = await crearComentarioHandler(
      peticion({ ficha_id: UUID_INEXISTENTE, contenido: "hola" }),
    );
    assert.equal(respuesta.status, 404);
  });

  it("PATCH y DELETE /api/comentarios/[id] exigen el código del comentario", async () => {
    const ficha = await crearFichaDePrueba();
    const creado = await (
      await crearComentarioHandler(
        peticion({ ficha_id: ficha.ficha.id, contenido: "original" }),
      )
    ).json();

    const editarConCodigoDeLaFicha = await editarComentarioHandler(
      peticion({ codigo: ficha.codigo, contenido: "editado" }, "PATCH"),
      contexto(creado.comentario.id),
    );
    assert.equal(editarConCodigoDeLaFicha.status, 403);

    const editar = await editarComentarioHandler(
      peticion({ codigo: creado.codigo, contenido: "editado" }, "PATCH"),
      contexto(creado.comentario.id),
    );
    assert.equal(editar.status, 200);
    assert.equal((await editar.json()).comentario.contenido, "editado");

    const borrarMal = await borrarComentarioHandler(
      peticion({ codigo: CODIGO_EQUIVOCADO }, "DELETE"),
      contexto(creado.comentario.id),
    );
    assert.equal(borrarMal.status, 403);

    const borrar = await borrarComentarioHandler(
      peticion({ codigo: creado.codigo }, "DELETE"),
      contexto(creado.comentario.id),
    );
    assert.equal(borrar.status, 200);
  });
});

describe("capa de datos", { skip: SIN_BASE }, () => {
  it("la FK impide crear un comentario sobre una ficha inexistente", async () => {
    await assert.rejects(
      getDb().insert(comentarios).values({
        fichaId: UUID_INEXISTENTE,
        contenido: "huérfano",
        codigoHash: "hash-de-prueba",
      }),
      /violates foreign key constraint|comentarios_ficha_id_fichas_id_fk/,
    );
  });

  it("el listado de moderación trae el nombre de la ficha y nunca el codigo_hash", async () => {
    const ficha = await crearFichaDePrueba();
    await crearComentarioHandler(
      peticion({ ficha_id: ficha.ficha.id, contenido: "spam spam spam" }),
    );

    const listado = await listarComentariosParaModeracion({
      limite: 50,
      desplazamiento: 0,
    });
    const encontrado = listado.find(
      (comentario) => comentario.ficha_id === ficha.ficha.id,
    );

    assert.ok(encontrado);
    assert.equal(encontrado.ficha_nombre, "María de prueba");
    assert.equal(encontrado.contenido, "spam spam spam");
    assert.ok(!("codigo_hash" in encontrado));
  });

  it("borrar la ficha arrastra sus comentarios (ON DELETE CASCADE)", async () => {
    const ficha = await crearFichaDePrueba();
    await crearComentarioHandler(
      peticion({ ficha_id: ficha.ficha.id, contenido: "se va con la ficha" }),
    );

    await getDb().delete(fichas).where(eq(fichas.id, ficha.ficha.id));

    const restantes = await getDb()
      .select({ id: comentarios.id })
      .from(comentarios)
      .where(eq(comentarios.fichaId, ficha.ficha.id));
    assert.equal(restantes.length, 0);
  });
});
