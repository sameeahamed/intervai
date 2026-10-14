const BASE = process.env.TEST_BASE || 'http://127.0.0.1:3998';

function makePdf(text) {
  const header = '%PDF-1.4\n';
  const content = `BT /F1 24 Tf 72 700 Td (${text}) Tj ET`;
  const objs = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
  ];
  let body = header;
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(body));
    body += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(body);
  body += `xref\n0 ${objs.length + 1}\n`;
  body += `0000000000 65535 f \n`;
  offsets.forEach((off) => {
    body += `${String(off).padStart(10, '0')} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}

const pdfBuffer = makePdf('Hello IntervAI Resume Test');
const pdfString = pdfBuffer;

let pass = 0;
let fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra); }
}

async function main() {
  // Login
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'candidate@intervai.com', password: 'candidate123' }),
  });
  const login = await loginRes.json();
  check('login ok', loginRes.ok && !!login.token, JSON.stringify(login).slice(0, 120));
  const token = login.token;
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Unauthenticated upload rejected
  const noAuth = await fetch(`${BASE}/api/auth/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileBase64: Buffer.from(pdfString).toString('base64'), fileName: 'r.pdf' }),
  });
  check('upload requires auth', noAuth.status === 401 || noAuth.status === 403, `status=${noAuth.status}`);

  // Valid upload
  const b64 = Buffer.from(pdfString).toString('base64');
  const upRes = await fetch(`${BASE}/api/auth/resume`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ fileBase64: `data:application/pdf;base64,${b64}`, fileName: 'my resume.pdf' }),
  });
  const up = await upRes.json();
  check('valid pdf upload ok', upRes.ok && up.resume && up.resume.pages >= 1, JSON.stringify(up).slice(0, 200));
  check('extracted text present', !!up.user?.resumeText && /IntervAI/i.test(up.user.resumeText), up.user?.resumeText);
  check('filename stored sanitized', up.user?.resumeFileName === 'my resume.pdf', up.user?.resumeFileName);
  check('updatedAt stored', !!up.user?.resumeUpdatedAt);

  // /me reflects stored resume
  const me = await (await fetch(`${BASE}/api/auth/me`, { headers: auth })).json();
  check('me reflects resume', !!me.user?.resumeText && me.user.resumeFileName === 'my resume.pdf');

  // Non-PDF extension rejected
  const badExt = await fetch(`${BASE}/api/auth/resume`, {
    method: 'POST', headers: auth,
    body: JSON.stringify({ fileBase64: b64, fileName: 'resume.txt' }),
  });
  check('non-pdf extension rejected', badExt.status === 400, `status=${badExt.status}`);

  // Invalid signature rejected
  const badSig = await fetch(`${BASE}/api/auth/resume`, {
    method: 'POST', headers: auth,
    body: JSON.stringify({ fileBase64: Buffer.from('not a pdf at all').toString('base64'), fileName: 'fake.pdf' }),
  });
  check('invalid pdf signature rejected', badSig.status === 400, `status=${badSig.status}`);

  // Oversized rejected (6MB)
  const big = Buffer.alloc(6 * 1024 * 1024, 0x20);
  big.write('%PDF-', 0);
  const bigUp = await fetch(`${BASE}/api/auth/resume`, {
    method: 'POST', headers: auth,
    body: JSON.stringify({ fileBase64: big.toString('base64'), fileName: 'big.pdf' }),
  });
  check('oversized rejected', bigUp.status === 413, `status=${bigUp.status}`);

  // Delete
  const delRes = await fetch(`${BASE}/api/auth/resume`, { method: 'DELETE', headers: auth });
  const del = await delRes.json();
  check('delete clears resume', delRes.ok && !del.user?.resumeText && !del.user?.resumeFileName, JSON.stringify(del).slice(0, 200));

  const me2 = await (await fetch(`${BASE}/api/auth/me`, { headers: auth })).json();
  check('me after delete clear', !me2.user?.resumeText && !me2.user?.resumeFileName);

  console.log(`\nRESUME HTTP CHECKS: ${fail === 0 ? 'PASS' : 'FAIL'} (${pass} passed, ${fail} failed)`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error('TEST ERROR', e); process.exit(1); });
