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

const profileTypes = [
  { id: "", label: "All Types" },
  { id: "1", label: "Customer" },
  { id: "2", label: "Agent" },
  { id: "3", label: "Merchant" },
  { id: "4", label: "Distributor" },
  { id: "5", label: "Biller" },
  { id: "6", label: "System" },
];

const statusOptions = [
  { id: "", label: "All Statuses" },
  { id: "ACTIVE", label: "Active" },
  { id: "PENDING_KYC", label: "Pending KYC" },
  { id: "SUSPENDED", label: "Suspended" },
  { id: "BLOCKED", label: "Blocked" },
];

const statusBadge = {
  ACTIVE: "bg-green-100 text-green-700",
  PENDING_KYC: "bg-yellow-100 text-yellow-700",
  SUSPENDED: "bg-orange-100 text-orange-700",
  BLOCKED: "bg-red-100 text-red-700",
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
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500">{data.total} total users</p>
      </div>

      {/* Action bar */}
      <div className="mb-4 flex items-center justify-between">
        <div />
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors
            ${showCreate ? "bg-gray-500 hover:bg-gray-600" : "bg-primary-600 hover:bg-primary-700"}`}
        >
          {showCreate ? "Cancel" : "+ Create Distributor / Biller"}
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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearch} className="flex flex-[2] gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Search
          </button>
        </form>

        <div className="relative w-full sm:w-48">
          <select
            value={typeId}
            onChange={(e) => updateParams("typeId", e.target.value)}
            className="w-full appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {profileTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="relative w-full sm:w-48">
          <select
            value={status}
            onChange={(e) => updateParams("status", e.target.value)}
            className="w-full appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {statusOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <LoadingSpinner size="lg" className="py-12" />
        ) : data.users.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">
            No users found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.users.map((u) => (
                  <tr
                    key={u.profile_id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/admin/users/${u.profile_id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600">
                          {(u.full_name || "?")[0]}
                        </div>
                        <span className="font-medium text-gray-900">
                          {u.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {u.phone_number}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {u.type_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[u.account_status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {u.account_status || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {u.balance != null ? formatBDT(u.balance) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(u.registration_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500">
              Page {data.page} of {data.totalPages} ({data.total} results)
            </p>
            <div className="flex gap-2">
              <button
                disabled={data.page <= 1}
                onClick={() => updateParams("page", String(data.page - 1))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={data.page >= data.totalPages}
                onClick={() => updateParams("page", String(data.page + 1))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
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
    billerCode: "",
    serviceName: "",
    category: "",
  });
  const [districts, setDistricts] = useState([]);
  const [areasList, setAreasList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isAreaPickerOpen, setIsAreaPickerOpen] = useState(false);
  const [areaSearch, setAreaSearch] = useState("");

  const filteredAreas = areasList.filter((area) =>
    area.toLowerCase().includes(areaSearch.toLowerCase().trim()),
  );

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

  const toggleArea = (area) => {
    setForm((p) => {
      const has = p.selectedAreas.includes(area);
      const selectedAreas = has
        ? p.selectedAreas.filter((a) => a !== area)
        : [...p.selectedAreas, area];
      return { ...p, selectedAreas };
    });
  };

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
            closeButton: true,
            description:
              "Share this PIN with the distributor once. It will not be shown again.",
          });
        } else {
          toast.success("Distributor profile created.");
        }
      } else {
        await adminApi.createProfile({
          phoneNumber: form.phoneNumber,
          fullName: form.fullName,
          securityPin: form.securityPin,
          accountType: "BILLER",
          billerCode: form.billerCode,
          serviceName: form.serviceName,
          category: form.category || undefined,
        });
        toast.success("BILLER profile created successfully.");
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
              setIsAreaPickerOpen(false);
              setAreaSearch("");
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
              <select
                required
                value={form.district}
                onChange={(e) => {
                  setForm((p) => ({
                    ...p,
                    district: e.target.value,
                    selectedAreas: [],
                  }));
                  setIsAreaPickerOpen(false);
                  setAreaSearch("");
                }}
                className="w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-9 text-sm"
              >
                <option value="">Choose district</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-9 h-4 w-4 text-gray-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {req("Areas")}
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (!form.district) return;
                    setIsAreaPickerOpen((v) => !v);
                  }}
                  className={`w-full rounded-lg border px-3 py-2 pr-9 text-left text-sm ${
                    form.district
                      ? "border-gray-300 text-gray-900"
                      : "border-gray-200 bg-gray-50 text-gray-400"
                  }`}
                >
                  {form.selectedAreas.length > 0
                    ? form.selectedAreas.join(", ")
                    : form.district
                      ? "Choose areas"
                      : "Choose district first"}
                </button>
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />

                {isAreaPickerOpen && form.district ? (
                  <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                    <input
                      type="text"
                      value={areaSearch}
                      onChange={(e) => setAreaSearch(e.target.value)}
                      placeholder="Type to search area"
                      className="mb-2 w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    />
                    <div className="max-h-48 overflow-y-auto rounded-md border border-gray-100 p-1">
                      {filteredAreas.length === 0 ? (
                        <p className="px-2 py-2 text-xs text-gray-500">
                          No matching areas found
                        </p>
                      ) : (
                        filteredAreas.map((a) => (
                          <label
                            key={a}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={form.selectedAreas.includes(a)}
                              onChange={() => toggleArea(a)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-800">{a}</span>
                          </label>
                        ))
                      )}
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsAreaPickerOpen(false)}
                        className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
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
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">
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
              <label className="mb-1 block text-xs text-gray-500">
                {req("Full name")}
              </label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, fullName: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <PinInput
                length={5}
                onChange={(pin) => setForm((p) => ({ ...p, securityPin: pin }))}
                label="PIN (5 digits)"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                {req("Biller code")}
              </label>
              <input
                type="text"
                required
                value={form.billerCode}
                onChange={(e) =>
                  setForm((p) => ({ ...p, billerCode: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g., DESCO"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                {req("Service name")}
              </label>
              <input
                type="text"
                required
                value={form.serviceName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, serviceName: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g., Electricity"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                Category (optional)
              </label>
              <input
                type="text"
                value={form.category}
                onChange={(e) =>
                  setForm((p) => ({ ...p, category: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g., Utility"
              />
            </div>
          </div>
        </>
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
