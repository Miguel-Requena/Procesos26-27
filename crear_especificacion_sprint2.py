"""Genera el Word desde la especificación Markdown vigente, sin duplicar el alcance."""
from pathlib import Path
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.oxml.ns import qn

raiz = Path(__file__).resolve().parent
fuente = raiz / "documentacion/ESPECIFICACION-SPRINT-2.md"
salida = raiz / "documentacion/Especificacion-Sprint-2-TransDrakkar.docx"
documento = Document()
seccion = documento.sections[0]
seccion.page_width, seccion.page_height = Cm(21), Cm(29.7)
seccion.top_margin = seccion.bottom_margin = Cm(2)
seccion.left_margin = seccion.right_margin = Cm(2.2)
for nombre in ["Normal", "Title", "Heading 1"]:
    estilo = documento.styles[nombre]
    estilo.font.name = "Calibri"
    estilo.font.color.rgb = RGBColor(0, 0, 0)
normal = documento.styles["Normal"]
normal.font.size = Pt(11)
normal.paragraph_format.space_after = Pt(7)
normal.paragraph_format.line_spacing = 1.08
documento.styles["Title"].font.size = Pt(25)
documento.styles["Heading 1"].font.size = Pt(16)
documento.core_properties.title = "Especificación vigente del Sprint 2 de TransDrakkar"
documento.core_properties.author = "Miguel Requena López"
for linea in fuente.read_text(encoding="utf-8").splitlines():
    if linea.startswith("# "):
        documento.add_paragraph(linea[2:], "Title")
    elif linea.startswith("## "):
        documento.add_heading(linea[3:], 1)
    elif linea.strip():
        parrafo = documento.add_paragraph(linea)
        parrafo.paragraph_format.keep_together = True
# Algunas plantillas de Word añaden un borde al título por herencia.
for elemento in list(documento.styles.element.iter(qn('w:pBdr'))) + list(documento.element.iter(qn('w:pBdr'))):
    elemento.getparent().remove(elemento)
documento.save(salida)
print(salida)
