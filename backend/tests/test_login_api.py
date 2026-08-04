import urllib.request
import json

req = urllib.request.Request("http://127.0.0.1:8080/api/auth/login", method="POST")
req.add_header('Content-Type', 'application/json')
data = json.dumps({"email": "admin@example.com", "password": "password123"}).encode('utf-8')

try:
    with urllib.request.urlopen(req, data=data) as response:
        res = response.read().decode('utf-8')
        print("LOGIN:", response.status, res)
except Exception as e:
    print(e)
