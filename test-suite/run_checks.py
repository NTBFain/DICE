"""Sequential regression runner. All processes use a disposable cwd, database and secret."""
import argparse,os,secrets,subprocess,sys,tempfile
from pathlib import Path

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--legacy',action='store_true',help='Include isolated older backend checks.')
    args=parser.parse_args();root=Path(__file__).resolve().parents[1]
    with tempfile.TemporaryDirectory(prefix='dice-checks-') as directory:
        env={**os.environ,'DATABASE_URL':'sqlite://','SECRET_KEY':secrets.token_urlsafe(48),'DEMO_MODE':'false','PYTHONPATH':str(root/'backend')+os.pathsep+str(root/'backend/tests'),'DICE_FRONTEND_RUNTIME':os.environ.get('DICE_FRONTEND_RUNTIME',str(root/'frontend'))}
        commands=[[sys.executable,'-m','unittest','discover','-s',str(root/'test-suite'/role),'-p','test_*.py','-v'] for role in ('client','shared')]
        if args.legacy:commands.append([sys.executable,'-m','unittest','discover','-s',str(root/'backend/tests'),'-p','test_*.py','-v'])
        nodes=sorted(str(file) for role in ('client','artist','admin','shared') for pattern in ('*.test.mjs','*.test.cjs') for file in (root/'test-suite'/role).glob(pattern))
        commands.append(['node','--experimental-strip-types','--test','--test-concurrency=1',*nodes])
        failed=False
        for command in commands:
            result=subprocess.run(command,cwd=directory,env=env);failed=failed or result.returncode!=0
        raise SystemExit(failed)
