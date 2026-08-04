import urllib.request
import urllib.error

try:
    print(urllib.request.urlopen('http://127.0.0.1:8080/api/portfolio').read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code}")
    print(e.read().decode())
except Exception as e:
    print(f"Error: {e}")
