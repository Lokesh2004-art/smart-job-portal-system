import sqlite3, os
DB = os.path.abspath('backend/instance/dev.db')
print('DB', DB)
conn = sqlite3.connect(DB)
cur = conn.cursor()
cur.execute('SELECT id, job_id, seeker_id, status FROM applications ORDER BY id DESC')
for row in cur.fetchall():
    print(row)
conn.close()
