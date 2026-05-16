# vpn_checker.py
def check_ip(ip: str):

    bad_ips = [
        "10.0.0.1",
        "123.123.123.123"
    ]

    if ip in bad_ips:

        return {
            "vpn": True,
            "proxy": True,
            "tor": False
        }

    return {
        "vpn": False,
        "proxy": False,
        "tor": False
    }