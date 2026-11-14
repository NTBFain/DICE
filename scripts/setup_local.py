"""One-time, idempotent local configuration. Never prints the signing secret."""
import argparse, os, re, secrets
from pathlib import Path

PLACEHOLDER = 'super_secret_key_change_me_in_production_123456'

def configure(directory: Path, demo: bool):
    directory.mkdir(parents=True, exist_ok=True)
    path=directory/'.env'
    text=path.read_text(encoding='utf-8-sig') if path.exists() else ''
    def read(key):
        match=re.search(r'^\s*'+key+r'\s*=\s*(.*?)\s*$',text,re.M)
        return match.group(1).strip('"\'') if match else None
    secret=read('SECRET_KEY')
    if not secret or len(secret)<32 or secret==PLACEHOLDER:
        secret=secrets.token_urlsafe(48)
    values={'SECRET_KEY':secret,'DEMO_MODE':'true' if demo else 'false'}
    if not read('DATABASE_URL'):values['DATABASE_URL']='sqlite:///./dice-local.db'
    for key,value in values.items():
        pattern=r'^\s*'+key+r'\s*=.*$'
        if re.search(pattern,text,re.M):text=re.sub(pattern,key+'='+value,text,flags=re.M)
        else:text=text.rstrip()+'\n'+key+'='+value+'\n'
    # Replace only this configuration file, preserving unrelated settings.
    temporary=path.with_name('.env.setup-tmp')
    with temporary.open('w',encoding='utf8',newline='\n') as stream:stream.write(text.lstrip('\n'))
    os.replace(temporary,path)
    return path

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    group=parser.add_mutually_exclusive_group()
    group.add_argument('--demo',action='store_true',help='Explicitly seed local demonstration accounts and show quick credentials.')
    group.add_argument('--no-demo',action='store_true',help='Disable future demo seeding and quick credentials; existing records remain.')
    parser.add_argument('--backend-dir',type=Path,default=Path(__file__).resolve().parents[1]/'backend')
    args=parser.parse_args();configure(args.backend_dir,args.demo)
    print('Local configuration ready. Demo mode: '+('enabled' if args.demo else 'disabled')+'. Signing secret remains private.')
