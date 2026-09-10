from sqlmodel import Session
from models import SystemSetting

def get_setting(session: Session, key: str, default: str) -> str:
    """Read a system setting without forcing premature transaction commits on the caller session."""
    setting = session.get(SystemSetting, key)
    if not setting:
        return default
    return setting.value

def set_setting(session: Session, key: str, value: str):
    setting = session.get(SystemSetting, key)
    if not setting:
        setting = SystemSetting(key=key, value=value)
    else:
        setting.value = value
    session.add(setting)
    session.commit()
