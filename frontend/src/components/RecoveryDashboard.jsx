import React, { useState, useEffect } from "react";
import {
  Recycle,
  Factory,
  Scale,
  Calendar,
  CheckCircle,
  Leaf,
  Layers,
  ShieldCheck,
  Flame,
  Droplet
} from "lucide-react";
import { api } from "../api";
import confetti from "canvas-confetti";

export default function RecoveryDashboard({ currentUser }) {
  const [batches, setBatches] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  // Weighbridge verification modal
  const [activeBatchModal, setActiveBatchModal] = useState(null);
  const [verifiedWeight, setVerifiedWeight] = useState(500);
  const [weighbridgeNotes, setWeighbridgeNotes] = useState("Gross weighbridge slip #WB-8821 verified.");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([
        api.getRecoveryBatches(),
        api.getRecoveryPartners()
      ]);
      setBatches(bRes.batches);
      setPartners(pRes.partners);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBatch = async (batchId) => {
    try {
      await api.acceptRecoveryBatch(batchId, currentUser?.id || "recov-1");
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleVerifyWeightSubmit = async () => {
    if (!activeBatchModal) return;
    setIsVerifying(true);
    try {
      await api.verifyBatchWeight(
        activeBatchModal.id,
        parseFloat(verifiedWeight),
        weighbridgeNotes
      );
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 }
      });
      setActiveBatchModal(null);
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Info Banner */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 font-semibold text-xs border border-teal-200 flex items-center gap-1">
              <Factory className="w-3.5 h-3.5 text-teal-600" />
              Stage-2 Circular Recovery & Aggregation Hub
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#17211B] mt-1.5">{currentUser?.org_name || "Verified Recovery Partner Facility"}</h2>
          <p className="text-xs text-[#647067] mt-0.5">
            When surplus food cannot safely be redistributed, Surplus2Life aggregates compatible waste lots until facility minimums are met.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-center">
            <div className="text-lg font-bold text-teal-700">{batches.length}</div>
            <div className="text-[10px] text-[#647067] uppercase font-semibold">Active Batches</div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-center">
            <div className="text-lg font-bold text-emerald-700">3</div>
            <div className="text-[10px] text-[#647067] uppercase font-semibold">Verified Plants</div>
          </div>
        </div>
      </div>

      {/* Circular Pathways Overview Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="p-4 rounded-xl bg-white border border-[#E5EAE1] shadow-xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#17211B]">Anaerobic Digestion / Biogas</div>
            <div className="text-[11px] text-[#647067] mt-0.5 leading-snug">
              For cooked surplus, banquet leftovers & organic sludges. Generates clean methane energy & bio-slurry.
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-1">Min batch: ~400 kg</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5EAE1] shadow-xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#17211B]">Aerobic & Micro-Composting</div>
            <div className="text-[11px] text-[#647067] mt-0.5 leading-snug">
              For fruit & vegetable peelings, bakery crumbs and greens. Restores soil microbial organic carbon.
            </div>
            <div className="text-[10px] text-amber-700 font-semibold mt-1">Min batch: ~250 kg</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5EAE1] shadow-xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center shrink-0">
            <Droplet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#17211B]">Authorized Biodiesel Recovery (UCO)</div>
            <div className="text-[11px] text-[#647067] mt-0.5 leading-snug">
              Sealed collection of used cooking oil. Diverts oil from municipal sewers to clean bio-diesel fuel.
            </div>
            <div className="text-[10px] text-teal-700 font-semibold mt-1">Min batch: ~50 litres</div>
          </div>
        </div>

      </div>

      {/* Recovery Batches List */}
      <div>
        <h3 className="text-base font-bold text-[#17211B] mb-4 flex items-center justify-between">
          <span>Aggregated Circular Recovery Batches</span>
          <span className="text-xs text-[#647067] font-normal">Aggregated from multiple small donor lots</span>
        </h3>

        {loading ? (
          <div className="text-center py-12 text-[#647067] text-xs">Loading recovery batches...</div>
        ) : batches.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E5EAE1] shadow-xs">
            <Recycle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-[#17211B]">No active recovery batches</div>
            <p className="text-xs text-[#647067] mt-1">When surplus cannot safely be rescued, it will automatically aggregate here.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {batches.map((b) => {
              const isReady = b.status === "READY";
              const isAccepted = b.status === "ACCEPTED";
              const isCompleted = b.status === "RECOVERY_COMPLETED";

              return (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl bg-white border border-[#E5EAE1] hover:border-teal-300 shadow-xs hover:shadow-md transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E5EAE1]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-teal-700">{b.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : isAccepted
                            ? "bg-teal-100 text-teal-800 border-teal-200"
                            : isReady
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          {b.status.replace("_", " ")}
                        </span>
                        <span className="text-xs text-[#647067]">Hub: {b.hub_location}</span>
                      </div>

                      <h4 className="text-base font-bold text-[#17211B] mt-1">
                        {b.waste_type} — {b.suggested_pathway}
                      </h4>
                    </div>

                    {/* Weight summary & action button */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xl font-black text-teal-700">
                          {b.actual_verified_weight || b.total_quantity} {b.unit}
                        </div>
                        <div className="text-[10px] text-[#647067]">
                          {b.actual_verified_weight ? "Certified Weighbridge" : "Aggregated Lot Weight"}
                        </div>
                      </div>

                      {/* Action buttons */}
                      {b.status === "READY" && (
                        <button
                          onClick={() => handleAcceptBatch(b.id)}
                          className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Accept Batch</span>
                        </button>
                      )}

                      {b.status === "ACCEPTED" && (
                        <button
                          onClick={() => {
                            setActiveBatchModal(b);
                            setVerifiedWeight(b.total_quantity);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <Scale className="w-3.5 h-3.5" />
                          <span>Verify Weighbridge & Complete</span>
                        </button>
                      )}

                      {b.status === "RECOVERY_COMPLETED" && (
                        <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Verified Recovery
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Aggregated Sources inside this Batch */}
                  {b.items && b.items.length > 0 && (
                    <div className="mt-3 pt-2">
                      <div className="text-[11px] font-semibold text-[#647067] mb-2 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-teal-600" />
                        <span>Aggregated Small Lot Sources ({b.items.length} contributors):</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {b.items.map((it) => (
                          <div key={it.id} className="p-2.5 rounded-lg bg-[#F5F7F2] border border-[#E5EAE1] text-xs">
                            <div className="font-semibold text-[#17211B] truncate">{it.donor_name}</div>
                            <div className="text-[11px] text-teal-700 font-bold">{it.quantity} {b.unit}</div>
                            <div className="text-[10px] text-[#647067] truncate">{it.waste_type}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scheduled date or notes */}
                  {b.scheduled_pickup_date && (
                    <div className="mt-3 text-xs text-[#647067] flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      <span>Scheduled collection: <strong className="text-[#17211B]">{b.scheduled_pickup_date}</strong></span>
                      {b.verification_notes && (
                        <>
                          <span>•</span>
                          <span className="italic">{b.verification_notes}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Weighbridge Verification Modal */}
      {activeBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E5EAE1] shadow-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-[#17211B]">Weighbridge Gross Tare Verification</h3>
            </div>
            <p className="text-xs text-[#647067] mb-4">
              Enter the certified weighbridge slip weight for Batch {activeBatchModal.id}. This officially certifies circular diversion and awards recovery credits.
            </p>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-[#17211B] mb-1">
                  Actual Verified Weight ({activeBatchModal.unit}):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={verifiedWeight}
                  onChange={(e) => setVerifiedWeight(e.target.value)}
                  className="w-full px-3 py-2 text-base font-bold rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-emerald-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211B] mb-1">
                  Weighbridge Reference Slip / Notes:
                </label>
                <input
                  type="text"
                  value={weighbridgeNotes}
                  onChange={(e) => setWeighbridgeNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-[#17211B]"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800">
                🌿 <strong>Impact Multiplier:</strong> Every 50 kg verified waste will trigger 1 real tree planted via partner afforestation corridor.
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveBatchModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E5EAE1] text-[#17211B] hover:bg-[#F5F7F2] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyWeightSubmit}
                disabled={isVerifying}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
              >
                {isVerifying ? "Verifying..." : "Confirm & Award Impact"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
