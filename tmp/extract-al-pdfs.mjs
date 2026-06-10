import fs from 'fs'
const h = fs.readFileSync('tmp/senpai-al-physics.html', 'utf8')
const urls = [...h.matchAll(/https?:\/\/[^"'\s>]+\.pdf/gi)].map((m) => m[0])
console.log('PDFs:', urls.length)
urls.forEach((u) => console.log(u))
