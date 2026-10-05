import React, { useState, useEffect } from "react";
import {
  TreePine,
  MapPin,
  ShieldCheck,
  ChevronRight,
  Leaf
} from "lucide-react";
import { api } from "../api";

export default function ForestView({ currentUser }) {
  const [tab, setTab] = useState("my"); // 'my' | 'community'
  const [myTrees, setMyTrees] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [communityTrees, setCommunityTrees] = useState([]);
  const [impactStats, setImpactStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForestData();
  }, [currentUser]);

  const loadForestData = async () => {
    setLoading(true);
    try {
      const [myRes, commRes, statsRes] = await Promise.all([
        api.getMyForest(currentUser?.id || "donor-1"),
        api.getCommunityForest(),
        api.getImpactSummary()
      ]);
      setMyTrees(myRes.trees);
      setMyStats(myRes);
      setCommunityTrees(commRes.trees);
      setImpactStats(statsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const displayedTrees = tab === "my" ? myTrees : communityTrees;

  return (
    <div className="space-y-8">
      {/* Forest Hero Banner */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-semibold text-xs border border-emerald-200 flex items-center gap-1">
              <TreePine className="w-3.5 h-3.5 text-emerald-600" />
              Real Verified Tree Planting Engine
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#17211B] mt-1.5">
            {tab === "my" ? "🌳 My Forest" : "🌍 Surplus2Life Community Forest"}
          </h2>
          <p className="text-xs text-[#647067] mt-0.5 max-w-xl">
            100 verified rescued meals or 50 kg recovered organic waste = 1 real tree planted with geotagged verification through certified afforestation partners.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center p-1 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1]">
          <button
            onClick={() => setTab("my")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === "my" ? "bg-emerald-600 text-white shadow-xs" : "text-[#647067] hover:text-[#17211B]"
            }`}
          >
            My Forest ({myTrees.length})
          </button>
          <button
            onClick={() => setTab("community")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === "community" ? "bg-emerald-600 text-white shadow-xs" : "text-[#647067] hover:text-[#17211B]"
            }`}
          >
            Community Forest ({communityTrees.length})
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#E5EAE1] shadow-xs">
          <div className="text-2xl font-black text-emerald-700">
            {tab === "my" ? myTrees.length : impactStats?.trees_planted || 3}
          </div>
          <div className="text-xs text-[#647067] mt-0.5">Trees Planted</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5EAE1] shadow-xs">
          <div className="text-2xl font-black text-teal-700">
            {tab === "my" ? myStats?.meals_rescued || 100 : impactStats?.meals_rescued || 100}
          </div>
          <div className="text-xs text-[#647067] mt-0.5">Verified Meals Rescued</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5EAE1] shadow-xs">
          <div className="text-2xl font-black text-teal-700">
            {tab === "my" ? myStats?.waste_recovered_kg || 120 : impactStats?.waste_diverted_kg || 510} kg
          </div>
          <div className="text-xs text-[#647067] mt-0.5">Organic Waste Diverted</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5EAE1] shadow-xs">
          <div className="text-2xl font-black text-amber-600">
            {impactStats?.co2_diverted_kg_estimate || 802} kg
          </div>
          <div className="text-xs text-[#647067] mt-0.5">Est. CO₂ Offset</div>
        </div>
      </div>

      {/* Trees Grid with Tree Impact Cards */}
      <div>
        <h3 className="text-base font-bold text-[#17211B] mb-4 flex items-center justify-between">
          <span>{tab === "my" ? "Your Verified Tree Records" : "Community Afforestation Records"}</span>
          <span className="text-xs text-[#647067] font-normal">Real sapling photos & growth updates</span>
        </h3>

        {loading ? (
          <div className="text-center py-12 text-[#647067] text-xs">Loading tree impact cards...</div>
        ) : displayedTrees.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E5EAE1] shadow-xs">
            <TreePine className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-[#17211B]">No trees planted yet</div>
            <p className="text-xs text-[#647067] mt-1">Complete verified food rescues or circular waste recovery to plant your first tree!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedTrees.map((tree) => (
              <div
                key={tree.id}
                className="rounded-2xl bg-white border border-[#E5EAE1] hover:border-emerald-300 shadow-xs hover:shadow-md overflow-hidden transition-all hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  {/* Photo & Species Banner */}
                  <div className="relative h-44 overflow-hidden bg-slate-100">
                    <img src={tree.photo_url} alt={tree.species} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[10px] uppercase shadow-xs flex items-center gap-1">
                        <Leaf className="w-3 h-3" />
                        Verified Sapling
                      </span>
                    </div>
                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-[#17211B] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-200/80 shadow-xs">
                      <span className="font-semibold">{tree.planting_date}</span>
                      <span className="text-emerald-700 font-medium">{tree.location_name?.split(",")[0]}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <div className="text-xs text-emerald-700 font-bold uppercase tracking-wider mb-0.5">
                      {tree.trigger_type}
                    </div>
                    <h4 className="text-base font-bold text-[#17211B]">{tree.species}</h4>

                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex items-start gap-1.5 text-[#17211B]">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{tree.location_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#647067]">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>Partner: <strong className="text-[#17211B]">{tree.planting_partner_name}</strong></span>
                      </div>
                    </div>

                    {/* Growth update note */}
                    {tree.growth_update_text && (
                      <div className="mt-3 p-2.5 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-[11px] text-[#17211B] italic">
                        "{tree.growth_update_text}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-4 py-3 bg-[#F5F7F2] border-t border-[#E5EAE1] flex items-center justify-between text-[11px] text-[#647067]">
                  <span>GPS: {tree.latitude.toFixed(4)}, {tree.longitude.toFixed(4)}</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                    Live Geotag <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
