import urllib.request
import json

# Login
req = urllib.request.Request("http://127.0.0.1:8000/api/auth/login", method="POST")
req.add_header('Content-Type', 'application/json')
data = json.dumps({"email": "admin@example.com", "password": "password123"}).encode('utf-8')

try:
    with urllib.request.urlopen(req, data=data) as response:
        res = json.loads(response.read().decode('utf-8'))
        token = res["access_token"]
        
        # Test analytics
        for period in ["week", "month", "quarter", "year"]:
            req2 = urllib.request.Request(f"http://127.0.0.1:8000/api/analytics?period={period}", method="GET")
            req2.add_header("Authorization", f"Bearer {token}")
            with urllib.request.urlopen(req2) as resp2:
                print(period, resp2.status, resp2.read().decode('utf-8')[:100])
except urllib.error.HTTPError as e:
    print(e.code, e.read().decode('utf-8'))
except Exception as e:
    print(e)
