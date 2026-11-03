// node dev/pass38/gen-pfterm.mjs — regenerate api/_pfterm.mjs after editing cloud/pfterm.py (the function uploads that string).
import { readFileSync, writeFileSync } from 'node:fs';
const py = readFileSync(new URL('../../cloud/pfterm.py', import.meta.url), 'utf8');
writeFileSync(new URL('../../api/_pfterm.mjs', import.meta.url), '// Generated from cloud/pfterm.py by dev/pass38/gen-pfterm.mjs — do not edit.\nexport const PFTERM_SOURCE = ' + JSON.stringify(py) + ';\n');
