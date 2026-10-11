"""Resume solo metadatos de n8n. Copiar SQLite y sus archivos -wal/-shm al leer una instancia viva."""

import sqlite3
import sys


WORKFLOWS = (
    "travelmind-maintenance",
    "travelmind-consultation",
    "travelmind-quotation",
    "travelmind-reservation",
    "travelmind-notifications",
    "travelmind-exception_handling",
)


def main(path: str) -> None:
    connection = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        for workflow in WORKFLOWS:
            latest = connection.execute(
                'SELECT id, status, startedAt, stoppedAt FROM execution_entity '
                'WHERE workflowId = ? AND mode = ? ORDER BY id DESC LIMIT 1',
                (workflow, "trigger"),
            ).fetchone()
            finished = connection.execute(
                'SELECT id, status, startedAt, stoppedAt FROM execution_entity '
                "WHERE workflowId = ? AND mode = ? AND status NOT IN ('new', 'running') "
                'ORDER BY id DESC LIMIT 1',
                (workflow, "trigger"),
            ).fetchone()
            print(f"{workflow}: latest={latest}; finished={finished}")
    finally:
        connection.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Uso: python3 scripts/audit-n8n-executions.py <copia-sqlite-local>")
    main(sys.argv[1])
