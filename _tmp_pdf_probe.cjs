function makePdf(text) {
  const header = '%PDF-1.4\n';
  const content = `BT /F1 24 Tf 72 700 Td (${text}) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = header;
  const offs = [];
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(body)); body += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offs.forEach((o) => { body += `${String(o).padStart(10, '0')} 00000 n \n`; });
  body += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body);
}

const which = process.argv[2] || 'lib';
const pdfParse = which === 'main' ? require('pdf-parse') : require('pdf-parse/lib/pdf-parse.js');
pdfParse(makePdf('Hello IntervAI ' + which))
  .then((r) => console.log(which, 'OK pages', r.numpages, JSON.stringify(r.text)))
  .catch((e) => console.error(which, 'ERR', e.message));
