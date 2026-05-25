import sqlite3
import os

DB = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'dev.db')
DB = os.path.abspath(DB)
print('DB file:', DB)
conn = sqlite3.connect(DB)
cur = conn.cursor()
cur.execute("PRAGMA table_info(jobs)")
cols = [r[1] for r in cur.fetchall()]
print('existing columns:', cols)
changes = []
if 'experience_min' not in cols:
    cur.execute("ALTER TABLE jobs ADD COLUMN experience_min INTEGER")
    changes.append('experience_min')
if 'experience_max' not in cols:
    cur.execute("ALTER TABLE jobs ADD COLUMN experience_max INTEGER")
    changes.append('experience_max')
conn.commit()
print('added:', changes)
conn.close()
