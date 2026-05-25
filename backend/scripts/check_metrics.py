import requests
import sys

def main():
    try:
        r = requests.post('http://127.0.0.1:5000/api/auth/login', json={'email':'demo_recruiter@example.com','password':'password'}, timeout=10)
        print('login status', r.status_code)
        data = r.json()
        print('user:', data.get('user'))
        token = data.get('access_token')
        if not token:
            print('No token returned; aborting')
            return
        headers = {'Authorization': f'Bearer {token}'}
        m = requests.get('http://127.0.0.1:5000/api/recruiter/metrics', headers=headers, timeout=10)
        print('metrics status', m.status_code)
        print(m.json())
    except Exception as e:
        print('ERROR', e)
        sys.exit(1)

if __name__ == '__main__':
    main()
