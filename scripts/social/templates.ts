/**
 * HTML templates for @markscheme Instagram posts.
 *
 * Direction: "the script under the lamp." A deep late-night stage, one ivory
 * exam script lit on it, oxblood examiner marks in the margin, gold for the
 * score. Mirrors the product's own premium surfaces — theme.css
 * [data-ec-theme='late-night'] and max-vault.css — rather than inventing a
 * separate look.
 *
 * Deliberately NOT used, because each one reads cheap at feed size:
 *   - ruled exercise paper        (reads as a primary-school worksheet)
 *   - Caveat for body copy        (rounded and childish in long runs)
 *   - hard offset shadows         (trend-dated neubrutalism)
 *   - thick black borders         (hairlines and real shadow instead)
 *   - bright primary red          (oxblood carries more authority)
 */

import type { Annotation, Post } from './posts'
import { VERIFY } from './posts'

export const CANVAS = { width: 1080, height: 1350 }

const T = {
  stage: '#14120d',
  stageSoft: '#1a1711',
  ivory: '#f4efe3',
  ivoryDeep: '#e9e2d1',
  onIvory: '#221f18',
  onIvorySoft: '#5a5344',
  cream: '#f0ead9',
  creamMuted: '#b0a68c',
  creamFaint: '#7d7561',
  gold: '#d9b36a',
  goldDeep: '#a8853f',
  oxblood: '#9e3033',
  oxbloodOnDark: '#d76b6b',
  tick: '#1c7a52',
  hair: 'rgba(240,234,217,.14)',
  pen: '#22304f',
  rule: 'rgba(34,31,24,.07)',
}

/**
 * Deterministic per-line jitter. Real handwriting never sits on a grid, but
 * Math.random would reshuffle the page on every render — so the wobble is
 * derived from the line's own text instead.
 */
function wobble(line: string, i: number) {
  let h = 2166136261
  for (const ch of `${line}#${i}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  return {
    rot: (((h % 1000) / 1000) * 1.1 - 0.55).toFixed(2),
    dx: ((h >>> 10) % 13) - 6,
    dy: ((h >>> 18) % 7) - 3,
  }
}

/**
 * Lay out lines of handwriting. Each array entry is one visual line (they never
 * wrap). `lead` is only a starting guess — render.ts measures the real page and
 * shrinks it until everything fits.
 */
function handwriting(lines: string[], startLead: number) {
  const body = lines
    .map((l, i) => {
      const w = wobble(l, i)
      return `<div class="ln" style="transform:translate(${w.dx}px,${w.dy}px) rotate(${w.rot}deg)">${esc(l) || '&nbsp;'}</div>`
    })
    .join('')
  return `--lead:${startLead}px;--fs:${Math.round(startLead * 0.7)}px">${body}`
}

/** Fibre grain — keeps the ivory from reading as flat digital white. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.055'/%3E%3C/svg%3E\")"

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const slot = (v: string | number) =>
  v === VERIFY ? `<span class="slot">FILL IN</span>` : esc(String(v))

function shell(body: string) {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300;1,6..72,400&family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&family=Kalam:wght@300;400;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${CANVAS.width}px; height: ${CANVAS.height}px;
    background: ${T.stage};
    font-family: 'Instrument Sans', system-ui, sans-serif;
    color: ${T.cream};
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }
  /* Lamp: a single warm source above the desk. */
  .frame {
    position: relative; width: 100%; height: 100%;
    padding: 70px 68px 58px;
    display: flex; flex-direction: column;
    background:
      radial-gradient(120% 70% at 50% -12%, rgba(217,179,106,.10), transparent 62%),
      ${T.stage};
  }

  /* ---- masthead ---- */
  .mast {
    display: flex; justify-content: space-between; align-items: baseline;
    padding-bottom: 20px; border-bottom: 1px solid ${T.hair};
    font-family: 'IBM Plex Mono', monospace; font-size: 19px; font-weight: 500;
    letter-spacing: .24em; text-transform: uppercase;
  }
  .mast .brand { color: ${T.gold}; }
  .mast .ref { color: ${T.creamFaint}; letter-spacing: .16em; }

  /* ---- question ---- */
  .qwrap { margin-top: 40px; }
  .eyebrow {
    font-family: 'IBM Plex Mono', monospace; font-size: 17px; font-weight: 500;
    letter-spacing: .26em; text-transform: uppercase; color: ${T.creamFaint};
    margin-bottom: 18px;
  }
  .q {
    font-family: 'Newsreader', Georgia, serif; font-weight: 300;
    font-size: 50px; line-height: 1.22; letter-spacing: -.012em;
    color: ${T.cream};
  }
  .q .marks {
    font-family: 'IBM Plex Mono', monospace; font-size: 24px;
    color: ${T.gold}; letter-spacing: .04em; white-space: nowrap;
  }

  /* ---- paper ----
     GRAIN holds double quotes, so it can only live here, never in an inline
     style="..." attribute — inlining it closes the attribute early and silently
     drops every declaration after it. */
  .paper {
    background-color: ${T.ivory};
    background-image: ${GRAIN};
    border-radius: 3px;
    box-shadow: 0 34px 70px -26px rgba(0,0,0,.78), 0 2px 0 rgba(255,255,255,.05);
    color: ${T.onIvory};
    overflow: hidden; /* nothing ever escapes a sheet of paper */
  }
  .paper--dim { background-color: ${T.ivoryDeep}; }

  .script {
    flex: 1; margin-top: 34px; display: flex; gap: 26px;
    padding: 40px 38px;
  }
  /* The candidate's hand. Ballpoint blue-black, never pure blue.
     Everything scales off --lead so render.ts can shrink one variable until
     the page fits, instead of us guessing a pixel budget per template. */
  .work {
    flex: 0 0 66%;
    background-image: linear-gradient(to bottom, transparent calc(var(--lead) - 1px), ${T.rule} calc(var(--lead) - 1px));
    background-size: 100% var(--lead);
  }
  .work .ln {
    font-family: 'Kalam', cursive; font-weight: 300;
    font-size: var(--fs); line-height: var(--lead);
    color: ${T.pen}; white-space: nowrap;
  }
  /* Examiner writes down the margin — never across the candidate's work. */
  .margin {
    flex: 1; display: flex; flex-direction: column; gap: 26px;
    padding-left: 26px; border-left: 1px solid rgba(34,31,24,.10);
  }
  .ink {
    font-family: 'Kalam', cursive; font-weight: 400;
    font-size: 31px; line-height: 1.2; color: ${T.oxblood};
  }
  .ink.tick { color: ${T.tick}; }

  /* ---- verdict ---- */
  .verdict { margin-top: 34px; display: flex; align-items: flex-end; gap: 30px; }
  .score {
    font-family: 'IBM Plex Mono', monospace; font-weight: 500;
    font-size: 112px; line-height: .82; letter-spacing: -.05em; color: ${T.gold};
  }
  .score small { font-size: 44px; color: ${T.creamFaint}; letter-spacing: -.02em; }
  .verdict .say {
    flex: 1; padding-bottom: 8px;
    font-family: 'Newsreader', Georgia, serif; font-style: italic;
    font-weight: 300; font-size: 37px; line-height: 1.24; color: ${T.creamMuted};
  }

  /* ---- what the scheme wanted ---- */
  .fix { margin-top: 30px; }
  .fix ul { list-style: none; }
  .fix li {
    font-size: 26px; line-height: 1.42; color: ${T.cream};
    padding: 10px 0 10px 34px; position: relative;
  }
  .fix li + li { border-top: 1px solid ${T.hair}; }
  .fix li::before {
    content: ''; position: absolute; left: 4px; top: 22px;
    width: 15px; height: 1.5px; background: ${T.gold};
  }

  /* ---- footer ---- */
  .foot {
    margin-top: 30px; padding-top: 20px; border-top: 1px solid ${T.hair};
    display: flex; justify-content: space-between; align-items: center;
    font-family: 'IBM Plex Mono', monospace; font-size: 19px;
    font-weight: 500; letter-spacing: .2em; color: ${T.creamFaint};
    text-transform: uppercase;
  }
  .foot .site { color: ${T.creamMuted}; }

  .slot {
    color: ${T.gold}; border-bottom: 2px dashed ${T.goldDeep};
    font-family: 'IBM Plex Mono', monospace;
    font-size: .74em; letter-spacing: .1em;
  }
</style></head><body><div class="frame">${body}</div></body></html>`
}

function mast(ref: string) {
  return `<div class="mast"><span class="brand">Markscheme</span><span class="ref">${esc(ref)}</span></div>`
}

function foot(right = 'markscheme.app', push = false) {
  return `<div class="foot"${push ? ' style="margin-top:auto"' : ''}><span>Marked against the real scheme</span><span class="site">${esc(right)}</span></div>`
}

function inkMarks(marks: Annotation[]) {
  const notes = marks
    .map(
      (a) =>
        `<div class="ink ${a.tone === 'tick' ? 'tick' : ''}" style="transform:rotate(${a.rotate ?? 0}deg)">${esc(a.text)}</div>`,
    )
    .join('')
  return `<div class="margin">${notes}</div>`
}

/* ------------------------------------------------------------------ */

export function render(post: Post): string {
  switch (post.kind) {
    case 'autopsy': {
      return shell(`
        ${mast(`${post.code} · ${post.paper}`)}
        <div class="qwrap">
          <div class="eyebrow">${esc(post.qualification)}</div>
          <div class="q">${esc(post.question)} <span class="marks">[${post.marks}]</span></div>
        </div>
        <div class="script paper">
          <div class="work" style="${handwriting(post.answer, 48)}</div>
          ${inkMarks(post.annotations)}
        </div>
        <div class="verdict">
          <div class="score">${post.scored}<small>/${post.marks}</small></div>
          <div class="say">${esc(post.verdict)}</div>
        </div>
        <div class="fix">
          <ul>${post.fix.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
        </div>
        ${foot()}`)
    }

    case 'compare': {
      const col = (c: { label: string; answer: string[]; scored: number }, dim: boolean) => `
        <div style="flex:1;display:flex;flex-direction:column">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px">
            <span class="eyebrow" style="margin:0">${esc(c.label)}</span>
            <span style="font-family:'IBM Plex Mono',monospace;font-size:40px;font-weight:500;letter-spacing:-.03em;color:${dim ? T.creamFaint : T.gold}">${c.scored}<span style="font-size:22px;color:${T.creamFaint}">/${post.marks}</span></span>
          </div>
          <div class="paper${dim ? ' paper--dim' : ''} work" style="flex:1;padding:26px 22px;${handwriting(c.answer, 40)}</div>
        </div>`
      return shell(`
        ${mast(`${post.code} · Level check`)}
        <div class="qwrap">
          <div class="eyebrow">${esc(post.qualification)}</div>
          <div class="q" style="font-size:40px">${esc(post.question)} <span class="marks">[${post.marks}]</span></div>
        </div>
        <div style="margin-top:32px;display:flex;gap:24px;flex:1">${col(post.left, true)}${col(post.right, false)}</div>
        <div style="margin-top:32px">
          <div class="eyebrow">The only difference</div>
          <div style="font-family:'Newsreader',Georgia,serif;font-style:italic;font-weight:300;font-size:36px;line-height:1.26;color:${T.cream}">${esc(post.difference)}</div>
        </div>
        ${foot()}`)
    }

    case 'decoder': {
      const col = (c: { word: string; wants: string; trap: string }) => `
        <div class="paper" style="flex:1;padding:32px 28px;display:flex;flex-direction:column;gap:20px">
          <div style="font-family:'Newsreader',Georgia,serif;font-weight:400;font-size:36px;line-height:1.14;letter-spacing:-.02em;min-height:82px">${esc(c.word)}</div>
          <div style="height:1px;background:rgba(34,31,24,.14)"></div>
          <div style="font-size:27px;line-height:1.38;font-weight:500;min-height:112px">${esc(c.wants)}</div>
          <div style="font-family:'Kalam',cursive;font-weight:400;font-size:26px;line-height:1.34;color:${T.oxblood}">${esc(c.trap)}</div>
        </div>`
      return shell(`
        ${mast(esc(post.qualification))}
        <div class="qwrap">
          <div class="eyebrow">Read the verb, not the topic</div>
          <div class="q">${esc(post.title)}</div>
        </div>
        <!-- Row is centred in the leftover space; inner stretch keeps the cards equal height. -->
        <div style="flex:1;display:flex;align-items:center;margin-top:30px">
          <div style="display:flex;gap:20px;width:100%;align-items:stretch">${post.columns.map(col).join('')}</div>
        </div>
        ${foot()}`)
    }

    case 'boundary': {
      const lost =
        typeof post.mark === 'number' && typeof post.total === 'number'
          ? String(post.total - post.mark)
          : VERIFY
      return shell(`
        ${mast(`${post.code} · ${post.paper}`)}
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:46px">
          <div>
            <div class="eyebrow">Grade ${esc(post.grade)} boundary · ${slot(post.session)}</div>
            <div style="font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:158px;line-height:.9;letter-spacing:-.06em;color:${T.cream}">${slot(post.mark)}<span style="font-size:66px;color:${T.creamFaint}">/${slot(post.total)}</span></div>
          </div>
          <div style="height:1px;background:${T.hair}"></div>
          <div>
            <div class="eyebrow" style="color:${T.gold}">Marks you are allowed to lose</div>
            <div style="font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:158px;line-height:.9;letter-spacing:-.06em;color:${T.gold}">${slot(lost)}</div>
          </div>
          <div style="font-family:'Newsreader',Georgia,serif;font-style:italic;font-weight:300;font-size:38px;line-height:1.26;color:${T.creamMuted}">${esc(post.note)}</div>
        </div>
        ${foot()}`)
    }

    case 'quote':
      return shell(`
        ${mast('Examiner report')}
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:38px">
          <div style="font-family:'Newsreader',Georgia,serif;font-weight:300;font-size:150px;line-height:.6;color:${T.gold}">&ldquo;</div>
          <div style="font-family:'Newsreader',Georgia,serif;font-weight:300;font-size:46px;line-height:1.32;letter-spacing:-.01em;color:${T.cream}">${slot(post.quote)}</div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:21px;letter-spacing:.14em;text-transform:uppercase;color:${T.creamFaint}">— ${slot(post.source)}</div>
          <div style="height:1px;background:${T.hair}"></div>
          <div style="font-family:'Kalam',cursive;font-weight:400;font-size:36px;line-height:1.26;color:${T.oxbloodOnDark}">${esc(post.takeaway)}</div>
        </div>
        ${foot()}`)

    case 'manifesto':
      return shell(`
        ${mast('No. 001')}
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:40px">
          <div style="font-family:'Newsreader',Georgia,serif;font-weight:300;font-size:76px;line-height:1.08;letter-spacing:-.022em;color:${T.cream}">${esc(post.headline)}</div>
          <div style="font-family:'Newsreader',Georgia,serif;font-weight:300;font-style:italic;font-size:34px;line-height:1.4;color:${T.creamMuted};max-width:88%">${esc(post.body)}</div>
          <div style="height:1px;background:${T.hair}"></div>
          <div style="display:flex;flex-direction:column;gap:22px">
            ${post.lines
              .map(
                (l) => `<div style="display:flex;gap:26px;align-items:baseline">
                  <span style="flex:0 0 220px;font-family:'IBM Plex Mono',monospace;font-size:18px;letter-spacing:.18em;text-transform:uppercase;color:${T.gold};white-space:nowrap">${esc(l.k)}</span>
                  <span style="flex:1;font-size:28px;line-height:1.36;color:${T.cream}">${esc(l.v)}</span>
                </div>`,
              )
              .join('')}
          </div>
        </div>
        ${foot()}`)

    case 'thread':
      return shell(`
        ${mast(esc(post.when))}
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:32px">
          <div class="eyebrow" style="margin:0;color:${T.gold}">${esc(post.eyebrow)}</div>
          <div style="font-family:'Newsreader',Georgia,serif;font-weight:300;font-size:70px;line-height:1.08;letter-spacing:-.022em;color:${T.cream}">${esc(post.headline)}</div>
          <div style="font-family:'Newsreader',Georgia,serif;font-style:italic;font-weight:300;font-size:33px;line-height:1.4;color:${T.creamMuted}">${esc(post.context)}</div>
          <div style="height:1px;background:${T.hair}"></div>
          <div style="display:flex;flex-direction:column;gap:18px">
            ${post.prompts
              .map(
                (p, i) => `<div style="display:flex;gap:24px;align-items:baseline">
                  <span style="font-family:'IBM Plex Mono',monospace;font-size:21px;color:${T.gold}">0${i + 1}</span>
                  <span style="flex:1;font-size:29px;line-height:1.34;color:${T.cream}">${esc(p)}</span>
                </div>`,
              )
              .join('')}
          </div>
          <!-- The one place on the page we want a tap: inverted so it carries. -->
          <div class="paper" style="margin-top:10px;padding:24px 30px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-family:'IBM Plex Mono',monospace;font-size:19px;letter-spacing:.18em;text-transform:uppercase;color:${T.onIvorySoft}">Join the thread</span>
            <span style="font-family:'IBM Plex Mono',monospace;font-size:27px;font-weight:600;color:${T.onIvory}">${esc(post.cta)}</span>
          </div>
        </div>
        ${foot()}`)

    case 'invite':
      return shell(`
        ${mast('Open · one a day')}
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:34px">
          <div style="font-family:'Newsreader',Georgia,serif;font-weight:300;font-size:86px;line-height:1.04;letter-spacing:-.025em;color:${T.cream}">${esc(post.headline)}</div>
          <div style="font-family:'Kalam',cursive;font-weight:400;font-size:40px;line-height:1.28;color:${T.oxbloodOnDark}">${esc(post.sub)}</div>
          <div style="height:1px;background:${T.hair};margin-top:6px"></div>
          <div style="display:flex;flex-direction:column;gap:24px">
            ${post.steps
              .map(
                (s, i) => `<div style="display:flex;gap:28px;align-items:baseline">
                  <span style="font-family:'IBM Plex Mono',monospace;font-size:24px;color:${T.gold};letter-spacing:.1em">0${i + 1}</span>
                  <span style="font-size:34px;line-height:1.3;color:${T.cream}">${esc(s)}</span>
                </div>`,
              )
              .join('')}
          </div>
        </div>
        ${foot()}`)
  }
}
