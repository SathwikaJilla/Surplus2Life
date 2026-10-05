import React, { useState, useEffect } from "react";
import {
  Trophy,
  Flame,
  Bike,
  Building,
  EyeOff,
  Eye,
  Coins
} from "lucide-react";
import { api } from "../api";

export default function LeaderboardView() {
  const [leaderboards, setLeaderboards] = useState({
    top_overall: [],
    top_donors: [],
    top_volunteers: []
  });
  const [loading, setLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    setLoading(true);
    try {
      const res = await api.getLeaderboards();
      setLeaderboards(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (idx) => {
    if (idx === 0) return <span className="text-xl">🥇</span>;
    if (idx === 1) return <span className="text-xl">🥈</span>;
    if (idx === 2) return <span className="text-xl">🥉</span>;
    return <span className="text-xs font-bold text-[#647067] w-5 text-center">#{idx + 1}</span>;
  };

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-semibold text-xs border border-amber-200 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              Verified Community Leaderboard
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#17211B] mt-1.5">Top Food Rescuers & Heroes</h2>
          <p className="text-xs text-[#647067] mt-0.5">
            Recognizing donors, volunteers, and facilities leading the circular food revolution.
          </p>
        </div>

        {/* Anonymous Mode Toggle */}
        <button
          onClick={() => setIsAnonymous(!isAnonymous)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
            isAnonymous
              ? "bg-teal-50 text-teal-800 border-teal-200"
              : "bg-[#F5F7F2] text-[#17211B] border-[#E5EAE1] hover:bg-slate-200/70"
          }`}
        >
          {isAnonymous ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{isAnonymous ? "Incognito Active" : "Private Mode"}</span>
        </button>
      </div>

      {/* Leaderboard Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Column 1: Top Rescuers (Donors) */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#17211B] mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>Top Donor Organizations</span>
            </h3>

            <div className="space-y-3">
              {leaderboards.top_donors.map((d, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1]">
                  <div className="flex items-center gap-3">
                    {getRankBadge(idx)}
                    <div>
                      <div className="text-xs font-bold text-[#17211B]">
                        {isAnonymous && idx > 0 ? "Anonymous Donor" : (d.org_name || d.name)}
                      </div>
                      <div className="text-[10px] text-[#647067]">Verified Donor</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-700">{d.meals_rescued}</div>
                    <div className="text-[10px] text-[#647067]">meals rescued</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Top Volunteers */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#17211B] mb-4 flex items-center gap-2">
              <Bike className="w-4 h-4 text-amber-600" />
              <span>Top Volunteer Dispatchers</span>
            </h3>

            <div className="space-y-3">
              {leaderboards.top_volunteers.map((v, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1]">
                  <div className="flex items-center gap-3">
                    {getRankBadge(idx)}
                    <div>
                      <div className="text-xs font-bold text-[#17211B]">
                        {isAnonymous && idx > 0 ? "Anonymous Rescuer" : v.name}
                      </div>
                      <div className="text-[10px] text-rose-600 flex items-center gap-0.5 font-semibold">
                        <Flame className="w-3 h-3 fill-rose-500 text-rose-500" />
                        <span>{v.current_streak_weeks || 4}w streak</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-amber-600">{v.pickups_completed}</div>
                    <div className="text-[10px] text-[#647067]">deliveries</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Top Overall Impact Credits */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#17211B] mb-4 flex items-center gap-2">
              <Coins className="w-4 h-4 text-purple-600" />
              <span>Impact Credit Leaders</span>
            </h3>

            <div className="space-y-3">
              {leaderboards.top_overall.map((o, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1]">
                  <div className="flex items-center gap-3">
                    {getRankBadge(idx)}
                    <div>
                      <div className="text-xs font-bold text-[#17211B]">
                        {isAnonymous && idx > 0 ? "Eco Contributor" : o.name}
                      </div>
                      <div className="text-[10px] text-[#647067] capitalize">{o.role?.replace("_", " ")}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-purple-700">{o.total_credits}</div>
                    <div className="text-[10px] text-[#647067]">credits earned</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
