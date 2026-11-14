import unittest
from isolated_app import isolated_client

class LoginApiTests(unittest.TestCase):
    def test_demo_login_and_incorrect_password_use_disposable_database(self):
        with isolated_client(demo=True) as (client,_):
            for role in ('admin','artist','client'):
                response=client.post('/api/auth/login',json={'email':role+'@example.com','password':'password123'})
                self.assertEqual(response.status_code,200);self.assertTrue(response.json()['access_token'])
            self.assertEqual(client.post('/api/auth/login',json={'email':'admin@example.com','password':'wrong'}).status_code,401)

if __name__=='__main__':unittest.main()
