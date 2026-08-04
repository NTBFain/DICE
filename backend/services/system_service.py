from sqlmodel import Session
from models import SystemSetting

def get_setting(session: Session, key: str, default: str) -> str:
    setting = session.get(SystemSetting, key)
    if not setting:
        setting = SystemSetting(key=key, value=default)
        session.add(setting)
        session.commit()
        session.refresh(setting)
    return setting.value

def set_setting(session: Session, key: str, value: str):
    setting = session.get(SystemSetting, key)
    if not setting:
        setting = SystemSetting(key=key, value=value)
    else:
        setting.value = value
    session.add(setting)
    session.commit()
