import React, { useState, useEffect } from "react";
import {
  FileText,
  Clock,
  Share2,
  X,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { api } from "../api";

export default function FoodPassportModal({ donationId, onClose }) {
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (donationId) {
      loadPassport();
    }
  }, [donationId]);

  const loadPassport = async () => {
    setLoading(true);
    try {
      const res = await api.getPassport(donationId);
      setPassport(res.passport);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + `?passport=${donationId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-white border border-[#E5EAE1] shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5EAE1] bg-[#F5F7F2]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#17211B]">Food Passport</h2>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-extrabold text-xs border border-emerald-200">
                  {donationId}
                </span>
              </div>
              <p className="text-[11px] text-[#647067]">Verifiable Circular Audit Trail • Surplus2Life</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              title="Copy shareable link"
              className="p-1.5 rounded-lg text-[#647067] hover:text-emerald-700 hover:bg-slate-200/60 transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#647067] hover:text-[#17211B] hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-xs text-[#647067]">Loading passport audit trail...</div>
          ) : !passport ? (
            <div className="text-center py-8 text-xs text-[#647067]">Passport record not found for {donationId}.</div>
          ) : (
            <div className="space-y-6">

              {/* Item Overview Card */}
              <div className="p-4 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] flex items-start gap-3.5">
                <img src={passport.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-700">{passport.food_category}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white text-[#17211B] border border-[#E5EAE1] font-bold uppercase">
                      {passport.current_stage.replace("_", " ")}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#17211B] truncate mt-0.5">{passport.title}</h4>
                  <div className="text-xs text-[#647067] mt-1">
                    Lot: <strong className="text-[#17211B]">{passport.quantity} {passport.unit}</strong> • Donor: <span>{passport.donor_org || passport.donor_name}</span>
                  </div>
                </div>
              </div>

              {/* Timeline Journey */}
              <div>
                <h4 className="text-xs font-bold text-[#647067] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chronological Journey & Chain of Custody</span>
                </h4>

                <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                  {passport.timeline.map((event, idx) => (
                    <div key={idx} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-600 ring-4 ring-white shrink-0 shadow-xs" />
                      
                      <div className="bg-[#F5F7F2] p-3 rounded-xl border border-[#E5EAE1]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-[#17211B]">{event.stage}</span>
                          <span className="text-[11px] font-semibold text-emerald-700">{event.timestamp}</span>
                        </div>
                        <div className="text-[11px] text-[#647067]">
                          Actor: <strong className="text-[#17211B]">{event.actor}</strong>
                        </div>
                        <p className="text-xs text-[#647067] mt-1 leading-relaxed">
                          {event.note}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* QR Verification stamp */}
              <div className="p-3.5 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <QrCode className="w-8 h-8 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-[#17211B] flex items-center gap-1">
                      <span>Cryptographically Logged Impact</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-[11px] text-[#647067]">Prevents fictitious listing & reward abuse</div>
                  </div>
                </div>
                {copied && (
                  <span className="text-[11px] font-semibold text-emerald-700 animate-pulse">Link Copied!</span>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
