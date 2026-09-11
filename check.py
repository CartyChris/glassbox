import sys, subprocess, re, collections
s = open('GlassBox.html').read()
start = s.index('\n<script>') + len('\n<script>')
end   = s.index('</' + 'script>', start)
body  = s[start:end]
tail  = s[end:].strip()
open('/tmp/gb.js','w').write(body)
r = subprocess.run(['node','--check','/tmp/gb.js'],capture_output=True,text=True)
if r.returncode: print(r.stderr[:700]); sys.exit(1)
if tail != '</' + 'script>\n</body>\n</html>':
    print('FAIL: script block ends EARLY'); print(repr(tail[:140])); sys.exit(1)
# Blank out everything that is not code before scanning for duplicate declarations.
# The previous version skipped template literals only, and treated EVERY backtick as a
# delimiter — including the ones inside comments, of which this file has many. One stray
# backtick in prose flipped the parity for everything after it, so real code was scanned as
# string data and string data was scanned as code. Measured on the current file: it saw 1237
# top-level declarations out of 2133. A duplicate anywhere in the other 42% shipped silently.
# This version is a small lexer: comments, strings, template literals (with ${} nesting) and
# regex literals each get blanked, newlines preserved so line numbers still line up.
def blank(src):
    out=[];i=0;n=len(src);prev=''
    def keepnl(seg): out.append(''.join(c if c=='\n' else ' ' for c in seg))
    while i<n:
        c=src[i]
        if c=='/' and i+1<n and src[i+1]=='/':
            j=src.find('\n',i); j=n if j<0 else j
            keepnl(src[i:j]); i=j; continue
        if c=='/' and i+1<n and src[i+1]=='*':
            j=src.find('*/',i+2); j=n if j<0 else j+2
            keepnl(src[i:j]); i=j; continue
        # A slash is a regex only where a value may begin; otherwise it is division.
        if c=='/' and prev in '(,=:[!&|?{};+-*%~^<>':
            j=i+1; cls=False
            while j<n:
                d=src[j]
                if d=='\\': j+=2; continue
                if d=='\n': break
                if d=='[': cls=True
                elif d==']': cls=False
                elif d=='/' and not cls: j+=1; break
                j+=1
            keepnl(src[i:j]); i=j; continue
        if c in '"\'':
            j=i+1
            while j<n:
                d=src[j]
                if d=='\\': j+=2; continue
                if d==c: j+=1; break
                if d=='\n': break
                j+=1
            out.append(c); keepnl(src[i+1:max(i+1,j-1)]); out.append(c)
            i=j; prev=c; continue
        if c=='`':
            j=i+1; depth=0
            while j<n:
                d=src[j]
                if d=='\\': j+=2; continue
                if d=='$' and j+1<n and src[j+1]=='{': depth+=1; j+=2; continue
                if d=='}' and depth>0: depth-=1; j+=1; continue
                if d=='`' and depth==0: j+=1; break
                j+=1
            keepnl(src[i:j]); i=j; prev='`'; continue
        out.append(c)
        if not c.isspace(): prev=c
        i+=1
    return ''.join(out)
scan=blank(body)
dups=[k for k,v in collections.Counter(re.findall(r'^(?:function|const|let|class) ([A-Za-z_$][\w$]*)',scan,re.M)).items() if v>1]
if dups: print('FAIL: duplicate top-level decls:',dups); sys.exit(1)
ids=[i for i in re.findall(r'\sid="([^"]+)"',s) if '${' not in i]
idup=[k for k,v in collections.Counter(ids).items() if v>1]
if idup: print('FAIL: duplicate DOM ids:',idup); sys.exit(1)
views=set(re.findall(r'data-view="([a-z-]+)"',s))
secs=set(re.findall(r'<section class="view[^"]*" id="view-([a-z-]+)"',s))
missing=views-secs-{'handoff'}
if missing: print('FAIL: tabs with no section:',missing); sys.exit(1)
# Selectors used with a bare .onclick/.value that reference an id present nowhere in the HTML
# would throw at boot; node --check cannot see that.
whole=open('GlassBox.html').read()
# ids may be literal attributes OR injected through a helper as the string 'id="x"',
# so do not require whitespace before id=
ids=set(re.findall(r'id="([A-Za-z][\w-]*)"',whole))
ids|=set(re.findall(r"id='([A-Za-z][\w-]*)'",whole))
ids|=set(re.findall(r'id=\\"([A-Za-z][\w-]*)\\"',whole))
used=set(re.findall(r"\$\('#([a-zA-Z][\w-]*)'\)\.(?:onclick|onchange|oninput|value|checked)\s*=",body))
# an id wrapped in a truthiness guard cannot throw, so it is not an orphan risk
guarded=set(re.findall(r"if\s*\(\s*\$\('#([a-zA-Z][\w-]*)'\)",body))
orphan=sorted(u for u in used if u not in ids and u not in guarded)
if orphan: print('FAIL: ORPHAN IDS wired at boot (would throw):',orphan[:10]); sys.exit(1)
print(f'OK  js parses | {len(views)} tabs | {len(secs)} sections | no dup decls | no dup ids')
