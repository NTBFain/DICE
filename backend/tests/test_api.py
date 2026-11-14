import unittest
from isolated_app import isolated_client

class PublicApiTests(unittest.TestCase):
    def test_empty_catalogue_uses_disposable_database(self):
        with isolated_client() as (client,_):
            response=client.get('/api/portfolio')
            self.assertEqual(response.status_code,200)
            self.assertEqual(response.json(),[])

if __name__=='__main__':unittest.main()
