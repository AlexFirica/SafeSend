# scorer.py
from datetime import datetime

from db import get_history, save_login
from vpn_checker import check_ip
from rules import RULES


def analyze_risk(data):

    score = 100
    reasons = []

    history = get_history(data.employee_id)

    # DEVICE FINGERPRINT
    current_device = (
        f"{data.browser}-"
        f"{data.os}-"
        f"{data.screen_resolution}"
    )

    # VPN CHECK
    vpn_result = check_ip(data.ip)

    if vpn_result["vpn"] or vpn_result["proxy"]:

        score += RULES["vpn_detected"]

        reasons.append("VPN or Proxy detected")

    # HISTORY CHECKS
    if history:

        last_login = history[-1]

        # LAST DEVICE
        last_device = (
            f"{last_login['browser']}-"
            f"{last_login['os']}-"
            f"{last_login['screen_resolution']}"
        )

        # NEW DEVICE
        if current_device != last_device:

            score -= 30

            reasons.append("New device detected")

        # COUNTRY
        if data.country != last_login["country"]:

            score += RULES["new_country"]

            reasons.append("New country detected")

        # CITY
        if data.city != last_login["city"]:

            score += RULES["new_city"]

            reasons.append("New city detected")

        # ISP
        if data.isp != last_login["isp"]:

            score += RULES["unknown_isp"]

            reasons.append("Unknown ISP")

        # IMPOSSIBLE TRAVEL
        last_time = datetime.strptime(
            last_login["login_time"],
            "%Y-%m-%d %H:%M"
        )

        current_time = datetime.strptime(
            data.login_time,
            "%Y-%m-%d %H:%M"
        )

        time_difference = (
            current_time - last_time
        ).total_seconds() / 60

        if (data.country != last_login["country"] and time_difference < 60):

            score -= 80

            reasons.append("Impossible travel detected")

    # WORK HOURS CHECK
    login_hour = datetime.strptime(
        data.login_time,
        "%Y-%m-%d %H:%M"
    ).hour

    if login_hour < 6 or login_hour > 22:

        score += RULES["outside_work_hours"]

        reasons.append("Login outside work hours")

    # SCORE LIMITS
    if score < 0:
        score = 0

    if score > 100:
        score = 100

    # LABEL
    if score >= 80:

        label = "Green"

    elif score >= 50:

        label = "Yellow"

    else:

        label = "Red"

    # CONFIDENCE SCORE
    confidence_score = max(
        50,
        100 - (len(reasons) * 10)
    )

    # SAVE LOGIN
    save_login(
        data.employee_id,
        data.dict()
    )

    return {

        "employee_id": data.employee_id,

        "label": label,

        "trust_score": score,

        "confidence_score": confidence_score,

        "reasons": reasons,

        "message": "Behavioral AI analysis completed"
    }