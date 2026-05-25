import requests
try:
    r = requests.get('http://127.0.0.1:5000/api/health', timeout=5)
    print('health', r.status_code, r.text)
except Exception as e:
    print('health ERROR', e)
