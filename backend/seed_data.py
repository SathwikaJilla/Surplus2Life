import json
import uuid
from datetime import datetime, timedelta
from database import get_db, init_db

def seed_database():
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    # Clear existing data for fresh seed
    tables = [
        "users", "donations", "claims", "volunteer_tasks", "food_passports",
        "recovery_batches", "recovery_items", "recovery_partners", "credits",
        "streaks", "rewards", "reward_redemptions", "trees", "notifications",
        "audit_logs", "reward_config"
    ]
    for table in tables:
        cursor.execute(f"DELETE FROM {table}")

    now = datetime.now()
    now_str = now.isoformat()

    # 1. USERS (Clean fictional role-based demo personas)
    # 1. USERS - Only the 5 official demo role accounts needed for dashboard switching
    users = [
        # 1. Admin
        {
            "id": "admin-1",
            "email": "admin@surplus2life.org",
            "name": "Surplus2Life Admin",
            "role": "admin",
            "org_name": "Surplus2Life Central Office",
            "phone": "+91 98410 11223",
            "address": "Eco Governance Center, Guindy, Chennai",
            "latitude": 13.0102,
            "longitude": 80.2157,
            "verified": 1,
            "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80"
        },
        # 2. Donor
        {
            "id": "donor-1",
            "email": "donor@surplus2life.org",
            "name": "Surplus Food Donor",
            "role": "donor",
            "org_name": "Hotel & Restaurant Network",
            "phone": "+91 98401 22334",
            "address": "Hospitality Hub, T. Nagar, Chennai",
            "latitude": 13.0418,
            "longitude": 80.2341,
            "verified": 1,
            "avatar_url": "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=200&q=80"
        },
        # 3. Recipient
        {
            "id": "recip-1",
            "email": "recipient@surplus2life.org",
            "name": "Verified Community Recipient",
            "role": "recipient",
            "org_name": "Community Food Network",
            "phone": "+91 98404 55667",
            "address": "Community Care Center, Chetpet, Chennai",
            "latitude": 13.0694,
            "longitude": 80.2376,
            "verified": 1,
            "avatar_url": "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=200&q=80"
        },
        # 4. Volunteer
        {
            "id": "vol-1",
            "email": "volunteer@surplus2life.org",
            "name": "Surplus2Life Volunteer",
            "role": "volunteer",
            "org_name": "Surplus2Life Volunteer Network",
            "phone": "+91 98406 77889",
            "address": "Dispatch Depot, Nungambakkam, Chennai",
            "latitude": 13.0600,
            "longitude": 80.2400,
            "verified": 1,
            "avatar_url": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80"
        },
        # 5. Recovery Partner
        {
            "id": "recov-1",
            "email": "recovery@surplus2life.org",
            "name": "Verified Recovery Partner",
            "role": "recovery_partner",
            "org_name": "Circular Recovery Network",
            "phone": "+91 98408 99001",
            "address": "Bio-Energy Processing Plant, Ambattur",
            "latitude": 13.1143,
            "longitude": 80.1548,
            "verified": 1,
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
        }
    ]

    for u in users:
        cursor.execute("""
        INSERT INTO users (id, email, name, role, org_name, phone, address, latitude, longitude, verified, avatar_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (u["id"], u["email"], u["name"], u["role"], u["org_name"], u["phone"], u["address"], u["latitude"], u["longitude"], u["verified"], u["avatar_url"], now_str))

    # 2. RECOVERY PARTNERS DETAILS
    recovery_partners = [
        {
            "id": "rp-1",
            "user_id": "recov-1",
            "facility_name": "Circular Recovery Network — Biogas Plant",
            "pathway": "Anaerobic Digestion / Biogas",
            "min_quantity": 400.0,
            "accepted_waste_types": json.dumps(["Organic Food Waste", "Cooked Meals", "Vegetable Scraps"]),
            "processing_capacity": 5000.0,
            "collection_radius_km": 25.0,
            "pickup_available": 1,
            "verified": 1,
            "latitude": 13.1143,
            "longitude": 80.1548
        }
    ]
    for rp in recovery_partners:
        cursor.execute("""
        INSERT INTO recovery_partners (id, user_id, facility_name, pathway, min_quantity, accepted_waste_types, processing_capacity, collection_radius_km, pickup_available, verified, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (rp["id"], rp["user_id"], rp["facility_name"], rp["pathway"], rp["min_quantity"], rp["accepted_waste_types"], rp["processing_capacity"], rp["collection_radius_km"], rp["pickup_available"], rp["verified"], rp["latitude"], rp["longitude"]))

    # 3. DONATIONS - Starts completely clean with zero mock food donations
    donations = []

    # 4. CLAIMS - Starts clean
    claims = []

    # 5. VOLUNTEER TASKS - Starts clean
    volunteer_tasks = []

    # 6. FOOD PASSPORTS - Starts clean
    passports = []

    # 7. RECOVERY BATCHES - Starts clean
    recovery_batches = []
    recovery_items = []

    # 8. IMPACT CREDITS & STREAKS
    cursor.execute("""
    INSERT INTO credits (id, user_id, source_type, source_id, credits, verification_status, notes, created_at)
    VALUES (?, ?, 'welcome_bonus', 'welcome-donor1', 200, 'VERIFIED', 'Verified Platform Partner Credit Balance', ?)
    """, ("cred-d1", "donor-1", (now - timedelta(days=1)).isoformat()))

    cursor.execute("""
    INSERT INTO credits (id, user_id, source_type, source_id, credits, verification_status, notes, created_at)
    VALUES (?, ?, 'welcome_bonus', 'welcome-vol1', 50, 'VERIFIED', 'Surplus2Life Volunteer Welcome Bonus', ?)
    """, ("cred-v1", "vol-1", (now - timedelta(days=1)).isoformat()))

    cursor.execute("""
    INSERT INTO credits (id, user_id, source_type, source_id, credits, verification_status, notes, created_at)
    VALUES (?, ?, 'streak_bonus', 'streak-4w', 150, 'VERIFIED', '4-Week rescue streak bonus!', ?)
    """, ("cred-v2", "vol-1", (now - timedelta(days=3)).isoformat()))

    # Streaks
    streaks = [
        {"id": "strk-1", "user_id": "donor-1", "current_streak_weeks": 4, "longest_streak_weeks": 6, "last_active_week": 40, "streak_freezes_remaining": 1, "last_freeze_used_date": None, "updated_at": now_str},
        {"id": "strk-3", "user_id": "vol-1", "current_streak_weeks": 5, "longest_streak_weeks": 8, "last_active_week": 40, "streak_freezes_remaining": 1, "last_freeze_used_date": None, "updated_at": now_str},
    ]
    for s in streaks:
        cursor.execute("""
        INSERT INTO streaks (id, user_id, current_streak_weeks, longest_streak_weeks, last_active_week, streak_freezes_remaining, last_freeze_used_date, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (s["id"], s["user_id"], s["current_streak_weeks"], s["longest_streak_weeks"], s["last_active_week"], s["streak_freezes_remaining"], s["last_freeze_used_date"], s["updated_at"]))

    # 9. PRACTICAL REWARDS CATALOG
    rewards = [
        {
            "id": "rew-1",
            "title": "☕ Café Coffee Day - Brewed Coffee",
            "category": "Food & Beverage",
            "credits_cost": 100,
            "partner_name": "Café Coffee Day",
            "coupon_code_pattern": "S2L-CCD-",
            "description": "Free artisanal cappuccino or filter brew at any CCD partner outlet.",
            "icon": "Coffee"
        },
        {
            "id": "rew-2",
            "title": "🍔 Subway Fresh Sub - ₹150 Off",
            "category": "Dining",
            "credits_cost": 200,
            "partner_name": "Subway India",
            "coupon_code_pattern": "S2L-SUB-",
            "description": "Instant ₹150 off on 6-inch or footlong subs at partner stores.",
            "icon": "UtensilsCrossed"
        },
        {
            "id": "rew-3",
            "title": "🎬 PVR Inox Movie Ticket - 50% Off",
            "category": "Entertainment",
            "credits_cost": 300,
            "partner_name": "PVR Inox Cinemas",
            "coupon_code_pattern": "S2L-PVR-",
            "description": "50% off up to ₹200 on any weekday movie ticket booking.",
            "icon": "Film"
        },
        {
            "id": "rew-4",
            "title": "🛒 BigBasket Fresh Groceries - ₹250 Off",
            "category": "Shopping",
            "credits_cost": 400,
            "partner_name": "BigBasket",
            "coupon_code_pattern": "S2L-BB-",
            "description": "Flat ₹250 voucher on organic fresh produce basket.",
            "icon": "ShoppingBag"
        },
        {
            "id": "rew-5",
            "title": "⚡ EV Fast Charging / Fastag Pass - ₹300",
            "category": "Transport",
            "credits_cost": 500,
            "partner_name": "Ather Grid & ChargeZone",
            "coupon_code_pattern": "S2L-EV-",
            "description": "Free electric vehicle charging or highway green corridor toll rebate.",
            "icon": "Zap"
        },
        {
            "id": "rew-6",
            "title": "📱 Mobile 5G Data Pack Recharge (5 GB)",
            "category": "Connectivity",
            "credits_cost": 150,
            "partner_name": "Jio / Airtel / Vi",
            "coupon_code_pattern": "S2L-DATA-",
            "description": "Direct 5GB high-speed 5G mobile data pack recharge coupon.",
            "icon": "Smartphone"
        }
    ]
    for r in rewards:
        cursor.execute("""
        INSERT INTO rewards (id, title, category, credits_cost, partner_name, coupon_code_pattern, description, icon, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (r["id"], r["title"], r["category"], r["credits_cost"], r["partner_name"], r["coupon_code_pattern"], r["description"], r["icon"]))

    # Seed one existing redemption for volunteer
    cursor.execute("""
    INSERT INTO reward_redemptions (id, user_id, reward_id, credits_spent, coupon_code, status, redeemed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("red-1", "vol-1", "rew-1", 100, "S2L-CCD-9481B", "ACTIVE", (now - timedelta(days=2)).isoformat()))

    # 10. TREES PLANTED (Verified Tree Impact Cards)
    trees = [
        {
            "id": "tree-1",
            "user_id": "donor-1",
            "trigger_type": "Verified Surplus Food Rescue",
            "trigger_quantity": 100.0,
            "location_name": "Guindy Forest Reserve Green Corridor, Chennai",
            "species": "Neem (Azadirachta indica)",
            "photo_url": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80",
            "planting_date": (now - timedelta(days=1)).strftime("%b %d, %Y"),
            "verification_status": "VERIFIED_PARTNER",
            "planting_partner_name": "Cauvery Calling & Tamil Nadu Forest Dept",
            "latitude": 13.0067,
            "longitude": 80.2206,
            "growth_update_text": "Sapling planted with organic compost; geotagged and protected with bamboo tree-guard."
        },
        {
            "id": "tree-2",
            "user_id": "donor-1",
            "trigger_type": "100 Verified Meals Rescued",
            "trigger_quantity": 100.0,
            "location_name": "Adyar Estuary Ecological Restoration Zone, Chennai",
            "species": "Peepal (Ficus religiosa)",
            "photo_url": "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80",
            "planting_date": (now - timedelta(days=14)).strftime("%b %d, %Y"),
            "verification_status": "VERIFIED_PARTNER",
            "planting_partner_name": "Chennai Rivers Restoration Trust (CRRT)",
            "latitude": 13.0133,
            "longitude": 80.2612,
            "growth_update_text": "Healthy root establishment observed. First auxiliary branch leaves sprouted."
        }
    ]
    for t in trees:
        cursor.execute("""
        INSERT INTO trees (id, user_id, trigger_type, trigger_quantity, location_name, species, photo_url, planting_date, verification_status, planting_partner_name, latitude, longitude, growth_update_text, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (t["id"], t["user_id"], t["trigger_type"], t["trigger_quantity"], t["location_name"], t["species"], t["photo_url"], t["planting_date"], t["verification_status"], t["planting_partner_name"], t["latitude"], t["longitude"], t["growth_update_text"], now_str))

    # 11. NOTIFICATIONS
    notifications = [
        {"id": "notif-1", "user_id": "donor-1", "title": "🎉 Welcome to Surplus2Life", "message": "Connect with verified community shelters and prevent food waste.", "type": "SUCCESS", "link": "/forest"},
        {"id": "notif-3", "user_id": "vol-1", "title": "🔥 Rescue Streak Active", "message": "Maintain your weekly rescue streak to earn platform recognition!", "type": "REWARD", "link": "/rewards"},
    ]
    for n in notifications:
        cursor.execute("""
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        """, (n["id"], n["user_id"], n["title"], n["message"], n["type"], n["link"], now_str))

    # 12. REWARD CONFIG (Admin Configurable)
    configs = [
        ("credits_per_rescued_meal", 2.0, "Credits awarded per verified rescued meal"),
        ("credits_per_kg_waste_recovered", 5.0, "Credits awarded per kg verified organic waste recovered"),
        ("credits_per_volunteer_pickup", 10.0, "Credits awarded per verified volunteer rescue delivery"),
        ("credits_per_litre_oil_recovered", 8.0, "Credits awarded per litre used cooking oil recovered"),
        ("streak_bonus_2w", 50.0, "Bonus credits for 2 consecutive active weeks"),
        ("streak_bonus_4w", 150.0, "Bonus credits for 4 consecutive active weeks"),
        ("streak_bonus_8w", 400.0, "Bonus credits for 8 consecutive active weeks"),
        ("meals_per_tree_planted", 100.0, "Number of verified meals required to trigger 1 real tree planting"),
        ("kg_waste_per_tree_planted", 50.0, "Kg of verified waste diverted to trigger 1 real tree planting")
    ]
    for c in configs:
        cursor.execute("""
        INSERT INTO reward_config (config_key, config_val, description)
        VALUES (?, ?, ?)
        """, (c[0], c[1], c[2]))

    conn.commit()
    conn.close()
    print("Database reseeded with Surplus2Life fictional role personas successfully!")

if __name__ == "__main__":
    seed_database()
