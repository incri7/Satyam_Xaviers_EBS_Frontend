const lat = 27.41780, lon = 85.03971, dLat = 0.0032, dLon = 0.0036;
const bb = `${lat - dLat},${lon - dLon},${lat + dLat},${lon + dLon}`;
const q = `[out:json][timeout:90][bbox:${bb}];(way[building];way[highway];way[leisure];way[landuse];way[natural];way[waterway];);out geom tags;`;
const hosts = ['https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter'];
for (let round = 0; round < 2; round++) for (const host of hosts) {
  try {
    const res = await fetch(host + '?data=' + encodeURIComponent(q), { headers: { 'User-Agent': 'SXEBS-site-model/1.0' } });
    if (!res.ok) { console.log(host, res.status); continue; }
    const j = await res.json();
    (await import('fs')).writeFileSync((process.env.OUT || '../data/street') + '/osm_geom.json', JSON.stringify(j));
    const c = {}; for (const e of j.elements) { const k = Object.keys(e.tags || {}).find(k => ['building', 'highway', 'leisure', 'landuse', 'natural', 'waterway'].includes(k)); c[k] = (c[k] || 0) + 1; }
    console.log(host, j.elements.length, c); process.exit(0);
  } catch (e) { console.log(host, e.message); }
}
