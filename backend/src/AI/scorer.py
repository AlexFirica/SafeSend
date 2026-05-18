from datetime import datetime
from db import get_history

def analyze_risk(data):
    score = 100
    reasons = []
    
    # Extract details from payload structure
    current_device = f"{data.browser}-{data.os}-{data.screen_resolution}"
    history = get_history(data.employee_id)
    
    # 1. IP & VPN Gateway Check (Known Malicious IP / Proxy Rule)
    # Checked upstream or via internal list helper (e.g. your 10.0.0.1 or 123.123.123.123 rule)
    from vpn_checker import check_ip
    vpn_result = check_ip(data.ip)
    
    if vpn_result["vpn"] or vpn_result["proxy"]:
        score += -100  # Instantly drops to 0
        reasons.append("Known Malicious IP / VPN / Proxy Node")
        return {"label": "Red", "trust_score": max(0, score), "reasons": reasons}

    # 2. Evaluate History Context Matrix
    if history:
        last_login = history[-1]
        last_device = f"{last_login['browser']}-{last_login['os']}-{last_login['screen_resolution']}"
        
        # Calculate Time Delta for Location Velocity Tracking
        last_time = datetime.strptime(last_login["login_time"], "%Y-%m-%d %H:%M")
        current_time = datetime.strptime(data.login_time, "%Y-%m-%d %H:%M")
        time_difference_mins = (current_time - last_time).total_seconds() / 60

        # Location Matrix
        is_new_country = data.country != last_login["country"]
        is_new_city = data.city != last_login["city"]
        is_new_device = current_device != last_device
        
        # Check Impossible Travel Velocity Rule
        if is_new_country and time_difference_mins < 360:  # Less than 6 hours between countries
            score += -70
            reasons.append("New Country (Impossible Travel)")
        elif is_new_city and not is_new_country:
            score += -10
            reasons.append("New City (Same Country)")

        # Hardware/Device Matrix
        if is_new_device:
            if data.browser != last_login["browser"]:
                score += -20
                reasons.append("New Browser")
            if data.os != last_login["os"]:
                score += -20
                reasons.append("New Operating System")
            if data.screen_resolution != last_login["screen_resolution"]:
                score += -10
                reasons.append("New Screen Resolution")

        # Network Operator Context Rule
        if data.isp != last_login["isp"]:
            score += -35
            reasons.append("Unknown ISP (Public WiFi/Alternative route)")

    # 3. Working Hours Check
    login_hour = datetime.strptime(data.login_time, "%Y-%m-%d %H:%M").hour
    is_outside_hours = login_hour < 6 or login_hour > 22

    if is_outside_hours:
        # Score calculation is tracked, label behavior defined below
        reasons.append("Login outside normal work hours")

    # Final Boundary Caps
    score = max(0, min(100, score))

    # Determine Label Based on combined variables
    # Matrix Rule: New device, new location, unusual time = RED
    if history:
        last_login = history[-1]
        if (current_device != last_device) and (data.city != last_login["city"]) and is_outside_hours:
            label = "Red"
        # Matrix Rule: New Country / Malicious IP = RED
        elif score <= 40 or "New Country (Impossible Travel)" in reasons:
            label = "Red"
        # Matrix Rule: New Device but same location = YELLOW, or Unknown ISP = YELLOW
        elif score <= 79 or "Unknown ISP (Public WiFi)" in reasons or (current_device != last_device and data.city == last_login["city"]):
            label = "Yellow"
        # Matrix Rule: Outside work hours but same location = YELLOW
        elif is_outside_hours and data.city == last_login["city"]:
            label = "Yellow"
        else:
            label = "Green"
    else:
        # No history footprint baseline: Default label based on initial raw score metric
        if score >= 80: label = "Green"
        elif score >= 50: label = "Yellow"
        else: label = "Red"

    return {
        "label": label,
        "trust_score": score,
        "reasons": reasons
    }