"""Public artist statistics count verified completed orders using owner user IDs."""
import unittest
from sqlalchemy import event
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel,Session,create_engine
from api.routers.artists import get_artists,get_artist_by_handle
from models import User,ArtistProfile,Order,OrderStatus

class PublicArtistOrderCountTests(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
        @event.listens_for(self.engine,'connect')
        def foreign_keys(connection,record):connection.execute('PRAGMA foreign_keys=ON')
        SQLModel.metadata.create_all(self.engine);self.session=Session(self.engine)
        self.client=User(email='client@counts.test',full_name='Client',hashed_password='unused')
        self.artist=User(email='artist@counts.test',full_name='Artist',hashed_password='unused',is_artist=True)
        self.other=User(email='other@counts.test',full_name='Other',hashed_password='unused',is_artist=True)
        self.session.add_all([self.client,self.artist,self.other]);self.session.commit()
        self.profile=ArtistProfile(user_id=self.artist.id,handle='counts_artist',display_name='Artist A',tagline='',bio='',total_completed_orders=99)
        self.other_profile=ArtistProfile(user_id=self.other.id,handle='counts_other',display_name='Artist B',tagline='',bio='',total_completed_orders=99)
        self.session.add_all([self.profile,self.other_profile]);self.session.commit()
        self.assertEqual(self.artist.id,self.other_profile.id)

    def tearDown(self):self.session.close();self.engine.dispose()

    def order(self,artist,status):
        order=Order(title='QA',description='QA',artist_id=artist.id,client_id=self.client.id,status=status)
        self.session.add(order);self.session.commit();return order

    def test_profile_and_directory_ignore_stale_counters_and_separate_owners(self):
        self.order(self.artist,OrderStatus.COMPLETED);self.order(self.artist,OrderStatus.COMPLETED)
        self.order(self.artist,OrderStatus.PENDING);self.order(self.other,OrderStatus.COMPLETED)
        profiles=get_artists(session=self.session)
        self.assertEqual({p.handle:p.total_completed_orders for p in profiles},{'counts_artist':2,'counts_other':1})
        self.assertEqual(get_artist_by_handle('counts_artist',self.session).total_completed_orders,2)
        self.assertEqual(get_artist_by_handle('counts_other',self.session).total_completed_orders,1)

    def test_count_tracks_actual_completion_changes(self):
        order=self.order(self.artist,OrderStatus.PENDING)
        self.assertEqual(get_artist_by_handle('counts_artist',self.session).total_completed_orders,0)
        order.status=OrderStatus.COMPLETED;self.session.add(order);self.session.commit()
        self.assertEqual(get_artist_by_handle('counts_artist',self.session).total_completed_orders,1)
        order.status=OrderStatus.CANCELLED;self.session.add(order);self.session.commit()
        self.assertEqual(get_artist_by_handle('counts_artist',self.session).total_completed_orders,0)

    def test_ownerless_legacy_profile_cannot_inherit_a_colliding_users_orders(self):
        self.order(self.other,OrderStatus.COMPLETED)
        legacy=ArtistProfile(handle='counts_legacy',display_name='Legacy',tagline='',bio='',total_completed_orders=999)
        self.session.add(legacy);self.session.commit();self.assertEqual(legacy.id,self.other.id)
        self.assertEqual(get_artist_by_handle('counts_legacy',self.session).total_completed_orders,0)
        profiles=get_artists(session=self.session)
        self.assertEqual(next(p.total_completed_orders for p in profiles if p.handle=='counts_legacy'),0)

if __name__=='__main__':unittest.main()
