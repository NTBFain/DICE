import io
import json
import unittest
from datetime import datetime, timedelta, timezone

from PIL import Image
from sqlmodel import Session

from isolated_app import isolated_client
from models import Auction


class AdoptableDeliveryTests(unittest.TestCase):
    def setUp(self):
        context = isolated_client(demo=True)
        self.http, self.engine = context.__enter__()
        self.addCleanup(context.__exit__, None, None, None)
        self.headers = {}
        for role in ('client', 'artist'):
            response = self.http.post('/api/auth/login', json={
                'email': f'{role}@example.com', 'password': 'password123',
            })
            self.assertEqual(response.status_code, 200)
            self.headers[role] = {'Authorization': f"Bearer {response.json()['access_token']}"}
        image = io.BytesIO()
        Image.new('RGB', (2, 2), 'blue').save(image, 'PNG')
        self.original = image.getvalue()
        now = datetime.now(timezone.utc)
        self.listing = {
            'title': 'Isolated artwork', 'description': 'Personal display rights',
            'auction_type': 'ADOPTABLE', 'starting_bid': 100, 'bid_increment': 50, 'auto_buy': 200,
            'start_time': (now - timedelta(minutes=1)).isoformat(),
            'end_time': (now + timedelta(hours=1)).isoformat(),
        }

    def launch(self, private_original=True):
        if private_original:
            response = self.http.post('/api/auctions/with-original', headers=self.headers['artist'],
                                      data={'listing': json.dumps(self.listing)},
                                      files={'original': ('original.png', self.original, 'image/png')})
        else:
            response = self.http.post('/api/auctions', headers=self.headers['artist'], json=self.listing)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertNotIn('original_key', response.json())
        return response.json()['id']

    def win(self, auction_id, *, auto_buy=True):
        response = self.http.post(f'/api/auctions/{auction_id}/bid', headers=self.headers['client'],
                                  json={'amount': 200 if auto_buy else 100, 'auto_buy': auto_buy})
        self.assertEqual(response.status_code, 200, response.text)
        if not auto_buy:
            with Session(self.engine) as session:
                auction = session.get(Auction, auction_id)
                auction.end_time = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=1)
                session.add(auction)
                session.commit()
            self.http.get(f'/api/auctions/{auction_id}')
        orders = self.http.get('/api/orders', headers=self.headers['client']).json()
        return next(order for order in orders if order['auction_id'] == auction_id)

    def approve(self, order):
        invoices = self.http.get(f"/api/orders/{order['id']}/invoices", headers=self.headers['client']).json()
        self.assertEqual(len(invoices), 1)
        result = self.http.post(f"/api/invoices/{invoices[0]['id']}/approve", headers=self.headers['artist'])
        self.assertEqual(result.status_code, 200, result.text)

    def test_original_is_required_and_both_winning_paths_unlock_after_payment(self):
        artist = self.headers['artist']
        buyer = self.headers['client']
        self.assertEqual(self.http.post('/api/auctions', json=self.listing, headers=artist).status_code, 422)
        for auto_buy in (True, False):
            with self.subTest(auto_buy=auto_buy):
                order = self.win(self.launch(), auto_buy=auto_buy)
                self.assertEqual(order['auction_type'], 'ADOPTABLE')
                order_url = f"/api/orders/{order['id']}"
                final = next(file for file in self.http.get(f'{order_url}/files', headers=buyer).json()
                             if file['file_type'] == 'FINAL')
                download = f"{order_url}/files/{final['id']}/download"
                self.assertEqual(self.http.get(download, headers=buyer).status_code, 402)
                self.assertEqual(self.http.get(download).status_code, 401)
                self.assertEqual(self.http.get(f"/api/auctions/images/{final['s3_key']}").status_code, 404)
                self.approve(order)
                self.assertEqual(self.http.get(order_url, headers=buyer).json()['status'], 'COMPLETED')
                self.assertEqual(self.http.get(download, headers=buyer).content, self.original)
                collection = self.http.get('/api/auth/me/collection', headers=buyer).json()
                self.assertTrue(any(item['order_id'] == order['id'] for item in collection))

    def test_legacy_paid_purchase_completes_on_upload_and_commission_slot_stays_accepted(self):
        self.listing['auction_type'] = 'COMMISSION_SLOT'
        commission = self.win(self.launch(private_original=False))
        self.approve(commission)
        self.assertEqual(self.http.get(f"/api/orders/{commission['id']}", headers=self.headers['client']).json()['status'], 'ACCEPTED')

        auction_id = self.launch(private_original=False)
        with Session(self.engine) as session:
            auction = session.get(Auction, auction_id)
            auction.auction_type = 'ADOPTABLE'
            session.add(auction)
            session.commit()
        legacy = self.win(auction_id)
        self.approve(legacy)
        order_url = f"/api/orders/{legacy['id']}"
        self.assertEqual(self.http.get(order_url, headers=self.headers['client']).json()['status'], 'ACCEPTED')
        result = self.http.post(f'{order_url}/files', headers=self.headers['artist'], data={'file_type': 'FINAL'},
                                files={'file': ('original.png', self.original, 'image/png')})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(self.http.get(order_url, headers=self.headers['client']).json()['status'], 'COMPLETED')
