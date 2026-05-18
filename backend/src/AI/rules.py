# rules.py
RULES = {
    # Location anomalies
    "new_country":          -70,
    "new_city":             -15,

    # Device anomalies  
    "new_browser":          -20,
    "new_os":               -20,
    "new_resolution":       -10,
    "new_device_combined":  -30,   # all three changed at once

    # Network anomalies
    "unknown_isp":          -35,
    "vpn_detected":         -100,

    # Behavior anomalies
    "outside_work_hours":   -25,
    "impossible_travel":    -80,
}