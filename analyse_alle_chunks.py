
from pathlib import Path
from urllib.request import Request, urlopen
import json
import re
import sys

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "docs" / "chunks"
OUTPUT = ROOT / "docs" / "analysis"
MODEL = "qwen2.5-coder:7b"

OUTPUT.mkdir(parents=True, exist_ok=True)

files = sorted(SOURCE.glob("*.md"))

if not files:
    print(f"Keine Markdown-Dateien gefunden: {SOURCE}")
    sys.exit(1)

def ask_ollama(text, filename):
    prompt = f"""
Du bist der technische Produktanalyst für die Gym-Battle-App.

Analysiere den folgenden Abschnitt der Produktspezifikation.
Fasse konkrete Anforderungen und Regeln präzise zusammen.
Erfinde keine Anforderungen und ergänze keine unbelegten Annahmen.
Kennzeichne Unklarheiten ausdrücklich als offene Fragen.
Entferne Wiederholungen und allgemeine Aussagen, wenn sie keinen
konkreten Nutzen für die Implementierung haben.

Strukturiere die Antwort mit:
1. Konkrete Produktanforderungen
2. Funktionen und Nutzerabläufe
3. Datenmodell und Datenregeln
4. Sicherheit und Berechtigungen
5. UI, Barrierefreiheit und Fehlerfälle
6. Offene Fragen und Widersprüche

Quelle: {filename}

INHALT:
{text}
"""

    payload = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_ctx": 16384
        }
    }).encode("utf-8")

    request = Request(
        "http://localhost:11434/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    with urlopen(request, timeout=900) as response:
        result = json.loads(response.read().decode("utf-8"))

    return result["response"].strip()


results = []

for index, file in enumerate(files, start=1):
    print(f"\n[{index}/{len(files)}] Analysiere: {file.name}")

    try:
        content = file.read_text(encoding="utf-8")
        analysis = ask_ollama(content, file.name)

        output_file = OUTPUT / f"{index:02d}_analyse.md"
        output_file.write_text(
            f"# Analyse {index}: {file.name}\n\n{analysis}\n",
            encoding="utf-8"
        )

        results.append(
            f"# Abschnitt {index}: {file.name}\n\n{analysis}"
        )

        print(f"Fertig: {output_file.name}")

    except Exception as error:
        print(f"FEHLER: {error}")
        print("Du kannst das Skript nach Behebung erneut ausführen.")

if results:
    combined = OUTPUT / "GYM_BATTLE_GESAMTANALYSE.md"
    combined.write_text(
        "# Gym Battle – Gesamtanalyse\n\n"
        + "\n\n---\n\n".join(results),
        encoding="utf-8"
    )
    print(f"\nGespeichert: {combined}")
    print(f"Analysierte Abschnitte: {len(results)}/{len(files)}")
