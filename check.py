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
# Strip template-literal contents first: generated code inside backticks is not a
# declaration in THIS file, and scanning it produces false duplicates.
def strip_templates(src):
    out=[];i=0;n=len(src);depth=0
    while i<n:
        c=src[i]
        if c=='\\': out.append('  ');i+=2;continue
        if c=='`':
            i+=1
            while i<n:
                if src[i]=='\\': i+=2;continue
                if src[i]=='`': i+=1;break
                if src[i]=='\n': out.append('\n')
                i+=1
            continue
        out.append(c);i+=1
    return ''.join(out)
scan=strip_templates(body)
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
