import React from "react";
import {
  Utensils,
  Heart,
  Bike,
  Recycle,
  Sparkles,
  TreePine,
  ArrowRight,
} from "lucide-react";

export default function HeroLanding({
  impactStats,
  onOpenDonateModal,
  onOpenFindFood,
  onOpenVolunteer,
  onOpenRecovery,
  onOpenSMSModal
}) {
  return (
    <div className="relative overflow-hidden pt-6 pb-8">
      {/* Background ambient radial gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[380px] bg-gradient-to-b from-emerald-100/40 via-teal-50/30 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Banner Pill */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Surplus2Life Circular Ecosystem</span>
            <span className="w-1 h-1 rounded-full bg-emerald-500" />
            <span className="text-[#647067]">Rescue. Recover. Renew.</span>
          </div>
        </div>

        {/* Hero Title & Subtext */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#17211B] leading-[1.12]">
            Rescue Food First. <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 bg-clip-text text-transparent">
              Recover What Remains.
            </span>{" "}
            Renew Life.
          </h1>
          <p className="mt-3.5 text-base sm:text-lg text-[#647067] max-w-2xl mx-auto leading-relaxed">
            Connect surplus food with verified recipients, mobilize volunteer rescuers, recover suitable organic waste into green biogas & compost, and turn verified impact into real trees.
          </p>
        </div>

        {/* 4 Main Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mb-10">
          
          {/* Action 1: Donate Food */}
          <div
            onClick={onOpenDonateModal}
            className="group relative p-5 rounded-2xl bg-white border border-[#E5EAE1] hover:border-orange-300 shadow-xs hover:shadow-md cursor-pointer transition-all duration-300 hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Utensils className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#17211B] mb-1 flex items-center justify-between">
              <span>🍱 Donate Food</span>
              <ArrowRight className="w-4 h-4 text-[#647067] group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-[#647067] leading-relaxed">
              Hotels, caterers & supermarkets. 4 simple inputs with AI assistance & auto-matching.
            </p>
          </div>

          {/* Action 2: Find Food */}
          <div
            onClick={onOpenFindFood}
            className="group relative p-5 rounded-2xl bg-white border border-[#E5EAE1] hover:border-teal-300 shadow-xs hover:shadow-md cursor-pointer transition-all duration-300 hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#17211B] mb-1 flex items-center justify-between">
              <span>❤️ Find Food</span>
              <ArrowRight className="w-4 h-4 text-[#647067] group-hover:text-teal-700 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-[#647067] leading-relaxed">
              Verified NGOs & community shelters. Browse fresh surplus, claim full or split lots.
            </p>
          </div>

          {/* Action 3: Volunteer */}
          <div
            onClick={onOpenVolunteer}
            className="group relative p-5 rounded-2xl bg-white border border-[#E5EAE1] hover:border-emerald-300 shadow-xs hover:shadow-md cursor-pointer transition-all duration-300 hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Bike className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#17211B] mb-1 flex items-center justify-between">
              <span>🚴 Volunteer</span>
              <ArrowRight className="w-4 h-4 text-[#647067] group-hover:text-emerald-700 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-[#647067] leading-relaxed">
              Bridge the delivery gap. Accept pickup tasks, upload proof of delivery, earn streaks.
            </p>
          </div>

          {/* Action 4: Circular Recovery */}
          <div
            onClick={onOpenRecovery}
            className="group relative p-5 rounded-2xl bg-white border border-[#E5EAE1] hover:border-teal-300 shadow-xs hover:shadow-md cursor-pointer transition-all duration-300 hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-800 border border-teal-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Recycle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#17211B] mb-1 flex items-center justify-between">
              <span>♻️ Circular Hub</span>
              <ArrowRight className="w-4 h-4 text-[#647067] group-hover:text-teal-800 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-[#647067] leading-relaxed">
              Cannot be redistributed? Route suitable waste to verified biogas, composting, or biodiesel.
            </p>
          </div>

        </div>

        {/* Live Community Impact Numbers Strip */}
        <div className="p-6 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5EAE1]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold text-[#17211B] uppercase tracking-wider">Live Verified Real-World Impact</span>
            </div>
            <span className="text-[11px] text-[#647067]">Strictly verified post-delivery & weighbridge</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            
            <div className="p-3.5 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1]/80">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#16A34A]">
                {impactStats?.meals_rescued?.toLocaleString() || "100"}
              </div>
              <div className="text-[11px] font-semibold text-[#647067] mt-1 flex items-center justify-center gap-1">
                <span>🍱 Meals Rescued</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1]/80">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0F766E]">
                {impactStats?.waste_diverted_kg?.toLocaleString() || "510"} <span className="text-xs">kg</span>
              </div>
              <div className="text-[11px] font-semibold text-[#647067] mt-1 flex items-center justify-center gap-1">
                <span>♻️ Waste Diverted</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1]/80">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
                {impactStats?.trees_planted || "3"}
              </div>
              <div className="text-[11px] font-semibold text-[#647067] mt-1 flex items-center justify-center gap-1">
                <TreePine className="w-3.5 h-3.5 text-emerald-600" />
                <span>Trees Planted</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1]/80">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#F59E0B]">
                {impactStats?.people_served?.toLocaleString() || "100"}
              </div>
              <div className="text-[11px] font-semibold text-[#647067] mt-1 flex items-center justify-center gap-1">
                <span>👥 People Nourished</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
