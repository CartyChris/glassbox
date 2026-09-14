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
# Duplicate keys in the window.__gb literal. A repeated key is not a syntax error — the LAST
# one silently wins — so node --check sees nothing and the export surface quietly disagrees with
# itself. This guard existed before the Pass 17 rewrite and was lost in it; it was restored after
# a duplicate WOS export slipped through a clean gate.
m=re.search(r'window\.__gb\s*=\s*\{',scan)
if m:
    i=m.end(); depth=1; j=i
    while j<len(scan) and depth:
        if scan[j]=='{': depth+=1
        elif scan[j]=='}': depth-=1
        j+=1
    lit=scan[i:j]
    # top-level keys only: split on commas at depth 0
    keys=[]; d=0; cur=''
    for ch in lit:
        if ch in '{[(': d+=1
        elif ch in '}])': d-=1
        if ch==',' and d==0: keys.append(cur); cur=''
        else: cur+=ch
    keys.append(cur)
    names=[]
    for k in keys:
        k=k.strip()
        mm=re.match(r'^(?:get|set)\s+([A-Za-z_$][\w$]*)\s*\(', k) or re.match(r'^([A-Za-z_$][\w$]*)\s*(?::|,|$)', k)
        if mm: names.append(mm.group(1))
    seen=collections.Counter(names)
    # a get/set PAIR for the same name is correct and expected, so only 3+ is a real duplicate
    gdup=[k for k,v in seen.items() if v>2]
    if gdup: print('FAIL: duplicate __gb export keys:',gdup); sys.exit(1)

# Every fetch in REAL code must carry an abort signal. A hung request neither resolves nor
# rejects; it just holds a connection slot forever, and nothing in the UI ever says so. Fetches
# inside template literals are skipped because they belong to the sandboxed editor documents,
# which have no deadline() of their own. `scan` already has every string and template blanked.
def fetch_without_signal(scan_src, raw_src):
    bad=[]
    for m in re.finditer(r'\bfetch\s*\(', scan_src):
        if in_sabotage(m.start()): continue
        i=m.end(); depth=1; j=i
        while j<len(scan_src) and depth:
            if scan_src[j]=='(': depth+=1
            elif scan_src[j]==')': depth-=1
            j+=1
        # read the ARGUMENTS from the raw source (the blanked copy has string contents removed,
        # but `signal` is an identifier so it survives either way)
        args=raw_src[i:j]
        if not re.search(r'\bsignal\b', args):
            bad.append(base_line + raw_src[:i].count('\n'))
    return bad
# An EMPTY catch around a persisting write. A failed delete loses nothing and a failed probe is
# an answer, so those stay allowed — this targets only writes that can lose the user's work while
# saying nothing. IDB.set returns false rather than throwing, so a try/catch here is doubly
# misleading: it looks handled and cannot even fire.
base_line = s[:start].count('\n') + 1
# The sabotage table is deliberately-broken code by design — every detector fires on it and every
# hit is a false positive. Compute its span once and skip anything inside it.
_sab = scan.find('const GAUNTLET_SABOTAGE=[')
if _sab >= 0:
    _d = 0; _j = scan.index('[', _sab)
    _k = _j
    while _k < len(scan):
        if scan[_k] == '[': _d += 1
        elif scan[_k] == ']':
            _d -= 1
            if _d == 0: break
        _k += 1
    SAB_SPAN = (_sab, _k)
else:
    SAB_SPAN = (-1, -1)
def in_sabotage(off): return SAB_SPAN[0] <= off <= SAB_SPAN[1]
def swallowed_writes(scan_src, raw_src):
    bad=[]
    for m in re.finditer(r'catch\s*\([A-Za-z_$]*\)\s*\{\s*\}', scan_src):
        if in_sabotage(m.start()): continue
        k=m.start()-1
        while k>0 and scan_src[k] in ' \n\t': k-=1
        if k<=0 or scan_src[k]!='}': continue
        depth=1; k-=1
        while k>0 and depth:
            if scan_src[k]=='}': depth+=1
            elif scan_src[k]=='{': depth-=1
            k-=1
        blk=raw_src[k+1:m.start()]
        if not re.search(r'(store\.set\(|IDB\.set\(|localStorage\.setItem\()', blk): continue
        # deletes and clears are fine: nothing is lost when removing something already going away
        if re.search(r"(removeItem|IDB\.set\([^,]+,\s*(null|''|\"\"))", blk): continue
        bad.append(base_line + raw_src[:m.start()].count('\n'))
    return bad
swallowed=swallowed_writes(scan, body)
if swallowed:
    print('FAIL: empty catch around a persisting write at line(s):', swallowed[:8]); sys.exit(1)

unbounded=fetch_without_signal(scan, body)
if unbounded:
    print('FAIL: fetch() with no abort signal at line(s):', unbounded[:8]); sys.exit(1)

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
