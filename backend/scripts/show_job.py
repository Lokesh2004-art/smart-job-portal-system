import sqlite3, os
DB = os.path.abspath('backend/instance/dev.db')
conn = sqlite3.connect(DB)
cur = conn.cursor()
cur.execute('SELECT id, title, recruiter_id FROM jobs')
for r in cur.fetchall():
    print(r)
conn.close()
