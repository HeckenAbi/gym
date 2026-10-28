
from pathlib import Path
import fitz

source_dir = Path("docs/manus")
output_dir = Path("docs/extracted")
output_dir.mkdir(parents=True, exist_ok=True)

pdfs = sorted(source_dir.glob("*.pdf"))

if not pdfs:
    print(f"Keine PDFs gefunden in: {source_dir.resolve()}")
    raise SystemExit(1)

for pdf in pdfs:
    try:
        document = fitz.open(pdf)
        pages = []

        for page_number, page in enumerate(document, start=1):
            text = page.get_text("text")
            pages.append(f"\n\n--- Seite {page_number} ---\n\n{text}")

        output_file = output_dir / f"{pdf.stem}.md"
        output_file.write_text(
            f"# {pdf.stem}\n" + "".join(pages),
            encoding="utf-8",
        )

        print(f"OK: {pdf.name} -> {output_file} ({len(document)} Seiten)")
        document.close()

    except Exception as error:
        print(f"FEHLER bei {pdf.name}: {error}")

print("\nFertig. Bitte prüfen, ob alle PDFs Text enthalten.")
