import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import HeroLanding from "./components/HeroLanding";
import DonorDashboard from "./components/DonorDashboard";
import RecipientDashboard from "./components/RecipientDashboard";
import VolunteerDashboard from "./components/VolunteerDashboard";
import RecoveryDashboard from "./components/RecoveryDashboard";
import AdminDashboard from "./components/AdminDashboard";
import DonorFlow from "./components/DonorFlow";
import FoodPassportModal from "./components/FoodPassportModal";
import ForestView from "./components/ForestView";
import RewardsStore from "./components/RewardsStore";
import HeatmapView from "./components/HeatmapView";
import LeaderboardView from "./components/LeaderboardView";
import SMSGatewaySimulator from "./components/SMSGatewaySimulator";
import { api } from "./api";
import {
  Leaf,
  Layers,
  Sparkles,
  Wifi,
  Smartphone,
  ShieldCheck,
  CheckCircle,
  ExternalLink,
  Heart
} from "lucide-react";

const DEFAULT_DEMO_USERS = {
  admin: {
    id: "admin-1",
    role: "admin",
    name: "Admin",
    org_name: "Surplus2Life Central Office",
    verified: 1,
    avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80"
  },
  donor: {
    id: "donor-1",
    role: "donor",
    name: "Donor",
    org_name: "Surplus Food Donor",
    verified: 1,
    trees_planted: 2,
    credits_balance: 200,
    streak: { current_streak_weeks: 4, longest_streak_weeks: 6, streak_freezes_remaining: 1 },
    avatar_url: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=200&q=80"
  },
  recipient: {
    id: "recip-1",
    role: "recipient",
    name: "Recipient",
    org_name: "Verified Community Recipient",
    verified: 1,
    avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80"
  },
  volunteer: {
    id: "vol-1",
    role: "volunteer",
    name: "Volunteer",
    org_name: "Surplus2Life Volunteer",
    verified: 1,
    credits_balance: 330,
    streak: { current_streak_weeks: 4, longest_streak_weeks: 6, streak_freezes_remaining: 1 },
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
  },
  recovery_partner: {
    id: "recov-1",
    role: "recovery_partner",
    name: "Recovery Partner",
    org_name: "Verified Recovery Partner",
    verified: 1,
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80"
  }
};

export default function App() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(DEFAULT_DEMO_USERS.donor);
  const [activeTab, setActiveTab] = useState("home");
  const [impactStats, setImpactStats] = useState(null);

  // Modals
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isSMSOpen, setIsSMSOpen] = useState(false);
  const [activePassportId, setActivePassportId] = useState(null);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const [uRes, statsRes] = await Promise.all([
        api.getUsers(),
        api.getImpactSummary()
      ]);
      setUsers(uRes.users);
      setImpactStats(statsRes);

      // Default to first donor without forcing navigation away from home
      if (uRes.users && uRes.users.length > 0) {
        const defaultUser = uRes.users.find((u) => u.role === "donor") || uRes.users[0];
        const rawRole = defaultUser.role || "donor";
        const roleKey = rawRole.toLowerCase().replace(/[\s-]/g, "_");
        setCurrentUser({
          ...(DEFAULT_DEMO_USERS[roleKey] || DEFAULT_DEMO_USERS.donor),
          ...defaultUser,
          role: roleKey
        });
        if (defaultUser.id) {
          loadUserFullProfile(defaultUser.id);
        }
      }
    } catch (err) {
      console.error("Init error:", err);
    }
  };

  const loadUserFullProfile = async (userId) => {
    try {
      const res = await api.getUserProfile(userId);
      if (res && res.user) {
        setCurrentUser((prev) => ({
          ...prev,
          ...res.user,
          role: res.user.role || prev?.role
        }));
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
    }
  };

  const handleSelectUser = (user) => {
    const rawRole = user.role || "donor";
    const roleKey = rawRole.toLowerCase().replace(/[\s-]/g, "_");
    const baseDefault = DEFAULT_DEMO_USERS[roleKey] || DEFAULT_DEMO_USERS.donor;
    const fullUser = {
      ...baseDefault,
      ...user,
      role: roleKey
    };
    setCurrentUser(fullUser);
    setActiveTab("dashboard");
    if (user.id) {
      loadUserFullProfile(user.id);
    }
  };

  const refreshData = async () => {
    try {
      const stats = await api.getImpactSummary();
      setImpactStats(stats);
      if (currentUser) {
        await loadUserFullProfile(currentUser.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDonationCreated = (donation) => {
    refreshData();
    if (currentRole !== "donor") {
      const donorUser = users.find((u) => u.role === "donor") || DEFAULT_DEMO_USERS.donor;
      handleSelectUser(donorUser);
    } else {
      setActiveTab("dashboard");
    }
  };

  const currentRole = (currentUser?.role || "donor").toLowerCase().replace(/[\s-]/g, "_");

  // Render exactly one role-specific dashboard component
  const renderRoleDashboard = () => {
    switch (currentRole) {
      case "admin":
        return <AdminDashboard currentUser={currentUser} />;
      case "donor":
        return (
          <DonorDashboard
            currentUser={currentUser}
            onOpenDonateModal={() => setIsDonateOpen(true)}
            onOpenPassport={(id) => setActivePassportId(id)}
            onOpenForest={() => setActiveTab("forest")}
            onOpenRewards={() => setActiveTab("rewards")}
          />
        );
      case "recipient":
        return (
          <RecipientDashboard
            currentUser={currentUser}
            onOpenPassport={(id) => setActivePassportId(id)}
          />
        );
      case "volunteer":
        return (
          <VolunteerDashboard
            currentUser={currentUser}
            onOpenPassport={(id) => setActivePassportId(id)}
            onOpenRewards={() => setActiveTab("rewards")}
          />
        );
      case "recovery_partner":
        return <RecoveryDashboard currentUser={currentUser} />;
      default:
        return (
          <DonorDashboard
            currentUser={currentUser}
            onOpenDonateModal={() => setIsDonateOpen(true)}
            onOpenPassport={(id) => setActivePassportId(id)}
            onOpenForest={() => setActiveTab("forest")}
            onOpenRewards={() => setActiveTab("rewards")}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F2] text-[#17211B] flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Universal Sticky Header */}
      <Header
        currentUser={currentUser}
        users={users}
        onSelectUser={handleSelectUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDonateModal={() => setIsDonateOpen(true)}
        onOpenSMSModal={() => setIsSMSOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* TAB: SEPARATE HOME / LANDING PAGE */}
        {activeTab === "home" && (
          <div className="space-y-10">
            {/* Hero Landing Section with Action Cards & Community Strip */}
            <HeroLanding
              impactStats={impactStats}
              onOpenDonateModal={() => setIsDonateOpen(true)}
              onOpenFindFood={() => {
                const recip = Array.isArray(users) ? users.find((u) => u.role === "recipient") : null;
                handleSelectUser(recip || DEFAULT_DEMO_USERS.recipient);
              }}
              onOpenVolunteer={() => {
                const vol = Array.isArray(users) ? users.find((u) => u.role === "volunteer") : null;
                handleSelectUser(vol || DEFAULT_DEMO_USERS.volunteer);
              }}
              onOpenRecovery={() => {
                const recov = Array.isArray(users) ? users.find((u) => u.role === "recovery_partner") : null;
                handleSelectUser(recov || DEFAULT_DEMO_USERS.recovery_partner);
              }}
              onOpenSMSModal={() => setIsSMSOpen(true)}
            />

            {/* Community Leaderboards */}
            <div className="pt-8 border-t border-[#E5EAE1]">
              <LeaderboardView />
            </div>
          </div>
        )}

        {/* TAB: ROLE-SPECIFIC DASHBOARD (Rendered solitary without landing page repetition) */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAE1]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-[#647067] uppercase tracking-wider">
                  Active View: {currentRole.toUpperCase().replace("_", " ")} WORKSPACE
                </span>
              </div>
              <span className="text-xs text-[#647067]">
                Switch demo roles anytime in the top-right header
              </span>
            </div>

            {/* Single active role dashboard component */}
            {renderRoleDashboard()}
          </div>
        )}

        {/* TAB: DONATIONS (Surplus Food Catalog) */}
        {activeTab === "donations" && (
          <RecipientDashboard
            currentUser={currentUser}
            onOpenPassport={(id) => setActivePassportId(id)}
          />
        )}

        {/* TAB: RECOVERY (Circular Recovery Hub) */}
        {activeTab === "recovery" && (
          <RecoveryDashboard currentUser={currentUser} />
        )}

        {/* TAB: FOREST (My Forest & Community Forest) */}
        {activeTab === "forest" && (
          <ForestView currentUser={currentUser} />
        )}

        {/* TAB: REWARDS (Practical Store & Weekly Streaks) */}
        {activeTab === "rewards" && (
          <RewardsStore
            currentUser={currentUser}
            onBalanceUpdated={refreshData}
          />
        )}

        {/* TAB: HEATMAP (Historical Platform Surplus Density) */}
        {activeTab === "heatmap" && (
          <HeatmapView />
        )}

      </main>

      {/* MODAL: 4-Input Donor Flow */}
      {isDonateOpen && (
        <DonorFlow
          currentUser={currentUser}
          onClose={() => setIsDonateOpen(false)}
          onDonationCreated={handleDonationCreated}
        />
      )}

      {/* MODAL: Food Passport */}
      {activePassportId && (
        <FoodPassportModal
          donationId={activePassportId}
          onClose={() => setActivePassportId(null)}
        />
      )}

      {/* MODAL: SMS Gateway Simulator */}
      <SMSGatewaySimulator
        isOpen={isSMSOpen}
        onClose={() => setIsSMSOpen(false)}
        onDonationCreated={handleDonationCreated}
      />

      {/* Footer */}
      <footer className="border-t border-[#E5EAE1] bg-white py-8 mt-12 text-xs text-[#647067]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                <Leaf className="w-4 h-4" />
              </div>
              <span className="font-bold text-[#17211B] text-sm">Surplus2Life Platform</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                Rescue. Recover. Renew.
              </span>
            </div>

            <div className="text-center md:text-right max-w-xl text-[11px] leading-relaxed text-[#647067]">
              Surplus2Life is a digital coordination platform connecting surplus-food donors with verified recipients and authorized circular recovery facilities. Safe food is prioritized for nourishment; remaining organic fractions are converted into green bio-energy and rich compost.
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E5EAE1] flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-[#647067]">
            <div>© 2026 Surplus2Life. Real-world impact verified. Plant real trees.</div>
            <div className="flex items-center gap-4 font-medium">
              <span>Path 1: Full App Online</span>
              <span>•</span>
              <span>Path 2: Offline-First Queue</span>
              <span>•</span>
              <span>Path 3: SMS Fallback Gateway</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
