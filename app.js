(function () {
  var NA = '<span class="na">not in the dataset</span>';
  var rows = [], picked = [];
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function has(v) { return v !== null && v !== undefined && v !== ''; }
  function val(v, unit) { return has(v) ? esc(v) + (unit || '') : NA; }

  function load() {
    return fetch('data/vehicles.json').then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).catch(function () {
      return new Promise(function (res, rej) {
        var s = document.createElement('script');
        s.src = 'data/vehicles.js';
        s.onload = function () { window.ATLAS_DATA ? res(window.ATLAS_DATA) : rej(new Error('no data')); };
        s.onerror = function () { rej(new Error('Could not load data/vehicles.json')); };
        document.head.appendChild(s);
      });
    });
  }

  function fill(sel, label, vals) {
    sel.innerHTML = '<option value="">' + label + '</option>' +
      vals.map(function (v) { return '<option>' + esc(v) + '</option>'; }).join('');
  }
  function uniq(key) {
    var m = {};
    rows.forEach(function (r) { if (has(r[key])) m[r[key]] = 1; });
    return Object.keys(m).sort(function (a, b) { return a.localeCompare(b); });
  }
  function rating(r) { return r.stats && has(r.stats.speed_rating); }

  function filtered() {
    var q = $('q').value.trim().toLowerCase(), c = $('f-class').value, m = $('f-man').value,
        cf = $('f-conf').value, onlyData = $('f-data').checked, sort = $('f-sort').value;
    var out = rows.filter(function (r) {
      if (c && r['class'] !== c) return false;
      if (m && r.manufacturer !== m) return false;
      if (cf && r.confidence !== cf) return false;
      if (onlyData && !rating(r)) return false;
      if (q) {
        var hay = [r.name, r.manufacturer, r.real_counterpart, r['class']].join(' ').toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    out.sort(function (a, b) {
      if (sort === 'seats') return (b.seats || -1) - (a.seats || -1) || a.name.localeCompare(b.name);
      if (sort === 'name') return a.name.localeCompare(b.name);
      var x = a[sort] || '\uffff', y = b[sort] || '\uffff';
      return x.localeCompare(y) || a.name.localeCompare(b.name);
    });
    return out;
  }

  function card(r) {
    var s = r.stats || {};
    var checked = picked.indexOf(r.slug) >= 0 ? ' checked' : '';
    return '<article class="card"><h3>' + esc(r.name) + '</h3>' +
      '<div class="meta">' + (has(r.manufacturer) ? esc(r.manufacturer) : 'manufacturer: not in the dataset') + ' &middot; ' +
      (has(r['class']) ? esc(r['class']) : 'class: not in the dataset') + '</div>' +
      '<div><span class="tag ' + esc(r.confidence) + '">' + esc(r.confidence) + '</span>' +
      '<span class="tag">verified ' + esc(r.last_verified) + '</span></div>' +
      '<dl><dt>Seats</dt><dd>' + val(r.seats) + '</dd>' +
      '<dt>Real-world match</dt><dd>' + val(r.real_counterpart) + '</dd>' +
      '<dt>Speed rating</dt><dd>' + val(s.speed_rating, has(s.speed_rating) ? ' (' + esc(s.measured_by || 'source') + ')' : '') + '</dd></dl>' +
      '<label><input type="checkbox" data-slug="' + esc(r.slug) + '"' + checked + '> Compare</label>' +
      '<details><summary>Sources</summary>' + (r.sources || []).map(function (u) {
        return '<div><a href="' + esc(u) + '" rel="noopener">' + esc(u.replace(/^https?:\/\//, '')) + '</a></div>';
      }).join('') + '</details></article>';
  }

  var FIELDS = [
    ['Manufacturer', function (r) { return val(r.manufacturer); }],
    ['Class', function (r) { return val(r['class']); }],
    ['Seats', function (r) { return val(r.seats); }],
    ['Real-world match', function (r) { return val(r.real_counterpart); }],
    ['Era', function (r) { return val(r.era); }],
    ['Price', function (r) { return val(r.price); }],
    ['Sell value', function (r) { return val(r.sell_value); }],
    ['Register cost', function (r) { return val(r.register_cost); }],
    ['Customisable', function (r) { return has(r.customisable) ? (r.customisable ? 'yes' : 'no') : NA; }],
    ['Top speed (km/h)', function (r) { return val(r.stats && r.stats.top_speed_kmh); }],
    ['Top speed (mph)', function (r) { return val(r.stats && r.stats.top_speed_mph); }],
    ['Speed rating (out of 10, source rating)', function (r) { return val(r.stats && r.stats.speed_rating); }],
    ['Acceleration', function (r) { return val(r.stats && r.stats.acceleration); }],
    ['Braking', function (r) { return val(r.stats && r.stats.braking); }],
    ['Traction', function (r) { return val(r.stats && r.stats.traction); }],
    ['Off-road handling', function (r) { return val(r.stats && r.stats.off_road_handling); }],
    ['Strength', function (r) { return val(r.stats && r.stats.strength); }],
    ['Rating source', function (r) { return val(r.stats && r.stats.measured_by); }],
    ['Confidence', function (r) { return val(r.confidence); }],
    ['Last verified', function (r) { return val(r.last_verified); }]
  ];

  function renderCompare() {
    var sel = picked.map(function (s) { return rows.filter(function (r) { return r.slug === s; })[0]; }).filter(Boolean);
    $('cmp-empty').style.display = sel.length >= 2 ? 'none' : '';
    $('cmp-empty').textContent = sel.length === 1 ? 'Pick at least one more vehicle.' : 'Tick "Compare" on two or more vehicles.';
    if (sel.length < 2) { $('cmp-table').innerHTML = ''; return; }
    var h = '<table><thead><tr><th></th>' + sel.map(function (r) { return '<th>' + esc(r.name) + '</th>'; }).join('') + '</tr></thead><tbody>';
    FIELDS.forEach(function (f) {
      h += '<tr><th>' + f[0] + '</th>' + sel.map(function (r) { return '<td>' + f[1](r) + '</td>'; }).join('') + '</tr>';
    });
    $('cmp-table').innerHTML = h + '</tbody></table>';
  }

  function render() {
    var out = filtered();
    $('count').textContent = out.length + ' of ' + rows.length + ' vehicles';
    $('list').innerHTML = out.map(card).join('') || '<p>No vehicles match.</p>';
    renderCompare();
  }

  function init(d) {
    rows = d.rows;
    $('snap').textContent = 'schema v' + d.schema_version + ', ' + rows.length + ' vehicles, snapshot fetched 24 Nov 2026';
    fill($('f-class'), 'All classes', uniq('class'));
    fill($('f-man'), 'All manufacturers', uniq('manufacturer'));
    fill($('f-conf'), 'Any confidence', uniq('confidence'));
    ['q', 'f-class', 'f-man', 'f-conf', 'f-sort', 'f-data'].forEach(function (id) {
      $(id).addEventListener(id === 'q' ? 'input' : 'change', render);
    });
    $('list').addEventListener('change', function (e) {
      var s = e.target.getAttribute('data-slug');
      if (!s) return;
      var i = picked.indexOf(s);
      if (e.target.checked && i < 0) picked.push(s);
      if (!e.target.checked && i >= 0) picked.splice(i, 1);
      renderCompare();
    });
    $('clear').addEventListener('click', function () { picked = []; render(); });
    var m = /[?&]compare=([^&]+)/.exec(location.search);
    if (m) picked = decodeURIComponent(m[1]).split(',').filter(function (x) { return rows.some(function (r) { return r.slug === x; }); });
    var q0 = /[?&]q=([^&]+)/.exec(location.search);
    if (q0) $('q').value = decodeURIComponent(q0[1]);
    render();
  }

  load().then(init).catch(function (e) {
    $('list').innerHTML = '<p>Could not load the data: ' + esc(e.message) + '</p>';
  });
})();
