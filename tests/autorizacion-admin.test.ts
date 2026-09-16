import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluarAccesoAdmin,
  normalizarEmail,
  respuestaRechazoAdmin,
  type SesionCandidataAdmin,
} from "@/lib/autorizacion-admin";

const ADMIN_EMAIL = "duena@example.com";

function sesion(parcial: Partial<SesionCandidataAdmin> = {}) {
  return {
    emailDeLaSesion: ADMIN_EMAIL,
    segundoFactorVerificado: true,
    ...parcial,
  };
}

describe("allowlist de una sola cuenta admin", () => {
  it("autoriza solo al email configurado en ADMIN_EMAIL", () => {
    const acceso = evaluarAccesoAdmin(sesion(), ADMIN_EMAIL);
    assert.equal(acceso.autorizado, true);
    assert.equal(acceso.autorizado && acceso.email, ADMIN_EMAIL);
  });

  it("ignora mayúsculas y espacios a los lados en ambos extremos", () => {
    const acceso = evaluarAccesoAdmin(
      sesion({ emailDeLaSesion: "  DUENA@Example.com " }),
      `${ADMIN_EMAIL} `,
    );
    assert.equal(acceso.autorizado, true);
    assert.equal(acceso.autorizado && acceso.email, ADMIN_EMAIL);
  });

  it("rechaza a cualquier otra cuenta de Clerk aunque tenga sesión válida", () => {
    const acceso = evaluarAccesoAdmin(
      sesion({ emailDeLaSesion: "intrusa@example.com" }),
      ADMIN_EMAIL,
    );
    assert.equal(acceso.autorizado, false);
    assert.equal(!acceso.autorizado && acceso.motivo, "EMAIL_NO_AUTORIZADO");
  });

  it("no acepta un email que sea prefijo o sufijo del autorizado", () => {
    for (const parecido of [
      "duena@example.com.attacker.test",
      "otra.duena@example.com",
      "duena@example.co",
    ]) {
      const acceso = evaluarAccesoAdmin(
        sesion({ emailDeLaSesion: parecido }),
        ADMIN_EMAIL,
      );
      assert.equal(!acceso.autorizado && acceso.motivo, "EMAIL_NO_AUTORIZADO");
    }
  });

  it("rechaza cuando no hay sesión", () => {
    const acceso = evaluarAccesoAdmin(
      sesion({ emailDeLaSesion: null }),
      ADMIN_EMAIL,
    );
    assert.equal(!acceso.autorizado && acceso.motivo, "SIN_SESION");
  });

  it("rechaza si la sesión no pasó por un segundo factor", () => {
    const acceso = evaluarAccesoAdmin(
      sesion({ segundoFactorVerificado: false }),
      ADMIN_EMAIL,
    );
    assert.equal(!acceso.autorizado && acceso.motivo, "SIN_SEGUNDO_FACTOR");
  });

  it("no autoriza a nadie si ADMIN_EMAIL no está configurado", () => {
    for (const configurado of [undefined, "", "   "]) {
      const acceso = evaluarAccesoAdmin(sesion(), configurado);
      assert.equal(
        !acceso.autorizado && acceso.motivo,
        "ADMIN_EMAIL_SIN_CONFIGURAR",
      );
    }
  });

  it("normaliza el email a minúsculas sin espacios", () => {
    assert.equal(normalizarEmail("  Duena@Example.COM "), ADMIN_EMAIL);
  });
});

describe("sobre de error del rechazo de admin", () => {
  it("devuelve 403 y el sobre único cuando el email no está en la allowlist", async () => {
    const respuesta = respuestaRechazoAdmin("EMAIL_NO_AUTORIZADO");
    const contenido = await respuesta.json();

    assert.equal(respuesta.status, 403);
    assert.deepEqual(contenido, {
      error: {
        tipo: "NO_AUTORIZADO",
        mensaje: "Esta cuenta no tiene permisos de administración.",
      },
    });
  });

  it("devuelve 403 cuando falta el segundo factor", async () => {
    const respuesta = respuestaRechazoAdmin("SIN_SEGUNDO_FACTOR");
    assert.equal(respuesta.status, 403);
    assert.equal((await respuesta.json()).error.tipo, "NO_AUTORIZADO");
  });

  it("devuelve 401 cuando no hay sesión", async () => {
    const respuesta = respuestaRechazoAdmin("SIN_SESION");
    assert.equal(respuesta.status, 401);
    assert.equal((await respuesta.json()).error.tipo, "NO_AUTENTICADO");
  });

  it("no filtra el nombre de la variable de entorno si falta configurarla", async () => {
    const respuesta = respuestaRechazoAdmin("ADMIN_EMAIL_SIN_CONFIGURAR");
    const contenido = await respuesta.json();

    assert.equal(respuesta.status, 500);
    assert.equal(contenido.error.tipo, "ERROR_INTERNO");
    assert.ok(!contenido.error.mensaje.includes("ADMIN_EMAIL"));
  });
});
