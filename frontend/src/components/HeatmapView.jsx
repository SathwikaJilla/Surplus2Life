import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  MapPin,
  Layers,
  Filter,
  Info
} from "lucide-react";
import { api } from "../api";

export default function HeatmapView() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [clusters, setClusters] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [filterLevel, setFilterLevel] = useState("all");

  useEffect(() => {
    loadHeatmapData();
  }, []);

  const loadHeatmapData = async () => {
    try {
      const res = await api.getHeatmapData();
      setClusters(res.clusters);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Initialize Leaflet Map centered around Chennai / Tamil Nadu
    const map = L.map(mapContainerRef.current, {
      center: [13.0600, 80.2200],
      zoom: 11,
      zoomControl: true,
    });

    // Public OpenStreetMap tile layer (100% Free, NO API KEY required, reliable light theme)
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map markers when clusters or filters change
  useEffect(() => {
    if (!mapInstanceRef.current || clusters.length === 0) return;

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const filtered = clusters.filter((c) => {
      if (filterLevel === "all") return true;
      return c.intensity === filterLevel;
    });

    filtered.forEach((c) => {
      const radius = c.intensity === "HIGH" ? 22 : c.intensity === "MEDIUM" ? 16 : 10;
      const circle = L.circleMarker([c.lat, c.lng], {
        radius: radius,
        fillColor: c.color,
        color: "#ffffff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.75,
      }).addTo(map);

      circle.bindTooltip(
        `<strong>${c.area}</strong><br/>Surplus: ${c.surplus_kg} kg (${c.intensity} Density)`,
        { direction: "top", className: "heatmap-tooltip" }
      );

      circle.on("click", () => {
        setSelectedCluster(c);
      });
    });
  }, [clusters, filterLevel]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5EAE1] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 font-semibold text-xs border border-rose-200 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              Surplus2Life Corridor Heatmap
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#17211B] mt-1.5">Surplus & Waste Density Hotspots</h2>
          <p className="text-xs text-[#647067] mt-0.5 max-w-xl">
            Derived directly from verified platform donations and recovery aggregation. Identifies surplus corridors to optimize volunteer routes and mobile recovery trucks.
          </p>
        </div>

        {/* Intensity Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F5F7F2] rounded-xl border border-[#E5EAE1]">
          <button
            onClick={() => setFilterLevel("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterLevel === "all"
                ? "bg-white text-[#17211B] shadow-xs"
                : "text-[#647067] hover:text-[#17211B]"
            }`}
          >
            All Clusters
          </button>
          <button
            onClick={() => setFilterLevel("HIGH")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterLevel === "HIGH"
                ? "bg-rose-500 text-white shadow-xs"
                : "text-rose-700 hover:bg-rose-50"
            }`}
          >
            🔴 High Surplus
          </button>
          <button
            onClick={() => setFilterLevel("MEDIUM")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterLevel === "MEDIUM"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-amber-800 hover:bg-amber-50"
            }`}
          >
            🟠 Medium
          </button>
          <button
            onClick={() => setFilterLevel("LOW")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterLevel === "LOW"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            🟢 Low
          </button>
        </div>
      </div>

      {/* Map Container + Cluster Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        
        {/* Leaflet Map */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-[#E5EAE1] shadow-xs relative">
          <div ref={mapContainerRef} className="w-full h-[520px] bg-[#F5F7F2] z-0" />
          
          {/* Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-10 p-3.5 rounded-xl bg-white/95 backdrop-blur-md border border-[#E5EAE1] text-xs space-y-1.5 shadow-md">
            <div className="text-[10px] font-bold text-[#647067] uppercase tracking-wider mb-1">Density Legend</div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-[#17211B] font-medium">High Surplus (&gt; 500 kg/mo)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-[#17211B] font-medium">Medium Surplus (200 - 500 kg)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-[#17211B] font-medium">Low Surplus (&lt; 200 kg)</span>
            </div>
          </div>
        </div>

        {/* Selected Cluster Info / Recommendations */}
        <div className="rounded-2xl bg-white border border-[#E5EAE1] p-5 flex flex-col justify-between shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-[#17211B] mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-500" />
              <span>Corridor Optimization</span>
            </h3>

            {selectedCluster ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1]">
                  <div className="text-[10px] font-bold text-rose-600 uppercase">{selectedCluster.intensity} Density Cluster</div>
                  <h4 className="text-base font-bold text-[#17211B] mt-0.5">{selectedCluster.area}</h4>
                  <div className="text-2xl font-black text-rose-600 mt-2">
                    {selectedCluster.surplus_kg} <span className="text-xs text-[#647067] font-normal">kg recorded</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-[#17211B]">
                  <div className="p-3 rounded-lg bg-[#F5F7F2] border border-[#E5EAE1]">
                    <strong className="text-emerald-700">🚴 Volunteer Mobilization:</strong> High demand for pickup riders in this sector during 1:00 PM - 3:30 PM.
                  </div>
                  <div className="p-3 rounded-lg bg-[#F5F7F2] border border-[#E5EAE1]">
                    <strong className="text-teal-700">♻️ Circular Hub:</strong> Direct feeder connection to EcoGas Plant & Guindy Central Aggregator.
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-[#647067] text-xs">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>Click on any colored hotspot circle on the map to inspect corridor density and volunteer routing recommendations.</p>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-[11px] text-[#647067] flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              <strong>Note:</strong> Heatmap is generated purely from Surplus2Life historical platform listings, not speculative predictions.
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}
