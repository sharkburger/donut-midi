import io,json,sqlite3,tempfile,threading,unittest,uuid,zipfile,http.client,csv
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'connector'))
from server import ConnectorServer, Feed, PUBLIC_ORIGIN
class StudyTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=Path(self.tmp.name)/'study.sqlite3';self.server=ConnectorServer(0,'t'*43,Feed(),data_path=self.path);self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start();self.sid=str(uuid.uuid4())
 def tearDown(self):self.server.shutdown();self.server.server_close();self.thread.join();self.tmp.cleanup()
 def req(self,path,body=None,auth=True,origin=PUBLIC_ORIGIN):
  c=http.client.HTTPConnection('127.0.0.1',self.server.server_port);headers={'Origin':origin,'Content-Type':'application/json'}
  if auth:headers['Authorization']='Bearer '+'t'*43
  c.request('POST' if body is not None else 'GET',path,json.dumps(body) if body is not None else None,headers);r=c.getresponse();result=(r.status,r.read());c.close();return result
 def start(self):return self.req('/study/start',dict(id=self.sid,participant_id='=P01 中文',consent=True,source='live'))
 def test_consent_auth_and_origins(self):
  self.assertEqual(self.req('/study/start',{},auth=False)[0],401);self.assertEqual(self.req('/study/export',origin='https://evil.example')[0],403);self.assertEqual(self.req('/study/start',dict(id=self.sid,participant_id='P1',consent=False,source='live'))[0],400);self.assertFalse(self.path.exists());self.assertEqual(self.start()[0],200)
 def test_durable_idempotent_batches_and_csv(self):
  self.assertEqual(self.start()[0],200);self.assertEqual(self.start()[0],200)
  sample=dict(n=0,t_ms=100,source='live',fresh=True,worn=True,pupil_valid=True,pupil_left_mm=4,pupil_right_mm=6,reference_mm=4,pupil_change_pct=25,block_id='1:0')
  body=dict(id=self.sid,batch_id=str(uuid.uuid4()),samples=[sample],events=[dict(n=0,type='test',t_ms=0)],snapshot=dict(blocks=[dict(block_id='1:0',completed=True)],report={'attention':4,'confusion':2,'notes':'@formula'}),status='completed')
  self.assertEqual(self.req('/study/batch',body)[0],200);self.assertEqual(self.req('/study/batch',body)[0],200)
  with sqlite3.connect(self.path) as db:self.assertEqual(db.execute('SELECT count(*) FROM samples').fetchone()[0],1)
  code,data=self.req('/study/export?id='+self.sid);self.assertEqual(code,200)
  with zipfile.ZipFile(io.BytesIO(data)) as z:
   self.assertEqual(set(z.namelist()),{'sessions.csv','blocks.csv','samples.csv','events.csv','README.txt'})
   rows=list(csv.DictReader(io.StringIO(z.read('sessions.csv').decode('utf-8-sig'))));self.assertEqual(rows[0]['participant_id'],"'=P01 中文");self.assertEqual(float(rows[0]['pupil_mean_mm']),5);self.assertEqual(rows[0]['inferred_state'],'');self.assertEqual(rows[0]['report_attention'],'4')
  from study_store import StudyStore
  self.assertEqual(StudyStore(self.path).listing()[0]['status'],'completed')
  body['batch_id']=str(uuid.uuid4());self.assertEqual(self.req('/study/batch',body)[0],400)
 def test_duplicate_participant_ids_and_partial_sessions(self):
  self.start();self.sid=str(uuid.uuid4());self.start();self.assertEqual(len(json.loads(self.req('/study/list')[1])['sessions']),2)
  self.assertEqual(self.req('/study/batch',dict(id=self.sid,batch_id=str(uuid.uuid4()),samples=[dict(n=0,pupil_valid=True,source='simulate')]))[0],400)
  self.assertEqual(self.req('/study/batch',dict(id=self.sid,batch_id=str(uuid.uuid4()),status='completed'))[0],400)
  self.assertEqual(self.req('/study.sqlite3')[0],404)
 def test_exports_saved_directly_to_disk(self):
  self.start();code,data=self.req('/study/export-files',{'id':self.sid});self.assertEqual(code,200);paths=json.loads(data);self.assertTrue(Path(paths['zip_path']).is_file());self.assertTrue((Path(paths['directory'])/'sessions.csv').is_file());self.assertEqual(self.req('/study/export-files',{},auth=False)[0],401)
