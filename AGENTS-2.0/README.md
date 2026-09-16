# Suite de subagentes para Claude Code

Seis subagentes de producción para `.claude/agents/` (proyecto) o `~/.claude/agents/`
(personal). Cada uno tiene una sola responsabilidad, el conjunto mínimo de herramientas
que necesita, una frontera explícita contra los otros cinco y un contrato de salida fijo.

System prompts en español. Validados contra la
[documentación oficial de subagentes](https://code.claude.com/docs/en/sub-agents),
consultada el 13 de septiembre de 2026.

## Tabla resumen

| Agente | Responsabilidad | Modelo | Herramientas | Memoria |
|---|---|---|---|---|
| `fullstack-feature-builder` | Feature completo UI + API + persistencia, con migración y tests | `opus` | Read, Write, Edit, Bash, Glob, Grep, TodoWrite | `project` |
| `software-engineer` | Implementar, refactorizar y depurar con causa raíz en una capa, todo menos Python | `sonnet` | Read, Write, Edit, Bash, Glob, Grep, TodoWrite | `project` |
| `python-pro` | Python idiomático, tipado, pytest, asyncio, uv/Poetry, empaquetado | `sonnet` | Read, Write, Edit, Bash, Glob, Grep, TodoWrite | `project` |
| `docs-writer` | README, referencia de API, docstrings, ADR, changelog, Mermaid | `sonnet` | Read, Write, Edit, Glob, Grep, TodoWrite | `project` |
| `tech-researcher` | Comparar librerías y enfoques con fuentes citadas y fechadas | `sonnet` | Read, Glob, Grep, WebSearch, WebFetch | — |
| `scalability-architect` | Hoja de ruta de crecimiento por etapas, medida y sin sobre-ingeniería | `opus` | Read, Glob, Grep, Bash (con hook), Write, TodoWrite | — |

Presupuesto de descripciones: ~603 tokens de los 15 000 disponibles, así que queda espacio
de sobra para agregar agentes más adelante.

## Instalación

### Personal (todos tus proyectos)

```bash
mkdir -p ~/.claude/agents ~/.claude/scripts
cp agents/*.md ~/.claude/agents/
cp scripts/readonly-shell.sh ~/.claude/scripts/
chmod +x ~/.claude/scripts/readonly-shell.sh
```

Con la instalación personal, edita `~/.claude/agents/scalability-architect.md` y pon la
ruta absoluta en el hook, porque el hook se resuelve desde el directorio de trabajo de la
sesión, no desde donde vive el agente:

```yaml
command: "/home/TU_USUARIO/.claude/scripts/readonly-shell.sh"
```

### Por proyecto (versionado con el repo)

```bash
mkdir -p .claude/agents .claude/scripts
cp agents/*.md .claude/agents/
cp scripts/readonly-shell.sh .claude/scripts/
chmod +x .claude/scripts/readonly-shell.sh
git add .claude && git commit -m "Add subagent suite"
```

Aquí la ruta relativa del hook (`.claude/scripts/readonly-shell.sh`) funciona tal cual.
Un detalle importante: los hooks declarados en el frontmatter de un agente **de proyecto**
solo corren si aceptaste el diálogo de confianza de esa carpeta; los de `~/.claude/agents/`
corren sin ese paso. Mientras no confíes en la carpeta, el agente igual funciona pero el
hook se omite y solo queda la restricción por prompt.

Los agentes de proyecto ganan a los personales cuando comparten `name`. Una mezcla
razonable: `software-engineer`, `python-pro`, `tech-researcher` y `docs-writer` a nivel
personal; `fullstack-feature-builder` y `scalability-architect` a nivel de proyecto, donde
la memoria del agente se comparte con el equipo por git.

### Validar antes de usar

```bash
claude plugin validate .claude/agents      # oficial, requiere Claude Code 2.1.233+
python3 validate-agents.py .claude/agents  # lint local, más estricto
```

`claude plugin validate` detecta YAML que no parsea, pero **no** avisa si falta `name`.
El script incluido sí revisa eso, más nombres duplicados, herramientas que no existen o que
Claude Code descarta en segundo plano, alias de modelo inválidos, el `": "` sin comillas
que rompe el YAML, campos de frontmatter desconocidos, scripts de hook que no existen o no
son ejecutables, descripciones sin cláusula negativa y el presupuesto de descripciones.

Comprueba también que el hook realmente bloquea:

```bash
printf '{"tool_input":{"command":"rm -rf build"}}' | .claude/scripts/readonly-shell.sh; echo $?
# 2 = bloqueado (correcto). 0 o 127 = el hook no te está protegiendo.
```

Claude Code observa `~/.claude/agents/` y `.claude/agents/` y recoge los cambios en
segundos. Solo hace falta reiniciar la sesión si el directorio `agents/` no existía cuando
arrancó.

## Cómo invocarlos

**Automático.** Escribe la tarea con normalidad; el `description` de cada agente es lo que
enruta. Frases que disparan cada uno:

- "agrega comentarios a los posts, con endpoint y tabla" → `fullstack-feature-builder`
- "este test de Go falla de forma intermitente" → `software-engineer`
- "mypy se queja en este módulo async" → `python-pro`
- "el README ya no corresponde al código" → `docs-writer`
- "¿Drizzle o Prisma para este proyecto?" → `tech-researcher`
- "esto aguanta 50 usuarios, ¿qué se rompe con 5 000?" → `scalability-architect`

**@mención** (garantiza cuál se usa, sin dejarlo a criterio de Claude):

```
@agent-tech-researcher compara Drizzle y Prisma para este repo
```

**Subir el modelo para una invocación puntual.** El parámetro de modelo por invocación gana
sobre el campo `model` del archivo, así que no hace falta editar nada para un bug difícil:

```
usa software-engineer con opus para depurar esta condición de carrera
```

**Sesión completa** con el prompt del agente reemplazando al de Claude Code:

```bash
claude --agent python-pro
claude --agent scalability-architect
```

O como predeterminado del proyecto, en `.claude/settings.json`:

```json
{ "agent": "software-engineer" }
```

## Flujo de orquestación recomendado

Encadena los agentes en una sola petición al hilo principal. Claude pasa el resultado de
cada uno al siguiente; los detalles verbosos se quedan en el contexto del subagente. Cada
agente de esta suite declara qué hacer con el bloque de salida del anterior, así que la
cadena no depende de que Claude improvise la traducción.

### Feature nuevo, de cero a documentado

```
1. tech-researcher           → decidir librería o enfoque (si hay decisión abierta)
2. fullstack-feature-builder → contrato, migración, endpoint, UI y tests
3. software-engineer         → arreglar lo que haya fallado en la verificación
4. docs-writer               → README, docstrings y ADR de la decisión del paso 1
```

Petición de ejemplo:

> Usa tech-researcher para decidir entre X e Y, luego fullstack-feature-builder para
> implementar el feature con esa decisión, y al final docs-writer para el ADR y el README.

### Bug en producción

```
1. software-engineer  → reproducir, causa raíz, test de regresión, fix mínimo
2. docs-writer        → entrada de changelog si el bug era visible para el usuario
```

Si el bug está en Python, el paso 1 lo hace `python-pro`.

### Preparar el proyecto para crecer

```
1. scalability-architect → medir, nombrar el cuello de botella, hoja de ruta por etapas
2. software-engineer     → ejecutar solo los ítems de la etapa "Ahora"
3. scalability-architect → volver a medir y confirmar que el cuello se movió
```

El paso 3 importa: el primer cuello de botella casi nunca es el único, y un plan sin
re-medición se convierte en arquitectura de fe.

### Trabajo en Python

`python-pro` reemplaza a `software-engineer` cuando el archivo que se edita es `.py`. Si el
cambio en Python atraviesa capas (modelo, endpoint, plantilla), va
`fullstack-feature-builder` primero y `python-pro` después para pulir tipado y tests.

## Notas de operación

- **Costos.** `CLAUDE_CODE_SUBAGENT_MODEL` define el modelo por defecto de los subagentes;
  con `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` se ignora el campo `model` de todas las
  definiciones. Útil para poner un techo de gasto sin editar seis archivos. Ten en cuenta
  que forzar `haiku` degrada seriamente a los agentes que juzgan código ajeno.
- **Esfuerzo.** Si quieres subir el razonamiento de un agente sin cambiar de modelo,
  agrega `effort: high` a su frontmatter. No viene puesto porque los niveles disponibles
  dependen del modelo y prefiero que la suite cargue sin sorpresas.
- **Segundo plano.** Los subagentes corren en segundo plano por defecto y ahí Claude Code
  reduce el conjunto de herramientas integradas. Las seis definiciones usan solo
  herramientas de ese conjunto reducido, así que se comportan igual en primer y segundo
  plano.
- **Memoria.** Los cuatro agentes con `memory: project` escriben en
  `.claude/agent-memory/<nombre>/`. Versiónalo si quieres que el equipo herede lo
  aprendido; ponlo en `.gitignore` y cambia a `memory: local` si no.
- **`tech-researcher` y `scalability-architect` no tienen `memory` a propósito**: la
  documentación es explícita en que activar `memory` habilita Read, Write y Edit
  automáticamente, lo que rompería el aislamiento de uno y le devolvería a otro el `Edit`
  que se le quitó.
- **Anidamiento.** Ninguno lleva `Agent`, así que ninguno puede generar subagentes propios.
  El árbol de delegación queda plano y predecible.
- **CLAUDE.md sí llega** a todos estos agentes (a diferencia de los integrados Explore y
  Plan), así que las reglas del repo siguen aplicando dentro de cada subagente.
- **Salida de subagentes.** Claude Code escanea el reporte de cada subagente antes de que
  Claude lo lea y marca texto con forma de instrucción. Los seis prompts además tratan
  explícitamente como dato cualquier instrucción que venga dentro de archivos, comandos o
  páginas leídas.
