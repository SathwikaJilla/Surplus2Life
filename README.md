# 🌱 FoodLoop: Two-Stage Food Rescue & Circular Recovery Platform

> **Rescue Food First. Recover What Remains. Waste Nothing.**

FoodLoop is a connectivity-resilient, AI-assisted digital coordination platform that connects surplus-food donors with verified recipients, mobilizes volunteers, and routes unrescuable organic waste toward verified circular recovery pathways (biogas, composting, and authorized used-cooking-oil biodiesel). Verified real-world impact is converted into practical rewards (café, dining, movie, and EV charging vouchers), weekly streaks, and real trees planted through certified afforestation partners.

---

## 🌟 Key Highlights & Architectural Features

### 1. Two-Stage Recovery Model
1. **Stage 1 — Food Rescue First**: Prioritizes safe redistribution of wholesome surplus food from hotels, restaurants, colleges, function halls, and caterers to verified shelters and NGOs.
2. **Stage 2 — Circular Recovery Fallback**: If surplus food cannot be safely redistributed within its freshness window or consists of non-edible scraps, it is assessed and aggregated at the **FoodLoop Regional Recovery Hub** and routed to verified facilities:
   - **Cooked Food Waste / Banquet Surplus** → *Anaerobic Digestion / Biogas*
   - **Fruit & Vegetable Trimmings / Peels** → *Community & Aerobic Composting*
   - **Used Cooking Oil (UCO)** → *Authorized Biodiesel Synthesis*

### 2. Connectivity Resilience (3 Donating Paths)
- **Path 1 (Full App)**: Fast 4-input donation listing with AI computer vision recognition and live auto-matching.
- **Path 2 (Offline-First Mode)**: Local queue with unique offline ID (`OFFLINE-FL-xxxx`), automatic background synchronization, and exponential backoff retry when connectivity is restored.
- **Path 3 (SMS Fallback Gateway)**: Direct SMS support for donors without smartphones or internet access. An integrated NLP entity extractor extracts food name, quantity, preparation time, and location from natural language text (e.g., `"200 plates rice curry 1pm Anna Nagar"`), auto-creates the listing, and sends an SMS confirmation.

### 3. AI Assistance & Rescue Priority
- **AI Food Recognition**: Classifies uploaded food photos, determines category, recommends storage windows, and suggests circular fallback pathways. Transparent and fully editable by the donor with `[YES]` and `[EDIT]` controls.
- **Food Rescue Priority**: Freshness risk estimator (🟢 NORMAL, 🟠 HIGH PRIORITY, 🔴 URGENT) calculated from food category and elapsed preparation time.
- **Smart Recipient & Volunteer Matching**: Transparent scoring based on distance proximity, quantity absorption, urgency, and verification status.

### 4. Split Claims Support
Never marks a donation as fully claimed when only part of it is taken. If a donor lists 60 meals and a shelter claims 25, the remaining 35 meals stay active and are automatically re-matched to other nearby recipients.

### 5. Food Passport (Chain of Custody)
Every donation receives a unique FoodLoop ID (`FL-1024`) with an immutable chronological audit trail:
`🟡 Listed` → `🔵 Recipient Matched` → `🟣 Claimed` → `🚚 Pickup in Progress` → `🟢 Delivered` → `❤️ Successfully Rescued` (or `♻️ Circular Recovery`).

### 6. Verified Impact Engine & Practical Rewards
- **Anti-Abuse Verification**: Credits and tree planting triggers are **only awarded after physical verification** (volunteer handover photo proof + recipient confirmation or certified weighbridge slip).
- **Weekly Streaks**: Weekly active streaks with milestone bonuses at 2, 4, 8 weeks, plus 1 monthly streak freeze.
- **Practical Rewards Store**: Instant coupon code generation for real vouchers (Café Coffee Day, Subway, PVR Cinemas, BigBasket, EV charging passes, 5G mobile data packs).
- **My Forest & Community Forest**: 100 verified rescued meals or 50 kg recovered waste = 1 real tree planted with geotagged coordinates, species, and growth updates.
- **Historical Density Heatmap**: Interactive Leaflet OpenStreetMap with CartoDB Dark Matter styling visualizing high, medium, and low surplus density hotspots.

---

## 👥 Five Role-Based Dashboards

1. **🏨 Donor** (*Grand Palace Hotel, SRM Mess, Spice Symphony*): Create quick 4-input donations, review AI tags, track Food Passports, view credits, weekly streaks, and trees planted.
2. **❤️ Recipient** (*Annai Teresa Shelter, Hope Foundation*): Filter surplus by category/urgency, claim full or split quantities, track volunteer pickup, and confirm receipt.
3. **🚴 Volunteer** (*Vikram Kumar, Ananya Rao*): Browse rescue tasks, accept dispatches, mark pickup, upload handover proof photos, and earn volunteer credits.
4. **🏭 Recovery Partner** (*EcoGas Bio-Energy, CleanFuel India UCO*): Inspect aggregated small-lot batches, accept batches meeting minimum facility thresholds (e.g., 400 kg), and log certified weighbridge weights.
5. **🛡️ Admin** (*FoodLoop Central*): Verify organizations and volunteers, configure credit and tree reward formulas, and inspect the platform audit trail.

---

## 🚀 Quickstart Guide

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### 1. Backend Setup (FastAPI)
```bash
cd backend
python -m pip install fastapi uvicorn pydantic python-multipart
python seed_data.py
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
Backend API will run at `http://127.0.0.1:8000`. Swagger documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup (React + Vite + Tailwind CSS)
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
Frontend web application will run at `http://127.0.0.1:5173`.

### 3. Automated End-to-End Verification Test Suite
Run the test suite from the root folder:
```bash
python test_platform.py
```

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Leaflet OpenStreetMap (CartoDB Dark Matter), Canvas Confetti
- **Backend**: Python 3, FastAPI, Uvicorn, SQLite relational database (PostgreSQL-compatible schema)
- **AI/NLP**: Heuristic computer vision classification, NLP regex entity extractor for SMS fallback, rule-based freshness priority calculation
- **Resilience**: Client-side offline queue with exponential backoff auto-sync worker, network latency simulation mode, interactive SMS phone terminal
