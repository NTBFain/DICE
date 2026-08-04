from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from typing import List, Optional
from pydantic import BaseModel
import calendar
from datetime import datetime, timedelta

from core.db import get_session
from core.auth import get_current_user
from models import User, MilestoneInvoice, Auction, AuctionType, Order, OrderStatus, ArtistProfile

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

class RevenueByPeriod(BaseModel):
    period: str
    revenue: float

class AnalyticsResponse(BaseModel):
    revenue_data: List[RevenueByPeriod]
    adoptable_revenue: float
    commission_revenue: float
    average_winning_bid: float
    completed_orders_count: int = 0
    total_clients_count: int = 0

@router.get("", response_model=AnalyticsResponse)
def get_analytics(period: str = "month", session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == current_user.id)).first()
    artist_id = profile.id if profile else (current_user.id if current_user.is_artist else None)
    
    # Define start and end dates based on period
    if period == "week":
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=6, hours=23, minutes=59, seconds=59)
    elif period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        _, last_day = calendar.monthrange(now.year, now.month)
        end_date = start_date.replace(day=last_day, hour=23, minute=59, second=59)
    elif period == "quarter":
        current_quarter = (now.month - 1) // 3 + 1
        start_month = 3 * current_quarter - 2
        start_date = now.replace(month=start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
        end_month = start_month + 2
        _, last_day = calendar.monthrange(now.year, end_month)
        end_date = now.replace(month=end_month, day=last_day, hour=23, minute=59, second=59)
    elif period == "year":
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end_date = now.replace(month=12, day=31, hour=23, minute=59, second=59)
    else:
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        _, last_day = calendar.monthrange(now.year, now.month)
        end_date = start_date.replace(day=last_day, hour=23, minute=59, second=59)

    # 1. Revenue from paid invoices within the time frame
    inv_statement = select(MilestoneInvoice).where(
        MilestoneInvoice.is_paid == True,
        MilestoneInvoice.created_at >= start_date,
        MilestoneInvoice.created_at <= end_date
    )
    if not current_user.is_admin and artist_id:
        inv_statement = inv_statement.join(Order).where((Order.artist_id == artist_id) | (Order.artist_id == current_user.id))
        
    invoices = session.exec(inv_statement).all()
    
    period_data = {}
    if period == "week":
        for d in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]:
            period_data[d] = 0
    elif period == "month":
        for w in range(1, 6):
            period_data[f"Week {w}"] = 0
    elif period == "quarter":
        for m in range(start_date.month, end_date.month + 1):
            period_data[calendar.month_abbr[m]] = 0
    elif period == "year":
        for m in range(1, 13):
            period_data[calendar.month_abbr[m]] = 0

    for inv in invoices:
        dt = inv.created_at
        if period == "week":
            period_str = dt.strftime("%a")
        elif period == "month":
            week_num = (dt.day - 1) // 7 + 1
            period_str = f"Week {week_num}"
        elif period in ["quarter", "year"]:
            period_str = dt.strftime("%b")
            
        if period_str in period_data:
            period_data[period_str] += inv.amount
        
    revenue_data = [{"period": k, "revenue": v} for k, v in period_data.items()]
    
    # 2. Commission revenue sum
    comm_sum_query = select(func.sum(MilestoneInvoice.amount)).where(MilestoneInvoice.is_paid == True)
    if not current_user.is_admin and artist_id:
        comm_sum_query = comm_sum_query.join(Order).where((Order.artist_id == artist_id) | (Order.artist_id == current_user.id))
    commission_revenue = session.exec(comm_sum_query).first() or 0.0

    # 3. Adoptable Auctions revenue
    auc_sum_query = select(func.sum(Auction.winning_bid)).where(
        Auction.winning_bid != None,
        Auction.auction_type == AuctionType.ADOPTABLE
    )
    if not current_user.is_admin and artist_id:
        auc_sum_query = auc_sum_query.where((Auction.artist_id == artist_id) | (Auction.artist_id == current_user.id))
    adoptable_revenue = session.exec(auc_sum_query).first() or 0.0

    # 4. Average bid / order stats
    auc_stats_query = select(func.sum(Auction.winning_bid), func.count(Auction.id)).where(Auction.winning_bid != None)
    if not current_user.is_admin and artist_id:
        auc_stats_query = auc_stats_query.where((Auction.artist_id == artist_id) | (Auction.artist_id == current_user.id))
    stats = session.exec(auc_stats_query).first()
    
    total_bids = stats[0] if stats and stats[0] else 0.0
    count_bids = stats[1] if stats and stats[1] else 0
    avg_bid = total_bids / count_bids if count_bids > 0 else 0.0
    
    # 5. Completed orders & clients count
    order_query = select(Order)
    if not current_user.is_admin and artist_id:
        order_query = order_query.where((Order.artist_id == artist_id) | (Order.artist_id == current_user.id))
    orders = session.exec(order_query).all()
    
    completed_orders = len([o for o in orders if o.status == OrderStatus.COMPLETED])
    unique_clients = len(set([o.client_id for o in orders]))
    
    return AnalyticsResponse(
        revenue_data=revenue_data,
        adoptable_revenue=adoptable_revenue,
        commission_revenue=commission_revenue,
        average_winning_bid=avg_bid,
        completed_orders_count=completed_orders,
        total_clients_count=unique_clients
    )

