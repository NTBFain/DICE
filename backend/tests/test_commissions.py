import unittest
from datetime import datetime, timedelta
from sqlmodel import SQLModel, create_engine, Session, select
from fastapi import HTTPException

from core.time import utcnow
from core.auth import get_password_hash
from models import (
    User, ArtistProfile, ArtistService, Order, OrderStatus,
    MilestoneInvoice, Notification, NotificationType
)
from models.commission import (
    ArtistCommissionPolicy, ServiceAddon, AddonPriceType,
    CommissionRequest, CommissionRequestStatus, CommissionSlotSubscription
)
from services.commission_service import (
    count_used_slots, get_effective_status, compute_total_price,
    accept_commission_request, dispatch_slot_opening_alert
)

class TestCommissionLogic(unittest.TestCase):
    def setUp(self):
        # High-speed in-memory SQLite database
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        SQLModel.metadata.create_all(self.engine)
        self.session = Session(self.engine)

        # Create artist user and client user
        self.artist_user = User(
            email="artist@test.com",
            full_name="Master Artist",
            hashed_password=get_password_hash("pass123"),
            is_artist=True
        )
        self.client_user = User(
            email="client@test.com",
            full_name="Valued Client",
            hashed_password=get_password_hash("pass123")
        )
        self.session.add_all([self.artist_user, self.client_user])
        self.session.commit()
        self.session.refresh(self.artist_user)
        self.session.refresh(self.client_user)

        # Create ArtistProfile
        self.profile = ArtistProfile(
            user_id=self.artist_user.id,
            handle="master_art",
            display_name="Master Art Studio",
            tagline="Top Quality Commissions",
            bio="Digital artist",
            commission_status="OPEN",
            starting_price=1000.0
        )
        self.session.add(self.profile)
        self.session.commit()
        self.session.refresh(self.profile)

        # Create ArtistCommissionPolicy
        self.policy = ArtistCommissionPolicy(
            artist_id=self.profile.id,
            terms_of_service="No refunds after sketching. No AI training allowed.",
            refund_policy="50% before coloring.",
            will_draw=["OC", "Anime", "VTuber"],
            wont_draw=["NSFW", "Mecha"],
            deposit_percent=50,
            default_revision_quota=3
        )
        self.session.add(self.policy)

        # Create Commission Scale/Service
        self.service = ArtistService(
            artist_id=self.profile.id,
            title="Full-Body Character",
            category="FULL_BODY",
            description="Detailed full body artwork",
            base_price=2000.0,
            estimated_days=14,
            max_slots=2,
            is_form_open=True,
            auto_close_on_full=True
        )
        self.session.add(self.service)
        self.session.commit()
        self.session.refresh(self.service)

    def tearDown(self):
        self.session.close()

    def test_price_computation_server_side(self):
        # Create fixed and percentage addons
        addon_fixed = ServiceAddon(
            service_id=self.service.id,
            name="Detailed Background",
            price_type=AddonPriceType.FIXED,
            price_value=500.0
        )
        addon_pct = ServiceAddon(
            service_id=self.service.id,
            name="Commercial Rights",
            price_type=AddonPriceType.PERCENTAGE,
            price_value=50.0  # +50% of 2000 = 1000
        )
        self.session.add_all([addon_fixed, addon_pct])
        self.session.commit()

        total, snapshots = compute_total_price(self.service, [addon_fixed, addon_pct])
        # Base (2000) + Fixed (500) + 50% (1000) = 3500.0
        self.assertEqual(total, 3500.0)
        self.assertEqual(len(snapshots), 2)

    def test_dynamic_used_slots_and_no_drift(self):
        # 0 active orders initially
        self.assertEqual(count_used_slots(self.session, self.service.id), 0)

        # Create active order
        order1 = Order(
            title="Commission 1",
            description="desc",
            status=OrderStatus.ACCEPTED,
            agreed_price=2000.0,
            client_id=self.client_user.id,
            artist_id=self.artist_user.id,
            service_id=self.service.id
        )
        self.session.add(order1)
        self.session.commit()

        self.assertEqual(count_used_slots(self.session, self.service.id), 1)

        # Mark order as completed -> slot automatically released!
        order1.status = OrderStatus.COMPLETED
        self.session.add(order1)
        self.session.commit()

        self.assertEqual(count_used_slots(self.session, self.service.id), 0)

    def test_effective_status_evaluation(self):
        # 1. Normal Open
        self.assertEqual(get_effective_status(self.profile, self.service, 0), "OPEN")

        # 2. Waitlist profile
        self.profile.commission_status = "WAITLIST"
        self.assertEqual(get_effective_status(self.profile, self.service, 0), "WAITLIST")
        self.profile.commission_status = "OPEN"

        # 3. Form closed on scale
        self.service.is_form_open = False
        self.assertEqual(get_effective_status(self.profile, self.service, 0), "CLOSED")
        self.service.is_form_open = True

        # 4. Slots full (2/2)
        self.assertEqual(get_effective_status(self.profile, self.service, 2), "FULL")

    def test_accept_request_creates_order_and_invoices(self):
        # Create a pending request
        req = CommissionRequest(
            service_id=self.service.id,
            client_id=self.client_user.id,
            artist_user_id=self.artist_user.id,
            status=CommissionRequestStatus.PENDING,
            character_name="Elysia",
            usage_type="PERSONAL",
            brief="Character with pink hair and dual daggers",
            canvas_size="Portrait (9:16)",
            total_price=2500.0,
            base_price_snapshot=2000.0,
            tos_snapshot=self.policy.terms_of_service,
            tos_version=1
        )
        self.session.add(req)
        self.session.commit()
        self.session.refresh(req)

        order = accept_commission_request(self.session, req.id, self.artist_user.id)

        # Verify Order creation
        self.assertIsNotNone(order.id)
        self.assertEqual(order.agreed_price, 2500.0)
        self.assertEqual(order.revision_quota, 3)
        self.assertEqual(order.status, OrderStatus.ACCEPTED)
        self.assertEqual(order.service_id, self.service.id)

        # Verify Milestone Invoices (50% deposit and 50% final)
        invoices = self.session.exec(select(MilestoneInvoice).where(MilestoneInvoice.order_id == order.id)).all()
        self.assertEqual(len(invoices), 2)
        self.assertEqual(invoices[0].amount, 1250.0)
        self.assertEqual(invoices[1].amount, 1250.0)

        # Verify Request Status updated
        self.session.refresh(req)
        self.assertEqual(req.status, CommissionRequestStatus.ACCEPTED)
        self.assertEqual(req.order_id, order.id)

        # Double accept should raise 409 Conflict
        with self.assertRaises(HTTPException) as ctx:
            accept_commission_request(self.session, req.id, self.artist_user.id)
        self.assertEqual(ctx.exception.status_code, 409)

    def test_accept_auto_close_on_full(self):
        # Service has max_slots = 2.
        # Add 1 existing active order
        order_existing = Order(
            title="Existing Order",
            description="desc",
            status=OrderStatus.SKETCHING,
            client_id=self.client_user.id,
            artist_id=self.artist_user.id,
            service_id=self.service.id
        )
        self.session.add(order_existing)
        self.session.commit()

        # Create request for the 2nd (final) slot
        req2 = CommissionRequest(
            service_id=self.service.id,
            client_id=self.client_user.id,
            artist_user_id=self.artist_user.id,
            status=CommissionRequestStatus.PENDING,
            character_name="Kiana",
            usage_type="PERSONAL",
            brief="Brief 2",
            total_price=2000.0,
            base_price_snapshot=2000.0
        )
        self.session.add(req2)
        self.session.commit()
        self.session.refresh(req2)

        # Accepting 2nd request fills the last slot -> should auto-close is_form_open
        accept_commission_request(self.session, req2.id, self.artist_user.id)

        self.session.refresh(self.service)
        self.assertFalse(self.service.is_form_open)

    async def async_slot_alert_test(self):
        # Subscribe client to artist slots
        sub = CommissionSlotSubscription(
            user_id=self.client_user.id,
            artist_id=self.profile.id,
            service_id=self.service.id,
            is_active=True
        )
        self.session.add(sub)
        self.session.commit()

        # Dispatch alert
        count = await dispatch_slot_opening_alert(self.session, self.service, self.profile, notify_followers=True)
        self.assertEqual(count, 1)

        # Check notification created in DB
        notifs = self.session.exec(select(Notification).where(Notification.user_id == self.client_user.id)).all()
        self.assertEqual(len(notifs), 1)
        self.assertEqual(notifs[0].type, NotificationType.COMMISSION)

        # Second dispatch immediately should be blocked by cooldown (returns 0)
        count_cooldown = await dispatch_slot_opening_alert(self.session, self.service, self.profile, notify_followers=True)
        self.assertEqual(count_cooldown, 0)

    def test_slot_opening_alert_cooldown_wrapper(self):
        import asyncio
        asyncio.run(self.async_slot_alert_test())

if __name__ == "__main__":
    unittest.main()
