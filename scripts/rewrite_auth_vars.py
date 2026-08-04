import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    # Import get_artist_user
    code = code.replace('from core.auth import get_current_user, get_admin_user', 'from core.auth import get_current_user, get_admin_user, get_artist_user')

    # Replace all Dependencies for admin_user -> artist_user
    code = re.sub(
        r'admin_user: User = Depends\(get_admin_user\)',
        r'artist_user: User = Depends(get_artist_user)',
        code
    )

    # In endpoints creating/modifying, replace admin_user usage
    code = code.replace('admin_user.id', 'artist_user.id')
    code = code.replace('admin_user.is_admin', 'artist_user.is_admin')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(code)

process_file('backend/api/routers/characters.py')
process_file('backend/api/routers/auctions.py')
print("Replaced variables!")
