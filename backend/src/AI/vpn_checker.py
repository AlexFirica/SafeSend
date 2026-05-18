# vpn_checker.py
import httpx

def check_ip(ip: str) -> dict:
    """
    Checks an IP against ip-api.com's pro fields.
    Returns a dict with 'vpn', 'proxy', 'hosting' booleans.
    Falls back to safe defaults if the API is unreachable.
    """
    # Known safe/local IPs — skip check
    if not ip or ip in ("N/A", "127.0.0.1", "localhost"):
        return {"vpn": False, "proxy": False, "hosting": False}

    try:
        response = httpx.get(
            f"http://ip-api.com/json/{ip}",
            params={"fields": "status,proxy,hosting,query"},
            timeout=5.0
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "success":
                return {
                    "vpn":     data.get("proxy", False),   # ip-api uses "proxy" for VPN/proxy
                    "proxy":   data.get("proxy", False),
                    "hosting": data.get("hosting", False)  # datacenter/server IPs
                }
    except Exception as e:
        print(f"[vpn_checker.py] IP check failed for {ip}: {e}")

    # Default: assume safe if check fails
    return {"vpn": False, "proxy": False, "hosting": False}