import asyncio
from core.db import engine
from sqlmodel import Session
from api.routers.analytics import get_analytics

def run():
    with Session(engine) as session:
        res = get_analytics(period="month", session=session, admin_user=None)
        print(res)

run()
