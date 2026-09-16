import { register } from "node:module";
import { JSDOM } from "jsdom";

register("./alias-loader.mjs", import.meta.url);

/**
 * Web APIs que Node ya expone de forma nativa (undici) pero que deben venir
 * de jsdom en los tests: sus instancias solo interoperan con los nodos del
 * propio jsdom (p. ej. `new FormData(formularioDeJsdom)` falla con la
 * implementación de undici porque no reconoce el HTMLFormElement de jsdom).
 */
const GLOBALES_FORZADAS_DESDE_JSDOM = ["FormData"];

/**
 * Expone un DOM real (jsdom) como entorno global antes de que corran los
 * tests, para que @testing-library/react pueda montar componentes. Solo se
 * copian las propiedades que Node no define ya (p. ej. no se toca `fetch`
 * ni `Response`, que los tests mockean sobre las globales nativas de Node),
 * salvo la lista explícita de arriba.
 */
function exponerEntornoDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });

  const propiedadesNode = new Set(Object.getOwnPropertyNames(globalThis));
  for (const propiedad of Object.getOwnPropertyNames(dom.window)) {
    const yaDefinidaEnNode = propiedadesNode.has(propiedad);
    const debeForzarse = GLOBALES_FORZADAS_DESDE_JSDOM.includes(propiedad);
    if (yaDefinidaEnNode && !debeForzarse) continue;
    Object.defineProperty(globalThis, propiedad, {
      configurable: true,
      enumerable: true,
      get: () => dom.window[propiedad],
      set: (valor) => {
        dom.window[propiedad] = valor;
      },
    });
  }
}

exponerEntornoDom();
