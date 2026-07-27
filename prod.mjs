import { chromium, devices } from 'playwright'
const SP='/private/tmp/claude-501/-Users-hamzagul-Documents-examcore/6d0fdbe1-cceb-4253-b312-4e0b4686b44c/scratchpad/'
const B='https://markscheme.app'
const b=await chromium.launch()
let fail=0; const ok=(n,c)=>{console.log((c?'  ok   ':'  FAIL')+'  '+n); if(!c)fail++}

console.log('== /mark in production ==')
const p=await (await b.newContext({viewport:{width:1400,height:900}})).newPage()
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,140)))
await p.goto(B+'/mark',{waitUntil:'networkidle',timeout:120000}); await p.waitForTimeout(3500)
ok('typing box shipped', await p.locator('#answer-text').count()===1)
ok('typing is above the uploader', await p.evaluate(()=>{
  const t=document.querySelector('#answer-text')?.getBoundingClientRect().top
  const c=[...document.querySelectorAll('button')].find(x=>/Choose files/i.test(x.innerText))?.getBoundingClientRect().top
  return t!=null && c!=null && t<c
}))
const submit=p.locator('button:has-text("Mark my")').first()
ok('submit disabled when empty', await submit.isDisabled())
await p.locator('#answer-text').fill('Water is polar because oxygen is more electronegative, so the shared electrons sit closer to it and the bent shape stops the dipoles cancelling.')
await p.waitForTimeout(700)
ok('submit enabled once typed', !(await submit.isDisabled()))
ok('no page errors', errs.length===0)

console.log('\n== lesson → marker handoff, both boards ==')
for (const [name,path,want] of [
  ['cambridge','/courses/9700/1-1-the-microscope-in-cell-studies','9700'],
  ['ib',       '/ib/courses/history-hl/1-1-paper-1-understanding-and-evaluating-sources','ib-history-hl'],
]) {
  const q=await (await b.newContext({viewport:{width:1400,height:900}})).newPage()
  const e2=[]; q.on('pageerror',e=>e2.push(String(e).slice(0,140)))
  await q.goto(B+path,{waitUntil:'networkidle',timeout:120000}); await q.waitForTimeout(3000)
  await q.evaluate(()=>document.getElementById('quiz')?.scrollIntoView({block:'start'}))
  await q.waitForTimeout(700)
  const card=q.locator('.qc-card').first()
  if (await card.count()===0){ console.log('  '+name+': no quick check'); await q.close(); continue }
  await card.locator('.qc-head').click(); await q.waitForTimeout(400)
  await card.locator('textarea.qc-input').fill('A full sentence answer written out properly so that it is long enough to be worth marking by an examiner.')
  await q.waitForTimeout(700)
  ok(name+': action appears', await card.locator('.qc-mark-mine').count()===1)
  await card.locator('.qc-mark-mine').click()
  await q.waitForURL(/\/mark/,{timeout:30000}); await q.waitForTimeout(5000)
  const st=await q.evaluate(()=>{
    const r=document.getElementById('answer-text')?.getBoundingClientRect()
    return {
      subject: document.getElementById('mark-subject')?.value ?? '',
      answerLen: document.getElementById('answer-text')?.value.length ?? 0,
      onScreen: !!r && r.top>=0 && r.top<window.innerHeight,
      disabled: [...document.querySelectorAll('button')].find(x=>/Mark my/.test(x.innerText))?.disabled,
    }
  })
  ok(name+`: subject resolves to ${want}`, st.subject===want)
  ok(name+': answer travelled', st.answerLen>50)
  ok(name+': answer is on screen', st.onScreen)
  ok(name+': submit enabled', st.disabled===false)
  ok(name+': no page errors', e2.length===0)
  if(name==='ib') await q.screenshot({path:SP+'prod-loop.png'})
  await q.close()
}
await b.close()
console.log(fail?`\n${fail} FAILED`:'\nproduction loop verified')
process.exit(fail?1:0)
