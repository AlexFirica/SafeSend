from datetime import datetime
from db import get_history, save_login
from vpn_checker import check_ip
from rules import RULES


def analyze_risk(data):

    score = 100
    reasons = []
    history = get_history(data.employee_id)

    # ── VPN / PROXY CHECK ─────────────────────────────────────────
    vpn_result = check_ip(data.ip)

    if vpn_result["vpn"] or vpn_result["proxy"]:
        score += RULES["vpn_detected"]      # -100
        reasons.append("VPN or Proxy detected")

    elif vpn_result["hosting"]:
        score += RULES["unknown_isp"]       # -35
        reasons.append("Hosting/datacenter IP detected")

    # ── HISTORY-BASED CHECKS ──────────────────────────────────────
    if history:
        last_login = history[-1]

        # Device checks
        if data.browser != last_login["browser"]:
            score += RULES["new_browser"]       # -20
            reasons.append("New browser detected")

        if data.os != last_login["os"]:
            score += RULES["new_os"]            # -20
            reasons.append("New OS detected")

        if data.screen_resolution != last_login["screen_resolution"]:
            score += RULES["new_resolution"]    # -10
            reasons.append("New screen resolution detected")

        # City check (no country)
        if data.city != last_login["city"]:
            score += RULES["new_city"]          # -15
            reasons.append("New city detected")

        # ISP check
        if data.isp != last_login["isp"]:
            score += RULES["unknown_isp"]       # -35
            reasons.append("Unknown or new ISP")

    # ── WORK HOURS CHECK ──────────────────────────────────────────
    try:
        login_hour = datetime.strptime(data.login_time, "%Y-%m-%d %H:%M").hour
        if login_hour < 6 or login_hour > 22:
            score += RULES["outside_work_hours"]    # -25
            reasons.append(f"Login outside work hours (hour={login_hour})")
    except ValueError:
        pass

    # ── CLAMP SCORE ───────────────────────────────────────────────
    score = max(0, min(100, score))

    # ── LABEL ─────────────────────────────────────────────────────
    if score >= 80:
        label = "Green"
    elif score >= 50:
        label = "Yellow"
    else:
        label = "Red"

    # ── CONFIDENCE ────────────────────────────────────────────────
    confidence_score = max(50, 100 - (len(reasons) * 10))

    # ── SAVE TO HISTORY ───────────────────────────────────────────
    save_login(data.employee_id, {
        **data.dict(),
        "local_hour": datetime.strptime(data.login_time, "%Y-%m-%d %H:%M").hour,
        "session_id": ""
    })

    return {
        "employee_id":      data.employee_id,
        "label":            label,
        "trust_score":      score,
        "confidence_score": confidence_score,
        "reasons":          reasons,
        "message":          "Behavioral AI analysis completed"
    }