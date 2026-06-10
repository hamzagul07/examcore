import fs from 'fs'
const h = fs.readFileSync('tmp/senpai-al-physics.html', 'utf8')
const urls = [...h.matchAll(/https?:\/\/[^"'\s>]+\.pdf/gi)].map((m) => m[0])
console.log('PDFs found:', urls.length)
for (const u of urls) console.log(u)
