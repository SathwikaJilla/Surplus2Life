import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "foodloop.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        org_name TEXT,
        phone TEXT,
        address TEXT,
        latitude REAL DEFAULT 13.0827,
        longitude REAL DEFAULT 80.2707,
        verified INTEGER DEFAULT 0,
        avatar_url TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # Donations table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS donations (
        id TEXT PRIMARY KEY,
        donor_id TEXT NOT NULL,
        food_category TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        photo_url TEXT,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        preparation_time TEXT NOT NULL,
        freshness_hours REAL DEFAULT 4.0,
        priority TEXT DEFAULT 'NORMAL',
        location_name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        status TEXT DEFAULT 'LISTED',
        claim_quantity_remaining REAL NOT NULL,
        ai_detected_item TEXT,
        ai_confidence REAL,
        ai_tags TEXT,
        is_offline_synced INTEGER DEFAULT 0,
        offline_local_id TEXT,
        recovery_pathway TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (donor_id) REFERENCES users(id)
    )
    """)

    # Claims table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS claims (
        id TEXT PRIMARY KEY,
        donation_id TEXT NOT NULL,
        recipient_id TEXT NOT NULL,
        quantity_claimed REAL NOT NULL,
        status TEXT DEFAULT 'CLAIMED',
        created_at TEXT NOT NULL,
        confirmed_at TEXT,
        FOREIGN KEY (donation_id) REFERENCES donations(id),
        FOREIGN KEY (recipient_id) REFERENCES users(id)
    )
    """)

    # Volunteer Tasks table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS volunteer_tasks (
        id TEXT PRIMARY KEY,
        donation_id TEXT NOT NULL,
        claim_id TEXT,
        volunteer_id TEXT,
        status TEXT DEFAULT 'OFFERED',
        pickup_location TEXT NOT NULL,
        delivery_location TEXT NOT NULL,
        pickup_time TEXT,
        delivery_time TEXT,
        proof_photo_url TEXT,
        verification_notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (donation_id) REFERENCES donations(id),
        FOREIGN KEY (volunteer_id) REFERENCES users(id)
    )
    """)

    # Food Passport table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS food_passports (
        id TEXT PRIMARY KEY,
        donation_id TEXT UNIQUE NOT NULL,
        current_stage TEXT NOT NULL,
        timeline_events TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (donation_id) REFERENCES donations(id)
    )
    """)

    # Recovery Batches table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recovery_batches (
        id TEXT PRIMARY KEY,
        waste_type TEXT NOT NULL,
        total_quantity REAL NOT NULL,
        unit TEXT DEFAULT 'kg',
        suggested_pathway TEXT NOT NULL,
        status TEXT DEFAULT 'COLLECTING',
        hub_location TEXT NOT NULL,
        partner_id TEXT,
        scheduled_pickup_date TEXT,
        actual_verified_weight REAL,
        verification_notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (partner_id) REFERENCES users(id)
    )
    """)

    # Recovery Items aggregated in batches
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recovery_items (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        source_donation_id TEXT,
        donor_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        waste_type TEXT NOT NULL,
        added_at TEXT NOT NULL,
        FOREIGN KEY (batch_id) REFERENCES recovery_batches(id)
    )
    """)

    # Recovery Partners profile table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recovery_partners (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        facility_name TEXT NOT NULL,
        pathway TEXT NOT NULL,
        min_quantity REAL NOT NULL,
        accepted_waste_types TEXT NOT NULL,
        processing_capacity REAL NOT NULL,
        collection_radius_km REAL NOT NULL,
        pickup_available INTEGER DEFAULT 1,
        verified INTEGER DEFAULT 1,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # Impact Credits table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS credits (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT,
        credits INTEGER NOT NULL,
        verification_status TEXT DEFAULT 'VERIFIED',
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # Weekly Streaks table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS streaks (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        current_streak_weeks INTEGER DEFAULT 0,
        longest_streak_weeks INTEGER DEFAULT 0,
        last_active_week INTEGER DEFAULT 0,
        streak_freezes_remaining INTEGER DEFAULT 1,
        last_freeze_used_date TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # Practical Rewards Catalog
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rewards (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        credits_cost INTEGER NOT NULL,
        partner_name TEXT NOT NULL,
        coupon_code_pattern TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
    )
    """)

    # Reward Redemptions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reward_redemptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        reward_id TEXT NOT NULL,
        credits_spent INTEGER NOT NULL,
        coupon_code TEXT NOT NULL,
        status TEXT DEFAULT 'ACTIVE',
        redeemed_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (reward_id) REFERENCES rewards(id)
    )
    """)

    # Trees Planted table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trees (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        trigger_quantity REAL NOT NULL,
        location_name TEXT NOT NULL,
        species TEXT NOT NULL,
        photo_url TEXT NOT NULL,
        planting_date TEXT NOT NULL,
        verification_status TEXT DEFAULT 'VERIFIED_PARTNER',
        planting_partner_name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        growth_update_text TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # Notifications table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'INFO',
        is_read INTEGER DEFAULT 0,
        link TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # Audit Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        timestamp TEXT NOT NULL
    )
    """)

    # Reward Config (Admin configurable)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reward_config (
        config_key TEXT PRIMARY KEY,
        config_val REAL NOT NULL,
        description TEXT NOT NULL
    )
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database schema initialized successfully.")
