import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

/**
 * Hook de resolución para `node --test`: traduce el alias "@/..." del tsconfig
 * a rutas reales y completa la extensión .ts/.tsx que TypeScript omite.
 * Node se encarga solo del stripping de tipos.
 */
const RAIZ = path.resolve(import.meta.dirname, "..");
const NODE_MODULES = path.join(RAIZ, "node_modules");
const EXTENSIONES = [".ts", ".tsx", ".js", ".mjs"];

function resolverArchivo(rutaBase) {
  if (existsSync(rutaBase) && statSync(rutaBase).isFile()) return rutaBase;
  for (const extension of EXTENSIONES) {
    const candidato = `${rutaBase}${extension}`;
    if (existsSync(candidato)) return candidato;
  }
  for (const extension of EXTENSIONES) {
    const candidato = path.join(rutaBase, `index${extension}`);
    if (existsSync(candidato)) return candidato;
  }
  return null;
}

export function resolve(especificador, contexto, siguiente) {
  if (especificador.startsWith("@/")) {
    const archivo = resolverArchivo(path.join(RAIZ, especificador.slice(2)));
    if (!archivo) {
      throw new Error(`No se pudo resolver el alias "${especificador}"`);
    }
    return { url: pathToFileURL(archivo).href, shortCircuit: true };
  }

  if (especificador.startsWith(".") && contexto.parentURL) {
    const directorio = path.dirname(fileURLToPath(contexto.parentURL));
    const archivo = resolverArchivo(path.resolve(directorio, especificador));
    if (archivo) {
      return { url: pathToFileURL(archivo).href, shortCircuit: true };
    }
  }

  // Los subpaths de "next" (p. ej. "next/navigation") no tienen extensión y el
  // paquete no declara un mapa "exports", así que la resolución ESM nativa de
  // Node no los encuentra. Solo se usan en los componentes de cliente que se
  // renderizan en tests, nunca en el código de servidor ya cubierto.
  if (especificador.startsWith("next/")) {
    const archivo = resolverArchivo(path.join(NODE_MODULES, especificador));
    if (archivo) {
      return { url: pathToFileURL(archivo).href, shortCircuit: true };
    }
  }

  return siguiente(especificador, contexto);
}

/**
 * Hook de carga para `node --test`: Node solo sabe despojar tipos de .ts
 * (sintaxis "erasable"), pero no transforma JSX. Los .tsx (componentes de
 * cliente) se transpilan aquí con el compilador de TypeScript, ya presente
 * como devDependency, usando las mismas opciones de jsx/target del tsconfig.
 */
export async function load(url, contexto, siguiente) {
  if (!url.endsWith(".tsx")) {
    return siguiente(url, contexto);
  }

  const ruta = fileURLToPath(url);
  const fuente = readFileSync(ruta, "utf8");
  const { outputText } = ts.transpileModule(fuente, {
    fileName: ruta,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2017,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });

  return { format: "module", shortCircuit: true, source: outputText };
}
