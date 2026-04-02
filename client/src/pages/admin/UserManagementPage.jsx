import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { adminApi } from "../../api/adminApi";
import { locationsApi } from "../../api/locationsApi";
import { formatBDT } from "../../utils/formatCurrency";
import AdminLayout from "../../components/admin/AdminLayout";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PinInput from "../../components/common/PinInput";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import ProfileAvatar from "../../components/common/ProfileAvatar";
import SearchableSelect from "../../components/common/SearchableSelect";
import { getProfileTypeAdmin, ADMIN_TYPE_PILL_BOX } from "../../utils/roleTheme";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

const profileTypes = [
  { id: "", label: "All Types" },
  { id: "1", label: "Customer" },
  { id: "2", label: "Agent" },
  { id: "3", label: "Merchant" },
  { id: "4", label: "Distributor" },
  { id: "5", label: "Biller" },
];

const statusOptions = [
  { id: "", label: "All Statuses" },
  { id: "ACTIVE", label: "Active" },
  { id: "PENDING_KYC", label: "Pending KYC" },
  { id: "SUSPENDED", label: "Suspended" },
  { id: "BLOCKED", label: "Blocked" },
];

const ACCOUNT_STATUS_STYLE = {
  ACTIVE: "bg-green-50 text-green-700 border border-green-100",
  PENDING_KYC: "bg-amber-50 text-amber-800 border border-amber-100",
  SUSPENDED: "bg-orange-50 text-orange-800 border border-orange-100",
  BLOCKED: "bg-red-50 text-red-700 border border-red-100",
};

export default function UserManagementPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({
    users: [],
    total: 0,
    page: 1,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [showCreate, setShowCreate] = useState(false);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const typeId = searchParams.get("typeId") || "";
  const status = searchParams.get("status") || "";

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (typeId) params.typeId = typeId;
      if (status) params.status = status;
      const res = await adminApi.getUsers(params);
      setData(res.data.data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeId, status]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateParams = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.set("page", "1");
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateParams("search", search);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User management</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {data.total.toLocaleString()} total · search by name or phone
        </p>
      </div>

      {/* Action bar */}
      <div className="mb-5 flex items-center justify-between">
        <div />
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors
            ${showCreate ? "bg-gray-500 hover:bg-gray-600" : "bg-primary-600 hover:bg-primary-700"}`}
        >
          {showCreate ? "Cancel" : "+ Create distributor / biller"}
        </button>
      </div>

      {/* Create Profile Form */}
      {showCreate && (
        <CreateProfileForm
          onCreated={() => {
            setShowCreate(false);
            fetchUsers();
          }}
        />
      )}

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearch} className="flex flex-[2] gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/10 shadow-sm"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 shadow-sm transition-colors"
          >
            Search
          </button>
        </form>

        <div className="w-full sm:w-44">
          <Select value={typeId} onValueChange={(val) => updateParams("typeId", val === "all" ? "" : val)}>
            <SelectTrigger className="w-full bg-white h-[42px] rounded-xl shadow-sm border-gray-200">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {profileTypes.filter(t => t.id !== "").map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-44">
           <Select value={status} onValueChange={(val) => updateParams("status", val === "all" ? "" : val)}>
            <SelectTrigger className="w-full bg-white h-[42px] rounded-xl shadow-sm border-gray-200">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.filter(t => t.id !== "").map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        {loading ? (
          <LoadingSpinner size="lg" className="py-16" />
        ) : data.users.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500">
            No users match your filters.
          </p>
        ) : (
          <div className="overflow-x-auto px-1">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Type
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Balance
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Registered
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.users.map((u) => (
                  <tr
                    key={u.profile_id}
                    className="cursor-pointer bg-white odd:bg-gray-50/60 hover:bg-primary-50/40 transition-colors"
                    onClick={() => navigate(`/admin/users/${u.profile_id}`)}
                  >
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center justify-start gap-3">
                        <ProfileAvatar
                          pictureUrl={u.profile_picture_url}
                          name={u.full_name}
                          className="h-10 w-10 text-sm"
                        />
                        <span className="font-semibold text-gray-900">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-left align-middle text-sm font-medium text-gray-700 tabular-nums">
                      {u.phone_number}
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex justify-center">
                        <span
                          className={`${ADMIN_TYPE_PILL_BOX} ${getProfileTypeAdmin(u.type_name).badge}`}
                        >
                          {u.type_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex justify-center">
                        <span
                          className={`inline-block rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${ACCOUNT_STATUS_STYLE[u.account_status] || "bg-gray-100 text-gray-700 border border-gray-200"}`}
                        >
                          {u.account_status || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right align-middle font-semibold tabular-nums text-gray-900">
                      {u.balance != null ? formatBDT(u.balance) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right align-middle text-xs font-medium text-gray-800 whitespace-nowrap">
                      {new Date(u.registration_date).toLocaleString("en-BD", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/80 px-5 py-3">
            <p className="text-xs text-gray-500 font-medium">
              Page <span className="text-gray-800 font-semibold">{data.page}</span> of {data.totalPages} · {data.total.toLocaleString()} results
            </p>
            <div className="flex gap-2">
              <button
                disabled={data.page <= 1}
                onClick={(e) => {
                  e.stopPropagation();
                  updateParams("page", String(data.page - 1));
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
              >
                Previous
              </button>
              <button
                disabled={data.page >= data.totalPages}
                onClick={(e) => {
                  e.stopPropagation();
                  updateParams("page", String(data.page + 1));
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ── Create Profile Form (Distributor / Biller) ────────────────

const req = (label) => (
  <>
    {label} <span className="text-red-500">*</span>
  </>
);

function CreateProfileForm({ onCreated }) {
  const BILLER_TYPES = [
    "Electricity", "Gas", "Water", "Internet", "Telephone",
    "TV", "Credit Card", "Govt. Fees", "Insurance", "Tracker", "Others",
  ];

  const [form, setForm] = useState({
    phoneNumber: "",
    fullName: "",
    securityPin: "",
    accountType: "DISTRIBUTOR",
    businessName: "",
    contactPersonName: "",
    email: "",
    additionalInfo: "",
    district: "",
    selectedAreas: [],
    serviceName: "",
    billerType: "Others",
    senderChargeFlat: "",
    senderChargePercent: "",
  });
  const [districts, setDistricts] = useState([]);
  const [areasList, setAreasList] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form.accountType !== "DISTRIBUTOR") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await locationsApi.getDistricts();
        if (!cancelled) setDistricts(res.data.data || []);
      } catch {
        if (!cancelled) toast.error("Failed to load districts.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.accountType]);

  useEffect(() => {
    if (form.accountType !== "DISTRIBUTOR" || !form.district) {
      setAreasList([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await locationsApi.getAreas(form.district);
        if (!cancelled) setAreasList(res.data.data || []);
      } catch {
        if (!cancelled) {
          setAreasList([]);
          toast.error("Failed to load areas for this district.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.accountType, form.district]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (form.accountType === "DISTRIBUTOR") {
        const payload = {
          phoneNumber: form.phoneNumber,
          accountType: "DISTRIBUTOR",
          businessName: form.businessName.trim(),
          contactPersonName: form.contactPersonName.trim(),
          email: form.email.trim() || undefined,
          additionalInfo: form.additionalInfo.trim() || undefined,
          areas: form.selectedAreas.map((area) => ({
            district: form.district,
            area,
          })),
        };
        const res = await adminApi.createProfile(payload);
        const temporaryPin = res.data.data?.temporaryPin;
        if (temporaryPin) {
          toast.success(`Temporary PIN: ${temporaryPin}`, {
            duration: Infinity,
            description: "Profile created! Share this PIN now. It will not be shown again.",
            action: {
              label: "Copy PIN",
              onClick: () => {
                navigator.clipboard.writeText(temporaryPin);
                toast.success("PIN copied to clipboard", { duration: 1000 });
              },
            },
          });
        } else {
          toast.success("Distributor profile created.");
        }
      } else {
        const res = await adminApi.createProfile({
          phoneNumber: form.phoneNumber,
          accountType: "BILLER",
          contactPersonName: form.contactPersonName.trim(),
          email: form.email.trim() || undefined,
          serviceName: form.serviceName,
          billerType: form.billerType,
          senderChargeFlat: parseFloat(form.senderChargeFlat) || 0,
          senderChargePercent: parseFloat(form.senderChargePercent) || 0,
        });
        const temporaryPin = res.data.data?.temporaryPin;
        if (temporaryPin) {
          toast.success(`Temporary PIN: ${temporaryPin}`, {
            duration: Infinity,
            description: "Profile created! Share this PIN now. It will not be shown again.",
            action: {
              label: "Copy PIN",
              onClick: () => {
                navigator.clipboard.writeText(temporaryPin);
                toast.success("PIN copied to clipboard", { duration: 1000 });
              },
            },
          });
        } else {
          toast.success("BILLER profile created successfully.");
        }
      }
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-xl border border-gray-200 bg-white p-5"
    >
      <h3 className="mb-4 text-sm font-semibold text-gray-700">
        Create New Profile
      </h3>

      <div className="mb-4 flex gap-2">
        {["DISTRIBUTOR", "BILLER"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setForm((p) => ({
                ...p,
                accountType: t,
                district: "",
                selectedAreas: [],
              }));
            }}
            className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
              form.accountType === t
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {form.accountType === "DISTRIBUTOR" ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {req("Business name")}
            </label>
            <input
              type="text"
              required
              value={form.businessName}
              onChange={(e) =>
                setForm((p) => ({ ...p, businessName: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Business / shop name"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {req("District")}
              </label>
              <SearchableSelect
                value={form.district}
                onChange={(val) => {
                  setForm((p) => ({
                    ...p,
                    district: val,
                    selectedAreas: [],
                  }));
                }}
                options={districts}
                placeholder={districts.length === 0 ? "Loading..." : "Choose district"}
                searchPlaceholder="Search district..."
                size="small"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {req("Areas")}
              </label>
              <SearchableSelect
                value={form.selectedAreas}
                onChange={(val) => {
                  setForm((p) => ({ ...p, selectedAreas: val }));
                }}
                options={areasList.map((a) => {
                  if (typeof a === 'string') return { label: a, value: a, disabled: false };
                  return { label: a.area, value: a.area, disabled: a.isTaken };
                })}
                placeholder={!form.district ? "Choose district first" : "Choose areas"}
                searchPlaceholder="Search area..."
                multiple={true}
                disabled={!form.district}
                size="small"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                One area can only be assigned to one distributor.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {req("Contact person")}
            </label>
            <input
              type="text"
              required
              value={form.contactPersonName}
              onChange={(e) =>
                setForm((p) => ({ ...p, contactPersonName: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Enter name"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {req("Phone number")}
              </label>
              <input
                type="tel"
                required
                value={form.phoneNumber}
                maxLength={11}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 11),
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="01XXXXXXXXX"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Email address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Enter email address"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Additional information you want to submit
            </label>
            <textarea
              value={form.additionalInfo}
              onChange={(e) =>
                setForm((p) => ({ ...p, additionalInfo: e.target.value }))
              }
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Additional information"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {req("Contact person name")}
            </label>
            <input
              type="text"
              required
              value={form.contactPersonName}
              onChange={(e) =>
                setForm((p) => ({ ...p, contactPersonName: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Enter name"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {req("Phone number")}
              </label>
              <input
                type="tel"
                required
                value={form.phoneNumber}
                maxLength={11}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 11),
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="01XXXXXXXXX"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Email address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Enter email address"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {req("Biller name")}
              </label>
              <input
                type="text"
                required
                value={form.serviceName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, serviceName: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g., DESCO"
              />
            </div>
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {req("Biller type")}
              </label>
              <SearchableSelect
                value={form.billerType}
                onChange={(val) => setForm((p) => ({ ...p, billerType: val }))}
                options={BILLER_TYPES}
                placeholder="Choose biller type"
                searchPlaceholder="Search biller type..."
                size="small"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Sender charge (Flat BDT)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.senderChargeFlat}
                onChange={(e) =>
                  setForm((p) => ({ ...p, senderChargeFlat: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Sender charge (Percent %)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.senderChargePercent}
                onChange={(e) =>
                  setForm((p) => ({ ...p, senderChargePercent: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Profile"}
        </button>
      </div>
    </form>
  );
}
