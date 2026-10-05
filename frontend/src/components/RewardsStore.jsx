import React, { useState, useEffect } from "react";
import {
  Gift,
  Coins,
  Flame,
  Coffee,
  UtensilsCrossed,
  Film,
  ShoppingBag,
  Zap,
  Smartphone,
  Copy,
  Check,
  Snowflake
} from "lucide-react";
import { api } from "../api";
import confetti from "canvas-confetti";

export default function RewardsStore({ currentUser, onBalanceUpdated }) {
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState(null);
  const [newlyUnlockedCode, setNewlyUnlockedCode] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    loadStore();
  }, [currentUser]);

  const loadStore = async () => {
    setLoading(true);
    try {
      const [rRes, myRes, uRes] = await Promise.all([
        api.getRewards(),
        api.getUserRedemptions(currentUser?.id || "donor-1"),
        api.getUserProfile(currentUser?.id || "donor-1")
      ]);
      setRewards(rRes.rewards);
      setRedemptions(myRes.redemptions);
      setUserProfile(uRes.user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (reward) => {
    const balance = userProfile?.credits_balance || 0;
    if (balance < reward.credits_cost) {
      alert(`Insufficient credits. You need ${reward.credits_cost} credits, but currently have ${balance}.`);
      return;
    }

    setRedeemingId(reward.id);
    try {
      const res = await api.redeemReward(currentUser?.id || "donor-1", reward.id);
      setNewlyUnlockedCode(res.coupon_code);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      await loadStore();
      if (onBalanceUpdated) onBalanceUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setRedeemingId(null);
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getRewardIcon = (iconName) => {
    switch (iconName) {
      case "Coffee": return <Coffee className="w-6 h-6 text-amber-600" />;
      case "UtensilsCrossed": return <UtensilsCrossed className="w-6 h-6 text-emerald-600" />;
      case "Film": return <Film className="w-6 h-6 text-teal-600" />;
      case "ShoppingBag": return <ShoppingBag className="w-6 h-6 text-purple-600" />;
      case "Zap": return <Zap className="w-6 h-6 text-cyan-600" />;
      case "Smartphone": return <Smartphone className="w-6 h-6 text-blue-600" />;
      default: return <Gift className="w-6 h-6 text-orange-600" />;
    }
  };

  const streak = userProfile?.streak || { current_streak_weeks: 4, longest_streak_weeks: 6, streak_freezes_remaining: 1 };

  return (
    <div className="space-y-8">
      {/* Rewards Hero Banner */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-orange-50 text-orange-800 font-semibold text-xs border border-orange-200 flex items-center gap-1">
              <Gift className="w-3.5 h-3.5 text-orange-600" />
              Practical Partner Rewards Store
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#17211B] mt-1.5">Impact Rewards & Weekly Streaks</h2>
          <p className="text-xs text-[#647067] mt-0.5 max-w-xl">
            Real impact converts to useful daily benefits. No meaningless badges. Redeem verified credits for coffee, dining, movies, and green vouchers.
          </p>
        </div>

        {/* User Balance & Streak Cards */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-center">
            <div className="text-xl font-extrabold text-amber-600 flex items-center justify-center gap-1">
              <Coins className="w-4 h-4" />
              <span>{userProfile?.credits_balance || 0}</span>
            </div>
            <div className="text-[10px] text-[#647067] uppercase font-semibold">Available Credits</div>
          </div>

          <div className="px-4 py-2 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-center">
            <div className="text-xl font-extrabold text-rose-600 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 fill-rose-500 text-rose-500" />
              <span>{streak.current_streak_weeks}w</span>
            </div>
            <div className="text-[10px] text-[#647067] uppercase font-semibold">Weekly Streak</div>
          </div>
        </div>
      </div>

      {/* Weekly Streak Milestone Strip */}
      <div className="p-5 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-[#E5EAE1]">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span className="text-xs font-bold text-[#17211B]">Weekly Streak Milestones (Active: {streak.current_streak_weeks} Consecutive Weeks)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#647067]">
            <Snowflake className="w-3.5 h-3.5 text-teal-600" />
            <span>Streak Freezes Remaining: <strong className="text-teal-700">{streak.streak_freezes_remaining}</strong> (1 free / mo)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className={`p-3 rounded-xl border ${streak.current_streak_weeks >= 2 ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-[#F5F7F2] border-[#E5EAE1] text-[#647067]"}`}>
            <div className="text-xs font-bold">2-Week Streak</div>
            <div className="text-sm font-extrabold mt-0.5 text-[#17211B]">+50 Credits</div>
            <div className="text-[10px] mt-1">{streak.current_streak_weeks >= 2 ? "✅ Unlocked" : "In Progress"}</div>
          </div>

          <div className={`p-3 rounded-xl border ${streak.current_streak_weeks >= 4 ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-[#F5F7F2] border-[#E5EAE1] text-[#647067]"}`}>
            <div className="text-xs font-bold">4-Week Streak</div>
            <div className="text-sm font-extrabold mt-0.5 text-[#17211B]">+150 Credits</div>
            <div className="text-[10px] mt-1">{streak.current_streak_weeks >= 4 ? "✅ Unlocked" : "In Progress"}</div>
          </div>

          <div className={`p-3 rounded-xl border ${streak.current_streak_weeks >= 8 ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-[#F5F7F2] border-[#E5EAE1] text-[#647067]"}`}>
            <div className="text-xs font-bold">8-Week Streak</div>
            <div className="text-sm font-extrabold mt-0.5 text-[#17211B]">+400 Credits</div>
            <div className="text-[10px] mt-1">{streak.current_streak_weeks >= 8 ? "✅ Unlocked" : "In Progress"}</div>
          </div>

          <div className="p-3 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-[#647067]">
            <div className="text-xs font-bold">12-Week Streak</div>
            <div className="text-sm font-extrabold mt-0.5 text-amber-700">Special Partner Hamper</div>
            <div className="text-[10px] mt-1">Champion Tier</div>
          </div>
        </div>
      </div>

      {/* Rewards Catalog */}
      <div>
        <h3 className="text-base font-bold text-[#17211B] mb-4 flex items-center justify-between">
          <span>Available Partner Rewards</span>
          <span className="text-xs text-[#647067] font-normal">Real voucher codes generated upon redemption</span>
        </h3>

        {loading ? (
          <div className="text-center py-12 text-[#647067] text-xs">Loading rewards store...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rewards.map((r) => {
              const canAfford = (userProfile?.credits_balance || 0) >= r.credits_cost;

              return (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl bg-white border border-[#E5EAE1] hover:border-orange-300 shadow-xs hover:shadow-md flex flex-col justify-between transition-all hover:-translate-y-1"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-[#F5F7F2] flex items-center justify-center border border-[#E5EAE1]">
                        {getRewardIcon(r.icon)}
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-extrabold flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        {r.credits_cost} Credits
                      </span>
                    </div>

                    <div className="text-[10px] font-bold text-[#647067] uppercase tracking-wider">{r.category}</div>
                    <h4 className="text-base font-bold text-[#17211B] mt-0.5">{r.title}</h4>
                    <p className="text-xs text-[#647067] mt-2 leading-relaxed">{r.description}</p>
                    <div className="text-[11px] text-[#647067] mt-2">Partner: <strong className="text-[#17211B]">{r.partner_name}</strong></div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#E5EAE1]">
                    <button
                      onClick={() => handleRedeem(r)}
                      disabled={!canAfford || redeemingId === r.id}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                        canAfford
                          ? "bg-[#F97316] hover:bg-[#ea580c] text-white"
                          : "bg-[#F5F7F2] text-slate-400 border border-[#E5EAE1] cursor-not-allowed"
                      }`}
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>{redeemingId === r.id ? "Redeeming..." : canAfford ? "REDEEM NOW" : `Need ${r.credits_cost - (userProfile?.credits_balance || 0)} More Credits`}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User's Redeemed Coupons Wallet */}
      {redemptions.length > 0 && (
        <div className="p-6 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs">
          <h3 className="text-base font-bold text-[#17211B] mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-600" />
            <span>My Redeemed Coupons & Vouchers</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {redemptions.map((red) => (
              <div
                key={red.id}
                className="p-3.5 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] flex flex-col justify-between"
              >
                <div>
                  <div className="text-[10px] font-bold text-[#647067] uppercase">{red.partner_name}</div>
                  <h4 className="text-xs font-bold text-[#17211B] mt-0.5 truncate">{red.title}</h4>
                </div>

                <div className="mt-3 p-2 rounded-lg bg-white border border-[#E5EAE1] flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-amber-700 tracking-wider">
                    {red.coupon_code}
                  </span>
                  <button
                    onClick={() => handleCopy(red.coupon_code)}
                    className="p-1 rounded text-[#647067] hover:text-[#17211B]"
                    title="Copy coupon code"
                  >
                    {copiedCode === red.coupon_code ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Unlocked Code Popover */}
      {newlyUnlockedCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-[#E5EAE1] shadow-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border border-orange-200">
              <Gift className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#17211B]">Coupon Unlocked!</h3>
              <p className="text-xs text-[#647067] mt-1">
                Your practical reward voucher is ready to use at partner counters.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] font-mono text-sm font-extrabold text-orange-600 tracking-widest">
              {newlyUnlockedCode}
            </div>

            <button
              onClick={() => setNewlyUnlockedCode(null)}
              className="w-full py-2.5 rounded-xl bg-[#F97316] hover:bg-[#ea580c] text-white font-bold text-xs shadow-xs"
            >
              Add to Wallet
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
