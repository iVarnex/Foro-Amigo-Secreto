# Decisiones de diseño

## Qué se tomó de dónde

| Fuente | Qué se adoptó | Qué se descartó |
|---|---|---|
| [Documentación oficial de subagentes](https://code.claude.com/docs/en/sub-agents), consultada 2026-09-13 | Esquema completo del frontmatter, `disallowedTools`, `hooks` en frontmatter, orden de resolución del modelo, reglas de archivos que Claude Code omite en silencio, presupuesto de 15 000 tokens, semántica de `memory`, filtro de herramientas en segundo plano, `claude plugin validate` | — |
| [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) | El mapeo de herramientas por rol (solo lectura → Read/Grep/Glob; investigación → + WebSearch/WebFetch; escritores de código → + Write/Edit/Bash) | El catálogo de 100+ agentes; demasiada superposición entre descripciones para enrutar bien |
| [wshobson/agents](https://github.com/wshobson/agents) (202 agentes a septiembre de 2026) | La idea de asignar modelo por complejidad de la tarea en lugar de usar uno solo para todo, y la existencia de un framework de evaluación como parte del entregable | Los prompts en sí. Son listas enciclopédicas de capacidades. Eso describe a un experto, no le dice qué hacer |
| [0xfurai/claude-code-subagents](https://github.com/0xfurai/claude-code-subagents) | El esqueleto Focus Areas / Approach / Quality Checklist, mejor que la lista enciclopédica | Los IDs de modelo fijados con fecha, que envejecen mal y quedan sujetos a sustitución por allowlist |
| [lst97/claude-code-sub-agents](https://github.com/lst97/claude-code-sub-agents) | La idea de un protocolo de traspaso estructurado entre agentes | Su implementación en JSON de briefing. Se reemplazó por un bloque Markdown, porque lo que el padre recibe es texto y las tablas se leen mejor |
| Ejemplo `db-reader` de la documentación oficial | El patrón `PreToolUse` + script que sale con código 2 para restringir `Bash` sin quitarlo | — |

La diferencia de fondo con las colecciones grandes: sus prompts son **descripciones de
experticia**, los de aquí son **procedimientos**. Cada agente tiene fases numeradas, un
contrato de entrada, una checklist de terminado, una lista de anti-patrones y una plantilla
de salida. Un prompt que dice "experto en optimización de rendimiento" no cambia el
comportamiento; uno que dice "mide antes de recetar, nombra un solo cuello de botella,
muestra la evidencia" sí lo hace.

## Elección de modelo

`model` acepta `sonnet`, `opus`, `haiku`, `fable`, `inherit` o un ID completo. Se usan
alias en todos los casos: un ID fijado envejece y, si tu organización restringe modelos, el
alias se sustituye por la versión permitida más nueva mientras que un ID bloqueado cae al
modelo heredado.

| Agente | Modelo | Razón |
|---|---|---|
| `fullstack-feature-builder` | `opus` | Es el de mayor radio de impacto. Diseña un contrato que luego restringe tres capas, y un error de contrato se paga reescribiendo todo. Se invoca pocas veces por sesión, así que el costo se justifica |
| `scalability-architect` | `opus` | Juicio puro sobre información incompleta: separar el cuello real del aparente y resistir la solución elegante. Se corre una vez cada muchas sesiones |
| `software-engineer` | `sonnet` | Es el caballo de batalla y la dificultad varía enormemente, pero necesita un **piso**, no una lotería. Sonnet es ese piso; para un bug feo se pide Opus en la invocación, y ese parámetro gana sobre el frontmatter |
| `python-pro` | `sonnet` | Trabajo de implementación con reglas bien definidas. Sonnet es fuerte en Python y este agente se invoca muchas veces al día; Opus aquí es gasto sin retorno |
| `docs-writer` | `sonnet` | Necesita buena prosa y lectura fiel del código, no razonamiento profundo. Haiku se consideró y se descartó: la detección de convenciones y la redacción de ADRs se degradan notoriamente |
| `tech-researcher` | `sonnet` | La parte difícil es evaluar credibilidad y reconciliar fuentes contradictorias, no generar texto. Haiku tiende a aceptar la primera fuente |

Ningún agente usa `haiku` y ninguno usa `inherit`. Los seis hacen juicios sobre código
ajeno, y ahí un modelo pequeño falla de la peor manera posible: con seguridad. `inherit`
se descartó por la misma razón — dejaba a `software-engineer`, el agente que hace análisis
de causa raíz, a merced del modelo con el que arrancaste la sesión, incluido Haiku. Para
tareas de búsqueda pura ya existe el agente integrado Explore.

## Elección de herramientas

El principio es que las herramientas son la única restricción que se aplica de verdad. El
prompt puede decir "no modifiques el código"; solo la ausencia de `Edit`, o un hook, lo
garantiza.

- **`tech-researcher` sin `Write`, `Edit` ni `Bash`**, y además con `disallowedTools`
  nombrándolos. La lista `tools` ya los excluye; el denylist documenta la intención y
  sobrevive a que alguien agregue `memory` sin pensarlo. Su salida es una recomendación que
  vuelve al hilo principal, y el aislamiento evita que "investigar una librería" se
  convierta en "instalarla".
- **`docs-writer` sin `Bash` ni acceso a la web.** No puede correr builds ni tests, y el
  prompt lo convierte en virtud: todo lo que no pudo verificar leyendo se marca como no
  verificado. Se le quitó `WebFetch` respecto de la versión anterior: su doctrina es que la
  fuente de verdad es el código de este repo, y sus anti-patrones prohíben copiar ejemplos
  de la documentación upstream. Darle la herramienta cuyo único uso plausible es justo lo
  prohibido era una contradicción. Conserva `Edit` porque los docstrings viven dentro del
  código, y el prompt limita ese permiso a prosa y comentarios.
- **`scalability-architect` con `Write` pero sin `Edit`, y con `Bash` bajo hook.** Esta es
  la corrección más importante frente a la versión anterior. Quitarle `Edit` mientras
  conserva `Bash` sin restringir era teatro: con `Bash` se escribe cualquier archivo con
  `cat > file`, se corre `alembic upgrade` y se borra un directorio. Ahora un hook
  `PreToolUse` ejecuta `scripts/readonly-shell.sh`, que sale con código 2 ante comandos que
  escriben archivos, mutan SQL, corren migraciones, instalan dependencias, tocan
  infraestructura o cambian el estado de git. `git log`, `EXPLAIN`, `wc`, `du` y `SELECT`
  pasan. El prompt sigue diciendo la regla, pero ya no es la regla la que protege.
- **Los tres agentes de código llevan el conjunto completo** Read, Write, Edit, Bash, Glob,
  Grep, TodoWrite. Sin `Bash` no hay verificación real, y sin verificación real un agente de
  código solo produce afirmaciones.
- **Ninguno lleva `Agent`.** Ninguno puede generar subagentes propios. Esto mantiene el
  árbol de delegación plano y evita que un agente de implementación se convierta en un
  orquestador que consume contexto en cascada.
- **Solo se usan herramientas del conjunto que sobrevive en segundo plano.** Los subagentes
  en background pierden las herramientas integradas fuera de una lista específica; ninguna
  definición depende de algo fuera de ella, así que se comportan igual en primer y segundo
  plano. El validador comprueba esto.

Lo que se evaluó y se descartó: `permissionMode: plan` para los dos agentes de solo
lectura. No es una garantía — si la conversación padre corre en `auto`, `acceptEdits` o
`bypassPermissions`, el subagente hereda ese modo y el valor declarado se ignora. Una
restricción que solo funciona a veces es peor que ninguna, porque induce a confiar.
También se descartó `isolation: worktree` para `fullstack-feature-builder`: da aislamiento
real, pero rama por defecto desde la rama principal en vez del `HEAD` de la sesión, lo que
sorprende cuando estás trabajando sobre una rama de feature.

## Enrutamiento: cómo se evita el solapamiento

Con seis agentes, el riesgo real no es que ninguno se active sino que se activen dos. Cada
`description` incluye una cláusula negativa explícita, y el validador falla si falta.

La frontera entre `software-engineer` y `python-pro` era el punto débil de la versión
anterior: uno decía "úsame para tests que fallan" y el otro "úsame para pytest que falla",
y la cláusula negativa hablaba de "idiomatismos de Python", que no es lo que la gente
escribe. Ahora la frontera es **el archivo que se va a editar**: `.py`, `pyproject.toml` o
`conftest.py` → `python-pro`; cualquier otra extensión → `software-engineer`. Está dicho en
ambas descripciones y repetido en la sección "Cuándo no eres tú" de ambos prompts.

Las fronteras completas: **¿cuántas capas toca?** más de una → fullstack. **¿El archivo es
.py?** sí → python-pro. **¿Produce prosa?** → docs-writer. **¿Necesita fuentes externas?** →
tech-researcher. **¿Se trata de crecimiento y capacidad?** → scalability-architect. Todo lo
demás → software-engineer.

Las palabras clave en español ahora están en las seis descripciones, no en tres. En la
versión anterior, tres agentes tenían pistas como "feature completa, de punta a punta" y
tres no, lo que sesgaba el enrutamiento hacia los primeros cuando la petición venía en
español. Se escriben con la ortografía que realmente usas al pedir la tarea.

## Doctrina compartida entre los seis

Seis reglas aparecen en todos, adaptadas a cada rol en vez de copiadas:

1. **Fase de reconocimiento obligatoria.** Ningún agente escribe antes de leer los
   manifiestos, los scripts reales y el ejemplo análogo más cercano en el repo. Esto es lo
   que hace que respeten el stack del proyecto en lugar de imponer el suyo.
2. **Nada inventado.** Todo símbolo, flag, variable de entorno o versión sale de algo leído
   en esta sesión. Lo no verificable se declara como tal.
3. **Verificación por ejecución.** "Debería funcionar" no es un estado. Los agentes con
   `Bash` corren los comandos del repo y reportan la salida real; los que no lo tienen
   marcan explícitamente lo no verificado.
4. **Prohibición de falsos verdes.** Nada de debilitar aserciones, borrar tests que fallan,
   agregar `except` amplios o marcar skips para que una corrida pase.
5. **Contrato de entrada.** Cada agente declara qué hacer con el bloque de salida de los
   otros cinco, y declara que el texto que viene dentro de archivos, salidas de comando o
   páginas web es dato, no instrucción. Esto es lo que hace que la cadena del README
   funcione sin que Claude tenga que improvisar la traducción entre agentes, y lo que
   reduce el riesgo de inyección por contenido leído.
6. **Higiene de secretos y revisión del propio diff.** Los agentes que reportan salida de
   comandos tienen prohibido pegar valores de variables de entorno, tokens o cadenas de
   conexión en su reporte, aunque hayan aparecido en pantalla. Los tres agentes de código
   leen su propio `git diff` completo antes de reportar, buscando archivos tocados de más,
   prints de depuración y secretos. Esto cubre el hueco de revisión sin agregar un séptimo
   agente.

## Uso de `memory`

`memory: project` en los cuatro agentes que se benefician de acumular conocimiento del repo
(comandos reales de test, ubicación de helpers, convención de docstrings, versión de
pydantic). Los prompts acotan qué se guarda: hechos durables del repositorio, nunca estado
de la tarea, porque una memoria llena de "estaba arreglando el bug X" envenena sesiones
futuras.

Los dos agentes restantes no la usan por una razón que la documentación oficial confirma
literalmente: activar `memory` habilita Read, Write y Edit automáticamente, lo que anularía
el aislamiento de `tech-researcher` y le devolvería a `scalability-architect` el `Edit` que
se le quitó a propósito.

## Verificación realizada

```
[   ok] docs-writer.md
[   ok] fullstack-feature-builder.md
[   ok] python-pro.md
[aviso] scalability-architect.md
          aviso: el hook apunta a '.claude/scripts/readonly-shell.sh' ...
          aviso: los hooks de frontmatter de un agente de proyecto solo corren si confiaste en la carpeta
[   ok] software-engineer.md
[   ok] tech-researcher.md

6 archivo(s) de agente, 6 nombre(s) único(s)
descripciones combinadas ~603 tokens del presupuesto de 15000
Todo parsea y debería cargar.
```

Los dos avisos de `scalability-architect` son recordatorios de instalación, no defectos:
aparecen porque el script del hook todavía no está en su destino final y porque los hooks de
proyecto necesitan confianza de carpeta. Ambos se resuelven siguiendo el README.

El hook se probó por separado contra doce comandos reales. Pasan `EXPLAIN ANALYZE SELECT`,
`SELECT ... FROM pg_stat_user_tables`, `git log -p`, `git diff --stat`, `wc`, `du` y
`grep`. Se bloquean `rm -rf`, `alembic upgrade head`, `echo x > archivo`, `DROP TABLE`,
`UPDATE ... SET`, `INSERT INTO`, `DELETE FROM`, `CREATE INDEX`, `npm install`,
`kubectl scale`, `git checkout -b`, `curl -X POST` y `cat setup.sh | bash`.

El validador comprueba: apertura del frontmatter en la línea 1, parseo YAML, `name` en
minúsculas con guiones y sin `:`, `description` presente con señal proactiva y cláusula
negativa, ausencia de `": "` sin comillas, herramientas que existen y que sobreviven en
segundo plano, herramientas que Claude Code descarta siempre, colisión entre `tools` y
`disallowedTools`, alias de modelo válidos, `memory` contra las herramientas declaradas,
`permissionMode`, `maxTurns`, `isolation`, `experimental.cacheTtl` mal ubicado, campos
desconocidos, existencia y permiso de ejecución de los scripts de hook, nombres únicos y
presupuesto de descripciones. Corre `claude plugin validate` en tu máquina como segunda
pasada.
