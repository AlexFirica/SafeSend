RULES = {
    # Match your precise action penalty map
    "new_city": -10,
    "new_browser": -20,
    "unknown_isp": -35,
    "new_country_impossible_travel": -70,
    "malicious_ip_vpn": -100,
    
    # Device context rules
    "new_os": -20,
    "new_resolution": -10,
    "outside_work_hours": -25,
}