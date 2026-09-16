#!/usr/bin/env python3
"""Lint de archivos de subagentes de Claude Code antes de que Claude Code los omita en silencio.

Reglas tomadas de https://code.claude.com/docs/en/sub-agents (consultada 2026-09-13):

  - el frontmatter abre en la línea 1, si no el archivo se trata como documentación
  - el YAML parsea, si no el archivo se omite y el error va al debug log
  - 'name' presente, minúsculas y guiones, sin ':', sin empezar con '-'
  - 'description' presente; sin ella el archivo se omite
  - un ': ' dentro de una description sin comillas rompe el YAML
  - las entradas de 'tools' resuelven a herramientas reales, si no el agente falla al lanzarse
  - herramientas que Claude Code quita a TODO subagente, y las que quita en segundo plano
  - 'model' es un alias válido, o un id completo (que envejece)
  - 'memory' habilita Read, Write y Edit automáticamente
  - campos desconocidos en el frontmatter
  - scripts de hooks que existen y son ejecutables
  - nombres únicos en todo el árbol y presupuesto combinado de descripciones (15k tokens)

Uso: python3 validate-agents.py [ruta-al-directorio-de-agentes]
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("hace falta pyyaml: pip install pyyaml --break-system-packages")

VALID_MODELS = {"sonnet", "opus", "haiku", "fable", "inherit"}
VALID_MEMORY = {"user", "project", "local"}
VALID_COLORS = {"red", "blue", "green", "yellow", "purple",
                "orange", "pink", "cyan"}
VALID_PERMISSION_MODES = {"default", "acceptEdits", "auto", "dontAsk",
                          "bypassPermissions", "plan", "manual"}

# Herramientas que un subagente en SEGUNDO PLANO conserva. Los subagentes corren en
# segundo plano por defecto, así que esta es la lista segura.
BACKGROUND_SAFE_TOOLS = {
    "Read", "Grep", "Glob", "Bash", "PowerShell", "Edit", "Write", "NotebookEdit",
    "WebFetch", "WebSearch", "TodoWrite", "Skill", "ToolSearch", "EnterWorktree",
    "ExitWorktree", "Monitor", "TaskStop", "SendMessage", "Artifact",
}
# Disponibles solo en primer plano.
FOREGROUND_ONLY_TOOLS = {"Agent", "ListAgents"}
# Quitadas de todo subagente aunque se listen.
ALWAYS_STRIPPED_TOOLS = {
    "AskUserQuestion", "EnterPlanMode", "ExitPlanMode", "ScheduleWakeup",
    "TaskOutput", "WaitForMcpServers", "Workflow", "EndConversation",
}

KNOWN_FIELDS = {
    "name", "description", "tools", "disallowedTools", "model", "permissionMode",
    "maxTurns", "skills", "mcpServers", "hooks", "memory", "background", "effort",
    "isolation", "color", "initialPrompt", "experimental",
}

NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
# Una cláusula negativa ("no es para X", "nunca Y", "solo lectura") es lo que evita
# que dos agentes se activen para la misma petición.
NEGATIVE_RE = re.compile(
    r"\b(no es para|no uses|no sirve|nunca|solo lectura|sólo lectura|no edita"
    r"|no ejecuta|no reescribe|no toca|not for|never|read-only)\b", re.I)
PROACTIVE_RE = re.compile(
    r"(úsalo|usalo|úsala|usala|úsalo proactivamente|use (this agent |it )?proactively"
    r"|use proactively|proactivamente)", re.I)


def as_list(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [v.strip() for v in value.split(",") if v.strip()]
    return [str(v).strip() for v in value if str(v).strip()]


def tool_is_known(tool: str) -> bool:
    if tool.startswith("mcp__") or tool.startswith("Agent("):
        return True
    return tool in BACKGROUND_SAFE_TOOLS | FOREGROUND_ONLY_TOOLS | ALWAYS_STRIPPED_TOOLS


def collect_hook_commands(hooks) -> list[str]:
    commands: list[str] = []
    if not isinstance(hooks, dict):
        return commands
    for entries in hooks.values():
        for entry in entries or []:
            for hook in (entry or {}).get("hooks", []) or []:
                cmd = (hook or {}).get("command")
                if isinstance(cmd, str):
                    commands.append(cmd)
    return commands


def check(path: Path):
    """Devuelve (errores, avisos, nombre, description, es_doc)."""
    errors: list[str] = []
    warnings: list[str] = []
    raw = path.read_text(encoding="utf-8")

    if not raw.startswith("---\n"):
        return ([], [], None, "", True)   # sin frontmatter -> es documentación

    parts = raw.split("\n---\n", 1)
    if len(parts) != 2:
        return (["el bloque de frontmatter no cierra con una línea '---'"],
                warnings, None, "", False)

    fm_text, body = parts[0][4:], parts[1]

    try:
        fm = yaml.safe_load(fm_text) or {}
    except yaml.YAMLError as exc:
        return ([f"el YAML no parsea -> Claude Code omite el archivo: {exc}"],
                warnings, None, "", False)

    if not isinstance(fm, dict):
        return (["el frontmatter no es un mapa"], warnings, None, "", False)

    # --- name -------------------------------------------------------------
    name = fm.get("name")
    if not name:
        return ([], [], None, "", True)   # sin name -> Claude Code lo trata como doc
    name = str(name)
    if ":" in name:
        errors.append("'name' contiene ':', reservado para el scoping de plugins")
    if name.startswith("-"):
        errors.append("'name' no puede empezar con '-'")
    if not NAME_RE.match(name):
        errors.append(f"'name' debe ser minúsculas-con-guiones, llegó {name!r}")
    if name != path.stem:
        warnings.append(f"'name' ({name}) difiere del nombre de archivo ({path.stem})")

    # --- description ------------------------------------------------------
    desc = fm.get("description")
    if not desc:
        errors.append("falta 'description' -> Claude Code omite el archivo")
        desc = ""
    else:
        desc = str(desc)
        if len(desc) < 40:
            warnings.append("description muy corta; el enrutamiento será poco fiable")
        if len(desc) > 600:
            warnings.append("description larga; mueve el detalle al system prompt")
        if not PROACTIVE_RE.search(desc):
            warnings.append("description sin señal proactiva ('úsalo proactivamente')")
        if not NEGATIVE_RE.search(desc):
            warnings.append("description sin cláusula negativa; puede solaparse con otro agente")

    # El ': ' dentro de un escalar sin comillas es el clásico rompe-YAML.
    for line in fm_text.splitlines():
        if line.startswith("description:"):
            value = line[len("description:"):].strip()
            if value and value[0] not in "\"'|>" and ": " in value:
                errors.append("description sin comillas contiene ': ' y rompe el YAML")

    # --- model ------------------------------------------------------------
    model = fm.get("model")
    if model is not None and str(model) not in VALID_MODELS:
        if str(model).startswith("claude-"):
            warnings.append(f"id de modelo fijado {model!r}; envejece, prefiere un alias")
        else:
            errors.append(f"alias de modelo inválido {model!r}; usa {sorted(VALID_MODELS)}")

    # --- tools / disallowedTools -----------------------------------------
    tools = as_list(fm.get("tools"))
    disallowed = as_list(fm.get("disallowedTools"))

    if fm.get("tools") is not None:
        if not tools:
            errors.append("'tools' está vacío -> el agente no se lanza")
        unknown = [t for t in tools if not tool_is_known(t)]
        if unknown:
            errors.append(f"herramienta(s) desconocida(s) {unknown}; el agente puede no lanzarse")
        stripped = [t for t in tools if t in ALWAYS_STRIPPED_TOOLS]
        if stripped:
            errors.append(f"{stripped} se quita a todo subagente aunque se liste")
        fg_only = [t for t in tools if t in FOREGROUND_ONLY_TOOLS]
        if fg_only:
            warnings.append(f"{fg_only} desaparece en segundo plano; el agente se comporta distinto")
        if set(tools) & set(disallowed):
            errors.append("hay herramientas en 'tools' y en 'disallowedTools' a la vez")

    # --- memory -----------------------------------------------------------
    mem = fm.get("memory")
    if mem is not None:
        if str(mem) not in VALID_MEMORY:
            errors.append(f"scope de memoria inválido {mem!r}; usa {sorted(VALID_MEMORY)}")
        if tools:
            auto = sorted({"Read", "Write", "Edit"} - set(tools))
            if auto:
                warnings.append(
                    f"memory habilita {auto} automáticamente, más allá de 'tools' declarado")
        if disallowed and {"Read", "Write", "Edit"} & set(disallowed):
            warnings.append(
                "memory habilita Read/Write/Edit y puede chocar con 'disallowedTools'")

    # --- otros campos ------------------------------------------------------
    pm = fm.get("permissionMode")
    if pm is not None and str(pm) not in VALID_PERMISSION_MODES:
        errors.append(f"permissionMode inválido {pm!r}; usa {sorted(VALID_PERMISSION_MODES)}")

    color = fm.get("color")
    if color is not None and str(color) not in VALID_COLORS:
        errors.append(f"color inválido {color!r}")

    turns = fm.get("maxTurns")
    if turns is not None and (not isinstance(turns, int) or turns <= 0):
        errors.append(f"maxTurns debe ser un entero positivo, llegó {turns!r}")

    iso = fm.get("isolation")
    if iso is not None and str(iso) != "worktree":
        errors.append(f"isolation solo acepta 'worktree', llegó {iso!r}")

    exp = fm.get("experimental")
    if exp is not None:
        if not isinstance(exp, dict):
            errors.append("'experimental' debe ser un mapa")
        elif "cacheTtl" in exp and str(exp["cacheTtl"]) not in {"5m", "1h"}:
            warnings.append("experimental.cacheTtl solo acepta '5m' o '1h'; el resto se ignora")
    if "cacheTtl" in fm:
        errors.append("cacheTtl va dentro del mapa 'experimental', no al nivel superior")

    unknown_fields = sorted(set(fm) - KNOWN_FIELDS)
    if unknown_fields:
        warnings.append(f"campo(s) de frontmatter desconocido(s) {unknown_fields}")

    # --- hooks -------------------------------------------------------------
    for cmd in collect_hook_commands(fm.get("hooks")):
        script = cmd.split()[0] if cmd.split() else ""
        if script.startswith(("./", ".claude/", "/", "~", "$")):
            candidate = Path(os.path.expanduser(script))
            if not candidate.exists():
                warnings.append(
                    f"el hook apunta a {script!r}, que no existe desde este directorio; "
                    "si el script falta, el hook no protege nada")
            elif not os.access(candidate, os.X_OK):
                errors.append(f"el script de hook {script!r} no es ejecutable (chmod +x)")

    if fm.get("hooks"):
        warnings.append(
            "los hooks de frontmatter de un agente de proyecto solo corren si confiaste "
            "en la carpeta; en ~/.claude/agents/ corren sin ese paso")

    if len(body.strip()) < 200:
        warnings.append("el cuerpo del system prompt es muy corto")

    return errors, warnings, name, desc, False


def main() -> int:
    target = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    files = sorted(target.rglob("*.md")) if target.is_dir() else [target]
    if not files:
        print(f"no hay archivos .md bajo {target}")
        return 1

    seen: dict[str, Path] = {}
    total_desc_chars = 0
    failed = False
    agents = 0

    for f in files:
        errors, warnings, name, desc, is_doc = check(f)
        if is_doc:
            print(f"[ doc] {f.name} (sin name o sin frontmatter -> no es un agente)")
            continue
        agents += 1
        total_desc_chars += len(desc)
        if name:
            if name in seen:
                errors.append(f"nombre duplicado, también en {seen[name]}")
            seen[name] = f

        status = "FALLA" if errors else ("aviso" if warnings else "ok")
        print(f"[{status:>5}] {f.name}")
        for e in errors:
            print(f"          error: {e}")
            failed = True
        for w in warnings:
            print(f"          aviso: {w}")

    approx_tokens = total_desc_chars / 4
    print(f"\n{agents} archivo(s) de agente, {len(seen)} nombre(s) único(s)")
    print(f"descripciones combinadas ~{approx_tokens:.0f} tokens "
          f"del presupuesto de 15000")
    if approx_tokens > 12000:
        print("AVISO: cerca del presupuesto de descripciones; recórtalas")

    print("\nFALLÓ" if failed else "\nTodo parsea y debería cargar.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
