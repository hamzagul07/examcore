import type { StemDeepSpec } from '../stem-deep-spec'

/** AS Organic chemistry 13.x–18.x */
export const PACK_9701_AS_ORGANIC: Record<string, Partial<StemDeepSpec>> = {
  '9701:3.5': {
    summary: 'VSEPR and electron-pair repulsion predict molecular shapes and bond angles for AS Chemistry.',
    simpleExplanation: {
      title: 'Shapes of molecules — VSEPR in four steps',
      summary:
        'Electron pairs (bonding and lone) arrange to minimise repulsion. Lone pairs compress bond angles below ideal geometry values.',
      analogy:
        'Think of electron pairs as people in a lift: lone pairs are wider passengers — everyone spreads out, and lone pairs push bonding pairs closer together.',
      steps: [
        'Count electron regions around the central atom (bonds + lone pairs; double bonds = one region).',
        'Name the electron-domain geometry: linear, trigonal planar, tetrahedral, trigonal bipyramidal, octahedral.',
        'Apply lone-pair repulsion: lone pairs > bonding pairs — state how angles shrink (e.g. H₂O ~104.5°).',
        'Use the Molecule Shapes sim: build CH₄, NH₃, H₂O — compare predicted vs displayed angles for exams.',
      ],
    },
    flashcards: [
      { front: 'State the VSEPR principle.', back: 'Electron pairs arrange to minimise repulsion between regions.' },
      { front: 'Order of repulsion strength.', back: 'Lone pair–lone pair > lone pair–bond > bond–bond.' },
      { front: 'Shape of CH₄ and bond angle.', back: 'Tetrahedral, 109.5° (four bonding regions, no lone pairs).' },
      { front: 'Shape of NH₃ and approximate angle.', back: 'Trigonal pyramidal, ~107° (one lone pair compresses H–N–H).' },
      { front: 'Shape of H₂O and angle.', back: 'Non-linear/bent, ~104.5° (two lone pairs).' },
      { front: 'Why is CO₂ linear?', back: 'Two double-bond regions, no lone pairs on carbon → 180°.' },
      { front: 'How many regions for SF₆?', back: 'Six bonding regions → octahedral, 90° angles.' },
      { front: 'Does a double bond count as two regions?', back: 'No — one region of electron density for VSEPR.' },
      { front: 'Trigonal planar angle.', back: '120° (three regions, no lone pairs on central atom).' },
      { front: 'Exam trap on lone pairs.', back: 'Molecular shape name may ignore lone pairs (e.g. H₂O is “bent” not “tetrahedral”).' },
    ],
    sections: [
      {
        type: 'intro',
        content:
          '**Shapes of molecules** (3.5) uses VSEPR to predict geometry from electron-pair repulsion — tested heavily on Paper 2 with 3D reasoning.',
      },
      { type: 'heading', content: 'Electron regions and repulsion' },
      {
        type: 'text',
        content:
          'Count **regions** of electron density around the central atom. **Lone pairs** occupy space and repel bonding pairs more strongly, reducing bond angles below ideal values (109.5°, 120°, 180°).',
      },
      { type: 'heading', content: 'Common shapes table' },
      {
        type: 'formula',
        content:
          'Linear 180° | Trigonal planar 120° | Tetrahedral 109.5° | Trigonal pyramidal ~107° | Bent H₂O ~104.5°',
      },
      { type: 'heading', content: 'Predicting shape workflow' },
      {
        type: 'keyPoints',
        items: [
          'Draw dot-and-cross or use formula to count lone pairs.',
          'State electron-domain geometry first, then molecular shape.',
          'Always mention lone pair repulsion when angles < ideal.',
          'Use the PhET sim to visualise 3D geometry.',
        ],
      },
      {
        type: 'workedExample',
        question: 'Predict the shape and bond angle of NH₃.',
        solution:
          'N has 3 bonds + 1 lone pair → **4 regions** → trigonal pyramidal. Lone pair compresses H–N–H to about **107°**.',
      },
      {
        type: 'workedExample',
        question: 'Explain why CO₂ is linear with 180° bond angle.',
        solution:
          'C forms two C=O double bonds, no lone pairs on carbon → **two regions** → linear, **180°**.',
      },
      { type: 'examTip', content: 'State **lone pair repulsion** whenever bond angles are below standard tetrahedral/planar values.' },
    ],
  },
}
