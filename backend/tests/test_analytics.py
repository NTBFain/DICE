import unittest
from isolated_app import isolated_client

class AnalyticsApiTests(unittest.TestCase):
    def test_admin_periods_are_read_from_disposable_database(self):
        with isolated_client(demo=True) as (client,_):
            response=client.post('/api/auth/login',json={'email':'admin@example.com','password':'password123'})
            self.assertEqual(response.status_code,200)
            headers={'Authorization':'Bearer '+response.json()['access_token']}
            for period in ('week','month','quarter','year'):
                self.assertEqual(client.get('/api/analytics?period='+period,headers=headers).status_code,200)

if __name__=='__main__':unittest.main()
