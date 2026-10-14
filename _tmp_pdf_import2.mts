import { createRequire } from "module";
const req = createRequire(import.meta.url);
const pdfParse = req("pdf-parse/lib/pdf-parse.js");
console.log("typeof", typeof pdfParse);
const s = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 52 >>\nstream\nBT /F1 24 Tf 72 700 Td (Hello IntervAI) Tj ET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n";
try { const r = await pdfParse(Buffer.from(s)); console.log("OK", r.numpages, JSON.stringify(r.text)); } catch (e) { console.error("ERR", e.message); }
