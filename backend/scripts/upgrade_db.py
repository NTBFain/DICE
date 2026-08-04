import sqlite3

def upgrade_db():
    conn = sqlite3.connect('test.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE artwork ADD COLUMN work_type VARCHAR DEFAULT 'ILLUSTRATION'")
        print("Added work_type")
    except Exception as e:
        print("work_type error:", e)
        
    try:
        cursor.execute("ALTER TABLE artwork ADD COLUMN character_id INTEGER REFERENCES character(id)")
        print("Added character_id")
    except Exception as e:
        print("character_id error:", e)

    try:
        cursor.execute("ALTER TABLE \"order\" ADD COLUMN start_date DATETIME")
        print("Added order start_date")
    except Exception as e:
        print("order start_date error:", e)

    try:
        cursor.execute("ALTER TABLE \"order\" ADD COLUMN due_date DATETIME")
        print("Added order due_date")
    except Exception as e:
        print("order due_date error:", e)

    conn.commit()
    conn.close()

if __name__ == '__main__':
    upgrade_db()
