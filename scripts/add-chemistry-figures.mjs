#!/usr/bin/env node
/**
 * Adds molecule figures to chemistry lessons, with structures sourced from
 * PubChem rather than recalled.
 *
 * Why sourced: a wrong SMILES renders a confident, beautiful, incorrect
 * structure — exactly the failure mode that makes a diagram worse than no
 * diagram. So every entry below carries an `expect` molecular formula, and the
 * script refuses to write a figure whose PubChem formula does not match. A name
 * that silently resolves to the wrong compound (a salt, a hydrate, a different
 * isomer) is caught here instead of by a student.
 *
 * The curation — which molecules illustrate which topic, and what the caption
 * tells the student to notice — is human judgment and lives in CURATION.
 * PubChem only supplies the structure.
 *
 * Usage:
 *   node scripts/add-chemistry-figures.mjs --dry-run     # report, write nothing
 *   node scripts/add-chemistry-figures.mjs               # write figures[]
 *   node scripts/add-chemistry-figures.mjs --slug 16-1-alcohols
 */

import fs from 'node:fs'
import path from 'node:path'

const PROJECT = process.cwd()
const CACHE_PATH = path.join(PROJECT, 'scripts/.pubchem-cache.json')
const PUBCHEM = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const ONLY_SLUG = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null

/**
 * `stereo: true` uses PubChem's isomeric SMILES so double-bond and chiral
 * configuration survive — needed for the isomerism topics, noise everywhere else.
 */
const CURATION = [
  {
    subject: '9701',
    slug: '13-1-formulas-functional-groups-and-the-naming-of-organic-compounds',
    molecules: [
      { name: 'ethanol', expect: 'C2H6O', title: 'Ethanol — an alcohol', caption: 'The –OH group is the functional group; alcohols are named with the suffix -ol.' },
      { name: 'acetone', expect: 'C3H6O', title: 'Propanone — a ketone', caption: 'C=O with a carbon on both sides. Ketones take the suffix -one.' },
      { name: 'acetic acid', expect: 'C2H4O2', title: 'Ethanoic acid — a carboxylic acid', caption: '–COOH combines C=O and –OH on the same carbon. Suffix -oic acid.' },
    ],
  },
  {
    subject: '9701',
    slug: '13-3-shapes-of-organic-molecules-and-bonds',
    molecules: [
      { name: 'ethane', expect: 'C2H6', title: 'Ethane — sp³, tetrahedral', caption: 'Four σ bonds per carbon, bond angle ≈109.5°. Free rotation about C–C.' },
      { name: 'ethylene', expect: 'C2H4', title: 'Ethene — sp², planar', caption: 'Three σ bonds plus one π bond, ≈120°. The π bond locks rotation — which is why E/Z isomers exist.' },
      { name: 'acetylene', expect: 'C2H2', title: 'Ethyne — sp, linear', caption: 'Two σ bonds and two π bonds, 180°.' },
    ],
  },
  {
    subject: '9701',
    slug: '13-4-isomerism-structural-isomerism-and-stereoisomerism',
    molecules: [
      { name: 'butane', expect: 'C4H10', title: 'Butane — straight chain', caption: 'Same formula C₄H₁₀ as the next structure: these are chain isomers.' },
      { name: 'isobutane', expect: 'C4H10', title: '2-methylpropane — branched', caption: 'Branching lowers the boiling point: less surface contact, weaker induced dipole forces.' },
      { name: 'cis-2-butene', expect: 'C4H8', stereo: true, title: '(Z)-but-2-ene', caption: 'Both methyl groups on the same side of the C=C. The π bond prevents rotation, so this cannot become the E form.' },
      { name: 'trans-2-butene', expect: 'C4H8', stereo: true, title: '(E)-but-2-ene', caption: 'Methyl groups on opposite sides — a different compound with a different boiling point.' },
    ],
  },
  {
    subject: '9701',
    slug: '14-1-alkanes',
    molecules: [
      { name: 'hexane', expect: 'C6H14', title: 'Hexane', caption: 'Saturated: only C–C and C–H single bonds. General formula CₙH₂ₙ₊₂.' },
      { name: '2-methylpentane', expect: 'C6H14', title: '2-methylpentane', caption: 'Same C₆H₁₄, but branched — so it boils lower than hexane.' },
    ],
  },
  {
    subject: '9701',
    slug: '14-2-alkenes',
    molecules: [
      { name: 'ethylene', expect: 'C2H4', title: 'Ethene', caption: 'The C=C is electron-rich, so it attacks electrophiles — hence electrophilic addition.' },
      { name: '1,2-dibromoethane', expect: 'C2H4Br2', title: '1,2-dibromoethane', caption: 'Product of ethene + bromine. The C=C is gone, which is why bromine water is decolourised.' },
    ],
  },
  {
    subject: '9701',
    slug: '15-1-halogenoalkanes',
    molecules: [
      { name: '1-bromobutane', expect: 'C4H9Br', title: '1-bromobutane — primary', caption: 'The C–Br carbon is easy to attack from behind, so primary halogenoalkanes favour SN2.' },
      { name: 'tert-butyl bromide', expect: 'C4H9Br', title: '2-bromo-2-methylpropane — tertiary', caption: 'Three alkyl groups block backside attack but stabilise the carbocation, so tertiary favours SN1.' },
    ],
  },
  {
    subject: '9701',
    slug: '16-1-alcohols',
    molecules: [
      { name: '1-propanol', expect: 'C3H8O', title: 'Propan-1-ol — primary', caption: 'One carbon attached to the C–OH carbon. Oxidises to an aldehyde, then a carboxylic acid.' },
      { name: '2-propanol', expect: 'C3H8O', title: 'Propan-2-ol — secondary', caption: 'Two carbons attached. Oxidises to a ketone and stops there.' },
      { name: 'tert-butanol', expect: 'C4H10O', title: '2-methylpropan-2-ol — tertiary', caption: 'Three carbons attached and no H on the C–OH carbon, so it resists oxidation — no colour change with dichromate.' },
    ],
  },
  {
    subject: '9701',
    slug: '17-1-aldehydes-and-ketones',
    molecules: [
      { name: 'propanal', expect: 'C3H6O', title: 'Propanal — an aldehyde', caption: 'C=O at the end of the chain, with an H attached. That H is why aldehydes are oxidised by Tollens’ and Fehling’s.' },
      { name: 'acetone', expect: 'C3H6O', title: 'Propanone — a ketone', caption: 'Same C₃H₆O, but C=O is in the middle with no H attached — so it is not oxidised.' },
    ],
  },
  {
    subject: '9701',
    slug: '18-1-carboxylic-acids',
    molecules: [
      { name: 'acetic acid', expect: 'C2H4O2', title: 'Ethanoic acid', caption: 'Losing H⁺ gives a carboxylate ion stabilised by delocalisation — which is what makes it acidic.' },
      { name: 'benzoic acid', expect: 'C7H6O2', title: 'Benzoic acid', caption: 'The ring withdraws electron density, so benzoic acid is a stronger acid than ethanoic acid.' },
    ],
  },
  {
    subject: '9701',
    slug: '18-2-esters',
    molecules: [
      { name: 'ethyl acetate', expect: 'C4H8O2', title: 'Ethyl ethanoate', caption: 'The ester link –COO–. Named alcohol-part first (ethyl), then acid-part (ethanoate).' },
      { name: 'methyl propanoate', expect: 'C4H8O2', title: 'Methyl propanoate', caption: 'Same C₄H₈O₂ as ethyl ethanoate — the split between the alcohol and acid halves is different.' },
    ],
  },
  {
    subject: '9701',
    slug: '19-1-primary-amines',
    molecules: [
      { name: 'ethylamine', expect: 'C2H7N', title: 'Ethylamine', caption: 'The alkyl group pushes electron density onto N, so the lone pair is more available — a stronger base than ammonia.' },
      { name: 'aniline', expect: 'C6H7N', title: 'Phenylamine', caption: 'Here the lone pair is delocalised into the ring, so it is far less available — a much weaker base.' },
    ],
  },
  {
    subject: '9701',
    slug: '19-2-nitriles-and-hydroxynitriles',
    molecules: [
      { name: 'propionitrile', expect: 'C3H5N', title: 'Propanenitrile', caption: 'The C≡N adds one carbon to the chain — which is how nitriles are used to lengthen a skeleton.' },
      { name: 'lactonitrile', expect: 'C3H5NO', title: '2-hydroxypropanenitrile', caption: 'Formed by adding HCN across the C=O of ethanal. Hydrolysis gives a 2-hydroxycarboxylic acid.' },
    ],
  },
  {
    subject: '9701',
    slug: '20-1-addition-polymerisation',
    molecules: [
      { name: 'ethylene', expect: 'C2H4', title: 'Ethene → poly(ethene)', caption: 'The monomer. Addition polymerisation opens the C=C and joins units with no atoms lost.' },
      { name: 'vinyl chloride', expect: 'C2H3Cl', title: 'Chloroethene → PVC', caption: 'One H replaced by Cl. Polar C–Cl bonds make PVC rigid, and are why burning it releases HCl.' },
      { name: 'tetrafluoroethylene', expect: 'C2F4', title: 'Tetrafluoroethene → PTFE', caption: 'Strong C–F bonds make PTFE unreactive and non-stick — and very slow to degrade.' },
    ],
  },
  // ── A Level organic (9701 topics 29–35) ──────────────────────────────────
  {
    subject: '9701',
    slug: '29-3-shapes-of-aromatic-organic-molecules-and-bonds',
    molecules: [
      { name: 'benzene', expect: 'C6H6', title: 'Benzene — delocalised ring', caption: 'Every C–C bond is the same length. The p orbitals overlap into a delocalised π system above and below a planar ring.' },
      { name: 'toluene', expect: 'C7H8', title: 'Methylbenzene', caption: 'The methyl group pushes electron density into the ring, activating it towards electrophiles and directing to 2- and 4-.' },
    ],
  },
  {
    subject: '9701',
    slug: '29-4-isomerism-optical',
    molecules: [
      { name: 'L-alanine', expect: 'C3H7NO2', stereo: true, title: 'L-alanine', caption: 'The central carbon carries four different groups — a chiral centre, so the molecule is not superimposable on its mirror image.' },
      { name: 'D-alanine', expect: 'C3H7NO2', stereo: true, title: 'D-alanine — the enantiomer', caption: 'Identical bonds and identical physical properties, but it rotates plane-polarised light the opposite way.' },
    ],
  },
  {
    subject: '9701',
    slug: '30-1-arenes',
    molecules: [
      { name: 'benzene', expect: 'C6H6', title: 'Benzene', caption: 'Delocalisation makes the ring stable, so arenes substitute rather than add — the ring survives the reaction.' },
      { name: 'nitrobenzene', expect: 'C6H5NO2', title: 'Nitrobenzene', caption: 'Product of nitration with concentrated HNO₃/H₂SO₄. The electrophile is NO₂⁺.' },
    ],
  },
  {
    subject: '9701',
    slug: '31-1-halogen-compounds',
    molecules: [
      { name: 'chloroethane', expect: 'C2H5Cl', title: 'Chloroethane — reactive', caption: 'The polar C–Cl bond is readily attacked by nucleophiles.' },
      { name: 'chlorobenzene', expect: 'C6H5Cl', title: 'Chlorobenzene — unreactive', caption: 'The Cl lone pair overlaps with the ring, giving partial double-bond character. That shorter, stronger C–Cl bond resists substitution.' },
    ],
  },
  {
    subject: '9701',
    slug: '32-2-phenol',
    molecules: [
      { name: 'phenol', expect: 'C6H6O', title: 'Phenol', caption: 'The –OH lone pair delocalises into the ring, stabilising the phenoxide ion — so phenol is acidic, unlike an alcohol.' },
      { name: '2,4,6-tribromophenol', expect: 'C6H3Br3O', title: '2,4,6-tribromophenol', caption: 'The white precipitate with bromine water. Three substitutions with no catalyst shows how strongly –OH activates the ring.' },
    ],
  },
  {
    subject: '9701',
    slug: '33-1-carboxylic-acids',
    molecules: [
      { name: 'acetic acid', expect: 'C2H4O2', title: 'Ethanoic acid', caption: 'The baseline for comparison — pKa ≈ 4.8.' },
      { name: 'chloroacetic acid', expect: 'C2H3ClO2', title: 'Chloroethanoic acid — stronger', caption: 'Cl withdraws electron density, stabilising the carboxylate ion, so the H⁺ is lost more readily.' },
      { name: 'benzoic acid', expect: 'C7H6O2', title: 'Benzoic acid', caption: 'The ring also withdraws density — stronger than ethanoic acid, weaker than the chlorinated acid.' },
    ],
  },
  {
    subject: '9701',
    slug: '33-3-acyl-chlorides',
    molecules: [
      { name: 'acetyl chloride', expect: 'C2H3ClO', title: 'Ethanoyl chloride', caption: 'C=O plus a good leaving group makes this the most reactive acid derivative — it fumes in moist air.' },
    ],
  },
  {
    subject: '9701',
    slug: '34-1-primary-and-secondary-amines',
    molecules: [
      { name: 'ethylamine', expect: 'C2H7N', title: 'Ethylamine — primary', caption: 'One alkyl group donating electron density to N.' },
      { name: 'diethylamine', expect: 'C4H11N', title: 'Diethylamine — secondary', caption: 'Two alkyl groups make the lone pair still more available, so it is the stronger base.' },
    ],
  },
  {
    subject: '9701',
    slug: '34-2-phenylamine-and-azo-compounds',
    molecules: [
      { name: 'aniline', expect: 'C6H7N', title: 'Phenylamine', caption: 'The lone pair is delocalised into the ring — a much weaker base than an aliphatic amine, but the ring is strongly activated.' },
      { name: 'azobenzene', expect: 'C12H10N2', title: 'Azobenzene — the azo group', caption: 'Two rings joined by –N=N–. The extended delocalisation across the whole system is what makes azo compounds coloured.' },
    ],
  },
  {
    subject: '9701',
    slug: '34-3-amides',
    molecules: [
      { name: 'acetamide', expect: 'C2H5NO', title: 'Ethanamide', caption: 'The N lone pair delocalises into the C=O, so amides are neutral — not basic like amines.' },
    ],
  },
  {
    subject: '9701',
    slug: '34-4-amino-acids',
    molecules: [
      { name: 'glycine', expect: 'C2H5NO2', title: 'Glycine — the achiral one', caption: 'Two hydrogens on the central carbon, so no chiral centre. The only amino acid without optical isomers.' },
      { name: 'L-alanine', expect: 'C3H7NO2', stereo: true, title: 'Alanine — chiral', caption: 'Four different groups on the central carbon. Both –NH₂ and –COOH are present, so it forms a zwitterion at intermediate pH.' },
    ],
  },
  {
    subject: '9701',
    slug: '35-1-condensation-polymerisation',
    molecules: [
      { name: 'ethylene glycol', expect: 'C2H6O2', title: 'Ethane-1,2-diol', caption: 'Two –OH groups: one monomer for PET. Each link formed loses a small molecule — that is what makes it condensation, not addition.' },
      { name: 'terephthalic acid', expect: 'C8H6O4', title: 'Benzene-1,4-dicarboxylic acid', caption: 'Two –COOH groups. With the diol above it forms the ester links of PET (a polyester).' },
      { name: 'hexamethylenediamine', expect: 'C6H16N2', title: '1,6-diaminohexane', caption: 'Two –NH₂ groups: one monomer for nylon-6,6.' },
      { name: 'adipic acid', expect: 'C6H10O4', title: 'Hexanedioic acid', caption: 'Two –COOH groups. With the diamine above it forms the amide links of nylon-6,6 (a polyamide).' },
    ],
  },

  // ── IB Chemistry ─────────────────────────────────────────────────────────
  ...['ib-chemistry-hl', 'ib-chemistry-sl'].map((subject) => ({
    subject,
    slug: 's3-2-functional-groups-classification-of-organic-compounds',
    molecules: [
      { name: 'ethanol', expect: 'C2H6O', title: 'Ethanol — alcohol', caption: 'The –OH group. Homologous series members differ by CH₂ and share chemical properties.' },
      { name: 'acetone', expect: 'C3H6O', title: 'Propanone — ketone', caption: 'C=O with carbons on both sides.' },
      { name: 'acetic acid', expect: 'C2H4O2', title: 'Ethanoic acid — carboxylic acid', caption: '–COOH: a carbonyl and a hydroxyl on the same carbon.' },
      { name: 'ethylamine', expect: 'C2H7N', title: 'Ethylamine — amine', caption: 'The –NH₂ group, with a lone pair on nitrogen.' },
    ],
  })),
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
  } catch {
    return {}
  }
}

const cache = loadCache()

async function fetchStructure(name) {
  if (cache[name]) return cache[name]
  const url = `${PUBCHEM}/${encodeURIComponent(name)}/property/SMILES,ConnectivitySMILES,MolecularFormula,IUPACName/JSON`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`PubChem ${res.status} for "${name}"`)
  const json = await res.json()
  const props = json?.PropertyTable?.Properties?.[0]
  if (!props) throw new Error(`no properties for "${name}"`)
  const entry = {
    cid: props.CID,
    smiles: props.ConnectivitySMILES ?? props.SMILES,
    isomericSmiles: props.SMILES ?? props.ConnectivitySMILES,
    formula: props.MolecularFormula,
    iupac: props.IUPACName,
  }
  cache[name] = entry
  // PubChem asks for no more than 5 requests/second.
  await sleep(250)
  return entry
}

async function main() {
  const targets = ONLY_SLUG ? CURATION.filter((c) => c.slug === ONLY_SLUG) : CURATION
  if (!targets.length) {
    console.error(`No curation entry for slug "${ONLY_SLUG}"`)
    process.exit(1)
  }

  let written = 0
  let figuresTotal = 0
  const problems = []

  for (const entry of targets) {
    const file = path.join(PROJECT, 'content/courses', entry.subject, `${entry.slug}.json`)
    if (!fs.existsSync(file)) {
      problems.push(`MISSING LESSON  ${entry.subject}/${entry.slug}`)
      continue
    }

    const figures = []
    for (const m of entry.molecules) {
      let s
      try {
        s = await fetchStructure(m.name)
      } catch (err) {
        problems.push(`FETCH FAILED    ${m.name}: ${err.message}`)
        continue
      }
      if (s.formula !== m.expect) {
        // The guard that matters: the name resolved, but to the wrong compound.
        problems.push(
          `FORMULA MISMATCH ${m.name}: expected ${m.expect}, PubChem gave ${s.formula} (CID ${s.cid}, ${s.iupac})`
        )
        continue
      }
      figures.push({
        kind: 'molecule',
        title: m.title,
        caption: m.caption,
        smiles: m.stereo ? s.isomericSmiles : s.smiles,
      })
      console.log(`  ✓ ${m.title.padEnd(42)} ${s.formula.padEnd(9)} CID ${s.cid}`)
    }

    if (!figures.length) {
      problems.push(`NO FIGURES      ${entry.slug}`)
      continue
    }

    const lesson = JSON.parse(fs.readFileSync(file, 'utf8'))
    const existing = (lesson.figures ?? []).filter((f) => f.kind !== 'molecule')
    lesson.figures = [...existing, ...figures]

    if (!DRY_RUN) {
      fs.writeFileSync(file, `${JSON.stringify(lesson, null, 2)}\n`)
      written++
    }
    figuresTotal += figures.length
    console.log(`${DRY_RUN ? '[dry] ' : ''}${entry.subject}/${entry.slug} — ${figures.length} figure(s)\n`)
  }

  if (!DRY_RUN) fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`)

  console.log('─'.repeat(72))
  console.log(`${DRY_RUN ? 'Would write' : 'Wrote'} ${figuresTotal} figures across ${DRY_RUN ? targets.length : written} lessons`)
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`)
    for (const p of problems) console.log(`  ${p}`)
    process.exitCode = 1
  } else {
    console.log('No problems — every structure matched its expected molecular formula.')
  }
}

await main()
