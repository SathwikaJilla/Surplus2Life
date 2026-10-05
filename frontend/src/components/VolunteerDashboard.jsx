import React, { useState, useEffect } from "react";
import {
  Bike,
  Navigation,
  Flame,
  Coins,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Camera
} from "lucide-react";
import { api } from "../api";
import confetti from "canvas-confetti";

export default function VolunteerDashboard({ currentUser, onOpenPassport, onOpenRewards }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDeliveryModal, setActiveDeliveryModal] = useState(null);
  const [deliveryProofUrl, setDeliveryProofUrl] = useState(
    "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=80"
  );
  const [deliveryNotes, setDeliveryNotes] = useState("Delivered directly to shelter coordinator.");
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [currentUser]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await api.getVolunteerTasks(currentUser?.id || "vol-1");
      setTasks(res.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTask = async (taskId) => {
    try {
      await api.acceptTask(taskId, currentUser?.id || "vol-1");
      await loadTasks();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMarkPickup = async (taskId) => {
    try {
      await api.markPickedUp(taskId);
      await loadTasks();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmitProofDelivery = async () => {
    if (!activeDeliveryModal) return;
    setIsSubmittingDelivery(true);
    try {
      await api.markDelivered(activeDeliveryModal.id, deliveryProofUrl, deliveryNotes);
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 }
      });
      setActiveDeliveryModal(null);
      await loadTasks();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Volunteer Hero & Stats Banner */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-semibold text-xs border border-emerald-200 flex items-center gap-1">
              <Bike className="w-3.5 h-3.5 text-emerald-600" />
              Verified Volunteer Dispatch Hub
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#17211B] mt-1.5">{currentUser?.name || "Surplus2Life Volunteer"}</h2>
          <p className="text-xs text-[#647067] mt-0.5">
            Your verified contributions are rewarded with credits and practical discounts. Deliver safely and upload proof of delivery.
          </p>
        </div>

        {/* Stats Strip */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-center">
            <div className="text-lg font-bold text-amber-600 flex items-center justify-center gap-1">
              <Coins className="w-4 h-4" />
              <span>{currentUser?.credits_balance || 330}</span>
            </div>
            <div className="text-[10px] text-[#647067] uppercase font-semibold">Credits Balance</div>
          </div>

          <div className="px-4 py-2 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-center">
            <div className="text-lg font-bold text-rose-600 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span>{currentUser?.streak?.current_streak_weeks || 4}w</span>
            </div>
            <div className="text-[10px] text-[#647067] uppercase font-semibold">Weekly Streak</div>
          </div>

          <button
            onClick={onOpenRewards}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1"
          >
            <span>Redeem Store</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Rescue Dispatch Tasks List */}
      <div>
        <h3 className="text-base font-bold text-[#17211B] mb-4 flex items-center justify-between">
          <span>Active Rescue Dispatch Tasks</span>
          <span className="text-xs text-[#647067] font-normal">Prioritized by freshness urgency</span>
        </h3>

        {loading ? (
          <div className="text-center py-12 text-[#647067] text-xs">Loading rescue tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E5EAE1] shadow-xs">
            <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <div className="text-sm font-semibold text-[#17211B]">All nearby rescue tasks are dispatched!</div>
            <p className="text-xs text-[#647067] mt-1">Check back soon as new donations are claimed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((t) => {
              const isMine = t.volunteer_id === currentUser?.id;
              const isUrgent = t.priority === "URGENT";

              return (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl bg-white border border-[#E5EAE1] hover:border-emerald-300 shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  {/* Food & Urgency Info */}
                  <div className="flex items-start gap-4">
                    <img src={t.photo_url} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0 border border-slate-200" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          isUrgent ? "bg-rose-100 text-rose-800 border-rose-200" : "bg-emerald-100 text-emerald-800 border-emerald-200"
                        }`}>
                          {t.priority}
                        </span>
                        <span className="text-xs font-semibold text-[#647067]">
                          {t.quantity_claimed || t.quantity} {t.unit}
                        </span>
                        <span className="text-xs text-slate-300">•</span>
                        <span className="text-xs font-semibold text-amber-800">Status: {t.status}</span>
                      </div>

                      <h4 className="text-sm font-bold text-[#17211B] mt-1">{t.food_title}</h4>

                      {/* Route Locations */}
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-[#17211B]">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-[#647067]">Pickup:</span>
                          <span className="font-medium text-[#17211B]">{t.pickup_location}</span>
                          <span className="text-[#647067] text-[11px]">({t.donor_name} - {t.donor_phone})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#17211B]">
                          <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                          <span className="text-[#647067]">Dropoff:</span>
                          <span className="font-medium text-[#17211B]">{t.delivery_location}</span>
                          <span className="text-[#647067] text-[11px]">({t.recipient_org})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Workflow Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => onOpenPassport(t.donation_id)}
                      className="px-3 py-2 rounded-xl bg-[#F5F7F2] hover:bg-slate-200/70 text-[#17211B] border border-[#E5EAE1] text-xs font-medium transition-colors"
                    >
                      Food Passport
                    </button>

                    {/* Step 1: Accept Task */}
                    {t.status === "OFFERED" && (
                      <button
                        onClick={() => handleAcceptTask(t.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <Bike className="w-3.5 h-3.5" />
                        <span>Accept Pickup Task</span>
                      </button>
                    )}

                    {/* Step 2: Mark Picked Up */}
                    {t.status === "ACCEPTED" && isMine && (
                      <button
                        onClick={() => handleMarkPickup(t.id)}
                        className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Mark Picked Up (In Transit)</span>
                      </button>
                    )}

                    {/* Step 3: Complete Delivery with Proof Photo */}
                    {t.status === "PICKED_UP" && isMine && (
                      <button
                        onClick={() => setActiveDeliveryModal(t)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Upload Proof & Deliver</span>
                      </button>
                    )}

                    {/* Done Status */}
                    {t.status === "DELIVERED" && (
                      <span className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                        Awaiting Recipient Confirmation
                      </span>
                    )}

                    {t.status === "VERIFIED" && (
                      <span className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Verified (+10 Credits Awarded)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Proof of Delivery Upload Modal */}
      {activeDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E5EAE1] shadow-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-[#17211B]">Proof of Delivery</h3>
            </div>
            <p className="text-xs text-[#647067] mb-4">
              Upload handover proof photo or shelter gate receipt to complete dispatch.
            </p>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-[#17211B] mb-1">
                  Handover Photo Proof:
                </label>
                <div className="rounded-xl overflow-hidden border border-[#E5EAE1] mb-2">
                  <img src={deliveryProofUrl} alt="" className="w-full h-36 object-cover" />
                </div>
                <input
                  type="text"
                  value={deliveryProofUrl}
                  onChange={(e) => setDeliveryProofUrl(e.target.value)}
                  placeholder="Or enter proof photo URL..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#F5F7F2] border border-[#E5EAE1] text-[#17211B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211B] mb-1">
                  Delivery Notes:
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Received by Sister Maria with signed register."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#F5F7F2] border border-[#E5EAE1] text-[#17211B]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveDeliveryModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E5EAE1] text-[#17211B] hover:bg-[#F5F7F2] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitProofDelivery}
                disabled={isSubmittingDelivery}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
              >
                {isSubmittingDelivery ? "Logging Delivery..." : "Submit Proof & Deliver"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
