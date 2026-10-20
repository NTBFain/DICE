from fastapi import APIRouter

from .auth import router as auth_router
from .system import router as system_router
from .portfolio import router as portfolio_router
from .orders import router as orders_router
from .auctions import router as auctions_router
from .analytics import router as analytics_router
from .characters import router as characters_router
from .notifications import router as notifications_router
from .artists import router as artists_router
from .commissions import router as commissions_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(system_router)
api_router.include_router(portfolio_router)
api_router.include_router(orders_router)
api_router.include_router(auctions_router)
api_router.include_router(analytics_router)
api_router.include_router(characters_router)
api_router.include_router(notifications_router)
api_router.include_router(artists_router)
api_router.include_router(commissions_router)
