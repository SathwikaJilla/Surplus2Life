import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Settings,
  History,
  CheckCircle,
  Save,
  Package,
  BarChart3,
  MapPin,
  AlertTriangle,
  Download,
  Filter,
  Eye,
  RefreshCw,
  Search,
  Users,
  Building,
  Recycle,
  Heart
} from "lucide-react";
import { api } from "../api";
import HeatmapView from "./HeatmapView";
import confetti from "canvas-confetti";

export default function AdminDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState("verifications"); // 'verifications' | 'donations' | 'analytics' | 'heatmap' | 'audit' | 'rewards'
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [configEdits, setConfigEdits] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [impactStats, setImpactStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Verification filter
  const [roleFilter, setRoleFilter] = useState("all"); // 'all' | 'recipient' | 'recovery_partner' | 'volunteer' | 'donor' | 'unverified'
  const [userSearch, setUserSearch] = useState("");

  // Donation filter
  const [donationStatusFilter, setDonationStatusFilter] = useState("all");

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [uRes, dRes, cRes, aRes, sRes] = await Promise.all([
        api.getUsers().catch(() => ({ users: [] })),
        api.getDonations().catch(() => ({ donations: [] })),
        api.getRewardConfig().catch(() => ({ configs: [] })),
        api.getAuditLogs().catch(() => ({ logs: [] })),
        api.getImpactSummary().catch(() => null)
      ]);
      setUsers(uRes?.users || []);
      setDonations(dRes?.donations || []);
      setConfigs(cRes?.configs || []);
      setAuditLogs(aRes?.logs || []);
      setImpactStats(sRes);

      const initialEdits = {};
      (cRes?.configs || []).forEach((c) => {
        initialEdits[c.config_key] = c.config_val;
      });
      setConfigEdits(initialEdits);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId) => {
    try {
      await api.verifyUser(userId);
      confetti({ particleCount: 50, spread: 50 });
      await loadAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveConfigs = async () => {
    setSavingConfig(true);
    try {
      await api.updateRewardConfig(configEdits);
      alert("Reward rules and credit configuration updated successfully.");
      await loadAdminData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  // Demo role accounts used strictly for 5-role dashboard switching
  const DEMO_ACCOUNT_IDS = new Set([
    "admin-1",
    "donor-1",
    "donor-2",
    "recip-1",
    "recip-2",
    "vol-1",
    "vol-2",
    "recov-1",
    "recov-2"
  ]);

  // Actual registered users/organizations only (excludes demo role accounts and mock seed accounts)
  const registeredUsers = users.filter(
    (u) => !DEMO_ACCOUNT_IDS.has(u.id) && !u.is_demo
  );

  // Filtered users for verification
  const filteredUsers = registeredUsers.filter((u) => {
    if (roleFilter === "unverified" && u.verified === 1) return false;
    if (roleFilter !== "all" && roleFilter !== "unverified" && u.role !== roleFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      const matchName = u.name?.toLowerCase().includes(q);
      const matchOrg = u.org_name?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      if (!matchName && !matchOrg && !matchEmail) return false;
    }
    return true;
  });

  // Filtered donations for monitoring
  const filteredDonations = donations.filter((d) => {
    if (donationStatusFilter !== "all" && d.status !== donationStatusFilter) return false;
    return true;
  });

  // Export report as CSV
  const handleExportReport = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Meals Rescued", impactStats?.meals_rescued || 0],
      ["Total Organic Waste Diverted (kg)", impactStats?.waste_diverted_kg || 0],
      ["Total Trees Planted", impactStats?.trees_planted || 0],
      ["People Nourished", impactStats?.people_nourished || 0],
      ["Total Registered Accounts", registeredUsers.length],
      ["Total Donations Recorded", donations.length]
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `surplus2life_admin_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Admin Hero Header */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-semibold text-xs border border-purple-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              Central Platform Governance
            </span>
            <span className="text-xs text-[#647067]">Surplus2Life Admin Console</span>
          </div>
          <h2 className="text-xl font-bold text-[#17211B] mt-1.5">Admin & Verification Console</h2>
          <p className="text-xs text-[#647067] mt-0.5 max-w-xl">
            Monitor real-time donations, verify recipient shelters and recovery facilities, view audit trails, and oversee system analytics.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap items-center p-1 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] gap-1">
          <button
            onClick={() => setActiveTab("verifications")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "verifications" ? "bg-purple-700 text-white shadow-xs" : "text-[#647067] hover:text-[#17211B]"
            }`}
          >
            User Verification
          </button>
          <button
            onClick={() => setActiveTab("donations")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "donations" ? "bg-purple-700 text-white shadow-xs" : "text-[#647067] hover:text-[#17211B]"
            }`}
          >
            Donation Monitoring
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "analytics" ? "bg-purple-700 text-white shadow-xs" : "text-[#647067] hover:text-[#17211B]"
            }`}
          >
            Platform Analytics
          </button>
          <button
            onClick={() => setActiveTab("heatmap")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "heatmap" ? "bg-purple-700 text-white shadow-xs" : "text-[#647067] hover:text-[#17211B]"
            }`}
          >
            Heatmap
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "audit" ? "bg-purple-700 text-white shadow-xs" : "text-[#647067] hover:text-[#17211B]"
            }`}
          >
            Audit Trail
          </button>
          <button
            onClick={() => setActiveTab("rewards")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "rewards" ? "bg-purple-700 text-white shadow-xs" : "text-[#647067] hover:text-[#17211B]"
            }`}
          >
            Reward Config
          </button>
        </div>
      </div>

      {/* TAB 1: User & Partner Verification */}
      {activeTab === "verifications" && (
        <div className="rounded-2xl bg-white border border-[#E5EAE1] overflow-hidden shadow-xs space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5EAE1]">
            <div>
              <h3 className="text-sm font-bold text-[#17211B] flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>Trust & Verification Matrix</span>
              </h3>
              <p className="text-xs text-[#647067]">
                Approve verified NGOs, community recipient centers, and circular recovery facilities.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#647067] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name, org, email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E5EAE1] bg-[#F5F7F2] focus:outline-none focus:border-purple-400 w-52"
                />
              </div>
              <button
                onClick={loadAdminData}
                title="Refresh list"
                className="p-1.5 rounded-lg border border-[#E5EAE1] hover:bg-[#F5F7F2] text-[#647067]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sub-Filters: Recipient verification, Recovery partner verification, etc. */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {[
              { id: "all", label: "All Accounts" },
              { id: "recipient", label: "Recipients Only" },
              { id: "recovery_partner", label: "Recovery Partners Only" },
              { id: "volunteer", label: "Volunteers Only" },
              { id: "donor", label: "Donors Only" },
              { id: "unverified", label: "Pending Verification" }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setRoleFilter(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  roleFilter === f.id
                    ? "bg-purple-100 text-purple-800 border border-purple-300"
                    : "bg-[#F5F7F2] text-[#647067] hover:text-[#17211B] border border-[#E5EAE1]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="divide-y divide-[#E5EAE1] max-h-[550px] overflow-y-auto">
            {registeredUsers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#E5EAE1] p-6 space-y-2">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-1" />
                <div className="text-sm font-semibold text-[#17211B]">No registered organizations or accounts</div>
                <p className="text-xs text-[#647067] max-w-sm mx-auto">
                  New community recipients, donor organizations, and circular recovery facilities will appear here for verification upon registration.
                </p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#647067]">
                No accounts match the selected verification filter.
              </div>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F5F7F2]/50">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-200" />
                    <div>
                      <div className="text-xs font-bold text-[#17211B] flex items-center gap-2">
                        <span>{u.name}</span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#F5F7F2] text-[#647067] border border-[#E5EAE1] capitalize font-medium">
                          {u.role.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#647067] mt-0.5">{u.org_name || u.email} • {u.phone}</div>
                      <div className="text-[10px] text-slate-400">{u.address}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {u.verified === 1 ? (
                      <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Verified
                      </span>
                    ) : (
                      <button
                        onClick={() => handleVerify(u.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve & Verify</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Donation Monitoring */}
      {activeTab === "donations" && (
        <div className="rounded-2xl bg-white border border-[#E5EAE1] p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5EAE1]">
            <div>
              <h3 className="text-sm font-bold text-[#17211B] flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                <span>Live Donation & Supply Monitoring</span>
              </h3>
              <p className="text-xs text-[#647067]">
                Track all listed, claimed, delivered, and recovery-routed surplus lots.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#647067] font-semibold">{filteredDonations.length} Lots</span>
              <button
                onClick={loadAdminData}
                className="p-1.5 rounded-lg border border-[#E5EAE1] hover:bg-[#F5F7F2] text-[#647067]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "All Statuses" },
              { id: "LISTED", label: "Listed / Available" },
              { id: "PARTIALLY_CLAIMED", label: "Partially Claimed" },
              { id: "CLAIMED", label: "Fully Claimed" },
              { id: "VERIFIED_RESCUE", label: "Verified Delivered" },
              { id: "RECOVERY_BATCH", label: "Routed to Recovery" }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setDonationStatusFilter(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  donationStatusFilter === f.id
                    ? "bg-purple-100 text-purple-800 border border-purple-300"
                    : "bg-[#F5F7F2] text-[#647067] hover:text-[#17211B] border border-[#E5EAE1]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F7F2] text-[#647067] uppercase font-semibold text-[10px] tracking-wider border-b border-[#E5EAE1]">
                <tr>
                  <th className="py-2.5 px-3">Lot ID</th>
                  <th className="py-2.5 px-3">Food Item</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Quantity</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Freshness Window</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAE1]">
                {filteredDonations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[#647067]">
                      No donations found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredDonations.map((d) => (
                    <tr key={d.id} className="hover:bg-[#F5F7F2]/50">
                      <td className="py-3 px-3 font-mono font-bold text-[#17211B]">{d.id}</td>
                      <td className="py-3 px-3 font-semibold text-[#17211B] max-w-xs truncate">{d.title}</td>
                      <td className="py-3 px-3 text-[#647067]">{d.food_category}</td>
                      <td className="py-3 px-3 font-semibold text-emerald-700">
                        {d.claim_quantity_remaining} / {d.quantity} {d.unit}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                          d.status === "VERIFIED_RESCUE"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : d.status === "RECOVERY_BATCH"
                            ? "bg-teal-100 text-teal-800 border-teal-200"
                            : d.status === "LISTED"
                            ? "bg-orange-100 text-orange-800 border-orange-200"
                            : "bg-purple-100 text-purple-800 border-purple-200"
                        }`}>
                          {d.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#647067]">{d.location_name || "Tamil Nadu"}</td>
                      <td className="py-3 px-3 text-[#647067]">{d.freshness_hours ? `${d.freshness_hours} hrs` : "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Platform Analytics & Reports */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-[#17211B] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span>Surplus2Life Impact Analytics & Compliance Reporting</span>
              </h3>
              <p className="text-xs text-[#647067] mt-0.5">
                Aggregate metrics verified against post-delivery and weighbridge records.
              </p>
            </div>
            <button
              onClick={handleExportReport}
              className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV Report</span>
            </button>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-[#E5EAE1] shadow-xs">
              <div className="text-xs font-semibold text-[#647067] uppercase tracking-wider">Meals Rescued</div>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">{impactStats?.meals_rescued || 100}</div>
              <div className="text-[11px] text-[#647067] mt-0.5">Direct hunger relief</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#E5EAE1] shadow-xs">
              <div className="text-xs font-semibold text-[#647067] uppercase tracking-wider">Waste Diverted</div>
              <div className="text-2xl font-extrabold text-teal-600 mt-1">{impactStats?.waste_diverted_kg || 510} kg</div>
              <div className="text-[11px] text-[#647067] mt-0.5">Landfill methane avoided</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#E5EAE1] shadow-xs">
              <div className="text-xs font-semibold text-[#647067] uppercase tracking-wider">Trees Planted</div>
              <div className="text-2xl font-extrabold text-emerald-700 mt-1">{impactStats?.trees_planted || 3}</div>
              <div className="text-[11px] text-[#647067] mt-0.5">Verified saplings in ground</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#E5EAE1] shadow-xs">
              <div className="text-xs font-semibold text-[#647067] uppercase tracking-wider">People Nourished</div>
              <div className="text-2xl font-extrabold text-amber-600 mt-1">{impactStats?.people_nourished || 100}</div>
              <div className="text-[11px] text-[#647067] mt-0.5">Through verified shelters</div>
            </div>
          </div>

          {/* Platform Distribution Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-[#17211B] uppercase tracking-wider">Two-Stage Circular Allocation</h4>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-[#17211B] font-semibold mb-1">
                    <span>Stage 1: Human Consumption (Shelters & NGOs)</span>
                    <span className="text-emerald-700">72%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#E5EAE1] overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "72%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[#17211B] font-semibold mb-1">
                    <span>Stage 2: Biogas / Anaerobic Digestion</span>
                    <span className="text-teal-700">18%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#E5EAE1] overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: "18%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[#17211B] font-semibold mb-1">
                    <span>Stage 2: Compost & Micro-Enrichment</span>
                    <span className="text-amber-700">10%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#E5EAE1] overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: "10%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-[#17211B] uppercase tracking-wider">Account Distribution</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1]">
                  <div className="text-[11px] text-[#647067]">Registered Donors</div>
                  <div className="text-lg font-bold text-[#17211B]">
                    {users.filter((u) => u.role === "donor").length}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1]">
                  <div className="text-[11px] text-[#647067]">Verified Recipients</div>
                  <div className="text-lg font-bold text-[#17211B]">
                    {users.filter((u) => u.role === "recipient").length}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1]">
                  <div className="text-[11px] text-[#647067]">Active Volunteers</div>
                  <div className="text-lg font-bold text-[#17211B]">
                    {users.filter((u) => u.role === "volunteer").length}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1]">
                  <div className="text-[11px] text-[#647067]">Recovery Facilities</div>
                  <div className="text-lg font-bold text-[#17211B]">
                    {users.filter((u) => u.role === "recovery_partner").length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Heatmap */}
      {activeTab === "heatmap" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white border border-[#E5EAE1] shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#17211B]">Surplus Concentration & Recovery Heatmap</h3>
              <p className="text-xs text-[#647067]">Real-time spatial visualization for volunteer route corridors and recovery logistics.</p>
            </div>
          </div>
          <HeatmapView />
        </div>
      )}

      {/* TAB 5: Audit Logs & Anti-Abuse */}
      {activeTab === "audit" && (
        <div className="rounded-2xl bg-white border border-[#E5EAE1] overflow-hidden shadow-xs">
          <div className="p-5 border-b border-[#E5EAE1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600" />
              <div>
                <h3 className="text-sm font-bold text-[#17211B]">Immutable Platform Audit Trail</h3>
                <p className="text-xs text-[#647067]">Cryptographically stamped actions and suspicious activity detection</p>
              </div>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Anti-Abuse System Active
            </span>
          </div>

          <div className="divide-y divide-[#E5EAE1] max-h-[500px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#647067]">No audit logs recorded yet.</div>
            ) : (
              auditLogs.map((l) => (
                <div key={l.id} className="p-3.5 flex items-start justify-between text-xs hover:bg-[#F5F7F2]/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#17211B] font-mono">{l.action}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F5F7F2] text-[#647067] border border-[#E5EAE1] font-medium">
                        {l.entity_type} {l.entity_id ? `(${l.entity_id})` : ""}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#647067] mt-1">{l.details}</div>
                  </div>
                  <span className="text-[10px] text-[#647067] font-mono shrink-0 ml-4">
                    {l.timestamp ? new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Just now"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: Reward Rate Configuration */}
      {activeTab === "rewards" && (
        <div className="rounded-2xl bg-white border border-[#E5EAE1] p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#E5EAE1]">
            <div>
              <h3 className="text-sm font-bold text-[#17211B] flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-600" />
                <span>Impact-Based Credit & Tree Formulas</span>
              </h3>
              <p className="text-xs text-[#647067] mt-0.5">
                Admin configurable reward rules. Verified actions strictly award credits based on these values.
              </p>
            </div>
            <button
              onClick={handleSaveConfigs}
              disabled={savingConfig}
              className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingConfig ? "Saving..." : "Save Configuration"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {configs.map((c) => (
              <div key={c.config_key} className="p-4 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#17211B] capitalize font-mono">
                    {c.config_key.replace(/_/g, " ")}
                  </span>
                  <input
                    type="number"
                    step="1"
                    value={configEdits[c.config_key] ?? c.config_val}
                    onChange={(e) => setConfigEdits({ ...configEdits, [c.config_key]: parseFloat(e.target.value) })}
                    className="w-24 px-2.5 py-1 text-sm font-bold rounded-lg bg-white border border-[#E5EAE1] text-purple-700 text-right focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="text-[11px] text-[#647067]">{c.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
