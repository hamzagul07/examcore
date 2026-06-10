const ids = ['reactants-products-and-leftovers', 'build-a-molecule', 'wave-interference']
const geos = ['gvkgx8ga', 'SnqQmKsq', 'VGWtkPU5', 'R2FQ8V5K', 'v4kEjJ2R']

for (const id of ids) {
  const u = `https://phet.colorado.edu/sims/html/${id}/latest/${id}_en.html`
  try {
    const r = await fetch(u, { method: 'HEAD', redirect: 'follow' })
    console.log(r.status, id)
  } catch { console.log('ERR', id) }
}
for (const id of geos) {
  const u = `https://www.geogebra.org/classic?material=${id}`
  try {
    const r = await fetch(u, { method: 'HEAD', redirect: 'follow' })
    console.log(r.status, 'geo', id)
  } catch { console.log('ERR geo', id) }
}
