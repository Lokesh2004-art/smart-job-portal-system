import sqlite3, os
DB = os.path.abspath('backend/instance/dev.db')
conn = sqlite3.connect(DB)
cur = conn.cursor()
cur.execute('SELECT id, user_id, type, message, job_id, application_id, created_at FROM notifications ORDER BY id DESC LIMIT 10')
for r in cur.fetchall():
    print(r)
conn.close()
