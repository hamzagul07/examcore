'use client'

import { useMemo, useState } from 'react'
import { COMMAND_WORD_TIERS, type CommandWord, type CommandWordTier } from '@/lib/seo/command-words'

const TIER_ORDER: CommandWordTier[] = ['recall', 'understanding', 'application', 'analysis', 'evaluation']

export function CommandWordExplorer({ words }: { words: CommandWord[] }) {
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState<CommandWordTier | 'all'>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return words.filter((w) => {
      if (tier !== 'all' && w.tier !== tier) return false
      if (!q) return true
      return (
        w.word.toLowerCase().includes(q) ||
        w.meaning.toLowerCase().includes(q) ||
        w.examiner.toLowerCase().includes(q)
      )
    })
  }, [words, query, tier])

  const grouped = TIER_ORDER.map((t) => ({
    tier: t,
    items: filtered.filter((w) => w.tier === t),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="cmd-tool">
      <div className="cmd-controls">
        <input
          type="search"
          className="cmd-search"
          placeholder="Search a command word (e.g. evaluate, explain)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search command words"
        />
        <div className="cmd-tabs" role="tablist" aria-label="Filter by depth">
          <button
            type="button"
            className={`cmd-tab${tier === 'all' ? ' is-active' : ''}`}
            onClick={() => setTier('all')}
            aria-pressed={tier === 'all'}
          >
            All
          </button>
          {TIER_ORDER.map((t) => (
            <button
              key={t}
              type="button"
              className={`cmd-tab${tier === t ? ' is-active' : ''}`}
              onClick={() => setTier(t)}
              aria-pressed={tier === t}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {grouped.length === 0 ? (
        <p className="ms-body-2" style={{ marginTop: 24 }}>
          No command words match “{query}”. Try “evaluate”, “explain” or “describe”.
        </p>
      ) : (
        grouped.map((group) => (
          <section key={group.tier} className="cmd-group">
            <h2 className="ms-overline cmd-group-head">{COMMAND_WORD_TIERS[group.tier]}</h2>
            <ul className="cmd-list">
              {group.items.map((w) => (
                <li key={w.word} className="cmd-card">
                  <h3 className="cmd-word">{w.word}</h3>
                  <p className="cmd-meaning">{w.meaning}</p>
                  <dl className="cmd-detail">
                    <div>
                      <dt>What earns the marks</dt>
                      <dd>{w.examiner}</dd>
                    </div>
                    <div>
                      <dt>Common mistake</dt>
                      <dd>{w.pitfall}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
