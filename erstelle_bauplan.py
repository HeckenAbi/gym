from pathlib import Path
from urllib.request import Request, urlopen
import json

root = Path(__file__).resolve().parent
source = root / "docs" / "analysis" / "GYM_BATTLE_GESAMTANALYSE.md"
output = root / "docs" / "analysis" / "GYM_BATTLE_TECHNISCHER_BAUPLAN.md"

if not source.exists():
    raise SystemExit(f"Quelldatei fehlt: {source}")

text = source.read_text(encoding="utf-8")

prompt = f"""
Du bist Senior Software Architect und planst die Umsetzung der App Gym Battle.

Erstelle aus der folgenden Analyse einen konkreten, umsetzbaren technischen Bauplan.
Technologie: Next.js App Router, TypeScript, Tailwind CSS, Supabase
(PostgreSQL, Auth und Storage), Git. Hosting soll möglichst kostenlos sein.

Wichtig:
- Trenne bestätigte Anforderungen von eigenen technischen Vorschlägen.
- Erfinde keine Produktanforderungen.
- Kennzeichne ungeklärte Entscheidungen als offene Fragen.
- Plane ein funktionsfähiges MVP, keine unnötigen Zusatzfunktionen.
- Definiere Datenbanktabellen, Beziehungen, Indizes und Löschregeln.
- Definiere Berechtigungen und Row Level Security (RLS).
- Plane Authentifizierung, Profile, Freundschaften, Gruppen,
  Einladungen, Trainings, Sätze und Gruppenranglisten.
- Berücksichtige Zeitzonen, private Trainings, geteilte Trainings
  und die Regel: 1 Punkt je freigegebenem Trainingstag,
  maximal 5 Punkte pro Gruppenwoche.
- Plane Seiten, Komponenten, API-/Server-Aktionen, Validierung,
  Fehlerzustände und Barrierefreiheit.
- Gib eine sinnvolle Reihenfolge für die Implementierung an.
- Für jede Phase: Ziel, betroffene Dateien und Prüfschritte.
- Gib keine fertigen Dateien aus, sondern einen Bauplan.

Struktur:
1. MVP und Abgrenzung
2. Architektur
3. Datenbankschema
4. Sicherheit und RLS
5. Seiten und Komponenten
6. Geschäftslogik
7. Implementierungsphasen
8. Tests und Abnahmekriterien
9. Risiken und offene Entscheidungen

ANALYSE:
{text}
"""

payload = json.dumps({
    "model": "qwen2.5-coder:7b",
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

print("Erstelle technischen Bauplan. Das kann einige Minuten dauern ...")

with urlopen(request, timeout=1800) as response:
    result = json.loads(response.read().decode("utf-8"))

output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(result["response"].strip() + "\n", encoding="utf-8")

print(f"\nFertig: {output}")