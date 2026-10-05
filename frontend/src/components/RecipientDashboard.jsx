import React, { useState, useEffect } from "react";
import {
  Heart,
  MapPin,
  CheckCircle,
  Filter,
  ShieldCheck,
  ExternalLink,
  PackageCheck
} from "lucide-react";
import { api } from "../api";
import confetti from "canvas-confetti";

export default function RecipientDashboard({ currentUser, onOpenPassport }) {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterUrgency, setFilterUrgency] = useState("all");

  // Split Claim Modal State
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [claimQty, setClaimQty] = useState(1);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Recipient claims history
  const [myClaims, setMyClaims] = useState([]);

  useEffect(() => {
    loadData();

    const handleCreated = () => {
      loadData();
    };
    window.addEventListener("foodloop_donation_created", handleCreated);
    return () => {
      window.removeEventListener("foodloop_donation_created", handleCreated);
    };
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getDonations();
      // Show available donations that have claimable surplus
      const available = res.donations.filter(
        (d) => d.status === "LISTED" || d.status === "PARTIALLY_CLAIMED"
      );
      setDonations(available);

      // Find claims where recipient is current user
      const claimedList = [];
      for (const d of res.donations) {
        if (d.claims && d.claims.length > 0) {
          d.claims.forEach((c) => {
            if (c.recipient_id === currentUser?.id) {
              claimedList.push({ ...c, donation: d });
            }
          });
        }
      }
      setMyClaims(claimedList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openClaimModal = (donation) => {
    setSelectedDonation(donation);
    setClaimQty(donation.claim_quantity_remaining); // default to full remaining
  };

  const handleExecuteClaim = async () => {
    if (!selectedDonation) return;
    setIsSubmittingClaim(true);
    try {
      await api.claimDonation(
        selectedDonation.id,
        currentUser?.id || "recip-1",
        claimQty
      );
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 }
      });
      setSelectedDonation(null);
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handleConfirmReceipt = async (claimId) => {
    try {
      const res = await api.confirmClaimReceipt(claimId);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 }
      });
      alert(`🎉 Receipt verified! Impact confirmed. Donor awarded ${res.donor_credits_awarded} credits.`);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredDonations = donations.filter((d) => {
    if (filterCategory !== "all" && d.food_category !== filterCategory) return false;
    if (filterUrgency !== "all" && d.priority !== filterUrgency) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header Info Banner */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 font-semibold text-xs border border-teal-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              Verified Community Recipient Dashboard
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#17211B] mt-1.5">{currentUser?.org_name || "Community Shelter & Food Bank"}</h2>
          <p className="text-xs text-[#647067] mt-0.5">
            Browse fresh surplus nearby. Support split claims so no food goes to waste. Confirm receipt to verify impact.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-center">
            <div className="text-lg font-bold text-teal-700">{filteredDonations.length}</div>
            <div className="text-[10px] text-[#647067] uppercase font-semibold">Available Lots</div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-center">
            <div className="text-lg font-bold text-emerald-700">{myClaims.length}</div>
            <div className="text-[10px] text-[#647067] uppercase font-semibold">Active Claims</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white border border-[#E5EAE1] shadow-xs">
        <div className="flex items-center gap-2 text-xs text-[#647067]">
          <Filter className="w-4 h-4 text-teal-600" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">Filter Surplus:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#F5F7F2] border border-[#E5EAE1] text-[#17211B] focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Categories</option>
            <option value="Cooked Meals">Cooked Meals</option>
            <option value="Bakery">Bakery</option>
            <option value="Raw Produce">Raw Produce</option>
            <option value="Cooking Oil">Cooking Oil</option>
          </select>

          {/* Urgency Filter */}
          <select
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#F5F7F2] border border-[#E5EAE1] text-[#17211B] focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Freshness Priorities</option>
            <option value="URGENT">🔴 URGENT (Immediate Pickup)</option>
            <option value="HIGH PRIORITY">🟠 HIGH PRIORITY</option>
            <option value="NORMAL">🟢 NORMAL</option>
          </select>
        </div>
      </div>

      {/* Available Surplus Cards Grid */}
      <div>
        <h3 className="text-base font-bold text-[#17211B] mb-4 flex items-center justify-between">
          <span>Available Surplus Near You</span>
          <span className="text-xs text-[#647067] font-normal">Real-time matching distance &lt; 15 km</span>
        </h3>

        {loading ? (
          <div className="text-center py-12 text-[#647067] text-xs">Loading available surplus...</div>
        ) : filteredDonations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E5EAE1] shadow-xs">
            <Heart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-[#17211B]">No surplus currently matches your filters</div>
            <p className="text-xs text-[#647067] mt-1">Check back shortly or broaden category filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDonations.map((d) => {
              const isUrgent = d.priority === "URGENT";
              const isHigh = d.priority === "HIGH PRIORITY";
              const isSplit = d.status === "PARTIALLY_CLAIMED";

              return (
                <div
                  key={d.id}
                  className="rounded-2xl bg-white border border-[#E5EAE1] hover:border-teal-300 overflow-hidden shadow-xs hover:shadow-md flex flex-col transition-all hover:-translate-y-1"
                >
                  {/* Photo & Badges */}
                  <div className="relative h-44 overflow-hidden bg-slate-100">
                    <img src={d.photo_url} alt="" className="w-full h-full object-cover" />
                    
                    {/* Urgency Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                        isUrgent
                          ? "bg-rose-100 text-rose-800 border-rose-200"
                          : isHigh
                          ? "bg-amber-100 text-amber-800 border-amber-200 font-bold"
                          : "bg-emerald-100 text-emerald-800 border-emerald-200"
                      }`}>
                        {d.priority}
                      </span>
                    </div>

                    {/* Split Claim active indicator */}
                    {isSplit && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200 shadow-xs">
                          Split Active
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-[#17211B] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-200/80 shadow-xs">
                      <span className="font-semibold">{d.id}</span>
                      <span className="text-[#647067]">Prepared: {d.preparation_time}</span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#17211B] leading-snug">{d.title}</h4>
                      <p className="text-xs text-[#647067] mt-1 line-clamp-2">{d.description}</p>
                      
                      <div className="mt-3 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[#17211B]">
                          <span className="text-[#647067]">Available:</span>
                          <span className="font-bold text-teal-700 text-sm">
                            {d.claim_quantity_remaining} {d.unit}
                            {d.claim_quantity_remaining < d.quantity && (
                              <span className="text-[10px] text-[#647067] ml-1 font-normal">(of {d.quantity} {d.unit})</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[#647067] pt-1">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="truncate">{d.location_name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-3 border-t border-[#E5EAE1] flex items-center gap-2">
                      <button
                        onClick={() => openClaimModal(d)}
                        className="flex-1 py-2 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <Heart className="w-3.5 h-3.5" />
                        <span>Claim (Full or Split)</span>
                      </button>
                      <button
                        onClick={() => onOpenPassport(d.id)}
                        title="View Food Passport"
                        className="p-2 rounded-xl bg-[#F5F7F2] hover:bg-slate-200/70 text-[#17211B] border border-[#E5EAE1] text-xs transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#647067]" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recipient's Active Claim History & Delivery Confirmation */}
      {myClaims.length > 0 && (
        <div className="p-6 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs">
          <h3 className="text-base font-bold text-[#17211B] mb-4 flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-teal-700" />
            <span>My Claim History & Verification</span>
          </h3>

          <div className="space-y-3">
            {myClaims.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#17211B] text-xs">{c.donation?.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold border border-teal-200">
                      Claimed: {c.quantity_claimed} {c.donation?.unit}
                    </span>
                  </div>
                  <div className="text-xs text-[#647067] mt-1 flex items-center gap-2">
                    <span>From: {c.donation?.donor_name}</span>
                    <span>•</span>
                    <span className="text-amber-800 font-medium">Status: {c.status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenPassport(c.donation_id)}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-[#17211B] text-xs border border-[#E5EAE1]"
                  >
                    Passport
                  </button>

                  {c.status !== "CONFIRMED" ? (
                    <button
                      onClick={() => handleConfirmReceipt(c.id)}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Confirm Receipt (Verify)</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Verified Rescue
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Split Claim Modal */}
      {selectedDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E5EAE1] shadow-2xl p-6">
            <h3 className="text-base font-bold text-[#17211B] mb-1">Claim Surplus Food</h3>
            <p className="text-xs text-[#647067] mb-4">{selectedDonation.title}</p>

            <div className="p-3 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] mb-4 text-xs space-y-1">
              <div className="flex justify-between text-[#17211B]">
                <span className="text-[#647067]">Available lot:</span>
                <span className="font-bold">{selectedDonation.claim_quantity_remaining} {selectedDonation.unit}</span>
              </div>
              <div className="flex justify-between text-[#17211B]">
                <span className="text-[#647067]">Location:</span>
                <span>{selectedDonation.location_name}</span>
              </div>
            </div>

            {/* Split Claim Slider & Input */}
            <div className="space-y-3 mb-5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#17211B]">
                  Select Claim Quantity:
                </label>
                <span className="text-sm font-extrabold text-teal-700">
                  {claimQty} {selectedDonation.unit}
                </span>
              </div>

              <input
                type="range"
                min="1"
                max={selectedDonation.claim_quantity_remaining}
                value={claimQty}
                onChange={(e) => setClaimQty(parseFloat(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />

              <div className="flex items-center justify-between text-[11px] text-[#647067]">
                <span>Min: 1 {selectedDonation.unit}</span>
                <button
                  type="button"
                  onClick={() => setClaimQty(selectedDonation.claim_quantity_remaining)}
                  className="text-teal-700 hover:underline font-semibold"
                >
                  Take All ({selectedDonation.claim_quantity_remaining})
                </button>
              </div>

              {/* Split Claim Explanation Notification */}
              {claimQty < selectedDonation.claim_quantity_remaining && (
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-[11px] text-teal-800">
                  💡 <strong>Split Claim Notice:</strong> You are claiming {claimQty} {selectedDonation.unit}. The remaining{" "}
                  <strong>{selectedDonation.claim_quantity_remaining - claimQty} {selectedDonation.unit}</strong> will stay open and immediately be re-matched to another nearby shelter.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedDonation(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E5EAE1] text-[#17211B] hover:bg-[#F5F7F2] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteClaim}
                disabled={isSubmittingClaim}
                className="flex-1 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs"
              >
                {isSubmittingClaim ? "Claiming..." : `Confirm Claim (${claimQty})`}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
