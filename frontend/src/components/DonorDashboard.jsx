import React, { useState, useEffect } from "react";
import {
  Utensils,
  Plus,
  TreePine,
  Coins,
  Flame,
  ShieldCheck,
  ExternalLink,
  Recycle,
  MapPin
} from "lucide-react";
import { api } from "../api";
import confetti from "canvas-confetti";

export default function DonorDashboard({
  currentUser,
  onOpenDonateModal,
  onOpenPassport,
  onOpenForest,
  onOpenRewards
}) {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [routingId, setRoutingId] = useState(null);

  useEffect(() => {
    loadDonorDonations();

    const handleCreated = (event) => {
      const newDonation = event?.detail;
      if (newDonation) {
        setDonations((prev) => {
          const filtered = prev.filter((d) => d.id !== newDonation.id);
          return [newDonation, ...filtered];
        });
      }
      loadDonorDonations(false);
    };

    window.addEventListener("foodloop_donation_created", handleCreated);
    return () => {
      window.removeEventListener("foodloop_donation_created", handleCreated);
    };
  }, [currentUser]);

  const loadDonorDonations = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const donorId = currentUser?.id || "donor-1";
      const res = await api.getDonations({ donor_id: donorId });
      if (res && res.donations) {
        setDonations(res.donations);
      }
    } catch (err) {
      console.error("Failed to load donor donations:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleRouteToRecovery = async (donationId) => {
    setRoutingId(donationId);
    try {
      const res = await api.routeToRecovery(donationId);
      confetti({ particleCount: 60, spread: 60 });
      alert(`♻️ Food assessed for circular recovery! Added to Batch ${res.batch_id} for ${res.pathway}.`);
      await loadDonorDonations();
    } catch (err) {
      alert(err.message);
    } finally {
      setRoutingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Donor Banner with Impact Counters */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 font-semibold text-xs border border-orange-200 flex items-center gap-1">
              <Utensils className="w-3.5 h-3.5 text-orange-600" />
              Surplus Donor Workspace
            </span>
            {currentUser?.verified === 1 && (
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-[#17211B] mt-1.5">{currentUser?.org_name || "Surplus Food Donor"}</h2>
          <p className="text-xs text-[#647067] mt-0.5">
            Turn surplus into social impact and carbon credits. Track live chain-of-custody via Food Passports.
          </p>
        </div>

        {/* Quick Impact Stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            onClick={onOpenForest}
            className="px-4 py-2 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-center cursor-pointer hover:border-emerald-300 transition-colors"
          >
            <div className="text-xl font-extrabold text-emerald-700 flex items-center justify-center gap-1">
              <TreePine className="w-4 h-4 text-emerald-600" />
              <span>{currentUser?.trees_planted || 2}</span>
            </div>
            <div className="text-[10px] text-[#647067] uppercase font-semibold">Trees Planted</div>
          </div>

          <div
            onClick={onOpenRewards}
            className="px-4 py-2 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-center cursor-pointer hover:border-amber-300 transition-colors"
          >
            <div className="text-xl font-extrabold text-amber-600 flex items-center justify-center gap-1">
              <Coins className="w-4 h-4" />
              <span>{currentUser?.credits_balance || 200}</span>
            </div>
            <div className="text-[10px] text-[#647067] uppercase font-semibold">Credit Balance</div>
          </div>

          <div className="px-4 py-2 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-center">
            <div className="text-xl font-extrabold text-rose-600 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 fill-rose-500 text-rose-500" />
              <span>{currentUser?.streak?.current_streak_weeks || 4}w</span>
            </div>
            <div className="text-[10px] text-[#647067] uppercase font-semibold">Weekly Streak</div>
          </div>

          <button
            onClick={onOpenDonateModal}
            className="px-4 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#ea580c] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Donate Surplus</span>
          </button>
        </div>
      </div>

      {/* Donor Listings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#17211B]">My Listed Surplus & Rescues</h3>
          <span className="text-xs text-[#647067]">{donations.length} Active & Past Lots</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#647067] text-xs">Loading donor records...</div>
        ) : donations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E5EAE1] shadow-xs">
            <Utensils className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-[#17211B]">No surplus donations created yet</div>
            <p className="text-xs text-[#647067] mt-1">Create your first surplus listing in just 4 quick steps.</p>
            <button
              onClick={onOpenDonateModal}
              className="mt-4 px-4 py-2 rounded-xl bg-[#F97316] text-white font-bold text-xs shadow-xs hover:bg-[#ea580c]"
            >
              + Create Donation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {donations.map((d) => {
              const isRescued = d.status === "VERIFIED_RESCUE";
              const isRecovery = d.status === "RECOVERY_BATCH";

              return (
                <div
                  key={d.id}
                  className="rounded-2xl bg-white border border-[#E5EAE1] hover:border-orange-300 shadow-xs hover:shadow-md overflow-hidden flex flex-col justify-between transition-all hover:-translate-y-1"
                >
                  <div>
                    {/* Photo & Badges */}
                    <div className="relative h-40 overflow-hidden bg-slate-100">
                      <img src={d.photo_url} alt="" className="w-full h-full object-cover" />
                      
                      <div className="absolute top-3 left-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                          isRescued
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : isRecovery
                            ? "bg-teal-100 text-teal-800 border-teal-200"
                            : "bg-orange-100 text-orange-800 border-orange-200"
                        }`}>
                          {d.status ? d.status.replace("_", " ") : "LISTED"}
                        </span>
                      </div>

                      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-[#17211B] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-200/80 shadow-xs">
                        <span className="font-bold">ID: {d.id}</span>
                        <span className="text-[#647067]">Prepared: {d.preparation_time}</span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-4">
                      <div className="flex items-center justify-between text-xs text-[#647067] mb-1">
                        <span className="font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                          {d.food_category}
                        </span>
                        <span className="font-bold text-emerald-700">
                          {d.claim_quantity_remaining ?? d.quantity} {d.unit} remaining
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#17211B] line-clamp-1 mt-1.5">{d.title}</h4>
                      {d.description && (
                        <p className="text-xs text-[#647067] mt-1 line-clamp-2">{d.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-[#647067] mt-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{d.location_name || "Location Provided"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-4 pt-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenPassport(d.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#F5F7F2] hover:bg-slate-200/70 text-[#17211B] border border-[#E5EAE1] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#647067]" />
                        <span>Food Passport ({d.id})</span>
                      </button>

                      {/* If unclaimed surplus is approaching freshness window, allow routing to Circular Recovery */}
                      {(d.status === "LISTED" || d.status === "PARTIALLY_CLAIMED") && (
                        <button
                          onClick={() => handleRouteToRecovery(d.id)}
                          disabled={routingId === d.id}
                          title="If surplus is unclaimed or cannot be safely redistributed, route to verified biogas/compost recovery"
                          className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Recycle className="w-3.5 h-3.5 text-teal-700" />
                          <span>{routingId === d.id ? "Routing..." : "Route to Recovery"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
