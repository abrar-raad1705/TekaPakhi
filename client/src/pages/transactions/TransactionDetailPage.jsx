import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LoadingSpinner from "../../components/common/LoadingSpinner";

/**
 * Legacy URL: /transactions/:id → opens the same detail modal on /transactions?tx=
 */
export default function TransactionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      navigate(`/transactions?tx=${encodeURIComponent(id)}`, {
        replace: true,
      });
    } else {
      navigate("/transactions", { replace: true });
    }
  }, [id, navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50">
      <LoadingSpinner size="lg" />
    </div>
  );
}
