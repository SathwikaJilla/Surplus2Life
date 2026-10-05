import re
from datetime import datetime, timedelta

def classify_food_image(filename_or_url: str, detected_label_hint: str = None):
    """
    AI Food Recognition Engine.
    Simulates high-precision computer vision analysis for surplus food classification.
    Returns detected item, category, estimated freshness, confidence score, and suggested recovery pathway.
    Always editable by donor.
    """
    text = (filename_or_url + " " + (detected_label_hint or "")).lower()

    if any(k in text for k in ["biryani", "rice", "curry", "meals", "thali", "sambar", "dal", "paneer"]):
        return {
            "detected_item": "Steamed Rice & Mixed Vegetable Curry",
            "category": "Cooked Meals",
            "confidence": 0.94,
            "suggested_unit": "meals",
            "freshness_window_hours": 4.0,
            "recovery_pathway": "Anaerobic Digestion / Biogas",
            "tags": ["cooked", "perishable", "vegetarian", "hot-prepared"]
        }
    elif any(k in text for k in ["apple", "banana", "vegetable", "tomato", "potato", "onion", "fruit", "produce"]):
        return {
            "detected_item": "Fresh Farm Produce (Fruits & Greens)",
            "category": "Raw Produce",
            "confidence": 0.91,
            "suggested_unit": "kg",
            "freshness_window_hours": 24.0,
            "recovery_pathway": "Community Composting",
            "tags": ["raw", "fresh", "produce", "compostable"]
        }
    elif any(k in text for k in ["bread", "cake", "pastry", "bakery", "croissant", "bun"]):
        return {
            "detected_item": "Assorted Bakery Breads & Buns",
            "category": "Bakery",
            "confidence": 0.96,
            "suggested_unit": "kg",
            "freshness_window_hours": 18.0,
            "recovery_pathway": "Composting / Animal Feed Assessment",
            "tags": ["bakery", "baked-goods", "dry"]
        }
    elif any(k in text for k in ["oil", "fry", "cooking oil", "uco"]):
        return {
            "detected_item": "Used Cooking Oil (Filtered)",
            "category": "Cooking Oil",
            "confidence": 0.98,
            "suggested_unit": "litres",
            "freshness_window_hours": 168.0, # 7 days
            "recovery_pathway": "Authorized Biodiesel Recovery",
            "tags": ["oil", "uco", "industrial-recovery"]
        }
    else:
        # Default wholesome cooked surplus
        return {
            "detected_item": "Wholesome Catered Food Packets",
            "category": "Cooked Meals",
            "confidence": 0.88,
            "suggested_unit": "meals",
            "freshness_window_hours": 4.0,
            "recovery_pathway": "Anaerobic Digestion / Biogas",
            "tags": ["catered", "ready-to-eat"]
        }

def calculate_rescue_priority(category: str, preparation_time_str: str, now: datetime = None) -> dict:
    """
    Computes Food Rescue Priority / Freshness-Risk Estimate:
    🟢 NORMAL, 🟠 HIGH PRIORITY, 🔴 URGENT
    Based on category, preparation time, and elapsed hours.
    Transparent rule-based logic; does not claim exact microbiological expiry.
    """
    if now is None:
        now = datetime.now()

    # Parse preparation time
    prep_dt = None
    time_formats = ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M", "%H:%M", "%I:%M %p", "%I:%M%p"]
    
    for fmt in time_formats:
        try:
            parsed = datetime.strptime(preparation_time_str.strip(), fmt)
            # If only time was parsed, use today's date
            if fmt in ["%H:%M", "%I:%M %p", "%I:%M%p"]:
                prep_dt = now.replace(hour=parsed.hour, minute=parsed.minute, second=0, microsecond=0)
                if prep_dt > now: # prepared earlier today or yesterday evening
                    prep_dt -= timedelta(days=1)
            else:
                prep_dt = parsed
            break
        except ValueError:
            continue

    if not prep_dt:
        prep_dt = now - timedelta(hours=1.5) # fallback estimate

    elapsed_hours = max(0.0, (now - prep_dt).total_seconds() / 3600.0)

    # Categories have different safety risk profiles
    if category.lower() in ["cooked meals", "dairy", "meat"]:
        # Safe window typically 4-5 hours at ambient temperature
        if elapsed_hours >= 3.0:
            priority = "URGENT"
            color = "rose"
            message = "Cooked surplus prepared over 3 hrs ago. Arrange immediate pickup."
        elif elapsed_hours >= 1.5:
            priority = "HIGH PRIORITY"
            color = "amber"
            message = "Prepared within last 2-3 hrs. Prioritize dispatch within 60 minutes."
        else:
            priority = "NORMAL"
            color = "emerald"
            message = "Freshly prepared. Good window for standard matching."
    elif category.lower() in ["bakery", "raw produce"]:
        if elapsed_hours >= 16.0:
            priority = "HIGH PRIORITY"
            color = "amber"
            message = "Perishable produce. Rescue within 4-6 hours recommended."
        else:
            priority = "NORMAL"
            color = "emerald"
            message = "Stable freshness window."
    else:
        priority = "NORMAL"
        color = "emerald"
        message = "Standard recovery priority."

    return {
        "priority": priority,
        "color": color,
        "elapsed_hours": round(elapsed_hours, 1),
        "advisory": message
    }

def score_recipient_match(donation: dict, recipient: dict, distance_km: float) -> dict:
    """
    Transparent Smart Recipient Matching Score (0 - 100).
    Factors:
    - Distance proximity (40 pts)
    - Quantity compatibility (25 pts)
    - Recipient capacity & urgency (20 pts)
    - Verification status (15 pts)
    """
    score = 0
    breakdown = {}

    # Distance factor (max 40)
    if distance_km <= 2.0:
        dist_pts = 40
    elif distance_km <= 5.0:
        dist_pts = 30
    elif distance_km <= 10.0:
        dist_pts = 20
    elif distance_km <= 15.0:
        dist_pts = 10
    else:
        dist_pts = 5
    score += dist_pts
    breakdown["distance_proximity"] = f"{dist_pts}/40 ({round(distance_km, 1)} km)"

    # Quantity compatibility (max 25)
    remaining = donation.get("claim_quantity_remaining", donation.get("quantity", 0))
    recip_need = recipient.get("capacity_needed", 50)
    
    if remaining <= recip_need:
        qty_pts = 25 # Recipient can absorb all remaining
    else:
        qty_pts = 18 # Recipient can take split claim
    score += qty_pts
    breakdown["capacity_compatibility"] = f"{qty_pts}/25"

    # Urgency match (max 20)
    urgency = donation.get("priority", "NORMAL")
    if urgency == "URGENT":
        urgency_pts = 20 if recipient.get("active_now", True) else 10
    elif urgency == "HIGH PRIORITY":
        urgency_pts = 18
    else:
        urgency_pts = 15
    score += urgency_pts
    breakdown["urgency_readiness"] = f"{urgency_pts}/20"

    # Verification bonus (max 15)
    verif_pts = 15 if recipient.get("verified", 1) else 0
    score += verif_pts
    breakdown["trust_verification"] = f"{verif_pts}/15"

    return {
        "match_score": min(100, score),
        "breakdown": breakdown,
        "is_recommended": score >= 75
    }

def parse_sms_donation(sms_body: str, default_sender_phone: str = "") -> dict:
    """
    NLP Entity Extractor for SMS Fallback donations.
    Example: '200 plates rice curry 1pm Anna Nagar'
    Extracts:
    - Quantity & Unit
    - Food Item description
    - Preparation Time
    - Location name
    - Flags missing or ambiguous fields
    """
    text = sms_body.strip()
    result = {
        "success": False,
        "raw_text": text,
        "sender_phone": default_sender_phone,
        "quantity": None,
        "unit": "meals",
        "food_item": None,
        "preparation_time": None,
        "location": None,
        "missing_fields": [],
        "suggested_reply": ""
    }

    # 1. Extract Quantity & Unit
    # Patterns like: 200 plates, 50 meals, 40 kg, 30 packets, 100 portions, 25l oil
    qty_match = re.search(r'(\d+(?:\.\d+)?)\s*(plates?|meals?|packets?|boxes?|portions?|kg|litres?|ltrs?|l)?', text, re.IGNORECASE)
    if qty_match:
        result["quantity"] = float(qty_match.group(1))
        unit_str = qty_match.group(2)
        if unit_str:
            u_clean = unit_str.lower().strip()
            if "kg" in u_clean:
                result["unit"] = "kg"
            elif u_clean in ["l", "litre", "litres", "ltr", "ltrs"] or "oil" in text.lower():
                result["unit"] = "litres"
            else:
                result["unit"] = "meals"
        else:
            result["unit"] = "meals"
    else:
        result["missing_fields"].append("quantity")

    # 2. Extract Preparation Time
    # Patterns: 1pm, 1:30 pm, 12:00, 11am, 2 pm, 14:00
    time_match = re.search(r'\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b', text, re.IGNORECASE)
    # Check if time match is distinct from quantity
    time_candidates = re.findall(r'\b(?:\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))\b', text, re.IGNORECASE)
    if time_candidates:
        result["preparation_time"] = time_candidates[0].strip()
    else:
        result["preparation_time"] = "12:00 PM" # sensible default for lunchtime donation

    # 3. Extract Location
    # Common location indicators: 'in <Loc>', 'at <Loc>', or trailing recognized city/area names
    loc_match = re.search(r'(?:at|in|near)\s+([A-Za-z0-9\s,\.-]+)$', text, re.IGNORECASE)
    if loc_match:
        result["location"] = loc_match.group(1).strip()
    else:
        # Check standard known hubs or trailing 2-3 words
        words = text.split()
        if len(words) >= 2:
            # Let's see if the last words look like a location
            potential_loc = " ".join(words[-2:])
            if not re.search(r'\d', potential_loc):
                result["location"] = potential_loc
            else:
                result["location"] = "Anna Nagar, Chennai" # fallback
        else:
            result["missing_fields"].append("location")

    # 4. Extract Food Item Description
    cleaned_food = text
    # Remove quantity
    if qty_match and qty_match.group(0):
        cleaned_food = cleaned_food.replace(qty_match.group(0), "")
    # Remove time
    if result["preparation_time"]:
        cleaned_food = re.sub(re.escape(result["preparation_time"]), "", cleaned_food, flags=re.IGNORECASE)
    # Remove location keyword
    if result.get("location"):
        cleaned_food = re.sub(re.escape(result["location"]), "", cleaned_food, flags=re.IGNORECASE)
    cleaned_food = re.sub(r'\b(at|in|near|prepared|ready|today|plates|meals|portions)\b', '', cleaned_food, flags=re.IGNORECASE)
    cleaned_food = re.sub(r'[\s,]+', ' ', cleaned_food).strip()

    if len(cleaned_food) >= 3:
        result["food_item"] = cleaned_food.title()
    else:
        result["food_item"] = "Nutritious Cooked Meals"

    if len(result["missing_fields"]) == 0 and result["quantity"]:
        result["success"] = True
        result["suggested_reply"] = (
            f"FoodLoop: Donation confirmed! {int(result['quantity'])} {result['unit']} of "
            f"'{result['food_item']}' at {result['location']}. Nearby verified recipients and volunteers notified."
        )
    else:
        result["success"] = False
        result["suggested_reply"] = (
            "FoodLoop: We couldn't detect your location or quantity. "
            "Please reply with: <quantity> <food name> <time> <location> (e.g. '150 meals rice curry 1pm Anna Nagar')."
        )

    return result

def assess_recovery_pathway(waste_type: str, contamination_level: str = "Low") -> dict:
    """
    Maps organic unrescued surplus or waste to verified circular pathways:
    - Organic Cooked Food Waste -> Anaerobic Digestion / Biogas
    - Fruit & Vegetable Scraps -> Industrial / Community Composting
    - Used Cooking Oil -> Authorized Biodiesel / Industrial Oil Recovery
    """
    wt = waste_type.lower()
    if "oil" in wt or "uco" in wt:
        return {
            "pathway": "Authorized Biodiesel Recovery",
            "hub_category": "Used Cooking Oil Hub",
            "environmental_benefit": "Prevents sewage clogging & produces clean bio-fuel replacement",
            "tree_factor_kg": 25.0, # 25 litres oil recovered = 1 tree equivalent
            "credits_per_unit": 8
        }
    elif any(k in wt for k in ["fruit", "vegetable", "greens", "peel", "raw"]):
        return {
            "pathway": "Community & Aerobic Composting",
            "hub_category": "Green Composting Hub",
            "environmental_benefit": "Restores soil microbial carbon and diverts landfill methane",
            "tree_factor_kg": 50.0,
            "credits_per_unit": 5
        }
    else:
        return {
            "pathway": "Anaerobic Digestion / Biogas",
            "hub_category": "Biogas Feedstock Hub",
            "environmental_benefit": "Generates methane-based green energy and nutrient bio-slurry",
            "tree_factor_kg": 50.0,
            "credits_per_unit": 5
        }
