import httpx

SUPABASE_URL = "https://hhxuvjiksyooedjzaabd.supabase.co"
SUPABASE_KEY = "sb_publishable_ukmy9hfPGZHjHcfhfFG7jw_zJznT2Ji"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def get_history(employee_id: str) -> list:
    try:
        response = httpx.get(
            f"{SUPABASE_URL}/rest/v1/SafeSend_user_logs",
            headers=HEADERS,
            params={
                "user_id": f"eq.{employee_id}",
                "order": "login_time.asc",
                "select": "ip_address,isp,browser,os,screen_resolution,location_city,local_hour,login_time,session_id"
            }
        )
        print(f"[DB] Status: {response.status_code}")
        print(f"[DB] Raw response: {response.text[:300]}")  # primele 300 caractere

        if response.status_code == 200:
            rows = response.json()
            print(f"[DB] Găsite {len(rows)} loguri pentru user {employee_id}")
            
            normalized = []
            for row in rows:
                normalized.append({
                    "ip":                row.get("ip_address", "N/A"),
                    "isp":               row.get("isp", "N/A"),
                    "browser":           row.get("browser", "N/A"),
                    "os":                row.get("os", "N/A"),
                    "screen_resolution": row.get("screen_resolution", "N/A"),
                    "city":              row.get("location_city", "N/A"),
                    "login_time": (row.get("login_time") or "")[:16].replace("T", " ")
                })
            return normalized
        else:
            print(f"[DB] Eroare Supabase: {response.status_code} {response.text}")
            return []
    except Exception as e:
        print(f"[DB] Exception: {e}")
        return []


def save_login(employee_id: str, data: dict):
    try:
        payload = {
            "user_id":           int(employee_id),
            "ip_address":        data.get("ip", "N/A"),
            "isp":               data.get("isp", "N/A"),
            "browser":           data.get("browser", "N/A"),
            "os":                data.get("os", "N/A"),
            "screen_resolution": data.get("screen_resolution", "N/A"),
            "location_city":     data.get("city", "N/A"),
            "local_hour":        int(data.get("local_hour", 0)),
            "session_id":        data.get("session_id", ""),
        }
        print(f"[DB] Salvăm login pentru user {employee_id}: {payload}")
        response = httpx.post(
            f"{SUPABASE_URL}/rest/v1/SafeSend_user_logs",
            headers=HEADERS,
            json=payload
        )
        print(f"[DB] Save status: {response.status_code} {response.text}")
    except Exception as e:
        print(f"[DB] Exception la save: {e}")