from pathlib import Path
from io import BytesIO
from pypdf import PdfReader, PdfWriter
import pypdfium2 as pdfium
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

base=Path(__file__).parent
qa=base/'qa-sprint1'
qa.mkdir(exist_ok=True)
src=Path(r'C:\Users\7migu\Downloads\Procesos_26_27.pdf')
r=PdfReader(src)
assert 'Sprint 1: Arquitectura Base' in r.pages[46].extract_text()
assert 'B.2.' in r.pages[50].extract_text()
w=PdfWriter()
for i in range(46,50): w.add_page(r.pages[i])
doc=pdfium.PdfDocument(str(src))
scale=4
im=doc[50].render(scale=scale).to_pil()
cut=414
top=im.crop((0,0,im.width,int(cut*scale)))
width,height=float(r.pages[50].mediabox.width),float(r.pages[50].mediabox.height)
buf=BytesIO();c=canvas.Canvas(buf,pagesize=(width,height))
c.drawImage(ImageReader(top),0,height-cut,width=width,height=cut)
c.setFont('Helvetica',10);c.drawCentredString(width/2,42,'29')
c.save();buf.seek(0)
w.add_page(PdfReader(buf).pages[0])
w.add_metadata({'/Title':'Documentación del Sprint 1','/Author':'Miguel Requena López'})
target=base/'Documentacion-Sprint-1-TransDrakkar.pdf'
with target.open('wb') as f:w.write(f)
final=pdfium.PdfDocument(str(target))
for i,page in enumerate(final):page.render(scale=1.5).to_pil().save(qa/f'page-{i+1}.png')
print(str(target));print('Paginas',len(final))
