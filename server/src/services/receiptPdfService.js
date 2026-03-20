import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TYPE_LABELS = {
  SEND_MONEY: 'Send Money',
  CASH_IN: 'Cash In',
  CASH_OUT: 'Cash Out',
  PAYMENT: 'Payment',
  PAY_BILL: 'Pay Bill',
  B2B: 'B2B Transfer',
};

function escapeHtml(s) {
  if (s == null || s === '') return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Tk + ASCII digits — reliable in all PDF pipelines; label clarifies BDT. */
function formatBdt(n) {
  const num = parseFloat(n);
  if (Number.isNaN(num)) return 'Tk 0.00';
  return `Tk ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPhone(phone) {
  if (!phone || String(phone).length !== 11) return escapeHtml(phone || '—');
  const p = String(phone);
  return escapeHtml(`${p.slice(0, 5)}-${p.slice(5)}`);
}

function formatWhen(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return escapeHtml(
    d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  );
}

function loadLogoDataUri() {
  const candidates = [
    path.join(__dirname, '../../assets/logo.svg'),
    path.join(__dirname, '../../../client/src/assets/icons/logo.svg'),
    path.join(process.cwd(), 'client/src/assets/icons/logo.svg'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        return `data:image/svg+xml;base64,${buf.toString('base64')}`;
      }
    } catch {
      /* next */
    }
  }
  return null;
}

function resolveChromeExecutablePath() {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  const systemCandidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const p of systemCandidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* continue */
    }
  }

  try {
    const bundled = puppeteer.executablePath();
    if (bundled && fs.existsSync(bundled)) return bundled;
  } catch {
    /* none */
  }

  return null;
}

/**
 * Recipient-facing receipt HTML. Styles come from locally compiled Tailwind
 * (`assets/receipt.compiled.css`); keep class lists in sync with
 * `src/styles/receipt-pdf-utilities.html`.
 */
function buildReceiptHtml(receipt, logoDataUri) {
  const typeLabel = escapeHtml(TYPE_LABELS[receipt.type] || receipt.type || 'Transaction');
  const ref = escapeHtml(String(receipt.transactionRef || '—'));
  const status = escapeHtml(receipt.status || 'COMPLETED');
  const senderName = escapeHtml(receipt.sender?.name || '—');
  const receiverName = escapeHtml(receipt.receiver?.name || '—');

  const logoHtml = logoDataUri
    ? `<img src="${logoDataUri}" alt="TekaPakhi" class="mb-2 block h-9 w-auto object-contain object-left" />`
    : `<span class="mb-2 block text-lg font-extrabold tracking-tight text-blue-600">TekaPakhi</span>`;

  const noteSection = receipt.note
    ? `<div class="ml-auto mt-5 w-1/2 max-w-full border-t border-slate-200 pt-3.5">
         <p class="mb-2 m-0 text-right text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">NOTE</p>
         <p class="m-0 text-right text-[10px] leading-snug text-slate-600 break-words [overflow-wrap:anywhere]">${escapeHtml(String(receipt.note))}</p>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
</head>
<body class="m-0 bg-white text-sm leading-normal text-slate-900 antialiased">
  <div class="mx-auto max-w-[520px] px-10 pb-12 pt-9">
    ${logoHtml}
    <p class="mb-1 m-0 text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-400">OFFICIAL RECEIPT</p>
    <h1 class="mb-5 m-0 text-[13px] font-extrabold tracking-tight text-slate-900">${typeLabel}</h1>
    <div class="mb-[18px] h-px w-full bg-slate-200" role="presentation"></div>

    <p class="mb-1.5 m-0 text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">TRANSACTION ID</p>
    <p class="mb-4 m-0 text-[10px] font-bold break-all text-slate-900">${ref}</p>
    <p class="mb-1.5 m-0 text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">DATE &amp; TIME</p>
    <p class="mb-4 m-0 text-[10px] text-slate-600">${formatWhen(receipt.timestamp)}</p>

    <div class="mb-[22px] rounded-md bg-slate-50 px-5 pt-3.5 pb-4 text-center">
      <p class="mb-2 m-0 text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-500">AMOUNT (BDT)</p>
      <p class="mb-2 m-0 text-2xl font-extrabold tracking-tight text-slate-900">${escapeHtml(formatBdt(receipt.amount))}</p>
      <p class="m-0 text-[9px] text-slate-500">Status: ${status}</p>
    </div>

    <div class="mb-1 flex gap-6">
      <div class="min-w-0 flex-1">
        <p class="mb-2 m-0 text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">FROM</p>
        <p class="mb-1.5 m-0 text-[10px] font-bold break-words text-slate-900">${senderName}</p>
        <p class="m-0 text-[9px] text-slate-500">${formatPhone(receipt.sender?.phone)}</p>
      </div>
      <div class="min-w-0 flex-1">
        <p class="mb-2 m-0 text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">TO</p>
        <p class="mb-1.5 m-0 text-[10px] font-bold break-words text-slate-900">${receiverName}</p>
        <p class="m-0 text-[9px] text-slate-500">${formatPhone(receipt.receiver?.phone)}</p>
      </div>
    </div>

    ${noteSection}

    <div class="mb-3 mt-6 h-px w-full bg-slate-200" role="presentation"></div>
    <div class="mb-3 flex items-center justify-between text-[7px]">
      <span class="font-semibold text-emerald-600">Verified secure transaction</span>
      <span class="font-bold text-slate-300">TekaPakhi</span>
    </div>
    <p class="m-0 text-center text-[7px] leading-snug text-slate-400">This receipt is for your records. For support, use the TekaPakhi app.</p>
  </div>
</body>
</html>`;
}

function resolveReceiptCompiledCssPath() {
  const p = path.join(__dirname, '../../assets/receipt.compiled.css');
  if (!fs.existsSync(p)) {
    throw new Error(
      'Missing assets/receipt.compiled.css. From server/: npm run build:receipt-css'
    );
  }
  return p;
}

export async function renderReceiptPdf(receipt) {
  const logoDataUri = loadLogoDataUri();
  const html = buildReceiptHtml(receipt, logoDataUri);
  const receiptCssPath = resolveReceiptCompiledCssPath();

  const executablePath = resolveChromeExecutablePath();
  if (!executablePath) {
    throw new Error(
      'No Chrome/Chromium found for PDF generation. Set PUPPETEER_EXECUTABLE_PATH or run: cd server && npx puppeteer browsers install chrome'
    );
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.addStyleTag({ path: receiptCssPath });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '36px', right: '36px', bottom: '40px', left: '36px' },
    });
    return Buffer.from(pdf);
  } finally {
    if (browser) await browser.close();
  }
}
