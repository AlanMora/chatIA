#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import sys
from pathlib import Path
from collections import Counter

REQUIRED = ["id", "skill", "tipo_documento", "categoria", "titulo", "contenido", "metadata"]

def main():
    if len(sys.argv) < 2:
        print("Uso: python validar_jsonl_sofia.py archivo.jsonl")
        sys.exit(1)

    path = Path(sys.argv[1])
    ids = []
    skills = Counter()
    count = 0

    with path.open("r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except Exception as exc:
                print(f"ERROR JSON línea {line_no}: {exc}")
                sys.exit(2)

            missing = [k for k in REQUIRED if k not in row]
            if missing:
                print(f"ERROR línea {line_no}: faltan campos {missing}")
                sys.exit(3)

            if not row["id"] or not row["contenido"]:
                print(f"ERROR línea {line_no}: id/contenido vacío")
                sys.exit(4)

            ids.append(row["id"])
            skills[row["skill"]] += 1
            count += 1

    repeated = [item for item, n in Counter(ids).items() if n > 1]
    if repeated:
        print("ERROR: ids duplicados")
        for item in repeated:
            print(f"- {item}")
        sys.exit(5)

    print("OK: JSONL válido para SofIA.")
    print(f"Registros: {count}")
    print("Skills:")
    for skill, n in skills.items():
        print(f"- {skill}: {n}")

if __name__ == "__main__":
    main()
