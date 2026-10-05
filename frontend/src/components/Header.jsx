import React, { useState, useEffect } from "react";
import {
  Leaf,
  Wifi,
  WifiOff,
  Radio,
  ChevronDown,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { getNetworkMode, setNetworkMode, getOfflineQueue, processOfflineSync } from "../api";

const DEMO_ROLES = [
  {
    roleKey: "admin",
    name: "Admin",
    fallbackId: "admin-1",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80"
  },
  {
    roleKey: "donor",
    name: "Donor",
    fallbackId: "donor-1",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-200",
    avatar: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=200&q=80"
  },
  {
    roleKey: "recipient",
    name: "Recipient",
    fallbackId: "recip-1",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80"
  },
  {
    roleKey: "volunteer",
    name: "Volunteer",
    fallbackId: "vol-1",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
  },
  {
    roleKey: "recovery_partner",
    name: "Recovery Partner",
    fallbackId: "recov-1",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80"
  }
];

const ROLE_MAP = {
  admin: {
    name: "Admin",
    label: "Admin",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    accent: "text-purple-600",
  },
  donor: {
    name: "Donor",
    label: "Donor",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-200",
    accent: "text-orange-600",
  },
  recipient: {
    name: "Recipient",
    label: "Recipient",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    accent: "text-teal-600",
  },
  volunteer: {
    name: "Volunteer",
    label: "Volunteer",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    accent: "text-emerald-600",
  },
  recovery_partner: {
    name: "Recovery Partner",
    label: "Recovery Partner",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    accent: "text-teal-700",
  },
};

export default function Header({
  currentUser,
  users,
  onSelectUser,
  activeTab,
  setActiveTab,
  onOpenDonateModal,
  onOpenSMSModal
}) {
  const [networkMode, setMode] = useState(getNetworkMode());
  const [offlineQueue, setOfflineQueue] = useState(getOfflineQueue());
  const [isSyncing, setIsSyncing] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [networkDropdownOpen, setNetworkDropdownOpen] = useState(false);

  useEffect(() => {
    const handleNetwork = () => setMode(getNetworkMode());
    const handleQueue = () => setOfflineQueue(getOfflineQueue());

    window.addEventListener("foodloop_network_change", handleNetwork);
    window.addEventListener("foodloop_queue_change", handleQueue);

    // Auto-sync heartbeat every 15s
    const interval = setInterval(() => {
      if (getNetworkMode() !== "offline" && getOfflineQueue().length > 0) {
        setIsSyncing(true);
        processOfflineSync(() => {
          setIsSyncing(false);
        }).finally(() => setIsSyncing(false));
      }
    }, 15000);

    return () => {
      window.removeEventListener("foodloop_network_change", handleNetwork);
      window.removeEventListener("foodloop_queue_change", handleQueue);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    if (networkMode === "offline") return;
    setIsSyncing(true);
    await processOfflineSync();
    setIsSyncing(false);
  };

  const currentRoleInfo = currentUser ? ROLE_MAP[currentUser.role] || {
    name: currentUser.name,
    label: currentUser.role,
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
    accent: "text-slate-600"
  } : null;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E5EAE1] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setActiveTab("home")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-600/20 ring-1 ring-emerald-500/30">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-[#17211B]">
                  Surplus<span className="text-emerald-600">2Life</span>
                </span>
              </div>
              <p className="text-[11px] text-[#647067] font-medium hidden sm:block">Rescue. Recover. Renew.</p>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab("home")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "home"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/90 font-semibold shadow-xs"
                  : "text-[#647067] hover:text-[#17211B] hover:bg-[#F5F7F2]"
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/90 font-semibold shadow-xs"
                  : "text-[#647067] hover:text-[#17211B] hover:bg-[#F5F7F2]"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("donations")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "donations"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/90 font-semibold shadow-xs"
                  : "text-[#647067] hover:text-[#17211B] hover:bg-[#F5F7F2]"
              }`}
            >
              Surplus Food
            </button>
            <button
              onClick={() => setActiveTab("recovery")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "recovery"
                  ? "bg-teal-50 text-teal-700 border border-teal-200 font-semibold shadow-xs"
                  : "text-[#647067] hover:text-[#17211B] hover:bg-[#F5F7F2]"
              }`}
            >
              Recovery Hub
            </button>
            <button
              onClick={() => setActiveTab("forest")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "forest"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/90 font-semibold shadow-xs"
                  : "text-[#647067] hover:text-[#17211B] hover:bg-[#F5F7F2]"
              }`}
            >
              🌳 Forest
            </button>
            <button
              onClick={() => setActiveTab("rewards")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "rewards"
                  ? "bg-orange-50 text-orange-700 border border-orange-200 font-semibold shadow-xs"
                  : "text-[#647067] hover:text-[#17211B] hover:bg-[#F5F7F2]"
              }`}
            >
              🎁 Rewards
            </button>
            <button
              onClick={() => setActiveTab("heatmap")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "heatmap"
                  ? "bg-rose-50 text-rose-700 border border-rose-200 font-semibold shadow-xs"
                  : "text-[#647067] hover:text-[#17211B] hover:bg-[#F5F7F2]"
              }`}
            >
              Heatmap
            </button>
          </nav>

          {/* Right Action Tools: Connectivity Switcher, SMS Button, Role Switcher */}
          <div className="flex items-center gap-2.5">

            {/* Quick SMS Gateway Button */}
            <button
              onClick={onOpenSMSModal}
              title="SMS Fallback Gateway (No Internet / Basic Phone)"
              className="px-2.5 py-1.5 rounded-lg bg-[#F5F7F2] hover:bg-emerald-50 text-[#17211B] text-xs flex items-center gap-1.5 border border-[#E5EAE1] hover:border-emerald-300 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline font-medium">SMS Mode</span>
            </button>

            {/* Connectivity Simulation Pill */}
            <div className="relative">
              <button
                onClick={() => {
                  setNetworkDropdownOpen(!networkDropdownOpen);
                  setRoleDropdownOpen(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  networkMode === "online"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70"
                    : networkMode === "poor"
                    ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/70"
                    : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/70"
                }`}
                title="Click to test Connectivity Resilience (Online / Intermittent / Offline Sync)"
              >
                {networkMode === "online" && <Wifi className="w-3.5 h-3.5 text-emerald-600" />}
                {networkMode === "poor" && <Radio className="w-3.5 h-3.5 text-amber-600 animate-pulse" />}
                {networkMode === "offline" && <WifiOff className="w-3.5 h-3.5 text-rose-600" />}
                
                <span className="capitalize text-[11px]">{networkMode}</span>
                {offlineQueue.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    {offlineQueue.length}
                  </span>
                )}
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {networkDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-[#E5EAE1] shadow-xl p-2 z-50">
                  <div className="text-[11px] font-semibold text-[#647067] px-2 py-1 uppercase tracking-wider">
                    Network Simulation
                  </div>
                  <button
                    onClick={() => { setNetworkMode("online"); setNetworkDropdownOpen(false); }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs ${
                      networkMode === "online" ? "bg-emerald-50 text-emerald-800 font-semibold" : "text-[#17211B] hover:bg-[#F5F7F2]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-emerald-600" />
                      <span>Full App (Online)</span>
                    </div>
                    {networkMode === "online" && <span className="text-[10px] text-emerald-600 font-bold">Active</span>}
                  </button>
                  <button
                    onClick={() => { setNetworkMode("poor"); setNetworkDropdownOpen(false); }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs ${
                      networkMode === "poor" ? "bg-amber-50 text-amber-800 font-semibold" : "text-[#17211B] hover:bg-[#F5F7F2]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-amber-600" />
                      <span>Poor Network (Retry)</span>
                    </div>
                    {networkMode === "poor" && <span className="text-[10px] text-amber-600 font-bold">Active</span>}
                  </button>
                  <button
                    onClick={() => { setNetworkMode("offline"); setNetworkDropdownOpen(false); }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs ${
                      networkMode === "offline" ? "bg-rose-50 text-rose-800 font-semibold" : "text-[#17211B] hover:bg-[#F5F7F2]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <WifiOff className="w-4 h-4 text-rose-600" />
                      <span>Offline Mode (Local Queue)</span>
                    </div>
                    {networkMode === "offline" && <span className="text-[10px] text-rose-600 font-bold">Active</span>}
                  </button>

                  {offlineQueue.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[#E5EAE1]">
                      <div className="flex items-center justify-between text-[11px] text-[#647067] mb-1 px-1">
                        <span>Offline Queue: {offlineQueue.length} items</span>
                        <button
                          onClick={handleManualSync}
                          disabled={networkMode === "offline" || isSyncing}
                          className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 disabled:opacity-40"
                        >
                          <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                          Sync Now
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Profile & Role Switcher */}
            <div className="relative">
              <button
                onClick={() => {
                  setRoleDropdownOpen(!roleDropdownOpen);
                  setNetworkDropdownOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#F5F7F2] border border-[#E5EAE1] shadow-xs transition-all"
              >
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-emerald-500/30" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                    {currentRoleInfo?.name?.charAt(0) || "U"}
                  </div>
                )}
                <div className="text-left hidden lg:block leading-tight">
                  <div className="text-xs font-semibold text-[#17211B] flex items-center gap-1.5">
                    <span className="truncate max-w-[130px]">
                      {currentRoleInfo?.name || "Select Role"}
                    </span>
                    {currentUser?.verified === 1 && <ShieldCheck className="w-3 h-3 text-emerald-600" />}
                  </div>
                  <div className="text-[10px] text-[#647067] font-medium">
                    Demo Account
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#647067]" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-[#E5EAE1] shadow-2xl p-2.5 z-50">
                  <div className="px-2 py-1.5 mb-1.5 border-b border-[#E5EAE1]">
                    <div className="text-xs font-bold text-[#17211B]">Switch Demo Role</div>
                    <div className="text-[11px] text-[#647067]">Select any role to view its dedicated workspace</div>
                  </div>
                  
                  <div className="space-y-1">
                    {DEMO_ROLES.map((role) => {
                      const matchedUser = Array.isArray(users) ? users.find((u) => u.role === role.roleKey) : null;
                      const roleUser = {
                        ...(matchedUser || {}),
                        id: matchedUser?.id || role.fallbackId,
                        role: role.roleKey,
                        name: role.name,
                        org_name: matchedUser?.org_name || role.name,
                        avatar_url: matchedUser?.avatar_url || role.avatar,
                        verified: 1
                      };
                      const isSelected = currentUser?.role === role.roleKey;
                      return (
                        <button
                          key={role.roleKey}
                          onClick={() => {
                            onSelectUser(roleUser);
                            setRoleDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                            isSelected
                              ? "bg-emerald-50 border border-emerald-200 shadow-xs"
                              : "hover:bg-[#F5F7F2] text-[#17211B]"
                          }`}
                        >
                          <img
                            src={roleUser.avatar_url || role.avatar}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                          />
                          <div className="flex-1 min-w-0 flex items-center justify-between">
                            <span className="text-xs font-bold text-[#17211B]">{role.name}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded border shrink-0 font-medium ${role.badgeColor}`}>
                              {role.name}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Donate Quick CTA button */}
            <button
              onClick={onOpenDonateModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803d] text-white font-bold text-xs shadow-sm shadow-emerald-600/30 transition-all transform active:scale-95"
            >
              <span>+ Donate</span>
            </button>

          </div>
        </div>
      </div>
    </header>
  );
}
