"""Checks data/vehicles.json and data/vehicles.js are identical and the rows are intact."""
import json, re
a = json.load(open('data/vehicles.json'))
js = open('data/vehicles.js').read()
b = json.loads(re.sub(r'^window\.ATLAS_DATA = |;\s*$', '', js))
assert a == b, 'vehicles.js differs from vehicles.json'
assert len(a['rows']) == 324
print('ok', len(a['rows']), 'vehicles')
