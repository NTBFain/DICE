"""Create the first local administrator without passwords in command arguments."""
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from pydantic import TypeAdapter, EmailStr
from sqlmodel import Session, select
from core.db import engine, init_db
from core.auth import get_password_hash
from models import User


def create_first_admin(session, email, name, password):
    if session.exec(select(User).where(User.is_admin == True)).first():
        raise ValueError('An administrator already exists. Use the existing administrator account.')
    email = str(TypeAdapter(EmailStr).validate_python(email.strip())).lower()
    if session.exec(select(User).where(User.email == email)).first():
        raise ValueError('This email already belongs to an account; it will not be promoted automatically.')
    if len(password) < 12 or len(password) > 128 or not name.strip():
        raise ValueError('Enter a name and a password of 12–128 characters.')
    user = User(email=email, full_name=name.strip(), hashed_password=get_password_hash(password), is_admin=True)
    session.add(user);session.commit()


if __name__ == '__main__':
    if '--help' in sys.argv:
        print('Run from the backend working directory: uv run python ../scripts/create_admin.py')
        raise SystemExit(0)
    init_db()
    with Session(engine) as session:
        if session.exec(select(User).where(User.is_admin == True)).first():
            raise SystemExit('An administrator already exists. No accounts changed.')
        email=input('Administrator email: ')
        name=input('Display name: ')
        password=getpass.getpass('Password (12–128 characters): ')
        if password != getpass.getpass('Confirm password: '):
            raise SystemExit('Passwords differ. No accounts changed.')
        try:create_first_admin(session,email,name,password)
        except ValueError as error:raise SystemExit(str(error)) from error
        print('First administrator created. Password was not displayed or saved as plaintext.')
