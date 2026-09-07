"""Generate selectable-text and blank PDF fixtures (requires reportlab). No real company data."""
from pathlib import Path
from reportlab.pdfgen import canvas
from textwrap import wrap
root = Path(__file__).resolve().parent.parent / 'tests/fixtures/decks'
out = root / 'generated'
out.mkdir(exist_ok=True)
for name in ('missing', 'contradictory', 'malicious'):
    c = canvas.Canvas(str(out / f'{name}.pdf'), pagesize=(720, 540), invariant=1)
    for i, page in enumerate((root / f'{name}.txt').read_text().split('\f'), 1):
        c.setFillColorRGB(.97,.98,.96)
        c.rect(0,0,720,540,fill=1,stroke=0)
        c.setFillColorRGB(.15,.18,.16)
        c.setFont('Helvetica-Bold', 18)
        c.drawString(36, 497, f'FundMatch synthetic fixture - {name} - page {i}')
        c.setFont('Helvetica', 12)
        y=460
        for line in page.splitlines():
            for fragment in wrap(line, 88):
                c.drawString(36,y,fragment)
                y-=20
        c.showPage()
    c.save()
c=canvas.Canvas(str(out/'scanned.pdf'),pagesize=(720,540),invariant=1)
c.setFillColorRGB(.8,.85,.9)
c.rect(36,36,648,468,fill=1,stroke=0)
c.showPage()
c.save()
print(out)
