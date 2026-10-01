"""Local participant database. No video, no remote synchronization."""
from contextlib import contextmanager
import csv
import io
import json
import os
import sqlite3
import statistics
import sys
import threading
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path


def default_path():
    if sys.platform == 'darwin':
        return Path.home() / 'Library/Application Support/Donut MIDI/data/study.sqlite3'
    return Path.home() / '.donut-midi/data/study.sqlite3'


def identifier(value):
    return str(uuid.UUID(value))


def encode(value):
    return json.dumps(value, ensure_ascii=False, allow_nan=False)


def csv_bytes(rows, fields):
    stream = io.StringIO(newline='')
    writer = csv.DictWriter(stream, fieldnames=fields, extrasaction='ignore')
    writer.writeheader()
    for row in rows:
        safe = {}
        for key in fields:
            value = row.get(key)
            if isinstance(value, (list, dict)):
                value = encode(value)
            # Prevent spreadsheet formulas from arbitrary participant IDs/text.
            if isinstance(value, str) and value.lstrip().startswith(('=', '+', '-', '@')):
                value = "'" + value
            safe[key] = '' if value is None else value
        writer.writerow(safe)
    return ('\ufeff' + stream.getvalue()).encode('utf-8')


def pupil_stats(samples, target_zone=None):
    usable = [s for s in samples if s.get('pupil_valid')]
    values = [(s['pupil_left_mm'] + s['pupil_right_mm']) / 2 for s in usable]
    changes = [s['pupil_change_pct'] for s in usable if s.get('pupil_change_pct') is not None]
    observed_ms=0
    target_ms=0
    for a,b in zip(samples,samples[1:]):
        dt=b.get('t_ms',0)-a.get('t_ms',0)
        if 0<dt<=250 and a.get('surface_valid'):
            observed_ms+=dt
            if target_zone is not None and a.get('aoi_zone')==target_zone: target_ms+=dt
    return dict(sample_count=len(samples), observed_gaze_ms=observed_ms, target_observed_ms=target_ms if target_zone is not None else None, valid_pupil_fraction=len(values)/len(samples) if samples else None,
                pupil_mean_mm=statistics.mean(values) if values else None,
                pupil_min_mm=min(values) if values else None, pupil_max_mm=max(values) if values else None,
                pupil_sd_mm=statistics.pstdev(values) if values else None, pupil_range_mm=max(values)-min(values) if values else None,
                pupil_change_mean_pct=statistics.mean(changes) if changes else None,
                reference_sample_count=len(changes))


class StudyStore:
    def __init__(self, path=None):
        self.path = Path(path) if path else default_path()
        self.lock = threading.RLock()

    @contextmanager
    def connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        db = sqlite3.connect(self.path)
        db.executescript('''CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, participant_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, status TEXT NOT NULL, meta TEXT NOT NULL, snapshot TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS batches(session_id TEXT, batch_id TEXT, PRIMARY KEY(session_id,batch_id));
        CREATE TABLE IF NOT EXISTS samples(session_id TEXT, n INTEGER, payload TEXT, PRIMARY KEY(session_id,n));
        CREATE TABLE IF NOT EXISTS events(session_id TEXT, n INTEGER, payload TEXT, PRIMARY KEY(session_id,n));''')
        try:
            os.chmod(self.path, 0o600)
        except OSError:
            pass
        try:
            with db:
                yield db
        finally:
            db.close()

    def start(self, data):
        sid = identifier(data['id'])
        participant = data['participant_id']
        if not isinstance(participant, str) or not participant.strip() or len(participant) > 128 or any(ord(c)<32 for c in participant):
            raise ValueError('Use a participant ID of 1–128 printable characters')
        if data.get('consent') is not True or data.get('source') not in ('live', 'simulate'):
            raise ValueError('Consent and a supported input source are required')
        now = datetime.now(timezone.utc).isoformat()
        meta = {k: data.get(k) for k in ('source','schema','app_version','consent','consent_version','baseline_mm')}
        with self.lock, self.connect() as db:
            existing = db.execute('SELECT participant_id,meta FROM sessions WHERE id=?',(sid,)).fetchone()
            if existing and (existing[0] != participant or existing[1] != encode(meta)):
                raise ValueError('Session ID already belongs to another start request')
            db.execute('INSERT OR IGNORE INTO sessions VALUES(?,?,?,?,?,?,?)',(sid,participant,now,now,'in_progress',encode(meta),'{}'))
        return {'id':sid,'saved':True}

    def batch(self, data):
        sid, bid = identifier(data['id']), identifier(data['batch_id'])
        samples, events = data.get('samples',[]), data.get('events',[])
        snapshot = data.get('snapshot',{})
        if not isinstance(samples,list) or len(samples)>500 or not isinstance(events,list) or len(events)>1000 or not isinstance(snapshot,dict):
            raise ValueError('Invalid batch size')
        for s in samples:
            if not isinstance(s,dict) or not isinstance(s.get('n'),int) or s['n']<0 or s['n']>200000:
                raise ValueError('Invalid sample index')
            for k in ('t_ms','x','y','pupil_left_mm','pupil_right_mm','reference_mm','pupil_change_pct'):
                v=s.get(k)
                if v is not None and (isinstance(v,bool) or not isinstance(v,(int,float)) or not -1e9<v<1e9):
                    raise ValueError('Invalid numeric sample')
            if s.get('pupil_valid') and (not s.get('fresh') or s.get('source')!='live' or not s.get('worn') or not all(isinstance(s.get(k),(int,float)) and 0<s[k]<30 for k in ('pupil_left_mm','pupil_right_mm'))):
                raise ValueError('Invalid pupil quality flag')
        for e in events:
            if not isinstance(e,dict) or not isinstance(e.get('n'),int) or e['n']<0:
                raise ValueError('Invalid event index')
        # Enforce finite JSON before opening a transaction.
        sample_json=[(sid,s['n'],encode(s)) for s in samples]
        event_json=[(sid,e['n'],encode(e)) for e in events]
        if not isinstance(snapshot.get('blocks',[]),list) or len(snapshot.get('blocks',[]))>10000 or any(not isinstance(b,dict) for b in snapshot.get('blocks',[])):
            raise ValueError('Invalid blocks')
        snapshot_json=encode(snapshot)
        status=data.get('status','in_progress')
        if status not in ('in_progress','completed','ended_early'):
            raise ValueError('Invalid status')
        if status!='in_progress' and not isinstance(snapshot.get('report'),dict):
            raise ValueError('Final self-report required (unsure is allowed)')
        with self.lock, self.connect() as db:
            row=db.execute('SELECT status FROM sessions WHERE id=?',(sid,)).fetchone()
            if not row: raise ValueError('Session not found')
            if db.execute('SELECT 1 FROM batches WHERE session_id=? AND batch_id=?',(sid,bid)).fetchone():
                return {'saved':True,'duplicate':True}
            if row[0]!='in_progress': raise ValueError('Session is already finalized')
            db.executemany('INSERT OR IGNORE INTO samples VALUES(?,?,?)',sample_json)
            db.executemany('INSERT OR IGNORE INTO events VALUES(?,?,?)',event_json)
            db.execute('INSERT INTO batches VALUES(?,?)',(sid,bid))
            db.execute('UPDATE sessions SET updated_at=?,status=?,snapshot=? WHERE id=?',(datetime.now(timezone.utc).isoformat(),status,snapshot_json,sid))
        return {'saved':True,'samples':len(samples)}

    def listing(self):
        if not self.path.exists():return []
        with self.lock, self.connect() as db:
            rows=db.execute('SELECT id,participant_id,created_at,status FROM sessions ORDER BY created_at DESC LIMIT 100').fetchall()
        return [dict(zip(('id','participant_id','created_at','status'),r)) for r in rows]

    def export(self, sid=None):
        if sid: sid=identifier(sid)
        sessions,blocks,samples,events=[],[],[],[]
        if not self.path.exists(): raise ValueError('No saved sessions yet')
        with self.lock, self.connect() as db:
            rows=db.execute('SELECT id,participant_id,created_at,updated_at,status,meta,snapshot FROM sessions'+(' WHERE id=?' if sid else ''),(sid,) if sid else ()).fetchall()
            if not rows: raise ValueError('No saved sessions found')
            for id,pid,created,updated,status,meta,snapshot in rows:
                meta,snap=json.loads(meta),json.loads(snapshot)
                ss=[json.loads(r[0]) for r in db.execute('SELECT payload FROM samples WHERE session_id=? ORDER BY n',(id,))]
                es=[json.loads(r[0]) for r in db.execute('SELECT payload FROM events WHERE session_id=? ORDER BY n',(id,))]
                prefix={'session_id':id,'participant_id':pid}
                report=snap.get('report') or {}
                game_blocks=snap.get('blocks',[])
                completed=[b for b in game_blocks if b.get('completed') and not b.get('automatic_preview')]
                sessions.append({**prefix,'created_at':created,'updated_at':updated,'status':status,**meta,**pupil_stats(ss),
                    'duration_ms':snap.get('duration_ms'),'end_reason':snap.get('end_reason'),
                    'planned_blocks':sum(not b.get('automatic_preview') for b in game_blocks),'preview_blocks':sum(bool(b.get('automatic_preview')) for b in game_blocks),'completed_blocks':len(completed),
                    'early_ready_blocks':sum(bool(b.get('early_ready')) for b in completed),
                    'completion_fraction':len(completed)/sum(not b.get('automatic_preview') for b in game_blocks) if any(not b.get('automatic_preview') for b in game_blocks) else None,
                    'report_scope':'whole_session_retrospective','model_status':'untrained','inferred_state':None,
                    **{'report_'+k:v for k,v in report.items()}})
                for b in game_blocks:
                    blocks.append({**prefix,**b,**pupil_stats([s for s in ss if s.get('block_id')==b.get('block_id')], b.get('target_zone')),'report_scope':'see sessions.csv; no block-level state inferred'})
                samples.extend({**prefix,**s} for s in ss)
                events.extend({**prefix,**e} for e in es)
        tables={'sessions.csv':sessions,'blocks.csv':blocks,'samples.csv':samples,'events.csv':events}
        buffer=io.BytesIO()
        with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED) as z:
            for name,rs in tables.items():
                fields=list(dict.fromkeys(['session_id','participant_id']+[k for r in rs for k in r]))
                z.writestr(name,csv_bytes(rs,fields))
            z.writestr('README.txt','Donut MIDI local study export v1\nTimes: ISO UTC and monotonic milliseconds from session start. Samples: browser observation at ~10 Hz, NOT raw Neon 200 Hz.\nMouse samples are synthetic; pupil summaries exclude them. Missing/invalid pupils are blank. Relative pupil change is only present when a valid Signals reference exists at that sample. Game entry invalidates that reference; game data usually has raw pupil values only. No focus, stress, confusion or fixation classifier.\nSelf-reports cover the entire session, not each sample/block. Target observed time sums valid adjacent sample intervals up to 250 ms; it is an approximate occupancy measure, not a fixation. Acquisition wall time can include pauses. early_ready means the next block was confirmed before the current one ended. No accuracy score is inferred from looking elsewhere.\nBlocks are game phrases; events also record free-play notes and guided research transitions/reports. in_progress means unfinished/interrupted, not a completed test. Samples not acknowledged before an abrupt browser close may be missing.\nCSV text beginning with spreadsheet formula characters is prefixed with an apostrophe for safety. No videos or pairing credentials are stored.\n')
        return buffer.getvalue()

    def export_files(self, sid=None):
        content=self.export(sid)
        directory=self.path.parent/'exports'/('test-'+(sid or 'all')+'-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')+'-'+uuid.uuid4().hex[:6])
        directory.mkdir(parents=True,exist_ok=False)
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            for name in archive.namelist():
                (directory/name).write_bytes(archive.read(name))
        archive_path=directory.with_suffix('.zip')
        archive_path.write_bytes(content)
        return {'saved':True,'directory':str(directory),'zip_path':str(archive_path)}
