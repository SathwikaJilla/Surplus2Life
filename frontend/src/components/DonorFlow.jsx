import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle,
  Edit2,
  X,
  ArrowRight,
  Send,
  Upload,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  Check
} from "lucide-react";
import { api } from "../api";
import confetti from "canvas-confetti";

export default function DonorFlow({ currentUser, onClose, onDonationCreated }) {
  // 1. Food Photo State
  const [photoUrl, setPhotoUrl] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // 2. Food Details State
  const [editedTitle, setEditedTitle] = useState("");
  const [foodCategory, setFoodCategory] = useState("Cooked Meals");
  const [quantity, setQuantity] = useState(50);
  const [unit, setUnit] = useState("meals");
  
  // Format current time as default (e.g. 02:00 PM)
  const defaultPrepTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const [preparationTime, setPreparationTime] = useState(defaultPrepTime);

  // 3. Location & GPS State
  const [locationName, setLocationName] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Workflow states
  const [step, setStep] = useState(1); // 1: Inputs -> 2: AI Review & Priority -> 3: Confirmation
  const [aiResult, setAiResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // --- CAMERA CAPTURE LOGIC ---
  const startCameraCapture = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Direct fallback to mobile/native camera capture input
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        setCameraError("Camera access is not supported by this browser. Please use the upload option.");
      }
      return;
    }

    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      }).catch(async () => {
        // Fallback without constraints if environment camera fails
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn("Camera getUserMedia error:", err);
      setIsCameraActive(false);
      // Fallback to camera file input
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        setCameraError("Camera access denied or unavailable. Please use the upload option.");
      }
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPhotoUrl(dataUrl);
    stopCameraStream();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- GEOLOCATION LOGIC ---
  const handleUseCurrentLocation = () => {
    setLocationError(null);
    setIsLocating(true);

    if (!navigator.geolocation) {
      setIsLocating(false);
      setLocationError("Geolocation is not supported by your browser. Please enter your pickup address manually.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setLocationConfirmed(true);

        const fallbackLocation = `GPS Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`;
        setLocationName(fallbackLocation);

        // Reverse geocoding via OpenStreetMap Nominatim
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: { "Accept-Language": "en" }
          });
          const data = await res.json();
          if (data && data.display_name) {
            const road = data.address?.road || data.address?.suburb || data.address?.neighbourhood || "";
            const city = data.address?.city || data.address?.town || data.address?.county || "";
            const friendly = [road, city].filter(Boolean).join(", ") || data.display_name.split(",").slice(0, 2).join(",");
            setLocationName(friendly || fallbackLocation);
          }
        } catch (e) {
          // Keep GPS coordinates fallback
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn("Geolocation error:", err);
        if (err.code === 1) { // PERMISSION_DENIED
          setLocationError("Location permission denied. Please enter your pickup address manually below.");
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          setLocationError("GPS location unavailable. Please enter your pickup address manually below.");
        } else {
          setLocationError("Location request timed out. Please enter your pickup address manually below.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  // --- AI ANALYSIS STEP ---
  const handleRunAIAnalysis = async () => {
    if (!editedTitle.trim()) {
      alert("Please enter the food name/description.");
      return;
    }
    if (!photoUrl) {
      alert("Please capture or upload a food photo first.");
      return;
    }
    if (!locationName.trim()) {
      alert("Please specify a pickup location or click 'Use Current Location'.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("photo_hint", editedTitle);
      formData.append("category_hint", foodCategory);
      formData.append("prep_time", preparationTime);

      const res = await api.aiAnalyze(formData);
      setAiResult(res.ai_result);
      if (!editedTitle) {
        setEditedTitle(res.ai_result.detected_item);
      }
      setFoodCategory(res.ai_result.category || foodCategory);
      setStep(2);
    } catch (err) {
      console.error(err);
      // Fallback estimate
      setAiResult({
        detected_item: editedTitle,
        category: foodCategory,
        confidence: 0.92,
        priority_analysis: {
          priority: "HIGH PRIORITY",
          color: "amber",
          elapsed_hours: 1.5,
          advisory: "Freshly prepared food. High priority for prompt verified community rescue."
        },
        recovery_pathway: "Anaerobic Digestion / Biogas"
      });
      setStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- SUBMISSION ---
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        donor_id: currentUser?.id || "donor-1",
        food_category: foodCategory,
        title: editedTitle.trim(),
        description: `Fresh surplus listed via Surplus2Life at ${locationName}.`,
        photo_url: photoUrl,
        quantity: parseFloat(quantity),
        unit: unit,
        preparation_time: preparationTime,
        location_name: locationName.trim() || "Pickup Location Provided",
        latitude: latitude || currentUser?.latitude || 13.0418,
        longitude: longitude || currentUser?.longitude || 80.2341,
        ai_detected_item: aiResult?.detected_item || editedTitle
      };

      const res = await api.createDonation(payload);
      setSubmissionResult(res);
      setStep(3);

      if (res.status !== "offline_queued") {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      if (onDonationCreated) {
        onDonationCreated(res.donation || res);
      }
    } catch (err) {
      alert("Error submitting donation: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-[#E5EAE1] shadow-2xl overflow-hidden my-8">
        
        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileUpload}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5EAE1] bg-[#F5F7F2]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#17211B]">Create Food Donation</h2>
              <p className="text-xs text-[#647067]">Live Camera Capture & Current Location Listing</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-1.5 rounded-lg text-[#647067] hover:text-[#17211B] hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">

          {/* STEP 1: Core Form */}
          {step === 1 && (
            <div className="space-y-5">
              
              {/* 1. Food Photo: Live Camera Capture */}
              <div>
                <label className="block text-xs font-semibold text-[#647067] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>1. 📷 Food Photo</span>
                  {photoUrl && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Photo Attached ✓
                    </span>
                  )}
                </label>

                {/* Camera Viewfinder (when stream active) */}
                {isCameraActive ? (
                  <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-700">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-md flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span>Live Camera View</span>
                    </div>

                    <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleCaptureSnapshot}
                        className="px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803d] text-white font-bold text-xs shadow-lg flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        <span>📸 Take Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCameraStream}
                        className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-900 text-white font-semibold text-xs border border-white/20"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : photoUrl ? (
                  /* Captured Photo Preview */
                  <div className="relative rounded-2xl overflow-hidden border border-[#E5EAE1] bg-slate-100 shadow-2xs">
                    <img src={photoUrl} alt="Captured surplus" className="w-full h-48 object-cover" />
                    
                    <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                      <CheckCircle className="w-3.5 h-3.5" /> Food Photo Captured ✓
                    </div>

                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={startCameraCapture}
                        className="px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Retake Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload Different
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Capture / Upload Selector */
                  <div className="border-2 border-dashed border-[#E5EAE1] hover:border-emerald-500 rounded-2xl p-6 text-center bg-[#F5F7F2] transition-colors">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                      <Camera className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="text-xs text-[#17211B] font-semibold mb-1">Capture real photo of the food donation</p>
                    <p className="text-[11px] text-[#647067] mb-4">Take a clear photo to help verified community recipients assess your surplus.</p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={startCameraCapture}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803d] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        <span>📷 Capture Food Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#17211B] font-semibold text-xs border border-[#E5EAE1] flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#647067]" />
                        <span>🖼️ Upload Photo</span>
                      </button>
                    </div>

                    {cameraError && (
                      <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center justify-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{cameraError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Food Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#647067] uppercase tracking-wider mb-1.5">
                    Food Name / Items
                  </label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    placeholder="e.g. Rice + Vegetable Curry, Fresh Breads, Fruit Basket"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-[#17211B] focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#647067] uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={foodCategory}
                    onChange={(e) => setFoodCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-emerald-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Cooked Meals">Cooked Meals</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Raw Produce">Raw Produce</option>
                    <option value="Packaged Food">Packaged Food</option>
                    <option value="Cooking Oil">Cooking Oil</option>
                  </select>
                </div>
              </div>

              {/* 3. Quantity & Preparation Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#647067] uppercase tracking-wider mb-1.5">
                    2. 🔢 Quantity
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-[#17211B] focus:outline-none focus:border-emerald-500"
                    />
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-emerald-700 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="meals">meals / portions</option>
                      <option value="kg">kg (weight)</option>
                      <option value="litres">litres (oil/liquids)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#647067] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>3. ⏰ Preparation Time</span>
                    <span className="text-[10px] text-emerald-700">Freshness Tracker</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={preparationTime}
                      onChange={(e) => setPreparationTime(e.target.value)}
                      placeholder="e.g. 11:30 AM or 1:00 PM"
                      className="w-full px-3 py-2 text-sm rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-[#17211B] focus:outline-none focus:border-emerald-500 pl-9"
                    />
                    <Clock className="w-4 h-4 text-[#647067] absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>

              {/* 4. Location: Geolocation Integration */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#647067] uppercase tracking-wider">
                    4. 📍 Location
                  </label>
                  {locationConfirmed && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Location Selected ✓
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {/* Primary Location Option */}
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                    className="w-full py-2.5 px-4 rounded-xl border border-emerald-600 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
                  >
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>{isLocating ? "Detecting GPS Coordinates..." : "📍 Use Current Location"}</span>
                  </button>

                  {/* Confirmed Location Preview with Map */}
                  {locationConfirmed && latitude && longitude && (
                    <div className="p-3 rounded-xl bg-white border border-emerald-300 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-xs text-emerald-800">
                        <span className="font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Location Selected ✓
                        </span>
                        <span className="font-mono text-[11px] text-[#647067]">
                          {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
                        </span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-[#647067] uppercase mb-1">
                          Confirm Pickup Address / Landmark
                        </label>
                        <input
                          type="text"
                          value={locationName}
                          onChange={(e) => setLocationName(e.target.value)}
                          placeholder="Confirm or edit pickup address..."
                          className="w-full px-3 py-2 text-xs rounded-lg bg-[#F5F7F2] border border-[#E5EAE1] text-[#17211B] focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Map Location Preview */}
                      <div className="relative h-28 rounded-lg overflow-hidden border border-emerald-200 bg-slate-100">
                        <iframe
                          title="Location Preview"
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          scrolling="no"
                          marginHeight="0"
                          marginWidth="0"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.008}%2C${latitude - 0.006}%2C${longitude + 0.008}%2C${latitude + 0.006}&layer=mapnik&marker=${latitude}%2C${longitude}`}
                          className="w-full h-full pointer-events-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Location Error Notice */}
                  {locationError && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{locationError}</span>
                      </div>
                    </div>
                  )}

                  {/* Manual Location Input (Fallback) */}
                  {!locationConfirmed && (
                    <div className="relative">
                      <input
                        type="text"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder="Or enter pickup location manually..."
                        className="w-full px-3 py-2 text-xs rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-[#17211B] focus:outline-none focus:border-emerald-500 pl-8"
                      />
                      <MapPin className="w-3.5 h-3.5 text-[#647067] absolute left-2.5 top-2.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* Next CTA with AI trigger */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRunAIAnalysis}
                  disabled={isAnalyzing || !quantity || !editedTitle.trim() || !photoUrl}
                  className="w-full py-3 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803d] disabled:opacity-50 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isAnalyzing ? "AI Analyzing Freshness & Priority..." : "Analyze with AI & Review Rescue Priority"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 2: AI Recognition Confirmation & Priority */}
          {step === 2 && aiResult && (
            <div className="space-y-5">
              
              {/* AI Recognition Card */}
              <div className="p-4 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                      AI Food Recognition & Classification
                    </span>
                  </div>
                  <span className="text-[10px] text-[#647067]">Editable by donor</span>
                </div>

                <div className="flex items-start gap-4">
                  <img src={photoUrl} alt="Captured food" className="w-20 h-20 rounded-xl object-cover shrink-0 border border-slate-200" />
                  <div className="flex-1">
                    {isEditingTitle ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white border border-[#E5EAE1] text-[#17211B]"
                        />
                        <button
                          onClick={() => setIsEditingTitle(false)}
                          className="px-2.5 py-1 text-[11px] rounded bg-emerald-600 text-white font-semibold"
                        >
                          Save Correction
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-bold text-[#17211B] flex items-center gap-2">
                          <span>{editedTitle}</span>
                          <button
                            onClick={() => setIsEditingTitle(true)}
                            className="text-[#647067] hover:text-emerald-700"
                            title="Edit food title"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs text-[#647067] mt-0.5">
                          Category: <span className="font-semibold text-emerald-700">{foodCategory}</span>
                        </div>
                        <div className="text-xs text-[#647067] mt-1">
                          Quantity: <span className="font-semibold text-[#17211B]">{quantity} {unit}</span> • Prepared: <span>{preparationTime}</span>
                        </div>
                        <div className="text-xs text-[#647067] mt-0.5">
                          Pickup: <span className="font-medium text-[#17211B]">{locationName}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {!isEditingTitle && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E5EAE1]">
                    <span className="text-[11px] text-[#647067]">Is this information accurate?</span>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                    >
                      ✓ YES
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingTitle(true)}
                      className="px-2.5 py-1 rounded bg-white text-[#17211B] border border-[#E5EAE1] text-xs font-medium hover:bg-[#F5F7F2]"
                    >
                      ✏️ EDIT
                    </button>
                  </div>
                )}
              </div>

              {/* Rescue Priority / Freshness-Risk Estimate Card */}
              {aiResult.priority_analysis && (
                <div className={`p-4 rounded-xl border ${
                  aiResult.priority_analysis.priority === "URGENT"
                    ? "bg-rose-50 border-rose-200 text-rose-800"
                    : aiResult.priority_analysis.priority === "HIGH PRIORITY"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-emerald-50 border-emerald-200 text-emerald-800"
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Food Rescue Priority: {aiResult.priority_analysis.priority}
                    </span>
                    <span className="text-[11px] font-medium opacity-80">
                      Elapsed: {aiResult.priority_analysis.elapsed_hours || 1.5} hrs
                    </span>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">
                    {aiResult.priority_analysis.advisory}
                  </p>
                </div>
              )}

              {/* AI Disclaimer Notice */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-[#647067] flex items-center gap-1.5">
                <span className="font-semibold text-slate-700 shrink-0">Note:</span>
                <span>AI assistance provides dispatch urgency scoring and category classification only. It does not certify food hygiene or safety.</span>
              </div>

              {/* Circular Fallback notice */}
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-[11px] text-teal-800 flex items-center gap-2">
                <span className="text-teal-700 text-sm">♻️</span>
                <span>
                  <strong>Two-Stage Guarantee:</strong> If unclaimed, this item will automatically be assessed for <strong>{aiResult.recovery_pathway || "Anaerobic Digestion / Biogas"}</strong>. Zero waste to landfill.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-[#E5EAE1] text-[#17211B] hover:bg-[#F5F7F2] text-xs font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803d] text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? "Broadcasting to Verified Shelters..." : "DONATE NOW"}</span>
                </button>
              </div>

            </div>
          )}

          {/* STEP 3: Success Confirmation */}
          {step === 3 && submissionResult && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-[#17211B]">
                  {submissionResult.status === "offline_queued" ? "Saved to Offline Queue" : "Donation Live & Broadcasted!"}
                </h3>
                <p className="text-xs text-[#647067] mt-1 max-w-md mx-auto">
                  {submissionResult.message}
                </p>
              </div>

              <div className="inline-block p-3.5 rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-left text-xs space-y-1">
                <div>Unique ID: <strong className="text-emerald-700">{submissionResult.donation_id}</strong></div>
                <div>Surplus: <strong className="text-[#17211B]">{quantity} {unit} of {editedTitle}</strong></div>
                <div>Location: <span className="text-[#647067]">{locationName}</span></div>
                <div>Status: <span className="text-amber-800 font-semibold">{submissionResult.status === "offline_queued" ? "Pending Auto-Sync" : "🟡 LISTED"}</span></div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803d] text-white font-bold text-xs shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
