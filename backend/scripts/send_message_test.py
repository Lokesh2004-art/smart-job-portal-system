import requests
BASE = 'http://127.0.0.1:5000'
login = requests.post(BASE + '/api/auth/login', json={'email':'demo_recruiter@example.com','password':'password'})
print('login', login.status_code)
if login.status_code != 200:
    print(login.text)
    raise SystemExit(1)
token = login.json()['access_token']
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
app_id = 1
resp = requests.post(f'{BASE}/api/applications/{app_id}/message', json={'message': 'Hello, we liked your profile. Can we schedule a quick call?'}, headers=headers)
print('status', resp.status_code)
print(resp.text)
