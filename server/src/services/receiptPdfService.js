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
 * Build a modern, professional receipt HTML.
 * Uses inline styles alongside Tailwind utility classes so the PDF
 * renders a polished document even with minimal CSS processing.
 * Keep class lists in sync with `src/styles/receipt-pdf-utilities.html`.
 */
function buildReceiptHtml(receipt, logoDataUri) {
  const typeLabel = escapeHtml(TYPE_LABELS[receipt.type] || receipt.type || 'Transaction');
  const ref = escapeHtml(String(receipt.transactionRef || '—'));
  const status = escapeHtml(receipt.status || 'COMPLETED');
  const senderName = escapeHtml(receipt.sender?.name || '—');
  const receiverName = escapeHtml(receipt.receiver?.name || '—');

  const logoHtml = logoDataUri
    ? `<img src="${logoDataUri}" alt="TekaPakhi" style="height:32px;width:auto;" />`
    : `<span style="font-size:20px;font-weight:800;color:#2563eb;letter-spacing:-0.02em;">TekaPakhi</span>`;

  // Build optional rows for the details table
  let extraRows = '';
  if (receipt.billAccountNumber) {
    extraRows += `
      <tr>
        <td style="padding:10px 0;color:#64748b;font-size:13px;font-weight:500;border-bottom:1px solid #f1f5f9;white-space:nowrap;">Account No.</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#1e293b;text-align:right;border-bottom:1px solid #f1f5f9;">${escapeHtml(receipt.billAccountNumber)}</td>
      </tr>`;
  }
  if (receipt.billContactNumber) {
    extraRows += `
      <tr>
        <td style="padding:10px 0;color:#64748b;font-size:13px;font-weight:500;border-bottom:1px solid #f1f5f9;white-space:nowrap;">Bill Contact</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#1e293b;text-align:right;border-bottom:1px solid #f1f5f9;">${formatPhone(receipt.billContactNumber)}</td>
      </tr>`;
  }
  if (receipt.note) {
    extraRows += `
      <tr>
        <td style="padding:10px 0;color:#64748b;font-size:13px;font-weight:500;white-space:nowrap;vertical-align:top;">Note</td>
        <td style="padding:10px 0;font-size:13px;font-weight:500;color:#475569;text-align:right;word-break:break-word;overflow-wrap:anywhere;">&ldquo;${escapeHtml(String(receipt.note))}&rdquo;</td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #ffffff;
      color: #1e293b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  </style>
</head>
<body>
  <div style="max-width:540px;margin:0 auto;padding:40px 44px 36px;">

    <!-- HEADER -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;">
      <div>
        ${logoHtml}
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;">Official Receipt</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${formatWhen(receipt.timestamp)}</div>
      </div>
    </div>

    <!-- HERO BAND -->
    <div style="background:#f2f9fe;border:1px solid #dbeafe;border-radius:16px;padding:28px 32px;margin-bottom:28px;color:#1e293b;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
        <span style="font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;">${typeLabel}</span>
        <span style="display:inline-flex;align-items:center;gap:6px;background:#ffffff;border:1px solid #dbeafe;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;letter-spacing:0.04em;color:#2563eb;">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#16a34a;"></span>
          ${status}
        </span>
      </div>
      <div style="font-size:36px;font-weight:800;letter-spacing:-0.02em;line-height:1.1;color:#2563eb;">${escapeHtml(formatBdt(receipt.amount))}</div>
      <div style="margin-top:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Transaction ID</div>
      <div style="margin-top:4px;font-size:14px;font-weight:700;color:#1e293b;letter-spacing:0.02em;word-break:break-all;font-family:inherit;">${ref}</div>
    </div>

    <!-- FROM / TO CARDS -->
    <div style="display:flex;gap:16px;margin-bottom:28px;">
      <div style="flex:1;background:#f2f9fe;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">From</div>
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px;">${senderName}</div>
        <div style="font-size:13px;color:#64748b;font-weight:500;">${formatPhone(receipt.sender?.phone)}</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;">
        <div style="width:36px;height:36px;background:#eff6ff;border:1px solid #dbeafe;border-radius:50%;display:flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </div>
      </div>
      <div style="flex:1;background:#f2f9fe;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">To</div>
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px;">${receiverName}</div>
        <div style="font-size:13px;color:#64748b;font-weight:500;">${formatPhone(receipt.receiver?.phone)}</div>
      </div>
    </div>

    <!-- BREAKDOWN TABLE -->
    <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:28px;">
      <div style="background:#f2f9fe;padding:12px 20px;border-bottom:1px solid #e2e8f0;">
        <span style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Transaction Details</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>
          <tr>
            <td style="padding:12px 20px;color:#64748b;font-size:13px;font-weight:500;border-bottom:1px solid #f1f5f9;">Amount</td>
            <td style="padding:12px 20px;font-size:13px;font-weight:600;color:#1e293b;text-align:right;border-bottom:1px solid #f1f5f9;">${escapeHtml(formatBdt(receipt.amount))}</td>
          </tr>
          <tr>
            <td style="padding:12px 20px;color:#64748b;font-size:13px;font-weight:500;border-bottom:1px solid #f1f5f9;">Fee</td>
            <td style="padding:12px 20px;font-size:13px;font-weight:600;color:#1e293b;text-align:right;border-bottom:1px solid #f1f5f9;">${escapeHtml(formatBdt(receipt.fee))}</td>
          </tr>
          <tr style="background:#f2f9fe;">
            <td style="padding:14px 20px;color:#1e293b;font-size:14px;font-weight:700;">Total Debit</td>
            <td style="padding:14px 20px;font-size:16px;font-weight:800;color:#2563eb;text-align:right;">${escapeHtml(formatBdt(receipt.totalDebit))}</td>
          </tr>
          ${extraRows ? `
          <tr><td colspan="2" style="padding:0;"><div style="height:1px;background:#e2e8f0;"></div></td></tr>
          ` : ''}
          ${extraRows.replace(/padding:10px 0/g, 'padding:12px 20px')}
        </tbody>
      </table>
    </div>

    <!-- FOOTER -->
    <div style="border-top:2px solid #e2e8f0;padding-top:20px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
        <span style="font-size:10px;font-weight:700;color:#16a34a;letter-spacing:0.05em;text-transform:uppercase;">Verified &amp; Secure</span>
      </div>
      <span style="font-size:10px;font-weight:600;color:#cbd5e1;">TekaPakhi</span>
    </div>
    <div style="text-align:center;margin-top:16px;">
      <p style="font-size:10px;color:#94a3b8;line-height:1.6;">
        This is a computer-generated receipt and does not require a signature.<br/>
        For support, contact us through the TekaPakhi app.
      </p>
    </div>
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
