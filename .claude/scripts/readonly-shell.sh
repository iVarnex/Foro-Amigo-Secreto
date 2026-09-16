#!/usr/bin/env bash
# Hook PreToolUse para scalability-architect.
#
# Claude Code entrega el input del hook como JSON por stdin. Este script extrae
# tool_input.command y sale con código 2 si el comando puede mutar algo, lo que
# bloquea la ejecución y devuelve el mensaje de stderr al subagente.
#
# Instalación (por proyecto):
#   mkdir -p .claude/scripts && cp scripts/readonly-shell.sh .claude/scripts/
#   chmod +x .claude/scripts/readonly-shell.sh
#
# Instalación personal: copia el script a ~/.claude/scripts/ y pon la ruta
# absoluta en el campo command del frontmatter del agente.
#
# Si el script no existe o no es ejecutable, el hook falla y deja de proteger
# nada: verifica la instalación pidiéndole al agente que intente un `rm -rf`.
#
# Probarlo a mano:
#   printf '{"tool_input":{"command":"rm -rf build"}}' | ./scripts/readonly-shell.sh; echo $?
#   (2 = bloqueado, 0 = permitido)

set -uo pipefail

INPUT="$(cat)"

if command -v jq >/dev/null 2>&1; then
  COMMAND="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')"
else
  COMMAND="$(printf '%s' "$INPUT" \
    | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' | head -n1)"
fi

[ -z "$COMMAND" ] && exit 0

deny_if() {
  # deny_if <regex extendida> <razón>
  if printf '%s' "$COMMAND" | grep -qiE "$1"; then
    echo "Bloqueado: scalability-architect tiene shell de solo lectura ($2). Pide este dato al hilo principal." >&2
    exit 2
  fi
}

# Destrucción o modificación de archivos.
deny_if '(^|[;&|[:space:]])(rm|mv|dd|truncate|chmod|chown|mkfs|shred)([[:space:]]|$)' \
        'modifica archivos'

# Redirección de escritura, o tubería hacia un intérprete.
deny_if '(^|[^0-9<>])>{1,2}[[:space:]]*[^&[:space:]]|\|[[:space:]]*(sh|bash|zsh|python3?|node)([[:space:]]|$)' \
        'escribe a un archivo o ejecuta código por tubería'

# SQL que muta datos o esquema (EXPLAIN y SELECT pasan).
deny_if '(\binsert[[:space:]]+into\b|\bupdate[[:space:]]+[a-z_."]+[[:space:]]+set\b|\bdelete[[:space:]]+from\b|\b(drop|truncate|alter|create)[[:space:]]+(table|index|database|schema|view|type)\b|\b(grant|revoke)[[:space:]]+|\b(vacuum[[:space:]]+full|reindex)\b)' \
        'muta datos o esquema'

# Herramientas de migración.
deny_if '\b(alembic|flyway|liquibase|drizzle-kit|prisma[[:space:]]+(migrate|db)|knex[[:space:]]+migrate|rails[[:space:]]+db|artisan[[:space:]]+migrate|sequelize[[:space:]]+db)\b' \
        'ejecuta migraciones'

# Gestores de paquetes que instalan o cambian dependencias.
deny_if '\b(pip3?|uv|poetry|pdm|npm|pnpm|yarn|bun|cargo|go|gem|composer|brew|apt|apt-get|yum|dnf)[[:space:]]+(install|add|remove|uninstall|update|upgrade|sync|publish)\b' \
        'instala o cambia dependencias'

# Infraestructura y despliegue.
deny_if '\b(terraform[[:space:]]+(apply|destroy|import)|kubectl[[:space:]]+(apply|delete|scale|patch|edit|rollout)|helm[[:space:]]+(install|upgrade|uninstall)|docker[[:space:]]+(run|rm|rmi|build|compose)|systemctl|flyctl[[:space:]]+deploy|vercel[[:space:]]+deploy|heroku[[:space:]]+(run|ps))\b' \
        'toca infraestructura'

# Git que cambia el estado del repositorio (git log, show, diff y blame pasan).
deny_if '\bgit[[:space:]]+(add|commit|push|reset|rebase|checkout|switch|merge|cherry-pick|clean|stash|tag|apply|restore|revert)\b' \
        'cambia el estado de git'

# Peticiones de red con efecto de escritura o descarga a disco.
deny_if '\b(curl|wget)\b.*(-X[[:space:]]*(POST|PUT|PATCH|DELETE)|--data|--upload-file|[[:space:]]-o[[:space:]]|[[:space:]]-O([[:space:]]|$))' \
        'hace una petición de escritura o descarga a disco'

exit 0
