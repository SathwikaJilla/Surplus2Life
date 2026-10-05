import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database import get_db, init_db
from ai_engine import (
    classify_food_image,
    calculate_rescue_priority,
    score_recipient_match,
    parse_sms_donation,
    assess_recovery_pathway
)

app = FastAPI(
    title="FoodLoop API",
    description="Backend API for FoodLoop: Two-stage food rescue and circular recovery platform.",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads folder exists
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

@app.on_event("startup")
def on_startup():
    init_db()

# --- PYDANTIC SCHEMAS ---

class CreateDonationRequest(BaseModel):
    donor_id: str
    food_category: str
    title: str
    description: Optional[str] = ""
    photo_url: Optional[str] = ""
    quantity: float
    unit: str = "meals"
    preparation_time: str
    location_name: str
    latitude: float = 13.0827
    longitude: float = 80.2707
    offline_local_id: Optional[str] = None
    is_offline_synced: Optional[int] = 0
    ai_detected_item: Optional[str] = None

class ClaimDonationRequest(BaseModel):
    recipient_id: str
    quantity: float

class AssignVolunteerRequest(BaseModel):
    volunteer_id: str

class ProofDeliveryRequest(BaseModel):
    proof_photo_url: Optional[str] = None
    notes: Optional[str] = ""

class RedeemRewardRequest(BaseModel):
    user_id: str
    reward_id: str

class InboundSMSRequest(BaseModel):
    from_phone: str
    body: str

class UpdateRewardConfigRequest(BaseModel):
    configs: dict

# --- HELPER FUNCTIONS ---

def add_audit_log(cursor, user_id, action, entity_type, entity_id, details):
    log_id = f"log-{uuid.uuid4().hex[:8]}"
    cursor.execute("""
    INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (log_id, user_id, action, entity_type, entity_id, json.dumps(details) if isinstance(details, dict) else str(details), datetime.now().isoformat()))

def append_passport_event(cursor, donation_id: str, stage: str, actor: str, note: str):
    cursor.execute("SELECT timeline_events FROM food_passports WHERE donation_id = ?", (donation_id,))
    row = cursor.fetchone()
    now_formatted = datetime.now().strftime("%I:%M %p")
    event = {
        "stage": stage,
        "timestamp": now_formatted,
        "actor": actor,
        "note": note
    }
    if row:
        events = json.loads(row["timeline_events"])
        events.append(event)
        cursor.execute("""
        UPDATE food_passports SET current_stage = ?, timeline_events = ? WHERE donation_id = ?
        """, (stage, json.dumps(events), donation_id))
    else:
        passport_id = f"fp-{uuid.uuid4().hex[:8]}"
        cursor.execute("""
        INSERT INTO food_passports (id, donation_id, current_stage, timeline_events, created_at)
        VALUES (?, ?, ?, ?, ?)
        """, (passport_id, donation_id, stage, json.dumps([event]), datetime.now().isoformat()))

def award_verified_impact(cursor, user_id: str, action_type: str, quantity: float, reference_id: str, donor_id: str = None):
    """
    Core Verified Impact Engine.
    Awards credits and tree planting triggers strictly upon verified delivery or recovery.
    """
    now_str = datetime.now().isoformat()
    credits_awarded = 0

    # Fetch reward rates
    cursor.execute("SELECT config_key, config_val FROM reward_config")
    config_dict = {row["config_key"]: row["config_val"] for row in cursor.fetchall()}

    if action_type == "meal_rescued":
        rate = config_dict.get("credits_per_rescued_meal", 2.0)
        credits_awarded = int(quantity * rate)
        cursor.execute("""
        INSERT INTO credits (id, user_id, source_type, source_id, credits, verification_status, notes, created_at)
        VALUES (?, ?, 'meal_rescued', ?, ?, 'VERIFIED', ?, ?)
        """, (f"cred-{uuid.uuid4().hex[:8]}", user_id, reference_id, credits_awarded, f"{int(quantity)} meals verified rescued", now_str))

        # Check tree planting eligibility (Every 100 verified meals)
        cursor.execute("SELECT SUM(quantity) as total_meals FROM donations WHERE donor_id = ? AND status = 'VERIFIED_RESCUE'", (user_id,))
        t_row = cursor.fetchone()
        total_rescued = t_row["total_meals"] or 0
        trees_deserved = int(total_rescued // config_dict.get("meals_per_tree_planted", 100.0))

        cursor.execute("SELECT COUNT(*) as existing_trees FROM trees WHERE user_id = ? AND trigger_type LIKE '%Meal%'", (user_id,))
        existing_trees = cursor.fetchone()["existing_trees"] or 0

        if trees_deserved > existing_trees:
            # Plant a new tree!
            tree_id = f"tree-{uuid.uuid4().hex[:8]}"
            cursor.execute("""
            INSERT INTO trees (id, user_id, trigger_type, trigger_quantity, location_name, species, photo_url, planting_date, verification_status, planting_partner_name, latitude, longitude, growth_update_text, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tree_id,
                user_id,
                f"{int(config_dict.get('meals_per_tree_planted', 100.0))} Verified Meals Rescued ({reference_id})",
                quantity,
                "Adyar River Urban Green Corridor, Chennai",
                "Neem (Azadirachta indica)",
                "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80",
                datetime.now().strftime("%b %d, %Y"),
                "VERIFIED_PARTNER",
                "Tamil Nadu Agro-Forestry Foundation",
                13.0125,
                80.2450,
                "Sapling planted in high-nutrient bio-soil. Geotag verified.",
                now_str
            ))
            # Send notification
            cursor.execute("""
            INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
            VALUES (?, ?, '🌳 Real Tree Planted!', 'Congratulations! 100 verified meals rescued unlocked a real tree planted in your name in Adyar Corridor.', 'SUCCESS', 0, '/forest', ?)
            """, (f"notif-{uuid.uuid4().hex[:8]}", user_id, now_str))

    elif action_type == "waste_recovered":
        rate = config_dict.get("credits_per_kg_waste_recovered", 5.0)
        credits_awarded = int(quantity * rate)
        cursor.execute("""
        INSERT INTO credits (id, user_id, source_type, source_id, credits, verification_status, notes, created_at)
        VALUES (?, ?, 'waste_recovered', ?, ?, 'VERIFIED', ?, ?)
        """, (f"cred-{uuid.uuid4().hex[:8]}", user_id, reference_id, credits_awarded, f"{quantity} kg waste verified circular recovery", now_str))

        if donor_id:
            cursor.execute("""
            INSERT INTO credits (id, user_id, source_type, source_id, credits, verification_status, notes, created_at)
            VALUES (?, ?, 'waste_recovered', ?, ?, 'VERIFIED', ?, ?)
            """, (f"cred-{uuid.uuid4().hex[:8]}", donor_id, reference_id, int(credits_awarded * 0.5), f"Surplus diverted to circular recovery: {quantity} kg", now_str))

    elif action_type == "volunteer_pickup":
        rate = int(config_dict.get("credits_per_volunteer_pickup", 10.0))
        credits_awarded = rate
        cursor.execute("""
        INSERT INTO credits (id, user_id, source_type, source_id, credits, verification_status, notes, created_at)
        VALUES (?, ?, 'volunteer_pickup', ?, ?, 'VERIFIED', ?, ?)
        """, (f"cred-{uuid.uuid4().hex[:8]}", user_id, reference_id, credits_awarded, "Verified surplus pickup & delivery", now_str))

    # Update Weekly Streak
    cursor.execute("SELECT * FROM streaks WHERE user_id = ?", (user_id,))
    streak_row = cursor.fetchone()
    current_calendar_week = datetime.now().isocalendar()[1]
    
    if streak_row:
        last_week = streak_row["last_active_week"]
        curr_streak = streak_row["current_streak_weeks"]
        longest = streak_row["longest_streak_weeks"]

        if last_week == current_calendar_week:
            pass # already active this week
        elif last_week == current_calendar_week - 1:
            curr_streak += 1
            if curr_streak > longest:
                longest = curr_streak
            # Check milestone bonus
            if curr_streak == 2:
                bonus = int(config_dict.get("streak_bonus_2w", 50))
                cursor.execute("INSERT INTO credits (id, user_id, source_type, source_id, credits, verification_status, notes, created_at) VALUES (?, ?, 'streak_bonus', 'streak-2w', ?, 'VERIFIED', '2-Week streak bonus!', ?)", (f"cred-{uuid.uuid4().hex[:8]}", user_id, bonus, now_str))
            elif curr_streak == 4:
                bonus = int(config_dict.get("streak_bonus_4w", 150))
                cursor.execute("INSERT INTO credits (id, user_id, source_type, source_id, credits, verification_status, notes, created_at) VALUES (?, ?, 'streak_bonus', 'streak-4w', ?, 'VERIFIED', '4-Week streak bonus!', ?)", (f"cred-{uuid.uuid4().hex[:8]}", user_id, bonus, now_str))
        else:
            curr_streak = 1 # reset or streak broke

        cursor.execute("""
        UPDATE streaks SET current_streak_weeks = ?, longest_streak_weeks = ?, last_active_week = ?, updated_at = ?
        WHERE user_id = ?
        """, (curr_streak, longest, current_calendar_week, now_str, user_id))
    else:
        cursor.execute("""
        INSERT INTO streaks (id, user_id, current_streak_weeks, longest_streak_weeks, last_active_week, streak_freezes_remaining, updated_at)
        VALUES (?, ?, 1, 1, ?, 1, ?)
        """, (f"strk-{uuid.uuid4().hex[:8]}", user_id, current_calendar_week, now_str))

    return credits_awarded


# --- USER & ROLE ENDPOINTS ---

@app.get("/api/users")
def get_users():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users ORDER BY role, name")
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"users": users}

@app.get("/api/users/{user_id}")
def get_user_profile(user_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    user_dict = dict(user)

    # Calculate current credits
    cursor.execute("SELECT SUM(credits) as total_earned FROM credits WHERE user_id = ? AND verification_status = 'VERIFIED'", (user_id,))
    total_earned = cursor.fetchone()["total_earned"] or 0

    cursor.execute("SELECT SUM(credits_spent) as total_spent FROM reward_redemptions WHERE user_id = ?", (user_id,))
    total_spent = cursor.fetchone()["total_spent"] or 0
    user_dict["credits_balance"] = max(0, total_earned - total_spent)
    user_dict["total_credits_earned"] = total_earned

    # Fetch streak info
    cursor.execute("SELECT * FROM streaks WHERE user_id = ?", (user_id,))
    streak = cursor.fetchone()
    user_dict["streak"] = dict(streak) if streak else {"current_streak_weeks": 0, "longest_streak_weeks": 0, "streak_freezes_remaining": 1}

    # Fetch user trees
    cursor.execute("SELECT COUNT(*) as tree_count FROM trees WHERE user_id = ?", (user_id,))
    user_dict["trees_planted"] = cursor.fetchone()["tree_count"] or 0

    conn.close()
    return {"user": user_dict}


# --- AI FOOD RECOGNITION & ESTIMATION ---

@app.post("/api/donations/ai-analyze")
def ai_analyze_donation(
    photo_hint: Optional[str] = Form("rice curry"),
    category_hint: Optional[str] = Form(None),
    prep_time: Optional[str] = Form("12:00 PM")
):
    analysis = classify_food_image(photo_hint, category_hint)
    priority_res = calculate_rescue_priority(analysis["category"], prep_time)
    analysis["priority_analysis"] = priority_res
    return {
        "status": "success",
        "ai_result": analysis
    }


# --- DONATIONS ENDPOINTS ---

@app.get("/api/donations")
def list_donations(
    status: Optional[str] = None,
    category: Optional[str] = None,
    donor_id: Optional[str] = None
):
    conn = get_db()
    cursor = conn.cursor()
    query = """
    SELECT d.*, u.name as donor_name, u.org_name as donor_org, u.phone as donor_phone
    FROM donations d
    JOIN users u ON d.donor_id = u.id
    WHERE 1=1
    """
    params = []
    if status:
        query += " AND d.status = ?"
        params.append(status)
    if category:
        query += " AND d.food_category = ?"
        params.append(category)
    if donor_id:
        query += " AND d.donor_id = ?"
        params.append(donor_id)

    query += " ORDER BY d.created_at DESC"
    cursor.execute(query, params)
    donations = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"donations": donations}

@app.get("/api/donations/{donation_id}")
def get_donation_detail(donation_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT d.*, u.name as donor_name, u.org_name as donor_org, u.phone as donor_phone
    FROM donations d
    JOIN users u ON d.donor_id = u.id
    WHERE d.id = ?
    """, (donation_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Donation not found")
    donation = dict(row)

    # Recalculate priority freshness
    donation["current_priority"] = calculate_rescue_priority(donation["food_category"], donation["preparation_time"])

    # Find candidate verified recipients and calculate transparent match scores
    cursor.execute("SELECT * FROM users WHERE role = 'recipient' AND verified = 1")
    recipients = [dict(r) for r in cursor.fetchall()]
    match_list = []
    for r in recipients:
        # Simplified Haversine / Euclidean distance approximation in km
        lat_diff = (r["latitude"] - donation["latitude"]) * 111.0
        lon_diff = (r["longitude"] - donation["longitude"]) * 111.0 * 0.98
        dist_km = max(0.4, (lat_diff**2 + lon_diff**2)**0.5)
        scoring = score_recipient_match(donation, r, dist_km)
        match_list.append({
            "recipient": r,
            "distance_km": round(dist_km, 1),
            "match_score": scoring["match_score"],
            "breakdown": scoring["breakdown"],
            "is_recommended": scoring["is_recommended"]
        })
    match_list.sort(key=lambda x: x["match_score"], reverse=True)
    donation["matched_recipients"] = match_list

    # Fetch associated claims if any
    cursor.execute("""
    SELECT c.*, u.name as recipient_name, u.org_name as recipient_org
    FROM claims c
    JOIN users u ON c.recipient_id = u.id
    WHERE c.donation_id = ?
    """, (donation_id,))
    donation["claims"] = [dict(c) for c in cursor.fetchall()]

    conn.close()
    return {"donation": donation}

@app.post("/api/donations")
def create_donation(payload: CreateDonationRequest):
    conn = get_db()
    cursor = conn.cursor()

    # Generate sequential FoodLoop ID starting at FL-1001
    cursor.execute("SELECT COUNT(*) as count FROM donations")
    count = cursor.fetchone()["count"]
    donation_id = f"FL-{1001 + count}"

    # AI assistance analysis
    ai_info = classify_food_image(payload.photo_url or payload.title, payload.food_category)
    priority_calc = calculate_rescue_priority(payload.food_category, payload.preparation_time)

    now_str = datetime.now().isoformat()
    detected_title = payload.title if len(payload.title) > 2 else ai_info["detected_item"]

    cursor.execute("""
    INSERT INTO donations (
        id, donor_id, food_category, title, description, photo_url, quantity, unit,
        preparation_time, freshness_hours, priority, location_name, latitude, longitude,
        status, claim_quantity_remaining, ai_detected_item, ai_confidence, ai_tags,
        is_offline_synced, offline_local_id, recovery_pathway, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'LISTED', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        donation_id,
        payload.donor_id,
        payload.food_category,
        detected_title,
        payload.description,
        payload.photo_url or "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80",
        payload.quantity,
        payload.unit,
        payload.preparation_time,
        ai_info.get("freshness_window_hours", 4.0),
        priority_calc["priority"],
        payload.location_name,
        payload.latitude,
        payload.longitude,
        payload.quantity,
        ai_info["detected_item"],
        ai_info["confidence"],
        json.dumps(ai_info.get("tags", [])),
        payload.is_offline_synced or 0,
        payload.offline_local_id,
        ai_info.get("recovery_pathway", "Anaerobic Digestion / Biogas"),
        now_str,
        now_str
    ))

    # Initialize Food Passport
    passport_id = f"fp-{uuid.uuid4().hex[:8]}"
    initial_event = {
        "stage": "🟡 Listed",
        "timestamp": datetime.now().strftime("%I:%M %p"),
        "actor": payload.donor_id,
        "note": f"{payload.quantity} {payload.unit} listed. AI Priority: {priority_calc['priority']}. Waiting for verified recipient claim."
    }
    cursor.execute("""
    INSERT INTO food_passports (id, donation_id, current_stage, timeline_events, created_at)
    VALUES (?, ?, 'LISTED', ?, ?)
    """, (passport_id, donation_id, json.dumps([initial_event]), now_str))

    add_audit_log(cursor, payload.donor_id, "CREATE_DONATION", "donation", donation_id, {"quantity": payload.quantity, "priority": priority_calc["priority"]})

    conn.commit()
    cursor.execute("""
    SELECT d.*, u.name as donor_name, u.org_name as donor_org, u.phone as donor_phone
    FROM donations d
    JOIN users u ON d.donor_id = u.id
    WHERE d.id = ?
    """, (donation_id,))
    row = cursor.fetchone()
    new_donation = dict(row) if row else None
    conn.close()

    return {
        "status": "success",
        "donation_id": donation_id,
        "message": f"Donation {donation_id} created successfully. Recipients are being matched.",
        "donation": new_donation,
        "ai_analysis": ai_info,
        "priority": priority_calc
    }


# --- SPLIT CLAIM & MATCHING ---

@app.post("/api/donations/{donation_id}/claim")
def claim_donation(donation_id: str, payload: ClaimDonationRequest):
    """
    Handles Full or Partial (Split) Claims.
    If only part is claimed:
    - Creates claim for partial amount
    - Updates donation remaining quantity
    - Donation status becomes 'PARTIALLY_CLAIMED' so remainder is immediately available for others!
    - Creates volunteer delivery task
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM donations WHERE id = ?", (donation_id,))
    donation = cursor.fetchone()
    if not donation:
        conn.close()
        raise HTTPException(status_code=404, detail="Donation not found")

    remaining = donation["claim_quantity_remaining"]
    if payload.quantity > remaining:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Cannot claim {payload.quantity}. Only {remaining} {donation['unit']} remaining.")

    now_str = datetime.now().isoformat()
    claim_id = f"claim-{uuid.uuid4().hex[:8]}"

    # Insert claim record
    cursor.execute("""
    INSERT INTO claims (id, donation_id, recipient_id, quantity_claimed, status, created_at)
    VALUES (?, ?, ?, ?, 'CLAIMED', ?)
    """, (claim_id, donation_id, payload.recipient_id, payload.quantity, now_str))

    new_remaining = remaining - payload.quantity
    new_status = "FULLY_CLAIMED" if new_remaining <= 0 else "PARTIALLY_CLAIMED"

    cursor.execute("""
    UPDATE donations
    SET claim_quantity_remaining = ?, status = ?, updated_at = ?
    WHERE id = ?
    """, (new_remaining, new_status, now_str, donation_id))

    # Fetch recipient details
    cursor.execute("SELECT name, org_name, address FROM users WHERE id = ?", (payload.recipient_id,))
    recip = cursor.fetchone()
    recip_org = recip["org_name"] if recip else "Verified Shelter"

    # Create Volunteer Task
    task_id = f"task-{uuid.uuid4().hex[:8]}"
    cursor.execute("""
    INSERT INTO volunteer_tasks (id, donation_id, claim_id, volunteer_id, status, pickup_location, delivery_location, created_at)
    VALUES (?, ?, ?, NULL, 'OFFERED', ?, ?, ?)
    """, (task_id, donation_id, claim_id, donation["location_name"], recip["address"] if recip else "Recipient Location", now_str))

    # Append to passport
    passport_stage = "🟣 Fully Claimed" if new_status == "FULLY_CLAIMED" else f"🟣 Split Claimed ({payload.quantity} {donation['unit']})"
    note = f"{recip_org} claimed {payload.quantity} {donation['unit']}."
    if new_remaining > 0:
        note += f" Remaining {new_remaining} {donation['unit']} automatically re-listed for other nearby recipients."
    append_passport_event(cursor, donation_id, passport_stage, recip_org, note)

    # Notify Donor
    cursor.execute("""
    INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
    VALUES (?, ?, 'Donation Claimed!', ?, 'INFO', 0, ?, ?)
    """, (f"notif-{uuid.uuid4().hex[:8]}", donation["donor_id"], f"{recip_org} claimed {payload.quantity} {donation['unit']} of {donation['title']}.", f"/passports/{donation_id}", now_str))

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "claim_id": claim_id,
        "donation_id": donation_id,
        "quantity_claimed": payload.quantity,
        "quantity_remaining": new_remaining,
        "donation_status": new_status,
        "task_id": task_id
    }


# --- VOLUNTEER RESCUE TASKS ---

@app.get("/api/volunteers/tasks")
def list_volunteer_tasks(volunteer_id: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    query = """
    SELECT vt.*, d.title as food_title, d.quantity, d.unit, d.priority, d.photo_url,
           u_donor.name as donor_name, u_donor.phone as donor_phone,
           u_recip.name as recipient_name, u_recip.org_name as recipient_org, u_recip.phone as recipient_phone,
           c.quantity_claimed
    FROM volunteer_tasks vt
    JOIN donations d ON vt.donation_id = d.id
    JOIN users u_donor ON d.donor_id = u_donor.id
    LEFT JOIN claims c ON vt.claim_id = c.id
    LEFT JOIN users u_recip ON c.recipient_id = u_recip.id
    WHERE 1=1
    """
    params = []
    if volunteer_id:
        query += " AND (vt.volunteer_id = ? OR vt.status = 'OFFERED')"
        params.append(volunteer_id)

    query += " ORDER BY vt.created_at DESC"
    cursor.execute(query, params)
    tasks = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"tasks": tasks}

@app.post("/api/volunteers/tasks/{task_id}/accept")
def accept_task(task_id: str, payload: AssignVolunteerRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM volunteer_tasks WHERE id = ?", (task_id,))
    task = cursor.fetchone()
    if not task:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")

    cursor.execute("SELECT name FROM users WHERE id = ?", (payload.volunteer_id,))
    v_name = cursor.fetchone()["name"]

    cursor.execute("""
    UPDATE volunteer_tasks
    SET volunteer_id = ?, status = 'ACCEPTED'
    WHERE id = ?
    """, (payload.volunteer_id, task_id))

    append_passport_event(cursor, task["donation_id"], "🚴 Volunteer Matched", v_name, f"Volunteer {v_name} accepted the rescue dispatch task.")

    conn.commit()
    conn.close()
    return {"status": "success", "message": "Task accepted successfully."}

@app.post("/api/volunteers/tasks/{task_id}/pickup")
def mark_task_picked_up(task_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM volunteer_tasks WHERE id = ?", (task_id,))
    task = cursor.fetchone()
    if not task:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")

    now_str = datetime.now().isoformat()
    cursor.execute("""
    UPDATE volunteer_tasks
    SET status = 'PICKED_UP', pickup_time = ?
    WHERE id = ?
    """, (now_str, task_id))

    cursor.execute("""
    UPDATE donations
    SET status = 'PICKUP', updated_at = ?
    WHERE id = ?
    """, (now_str, task["donation_id"]))

    append_passport_event(cursor, task["donation_id"], "🚚 Pickup in Progress", "Volunteer", "Food safely loaded in transport carrier; en route to destination.")

    conn.commit()
    conn.close()
    return {"status": "success", "message": "Pickup logged."}

@app.post("/api/volunteers/tasks/{task_id}/deliver")
def mark_task_delivered(task_id: str, payload: ProofDeliveryRequest):
    """
    Volunteer logs delivery with photo proof.
    Moves status to DELIVERED awaiting recipient final confirmation.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM volunteer_tasks WHERE id = ?", (task_id,))
    task = cursor.fetchone()
    if not task:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")

    now_str = datetime.now().isoformat()
    proof_photo = payload.proof_photo_url or "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=80"

    cursor.execute("""
    UPDATE volunteer_tasks
    SET status = 'DELIVERED', delivery_time = ?, proof_photo_url = ?, verification_notes = ?
    WHERE id = ?
    """, (now_str, proof_photo, payload.notes or "Handed over at shelter gate.", task_id))

    cursor.execute("""
    UPDATE donations
    SET status = 'DELIVERED', updated_at = ?
    WHERE id = ?
    """, (now_str, task["donation_id"]))

    append_passport_event(cursor, task["donation_id"], "🟢 Delivered", "Volunteer", "Delivered at recipient premise. Proof photo uploaded. Awaiting recipient confirmation.")

    conn.commit()
    conn.close()
    return {"status": "success", "message": "Delivery logged with proof photo."}


# --- RECIPIENT RECEIPT & IMPACT VERIFICATION ---

@app.post("/api/claims/{claim_id}/confirm")
def confirm_claim_receipt(claim_id: str):
    """
    Recipient confirms receipt.
    TRIGGER: System marks rescue as VERIFIED.
    Only NOW are credits, streaks, and trees awarded!
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT c.*, d.donor_id, d.title, d.quantity, vt.volunteer_id, vt.id as task_id
    FROM claims c
    JOIN donations d ON c.donation_id = d.id
    LEFT JOIN volunteer_tasks vt ON c.id = vt.claim_id
    WHERE c.id = ?
    """, (claim_id,))
    claim = cursor.fetchone()
    if not claim:
        conn.close()
        raise HTTPException(status_code=404, detail="Claim not found")

    now_str = datetime.now().isoformat()

    # Update claim status
    cursor.execute("UPDATE claims SET status = 'CONFIRMED', confirmed_at = ? WHERE id = ?", (now_str, claim_id))
    cursor.execute("UPDATE donations SET status = 'VERIFIED_RESCUE', updated_at = ? WHERE id = ?", (now_str, claim["donation_id"]))

    if claim["task_id"]:
        cursor.execute("UPDATE volunteer_tasks SET status = 'VERIFIED' WHERE id = ?", (claim["task_id"],))

    # Append passport event
    append_passport_event(cursor, claim["donation_id"], "❤️ Successfully Rescued", "Verified Recipient", f"Receipt confirmed for {claim['quantity_claimed']} meals. Impact verified!")

    # Award Verified Impact Engine
    donor_credits = award_verified_impact(cursor, claim["donor_id"], "meal_rescued", claim["quantity_claimed"], claim["donation_id"])

    vol_credits = 0
    if claim["volunteer_id"]:
        vol_credits = award_verified_impact(cursor, claim["volunteer_id"], "volunteer_pickup", 1, claim["task_id"])

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "message": "Impact successfully verified! Credits awarded.",
        "donor_credits_awarded": donor_credits,
        "volunteer_credits_awarded": vol_credits
    }


# --- FOOD PASSPORT ---

@app.get("/api/passports/{donation_id}")
def get_food_passport(donation_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT fp.*, d.title, d.quantity, d.unit, d.food_category, d.priority, d.photo_url, d.status,
           u.name as donor_name, u.org_name as donor_org, d.location_name
    FROM food_passports fp
    JOIN donations d ON fp.donation_id = d.id
    JOIN users u ON d.donor_id = u.id
    WHERE fp.donation_id = ?
    """, (donation_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Passport not found for this donation.")

    res = dict(row)
    res["timeline"] = json.loads(res["timeline_events"])
    conn.close()
    return {"passport": res}


# --- RECOVERY ASSESSMENT & AGGREGATION HUB ---

@app.post("/api/donations/{donation_id}/route-to-recovery")
def route_to_recovery(donation_id: str):
    """
    If food cannot be safely redistributed (e.g. unclaimed beyond freshness window or non-edible scraps),
    assess waste and route toward appropriate circular pathway (Anaerobic digestion, composting, or biodiesel).
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM donations WHERE id = ?", (donation_id,))
    donation = cursor.fetchone()
    if not donation:
        conn.close()
        raise HTTPException(status_code=404, detail="Donation not found")

    assessment = assess_recovery_pathway(donation["food_category"])
    now_str = datetime.now().isoformat()

    cursor.execute("""
    UPDATE donations
    SET status = 'RECOVERY_BATCH', recovery_pathway = ?, updated_at = ?
    WHERE id = ?
    """, (assessment["pathway"], now_str, donation_id))

    # Add item to active aggregation batch for this pathway
    cursor.execute("""
    SELECT * FROM recovery_batches
    WHERE suggested_pathway = ? AND status IN ('COLLECTING', 'READY')
    LIMIT 1
    """, (assessment["pathway"],))
    batch = cursor.fetchone()

    qty_kg = float(donation["quantity"]) if donation["unit"] == "kg" else float(donation["quantity"]) * 0.4 # approx kg per meal

    if batch:
        batch_id = batch["id"]
        new_total = batch["total_quantity"] + qty_kg
        # Check if threshold met (e.g. >= 400kg)
        new_status = "READY" if new_total >= 400.0 else batch["status"]
        cursor.execute("UPDATE recovery_batches SET total_quantity = ?, status = ?, updated_at = ? WHERE id = ?", (new_total, new_status, now_str, batch_id))
    else:
        cursor.execute("SELECT COUNT(*) as cnt FROM recovery_batches")
        cnt = cursor.fetchone()["cnt"]
        batch_id = f"FL-RB-{1024 + cnt + 1}"
        new_status = "COLLECTING"
        cursor.execute("""
        INSERT INTO recovery_batches (id, waste_type, total_quantity, unit, suggested_pathway, status, hub_location, created_at, updated_at)
        VALUES (?, ?, ?, 'kg', ?, ?, 'FoodLoop Regional Aggregation Hub, Guindy', ?, ?)
        """, (batch_id, donation["food_category"], qty_kg, assessment["pathway"], new_status, now_str, now_str))

    # Insert recovery item
    cursor.execute("""
    INSERT INTO recovery_items (id, batch_id, source_donation_id, donor_name, quantity, waste_type, added_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (f"ri-{uuid.uuid4().hex[:8]}", batch_id, donation_id, donation["donor_id"], qty_kg, donation["food_category"], now_str))

    append_passport_event(cursor, donation_id, "♻️ Circular Recovery", "FoodLoop Eco-Hub", f"Transferred to Recovery Batch {batch_id} for {assessment['pathway']}.")

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "batch_id": batch_id,
        "pathway": assessment["pathway"],
        "environmental_benefit": assessment["environmental_benefit"],
        "message": f"Successfully routed to Recovery Batch {batch_id}."
    }

@app.get("/api/recovery/batches")
def list_recovery_batches(status: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    query = """
    SELECT rb.*, u.name as partner_name, u.org_name as partner_org, rp.facility_name, rp.min_quantity as partner_min_qty
    FROM recovery_batches rb
    LEFT JOIN users u ON rb.partner_id = u.id
    LEFT JOIN recovery_partners rp ON u.id = rp.user_id
    WHERE 1=1
    """
    params = []
    if status:
        query += " AND rb.status = ?"
        params.append(status)

    query += " ORDER BY rb.created_at DESC"
    cursor.execute(query, params)
    batches = [dict(row) for row in cursor.fetchall()]

    for b in batches:
        cursor.execute("SELECT * FROM recovery_items WHERE batch_id = ?", (b["id"],))
        b["items"] = [dict(i) for i in cursor.fetchall()]

    conn.close()
    return {"batches": batches}

@app.post("/api/recovery/batches/{batch_id}/accept")
def accept_recovery_batch(batch_id: str, partner_id: str = Query(...)):
    conn = get_db()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    scheduled = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d 11:00 AM")

    cursor.execute("""
    UPDATE recovery_batches
    SET partner_id = ?, status = 'ACCEPTED', scheduled_pickup_date = ?, updated_at = ?
    WHERE id = ?
    """, (partner_id, scheduled, now_str, batch_id))

    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Batch {batch_id} accepted for collection on {scheduled}."}

@app.post("/api/recovery/batches/{batch_id}/verify-weight")
def verify_batch_weight(batch_id: str, verified_weight: float = Query(...), notes: str = Query("")):
    """
    Recovery partner records actual verified weight from facility weighbridge.
    Triggers Recovery Credits & Tree impact!
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM recovery_batches WHERE id = ?", (batch_id,))
    batch = cursor.fetchone()
    if not batch:
        conn.close()
        raise HTTPException(status_code=404, detail="Batch not found")

    now_str = datetime.now().isoformat()
    cursor.execute("""
    UPDATE recovery_batches
    SET actual_verified_weight = ?, status = 'RECOVERY_COMPLETED', verification_notes = ?, updated_at = ?
    WHERE id = ?
    """, (verified_weight, notes or "Weighbridge gross tare certified.", now_str, batch_id))

    # Award recovery partner credits
    if batch["partner_id"]:
        award_verified_impact(cursor, batch["partner_id"], "waste_recovered", verified_weight, batch_id)

    # Award tree if weight >= 50 kg
    trees_count = int(verified_weight // 50.0)
    if trees_count > 0 and batch["partner_id"]:
        for _ in range(min(trees_count, 3)): # cap seed loop
            tree_id = f"tree-{uuid.uuid4().hex[:8]}"
            cursor.execute("""
            INSERT INTO trees (id, user_id, trigger_type, trigger_quantity, location_name, species, photo_url, planting_date, verification_status, planting_partner_name, latitude, longitude, growth_update_text, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tree_id,
                batch["partner_id"],
                f"Verified Recovery Batch ({batch_id})",
                verified_weight,
                "OMR Bio-Energy Agro-Forestry Corridor",
                "Indian Mahogany (Swietenia mahagoni)",
                "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80",
                datetime.now().strftime("%b %d, %Y"),
                "VERIFIED_PARTNER",
                "Green Earth Bio-Afforestation",
                12.8530,
                80.2274,
                "Soil enriched with organic digestate from this batch.",
                now_str
            ))

    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Verified {verified_weight} kg recovery completed. Impact credits & tree units logged."}

@app.get("/api/recovery/partners")
def list_recovery_partners():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT rp.*, u.name, u.email, u.phone, u.org_name, u.avatar_url
    FROM recovery_partners rp
    JOIN users u ON rp.user_id = u.id
    """)
    partners = [dict(row) for row in cursor.fetchall()]
    for p in partners:
        p["accepted_waste_types"] = json.loads(p["accepted_waste_types"])
    conn.close()
    return {"partners": partners}


# --- PRACTICAL REWARDS STORE ---

@app.get("/api/rewards")
def list_rewards():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rewards WHERE is_active = 1")
    rewards = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"rewards": rewards}

@app.post("/api/rewards/redeem")
def redeem_reward(payload: RedeemRewardRequest):
    conn = get_db()
    cursor = conn.cursor()

    # Check reward cost
    cursor.execute("SELECT * FROM rewards WHERE id = ?", (payload.reward_id,))
    reward = cursor.fetchone()
    if not reward:
        conn.close()
        raise HTTPException(status_code=404, detail="Reward not found")

    # Check user credits
    cursor.execute("SELECT SUM(credits) as earned FROM credits WHERE user_id = ? AND verification_status = 'VERIFIED'", (payload.user_id,))
    earned = cursor.fetchone()["earned"] or 0
    cursor.execute("SELECT SUM(credits_spent) as spent FROM reward_redemptions WHERE user_id = ?", (payload.user_id,))
    spent = cursor.fetchone()["spent"] or 0
    balance = earned - spent

    if balance < reward["credits_cost"]:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Insufficient credits. You have {balance} credits, but {reward['credits_cost']} are required.")

    # Generate real redeemable coupon code
    unique_suffix = uuid.uuid4().hex[:6].upper()
    coupon_code = f"{reward['coupon_code_pattern']}{unique_suffix}"
    redemption_id = f"red-{uuid.uuid4().hex[:8]}"
    now_str = datetime.now().isoformat()

    cursor.execute("""
    INSERT INTO reward_redemptions (id, user_id, reward_id, credits_spent, coupon_code, status, redeemed_at)
    VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)
    """, (redemption_id, payload.user_id, payload.reward_id, reward["credits_cost"], coupon_code, now_str))

    cursor.execute("""
    INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
    VALUES (?, ?, '🎁 Coupon Code Unlocked!', ?, 'REWARD', 0, '/rewards', ?)
    """, (f"notif-{uuid.uuid4().hex[:8]}", payload.user_id, f"Redeemed {reward['title']}. Your coupon code: {coupon_code}", now_str))

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "redemption_id": redemption_id,
        "coupon_code": coupon_code,
        "reward_title": reward["title"],
        "partner_name": reward["partner_name"],
        "new_balance": balance - reward["credits_cost"]
    }

@app.get("/api/rewards/my-redemptions/{user_id}")
def get_user_redemptions(user_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT rr.*, r.title, r.category, r.partner_name, r.description, r.icon
    FROM reward_redemptions rr
    JOIN rewards r ON rr.reward_id = r.id
    WHERE rr.user_id = ?
    ORDER BY rr.redeemed_at DESC
    """, (user_id,))
    redemptions = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"redemptions": redemptions}


# --- TREES & MY FOREST ---

@app.get("/api/trees/my-forest/{user_id}")
def get_my_forest(user_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM trees WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    trees = [dict(row) for row in cursor.fetchall()]

    # Fetch stats
    cursor.execute("SELECT SUM(quantity) as meals FROM donations WHERE donor_id = ? AND status = 'VERIFIED_RESCUE'", (user_id,))
    m_row = cursor.fetchone()
    meals_rescued = m_row["meals"] or 0

    cursor.execute("SELECT SUM(quantity) as waste FROM recovery_items WHERE donor_name = ?", (user_id,))
    w_row = cursor.fetchone()
    waste_recovered = w_row["waste"] or 0

    conn.close()
    return {
        "trees": trees,
        "tree_count": len(trees),
        "meals_rescued": meals_rescued,
        "waste_recovered_kg": waste_recovered
    }

@app.get("/api/trees/community")
def get_community_forest():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT t.*, u.name as planter_name, u.org_name
    FROM trees t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC
    """)
    trees = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"trees": trees, "total_community_trees": len(trees)}


# --- IMPACT & COMMUNITY DASHBOARD ---

@app.get("/api/impact/summary")
def get_impact_summary():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT SUM(quantity) as total_meals FROM donations WHERE status = 'VERIFIED_RESCUE'")
    meals_rescued = cursor.fetchone()["total_meals"] or 0

    cursor.execute("SELECT SUM(actual_verified_weight) as total_waste FROM recovery_batches WHERE status = 'RECOVERY_COMPLETED'")
    waste_kg = cursor.fetchone()["total_waste"] or 0

    cursor.execute("SELECT COUNT(*) as trees FROM trees")
    trees_planted = cursor.fetchone()["trees"] or 0

    cursor.execute("SELECT COUNT(*) as active_volunteers FROM users WHERE role = 'volunteer'")
    volunteers = cursor.fetchone()["active_volunteers"] or 0

    cursor.execute("SELECT COUNT(*) as active_donors FROM users WHERE role = 'donor'")
    donors = cursor.fetchone()["active_donors"] or 0

    cursor.execute("SELECT COUNT(*) as total_batches FROM recovery_batches")
    batches = cursor.fetchone()["total_batches"] or 0

    people_served = int(meals_rescued * 1.0) # 1 meal = 1 person served

    conn.close()
    return {
        "meals_rescued": int(meals_rescued),
        "people_served": people_served,
        "waste_diverted_kg": round(float(waste_kg), 1),
        "trees_planted": trees_planted,
        "active_donors": donors,
        "active_volunteers": volunteers,
        "recovery_batches": batches,
        "co2_diverted_kg_estimate": round((meals_rescued * 1.9) + (waste_kg * 1.2), 1)
    }

@app.get("/api/analytics/heatmap")
def get_donation_heatmap():
    """
    Returns historical surplus clusters for Leaflet heatmap.
    🔴 High surplus, 🟠 Medium surplus, 🟢 Low surplus
    """
    points = [
        {"lat": 13.0418, "lng": 80.2341, "intensity": "HIGH", "area": "T. Nagar Commercial & Banquet Belt", "surplus_kg": 640, "color": "#ef4444"},
        {"lat": 13.0850, "lng": 80.2100, "intensity": "MEDIUM", "area": "Anna Nagar Restaurant Corridor", "surplus_kg": 320, "color": "#f97316"},
        {"lat": 12.8231, "lng": 80.0442, "intensity": "HIGH", "area": "Kattankulathur University & Hostel Messes", "surplus_kg": 850, "color": "#ef4444"},
        {"lat": 13.0694, "lng": 80.2376, "intensity": "LOW", "area": "Chetpet Residential", "surplus_kg": 90, "color": "#22c55e"},
        {"lat": 13.0102, "lng": 80.2157, "intensity": "MEDIUM", "area": "Guindy Industrial & Tech Hub", "surplus_kg": 410, "color": "#f97316"},
        {"lat": 13.0368, "lng": 80.2676, "intensity": "LOW", "area": "Mylapore Heritage Zone", "surplus_kg": 110, "color": "#22c55e"},
        {"lat": 13.1143, "lng": 80.1548, "intensity": "HIGH", "area": "Ambattur Food Processing Zone", "surplus_kg": 720, "color": "#ef4444"}
    ]
    return {"clusters": points}

@app.get("/api/leaderboards")
def get_leaderboards():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT u.name, u.org_name, u.role, u.avatar_url, SUM(c.credits) as total_credits
    FROM credits c
    JOIN users u ON c.user_id = u.id
    WHERE c.verification_status = 'VERIFIED'
    GROUP BY u.id
    ORDER BY total_credits DESC
    LIMIT 10
    """)
    top_overall = [dict(row) for row in cursor.fetchall()]

    cursor.execute("""
    SELECT u.name, u.org_name, u.avatar_url, SUM(d.quantity) as meals_rescued
    FROM donations d
    JOIN users u ON d.donor_id = u.id
    WHERE d.status = 'VERIFIED_RESCUE'
    GROUP BY u.id
    ORDER BY meals_rescued DESC
    LIMIT 5
    """)
    top_donors = [dict(row) for row in cursor.fetchall()]

    cursor.execute("""
    SELECT u.name, u.avatar_url, COUNT(vt.id) as pickups_completed, s.current_streak_weeks
    FROM volunteer_tasks vt
    JOIN users u ON vt.volunteer_id = u.id
    LEFT JOIN streaks s ON u.id = s.user_id
    WHERE vt.status = 'VERIFIED'
    GROUP BY u.id
    ORDER BY pickups_completed DESC
    LIMIT 5
    """)
    top_volunteers = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return {
        "top_overall": top_overall,
        "top_donors": top_donors,
        "top_volunteers": top_volunteers
    }


# --- SMS FALLBACK GATEWAY & WEBHOOK ---

SMS_LOGS = []

@app.post("/api/sms/inbound")
def handle_inbound_sms(payload: InboundSMSRequest):
    """
    SMS Fallback Gateway endpoint.
    Receives raw SMS text from phone without internet or smartphone.
    NLP extracts food, quantity, preparation time, and location.
    If valid, automatically creates listing and sends confirmation SMS!
    """
    parsed = parse_sms_donation(payload.body, payload.from_phone)
    now_str = datetime.now().isoformat()

    created_donation_id = None
    if parsed["success"]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM donations")
        cnt = cursor.fetchone()["count"]
        created_donation_id = f"FL-{1024 + cnt + 1}"

        # Assign to demo donor-1 or create phone donor
        cursor.execute("""
        INSERT INTO donations (
            id, donor_id, food_category, title, description, photo_url, quantity, unit,
            preparation_time, freshness_hours, priority, location_name, latitude, longitude,
            status, claim_quantity_remaining, ai_detected_item, ai_confidence, is_offline_synced, created_at, updated_at
        ) VALUES (?, 'donor-1', 'Cooked Meals', ?, 'Created via SMS Fallback Gateway', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80', ?, ?, ?, 4.0, 'HIGH PRIORITY', ?, 13.0827, 80.2707, 'LISTED', ?, ?, 0.90, 0, ?, ?)
        """, (
            created_donation_id,
            parsed["food_item"],
            parsed["quantity"],
            parsed["unit"],
            parsed["preparation_time"],
            parsed["location"],
            parsed["quantity"],
            parsed["food_item"],
            now_str,
            now_str
        ))

        # Add passport event
        append_passport_event(cursor, created_donation_id, "🟡 Listed via SMS", f"SMS Sender ({payload.from_phone})", f"SMS text: '{payload.body}'. NLP extracted: {parsed['quantity']} {parsed['unit']} of {parsed['food_item']} at {parsed['location']}.")

        conn.commit()
        conn.close()

    log_entry = {
        "id": f"sms-{uuid.uuid4().hex[:6]}",
        "sender": payload.from_phone,
        "message": payload.body,
        "nlp_parsed": parsed,
        "reply": parsed["suggested_reply"],
        "donation_id": created_donation_id,
        "timestamp": datetime.now().strftime("%Y-%m-%d %I:%M:%S %p")
    }
    SMS_LOGS.insert(0, log_entry)

    return {
        "status": "success",
        "response_sms": parsed["suggested_reply"],
        "parsed_entities": parsed,
        "donation_id": created_donation_id
    }

@app.get("/api/sms/logs")
def get_sms_logs():
    return {"logs": SMS_LOGS}


# --- ADMIN CONFIGURATION & AUDIT ---

@app.get("/api/admin/reward-config")
def get_reward_config():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reward_config")
    configs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"configs": configs}

@app.post("/api/admin/reward-config")
def update_reward_config(payload: UpdateRewardConfigRequest):
    conn = get_db()
    cursor = conn.cursor()
    for k, v in payload.configs.items():
        cursor.execute("UPDATE reward_config SET config_val = ? WHERE config_key = ?", (float(v), k))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Reward rules updated successfully."}

@app.post("/api/admin/verify-user/{user_id}")
def admin_verify_user(user_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET verified = 1 WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"User {user_id} verified."}

@app.get("/api/admin/audit-logs")
def get_audit_logs():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50")
    logs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"logs": logs}
