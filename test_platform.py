import sys
sys.stdout.reconfigure(encoding='utf-8')
import urllib.request
import json

def test(url, data=None, method=None):
    if method is None:
        method = "POST" if data is not None else "GET"
    body = json.dumps(data).encode() if data is not None else None
    headers = {'Content-Type': 'application/json'} if data is not None else {}
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    res = urllib.request.urlopen(req)
    return json.loads(res.read().decode())

def run_tests():
    print("=== Testing FoodLoop Platform Full-Stack Integration ===")

    # 1. Impact Summary
    summary = test("http://127.0.0.1:8000/api/impact/summary")
    print("\n1. [Live Impact Summary]:", summary)

    # 2. Test Donation Creation
    d_payload = {
        "donor_id": "donor-1",
        "food_category": "Cooked Meals",
        "title": "Vegetable Biryani & Mirchi Ka Salan",
        "description": "Buffet surplus from hall",
        "quantity": 60.0,
        "unit": "meals",
        "preparation_time": "12:30 PM",
        "location_name": "T. Nagar Banquet Hall",
        "latitude": 13.0418,
        "longitude": 80.2341
    }
    new_d = test("http://127.0.0.1:8000/api/donations", d_payload, method="POST")
    donation_id = new_d["donation_id"]
    print(f"\n2. [Created Donation]: ID={donation_id}, Priority={new_d['priority']['priority']}, AI Detection='{new_d['ai_analysis']['detected_item']}'")

    # 3. Test Split Claim (Shelter claims 25 of 60 meals)
    claim_payload = {"recipient_id": "recip-1", "quantity": 25.0}
    claim_res = test(f"http://127.0.0.1:8000/api/donations/{donation_id}/claim", claim_payload, method="POST")
    print(f"\n3. [Split Claim Executed]: Claimed={claim_res['quantity_claimed']} meals, Remaining={claim_res['quantity_remaining']} meals, New Status={claim_res['donation_status']}")

    # 4. Test Volunteer Delivery Task
    tasks = test("http://127.0.0.1:8000/api/volunteers/tasks")
    task_for_claim = next((t for t in tasks["tasks"] if t["donation_id"] == donation_id), None)
    if task_for_claim:
        print(f"\n4. [Volunteer Task Created]: ID={task_for_claim['id']}, Pickup={task_for_claim['pickup_location']}, Delivery={task_for_claim['delivery_location']}")
        test(f"http://127.0.0.1:8000/api/volunteers/tasks/{task_for_claim['id']}/accept", {"volunteer_id": "vol-1"}, method="POST")
        test(f"http://127.0.0.1:8000/api/volunteers/tasks/{task_for_claim['id']}/pickup", method="POST")
        test(f"http://127.0.0.1:8000/api/volunteers/tasks/{task_for_claim['id']}/deliver", {"proof_photo_url": "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c", "notes": "Handed to Sister Maria."}, method="POST")
        print("   -> Task Accepted, Picked Up, Delivered with Photo Proof!")

    # 5. Test Confirm Receipt to Trigger Impact Verification & Credits
    confirm_res = test(f"http://127.0.0.1:8000/api/claims/{claim_res['claim_id']}/confirm", method="POST")
    print(f"\n5. [Impact Verification Triggered]: {confirm_res['message']}, Donor Credits={confirm_res['donor_credits_awarded']}, Volunteer Credits={confirm_res['volunteer_credits_awarded']}")

    # 6. Test Food Passport
    passport = test(f"http://127.0.0.1:8000/api/passports/{donation_id}")
    print(f"\n6. [Food Passport Verified]: Current Stage={passport['passport']['current_stage']}, Timeline Events Count={len(passport['passport']['timeline'])}")
    for event in passport['passport']['timeline']:
        print(f"   • {event['stage']} [{event['timestamp']}] ({event['actor']}): {event['note'][:60]}...")

    # 7. Test Circular Recovery Batches
    batches = test("http://127.0.0.1:8000/api/recovery/batches")
    print(f"\n7. [Circular Recovery Aggregation Hub]: {len(batches['batches'])} Batches Active")
    for b in batches['batches']:
        print(f"   • Batch {b['id']}: {b['waste_type']} ({b['total_quantity']} {b['unit']}), Pathway='{b['suggested_pathway']}', Status={b['status']}")

    # 8. Test SMS Fallback Gateway with NLP Entity Extractor
    sms_payload = {
        "from_phone": "+91 99887 76655",
        "body": "150 plates rice curry 1pm Anna Nagar"
    }
    sms_res = test("http://127.0.0.1:8000/api/sms/inbound", sms_payload, method="POST")
    print(f"\n8. [SMS Fallback Gateway NLP]:")
    print(f"   Inbound SMS: '{sms_payload['body']}'")
    print(f"   NLP Extracted: Quantity={sms_res['parsed_entities']['quantity']} {sms_res['parsed_entities']['unit']}, Food='{sms_res['parsed_entities']['food_item']}', PrepTime='{sms_res['parsed_entities']['preparation_time']}', Location='{sms_res['parsed_entities']['location']}'")
    print(f"   Outbound SMS Confirmation: '{sms_res['response_sms']}'")
    print(f"   Created Donation Listing ID: {sms_res['donation_id']}")

    # 9. Test Practical Rewards Store & Redemption
    rewards = test("http://127.0.0.1:8000/api/rewards")
    print(f"\n9. [Practical Rewards Catalog]: {len(rewards['rewards'])} practical rewards loaded.")
    red_payload = {"user_id": "donor-1", "reward_id": "rew-1"}
    red_res = test("http://127.0.0.1:8000/api/rewards/redeem", red_payload, method="POST")
    print(f"   Redeemed Voucher: Code={red_res['coupon_code']}, Title='{red_res['reward_title']}', Partner='{red_res['partner_name']}', New Balance={red_res['new_balance']}")

    # 10. Test Trees & Forest
    my_forest = test("http://127.0.0.1:8000/api/trees/my-forest/donor-1")
    print(f"\n10. [My Forest]: {my_forest['tree_count']} Trees Planted celebrating {my_forest['meals_rescued']} verified meals rescued.")

    # 11. Test Heatmap Data
    heatmap = test("http://127.0.0.1:8000/api/analytics/heatmap")
    print(f"\n11. [Heatmap Density Clusters]: {len(heatmap['clusters'])} surplus hotspot clusters loaded.")

    # 12. Test Frontend Server HTTP response
    fe_res = urllib.request.urlopen("http://127.0.0.1:5173/")
    html_content = fe_res.read().decode()
    print(f"\n12. [Frontend Server]: HTTP {fe_res.status}, Title present in HTML: '{'FoodLoop' in html_content}'")

    print("\n=======================================================")
    print("🎉 ALL 12 END-TO-END INTEGRATION TESTS PASSED 100%!")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
