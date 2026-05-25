import requests

BASE = "http://127.0.0.1:5000"
login = requests.post(BASE + "/api/auth/login", json={"email": "demo_recruiter@example.com", "password": "password"})
print('login status', login.status_code, login.text)
if login.status_code != 200:
    raise SystemExit(1)
token = login.json().get('access_token')
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
job = {
    'title': 'Python Test Job',
    'description': 'Posted via test script',
    'location': 'Hyderabad',
    'job_type': 'Full-time',
    'skills_required': 'Python,Flask',
    'salary_min': 60000,
    'salary_max': 100000,
    'experience_min': 2,
    'experience_max': 5,
}
resp = requests.post(BASE + '/api/jobs', json=job, headers=headers)
print('create status', resp.status_code)
try:
    print(resp.json())
except Exception:
    print(resp.text)
