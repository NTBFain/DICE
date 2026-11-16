"""HTTP boundaries use real handlers and a disposable database, media and role actors."""
import io,json,sys,unittest
from pathlib import Path
from datetime import timedelta
from PIL import Image
from pypdf import PdfWriter
from sqlmodel import Session,select
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'backend/tests'))
from isolated_app import isolated_client
from models import User,ArtistProfile,ArtistService,Order,OrderStatus,MilestoneInvoice,File,Artwork,Character
from models.commission import CommissionRequest,ArtistCommissionPolicy
from core.auth import get_password_hash,create_access_token
from core.time import utcnow

def png():
    buffer=io.BytesIO();Image.new('RGB',(8,8),'blue').save(buffer,format='PNG');return buffer.getvalue()

class RoleBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.context=isolated_client(demo=True);self.http,self.engine=self.context.__enter__();self.addCleanup(self.context.__exit__,None,None,None)
        self.headers={}
        for role in ('client','artist','admin'):
            response=self.http.post('/api/auth/login',json={'email':role+'@example.com','password':'password123'});self.assertEqual(response.status_code,200)
            self.headers[role]={'Authorization':'Bearer '+response.json()['access_token']}
        with Session(self.engine) as session:
            self.owner=session.exec(select(User).where(User.email=='client@example.com')).one().id
            self.artist=session.exec(select(User).where(User.email=='artist@example.com')).one().id
            profile=session.exec(select(ArtistProfile).where(ArtistProfile.user_id==self.artist)).one();self.profile=profile.id
            other=User(email='other-boundary@qa.test',hashed_password=get_password_hash('LocalQA-2026-Test'),full_name='Other',is_artist=True)
            session.add(other);session.commit();self.other=other.id
            other_profile=ArtistProfile(user_id=other.id,handle='boundary_other',display_name='Other',tagline='',bio='');session.add(other_profile)
            service=ArtistService(artist_id=self.profile,title='Boundary service',category='Art',description='',base_price=100.25,estimated_days=7,max_slots=10)
            session.add(service);session.commit();self.service=service.id
            order=Order(title='Boundary order',description='Private brief',client_id=self.owner,artist_id=self.artist,status=OrderStatus.SKETCHING,agreed_price=100,revision_quota=1)
            session.add(order);session.commit();self.order=order.id
            invoice=MilestoneInvoice(order_id=order.id,title='Full Payment',amount=100);session.add(invoice)
            session.commit();self.invoice=invoice.id
        self.headers['other']={'Authorization':'Bearer '+self.http.post('/api/auth/login',json={'email':'other-boundary@qa.test','password':'LocalQA-2026-Test'}).json()['access_token']}
    def send(self,method,path,role='client',**kwargs):return self.http.request(method,path,headers=self.headers[role],**kwargs)
    def submit(self,name='Boundary brief',files=None):
        payload={'service_id':self.service,'character_name':name,'brief':'Exact private request details','agreed_to_tos':True}
        return self.send('POST','/api/commissions/requests',data={'payload':json.dumps(payload)},files=files)
    def test_other_account_cannot_read_order_resources_or_commission_brief(self):
        created=self.submit();self.assertEqual(created.status_code,200);request=created.json()['id']
        self.assertEqual(self.send('POST',f'/api/invoices/{self.invoice}/pay',files={'slip':('proof.png',png(),'image/png')}).status_code,200)
        upload=self.send('POST',f'/api/orders/{self.order}/files','artist',data={'file_type':'FINAL'},files={'file':('original.png',png(),'image/png')});self.assertEqual(upload.status_code,200);fid=upload.json()['id']
        for path in [f'/api/orders/{self.order}',f'/api/orders/{self.order}/messages',f'/api/orders/{self.order}/invoices',f'/api/orders/{self.order}/files',f'/api/orders/{self.order}/files/{fid}/download',f'/api/invoices/{self.invoice}/slip',f'/api/commissions/requests/{request}']:
            with self.subTest(path=path):self.assertEqual(self.send('GET',path,'other').status_code,403)
        self.assertEqual(self.send('POST',f'/api/orders/{self.order}/messages','other',json={'content':'Intrusion'}).status_code,403)
    def test_client_cannot_perform_artist_or_admin_actions(self):
        actions=[('GET','/api/auth/users',{}),('PATCH',f'/api/orders/{self.order}',{'json':{'status':'COLORING'}}),('POST',f'/api/orders/{self.order}/invoices',{'json':{'title':'Forged','amount':1}}),('POST',f'/api/invoices/{self.invoice}/approve',{}),('POST','/api/commissions/status',{'json':{'open':False}}),('POST','/api/commissions/homepage_text',{'json':{'hero_tag':'Forged'}}),('PUT',f'/api/auth/users/{self.artist}/role',{'json':{'is_admin':True}}),('DELETE',f'/api/auth/users/{self.artist}',{})]
        for method,path,kwargs in actions:
            with self.subTest(path=path):self.assertEqual(self.send(method,path,**kwargs).status_code,403)
        self.assertEqual(self.send('POST','/api/portfolio',data={'title':'Forged'},files={'image':('x.png',png(),'image/png')}).status_code,403)
    def test_corrupt_and_oversized_uploads_do_not_mutate_records(self):
        cases=[('/api/auth/me/avatar','client','file',{},5), (f'/api/invoices/{self.invoice}/pay','client','slip',{},15),('/api/portfolio','artist','image',{'title':'Rejected'},25),('/api/characters','artist','image',{'name':'Rejected'},25)]
        for path,role,field,data,limit in cases:
            for content,expected in [(b'Corrupt PNG',400),(png()+b'0'*(limit*1024*1024),413)]:
                with self.subTest(path=path,size=len(content)):
                    response=self.send('POST',path,role,data=data,files={field:('invalid.png',content,'image/png')});self.assertEqual(response.status_code,expected,response.text[:200])
        with Session(self.engine) as session:
            self.assertIsNone(session.get(MilestoneInvoice,self.invoice).slip_image_url)
            self.assertEqual(session.exec(select(Artwork)).all(),[]);self.assertEqual(session.exec(select(Character)).all(),[])
        self.assertEqual([p for p in Path('uploads').rglob('*') if p.is_file()],[])
    def test_pdf_payment_proof_download_retains_bytes_and_requires_order_access(self):
        buffer=io.BytesIO();writer=PdfWriter();writer.add_blank_page(width=72,height=72);writer.write(buffer);content=buffer.getvalue()
        response=self.send('POST',f'/api/invoices/{self.invoice}/pay',files={'slip':('proof.pdf',content,'application/pdf')})
        self.assertEqual(response.status_code,200)
        proof=self.send('GET',f'/api/invoices/{self.invoice}/slip','artist')
        self.assertEqual(proof.status_code,200);self.assertEqual(proof.content,content)
        self.assertEqual(proof.headers['content-type'],'application/pdf')
        self.assertEqual(self.send('GET',f'/api/invoices/{self.invoice}/slip','other').status_code,403)
        rejected=self.send('POST',f'/api/invoices/{self.invoice}/pay',files={'slip':('invalid.png',b'corrupt','image/png')})
        self.assertEqual(rejected.status_code,400)
        self.assertEqual(self.send('GET',f'/api/invoices/{self.invoice}/slip','artist').content,content)

    def test_reference_count_size_and_partial_failure_cleanup(self):
        files=[('reference_files',(f'{i}.png',png(),'image/png')) for i in range(6)]
        self.assertEqual(self.submit(files=files).status_code,400)
        self.assertEqual(self.submit(files=[('reference_files',('large.png',png()+b'0'*(10*1024*1024),'image/png'))]).status_code,413)
        self.assertEqual(self.submit(files=[('reference_files',('valid.png',png(),'image/png')),('reference_files',('corrupt.png',b'corrupt','image/png'))]).status_code,400)
        with Session(self.engine) as session:self.assertEqual(session.exec(select(CommissionRequest)).all(),[])
        self.assertEqual(list(Path('uploads/references').glob('*')),[])
    def test_repeated_proposal_actions_and_capacity_change_are_rejected(self):
        rid=self.submit('Withdraw').json()['id'];self.assertEqual(self.send('POST',f'/api/commissions/requests/{rid}/withdraw').status_code,200)
        self.assertEqual(self.send('POST',f'/api/commissions/requests/{rid}/withdraw').status_code,409)
        self.assertEqual(self.send('POST',f'/api/commissions/requests/{rid}/accept','artist').status_code,409)
        rid=self.submit('Decline').json()['id'];self.assertEqual(self.send('POST',f'/api/commissions/requests/{rid}/decline','artist',json={'reason':'Unavailable this week'}).status_code,200)
        self.assertEqual(self.send('POST',f'/api/commissions/requests/{rid}/decline','artist',json={'reason':'Repeated'}).status_code,409)
        rid=self.submit('Capacity changed').json()['id']
        with Session(self.engine) as session:
            service=session.get(ArtistService,self.service);service.max_slots=1;session.add(service)
            session.add(Order(title='Occupied',description='Fixture',client_id=self.owner,artist_id=self.artist,service_id=self.service,status=OrderStatus.ACCEPTED));session.commit()
        self.assertEqual(self.send('POST',f'/api/commissions/requests/{rid}/accept','artist').status_code,409)
    def test_zero_half_and_full_deposits_preserve_request_price_and_terms(self):
        for percent,expected in [(0,[100.25]),(50,[50.13,50.12]),(100,[100.25])]:
            with self.subTest(deposit=percent):
                policy={'terms_of_service':'Agreed original terms '+str(percent),'deposit_percent':percent,'default_revision_quota':2}
                response=self.send('PUT','/api/artists/me/commission-policy','artist',json=policy);self.assertEqual(response.status_code,200)
                with Session(self.engine) as session:
                    service=session.get(ArtistService,self.service);service.base_price=100.25;session.add(service);session.commit()
                response=self.submit('Deposit '+str(percent));self.assertEqual(response.status_code,200);request=response.json()
                with Session(self.engine) as session:
                    service=session.get(ArtistService,self.service);service.base_price=999.99;session.add(service);session.commit()
                policy['terms_of_service']='Edited later terms';self.assertEqual(self.send('PUT','/api/artists/me/commission-policy','artist',json=policy).status_code,200)
                accepted=self.send('POST','/api/commissions/requests/'+str(request['id'])+'/accept','artist');self.assertEqual(accepted.status_code,200)
                order=self.send('GET','/api/orders/'+str(accepted.json()['order_id'])).json()
                self.assertEqual(order['agreed_price'],100.25);self.assertEqual(order['commission_brief']['tos_snapshot'],request['tos_snapshot'])
                invoices=self.send('GET','/api/orders/'+str(order['id'])+'/invoices').json()
                self.assertEqual([i['amount'] for i in invoices],expected);self.assertEqual(round(sum(i['amount'] for i in invoices),2),100.25)
                self.assertEqual(order['revision_quota'],2)
        for invalid in [-1,101]:
            self.assertEqual(self.send('PUT','/api/artists/me/commission-policy','artist',json={'deposit_percent':invalid}).status_code,422)

    def test_fixed_percentage_addons_and_cross_artist_modification(self):
        ids=[]
        for kind,price in [('FIXED',12.25),('PERCENTAGE',10.5)]:
            response=self.send('POST',f'/api/artists/me/services/{self.service}/addons','artist',json={'name':kind+' add-on','price_type':kind,'price_value':price})
            self.assertEqual(response.status_code,200);ids.append(response.json()['id'])
        payload={'service_id':self.service,'character_name':'Addon price','brief':'Keep selected add-ons','agreed_to_tos':True,'addon_ids':ids}
        response=self.send('POST','/api/commissions/requests',data={'payload':json.dumps(payload)});self.assertEqual(response.status_code,200)
        self.assertEqual(response.json()['total_price'],123.03);self.assertEqual(len(response.json()['addons_snapshot']),2)
        self.assertEqual(self.send('PATCH',f'/api/artists/me/services/{self.service}/addons/{ids[0]}','other',json={'price_value':0}).status_code,403)
        self.assertEqual(self.send('PATCH',f'/api/artists/me/services/{self.service}/addons/{ids[0]}','artist',json={'is_active':False}).status_code,200)
        saved=self.send('GET','/api/commissions/requests/'+str(response.json()['id'])).json()
        self.assertEqual(saved['total_price'],123.03);self.assertEqual(saved['addons_snapshot'][0]['price_value'],12.25)

    def test_all_eight_artwork_categories_roundtrip_for_artist_and_admin(self):
        for role in ('artist','admin'):
            for category in ('COMMISSION','FANART','VTUBER_MODEL','ILLUSTRATION','SKETCH','COMIC','LIVE2D','CONCEPT_ART'):
                with self.subTest(role=role,category=category):
                    response=self.send('POST','/api/portfolio',role,data={'title':'Category '+category,'work_type':category},files={'image':('sample.png',png(),'image/png')});self.assertEqual(response.status_code,200,response.text[:200]);item=response.json();self.assertEqual(item['work_type'],category)
                    public=self.http.get('/api/portfolio',params={'work_type':category}).json();self.assertIn(item['id'],[row['id'] for row in public])
                    self.assertEqual(self.send('PUT','/api/portfolio/'+str(item['id']),'other',data={'title':'Forbidden'}).status_code,403)
    def test_expired_session_and_empty_chat_and_revision_quota(self):
        token=create_access_token({'sub':'client@example.com'},expires_delta=timedelta(seconds=-1))
        self.assertEqual(self.http.get('/api/orders',headers={'Authorization':'Bearer '+token}).status_code,401)
        for suffix,payload in [('messages',{'content':'   '}),('revisions',{'client_feedback':'   '})]:
            with self.subTest(blank=suffix):self.assertEqual(self.send('POST',f'/api/orders/{self.order}/'+suffix,json=payload).status_code,400)
        first=self.send('POST',f'/api/orders/{self.order}/revisions',json={'client_feedback':'Please adjust the blue color.'});self.assertEqual(first.status_code,200)
        second=self.send('POST',f'/api/orders/{self.order}/revisions',json={'client_feedback':'Another revision'});self.assertEqual(second.status_code,400)
        self.assertEqual(self.send('POST','/api/revisions/'+str(first.json()['id'])+'/resolve','artist').status_code,200)

if __name__=='__main__':unittest.main()
