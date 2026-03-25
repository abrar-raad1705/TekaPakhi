import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  ArrowPathIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import { transactionApi } from "../../api/transactionApi";
import { formatPhone } from "../../utils/formatCurrency";
import {
  formatTaka,
  formatReceiptTime,
  headerTitle,
} from "../../utils/transactionDetailFormat";
import LoadingSpinner from "../common/LoadingSpinner";

function GridCell({ children, borderRight, borderBottom, className = "" }) {
  return (
    <div
      className={`min-w-0 ${borderRight ? "border-r border-slate-200/80" : ""} ${borderBottom ? "border-b border-slate-200/80" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

function buildSendMoneyPrefillUrl(tx, isSender) {
  const raw = isSender ? tx.receiver_phone : tx.sender_phone;
  const digits = String(raw || "").replace(/\D/g, "");
  const cpName = isSender ? tx.receiver_name : tx.sender_name;
  const name = encodeURIComponent(cpName || "Recipient");
  return `/send-money?phone=${digits}&step=amount&name=${name}`;
}

export default function TransactionDetailPanel({ tx, user, onClose }) {
  const navigate = useNavigate();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [refCopied, setRefCopied] = useState(false);

  const isSender =
    tx.sender_profile_id?.toString() === user?.profileId?.toString();
  const amountNum = parseFloat(tx.amount) || 0;
  const feeNum = parseFloat(tx.fee_amount) || 0;

  const hideCounterpartyPhone = tx.type_name === "PAY_BILL";
  const counterparty = isSender
    ? { name: tx.receiver_name, phone: formatPhone(tx.receiver_phone) }
    : { name: tx.sender_name, phone: formatPhone(tx.sender_phone) };

  const copyTransactionRef = useCallback(async () => {
    if (!tx?.transaction_ref) return;
    try {
      await navigator.clipboard.writeText(tx.transaction_ref);
      setRefCopied(true);
      toast.success("Transaction ID copied");
      window.setTimeout(() => setRefCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  }, [tx?.transaction_ref]);

  const handleDownloadPdf = async () => {
    const tid = tx?.transaction_id;
    if (tid == null) {
      toast.error("Missing transaction id");
      return;
    }
    setPdfLoading(true);
    try {
      const { data } = await transactionApi.receiptPdf(Number(tid));
      const url = window.URL.createObjectURL(
        new Blob([data], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `TekaPakhi-Receipt-${tx.transaction_ref || tid}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Receipt downloaded");
    } catch (error) {
      let msg = "Could not generate PDF";
      const blob = error.response?.data;
      if (blob instanceof Blob) {
        try {
          const text = await blob.text();
          const j = JSON.parse(text);
          if (j.message) msg = j.message;
        } catch {
          /* keep default */
        }
      } else if (error.response?.data?.message) {
        msg = error.response.data.message;
      }
      toast.error(msg);
    } finally {
      setPdfLoading(false);
    }
  };

  const btnPrimaryFooter =
    "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-primary-600 bg-primary-600 px-4 py-3.5 text-[15px] font-bold text-white transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]";
  const btnOutlineFooter =
    "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-transparent px-4 py-3.5 text-[15px] font-bold text-slate-700 transition-transform duration-200 ease-out hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-100/80 active:scale-[0.98] disabled:opacity-50";

  return (
    <>
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 120% 80% at 0% -20%, rgba(56, 189, 248, 0.1), transparent 55%)",
        }}
      >
        <header className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 sm:px-8 sm:py-5">
          {/* Title */}
          <h2 className="min-w-0 text-lg font-bold tracking-tight text-slate-800 sm:text-xl">
            {headerTitle(tx, isSender)}
          </h2>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Download */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              title="Download Receipt"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-primary-600 transition-all duration-200 hover:bg-primary-50 hover:scale-105 hover:shadow-sm hover: disabled:opacity-50"
            >
              {pdfLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <ArrowDownTrayIcon className="h-5 w-5" strokeWidth={2} />
              )}
            </button>

            {/* Close (X) */}
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="group flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all duration-200 hover:bg-rose-50 hover:border-rose-100 hover:shadow-sm hover:scale-105"
            >
              <XMarkIcon
                className="h-5 w-5 transition-colors duration-200 group-hover:text-rose-600"
                strokeWidth={2}
              />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 border-b border-slate-200/80">
          <GridCell borderRight borderBottom className="p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Account
            </p>
            <p className="mt-2 text-base font-bold text-slate-800">
              {counterparty.name}
            </p>
            {!hideCounterpartyPhone ? (
              <p className="mt-1 text-[15px] font-medium text-slate-700">
                {counterparty.phone}
              </p>
            ) : null}
          </GridCell>
          <GridCell borderBottom className="p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Time
            </p>
            <p className="mt-2 text-[15px] font-medium text-slate-700">
              {formatReceiptTime(tx.transaction_time)}
            </p>
          </GridCell>
          <GridCell borderRight borderBottom className="p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Amount
            </p>
            <p className="mt-2 text-base font-bold text-slate-800">
              {formatTaka(amountNum)}
            </p>
          </GridCell>
          <GridCell borderBottom className="p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Charge
            </p>
            <p className="mt-2 text-base font-bold text-slate-800">
              {formatTaka(feeNum)}
            </p>
          </GridCell>
          <GridCell borderRight className="p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Transaction ID
            </p>
            <button
              type="button"
              onClick={() => copyTransactionRef()}
              className="mt-2 flex w-full min-w-0 items-center gap-2 text-left transition-opacity duration-200 hover:opacity-80"
            >
              <span className="min-w-0 flex-1 break-all font-mono text-base font-bold text-slate-800">
                {tx.transaction_ref}
              </span>
              {refCopied ? (
                <CheckIcon className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <DocumentDuplicateIcon
                  className="h-5 w-5 shrink-0 text-slate-500"
                  strokeWidth={1.75}
                />
              )}
            </button>
          </GridCell>
          <GridCell className="p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Reference
            </p>
            <p className="mt-2 min-h-[1.5rem] whitespace-pre-wrap break-words text-[15px] font-medium leading-relaxed text-slate-700">
              {tx.user_note?.trim() || "—"}
            </p>
          </GridCell>

          {tx.bill_account_number && (
            <GridCell borderRight className="border-t border-slate-200/80 p-4 sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Bill Account No.
              </p>
              <p className="mt-2 text-[15px] font-bold text-slate-800">
                {tx.bill_account_number}
              </p>
            </GridCell>
          )}
          {tx.bill_contact_number && (
            <GridCell className={`border-t border-slate-200/80 p-4 sm:p-5 ${!tx.bill_account_number ? "col-span-2" : ""}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Bill Contact
              </p>
              <p className="mt-2 text-[15px] font-bold text-slate-800">
                {formatPhone(tx.bill_contact_number)}
              </p>
            </GridCell>
          )}
        </div>

        <div
          className={`grid gap-3 p-5 sm:gap-4 sm:p-8 ${tx.type_name === "SEND_MONEY" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
        >
          {tx.type_name === "SEND_MONEY" ? (
            <button
              type="button"
              onClick={() => navigate(buildSendMoneyPrefillUrl(tx, isSender))}
              className={btnPrimaryFooter}
            >
              <ArrowPathIcon className="h-5 w-5" strokeWidth={2} />
              Send Money
            </button>
          ) : null}
          <button type="button" disabled className={btnOutlineFooter}>
            <ShareIcon className="h-5 w-5 text-slate-500" strokeWidth={2} />
            Share
          </button>
        </div>
      </div>
    </>
  );
}
