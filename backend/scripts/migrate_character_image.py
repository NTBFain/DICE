import sqlite3

def add_image_url_to_character():
    conn = sqlite3.connect('test.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE character ADD COLUMN image_url VARCHAR")
        print("Successfully added image_url to character table.")
    except sqlite3.OperationalError as e:
        print(f"Error (might already exist): {e}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    add_image_url_to_character()
