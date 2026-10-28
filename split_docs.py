from pathlib import Path
import re

source = Path("docs/extracted")
target = Path("docs/chunks")
target.mkdir(parents=True, exist_ok=True)

max_chars = 6000
files = sorted(source.glob("*.md"))
count = 0

for file in files:
    text = file.read_text(encoding="utf-8")
    sections = re.split(r"(?m)(?=^--- Seite \d+ ---)", text)

    current = []
    size = 0
    part = 1

    for section in sections:
        if size + len(section) > max_chars and current:
            output = target / f"{file.stem[:35]}_teil_{part:02}.md"
            output.write_text(
                f"# Quelle: {file.name}\n# Teil {part}\n\n" + "\n".join(current),
                encoding="utf-8"
            )
            print(f"Erstellt: {output}")
            count += 1
            part += 1
            current = []
            size = 0

        current.append(section)
        size += len(section)

    if current:
        output = target / f"{file.stem[:35]}_teil_{part:02}.md"
        output.write_text(
            f"# Quelle: {file.name}\n# Teil {part}\n\n" + "\n".join(current),
            encoding="utf-8"
        )
        print(f"Erstellt: {output}")
        count += 1

print(f"\nFertig: {count} Textdateien erstellt.")
