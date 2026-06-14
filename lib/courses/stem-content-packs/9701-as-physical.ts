import type { StemDeepSpec } from '../stem-deep-spec'

/** AS Physical chemistry chapters 1.x–8.x — content packs when no hand override exists. */
export const PACK_9701_AS_PHYSICAL: Record<string, Partial<StemDeepSpec>> = {
  '9701:8.2': {
    summary:
      'Activation energy and temperature control reaction rates via the Maxwell–Boltzmann distribution and collision theory.',
    simpleExplanation: {
      title: 'Activation energy — why heating speeds reactions',
      summary:
        'Only collisions with energy ≥ Ea produce products. Raising temperature shifts the Boltzmann distribution so more particles exceed Ea without changing average energy much.',
      analogy:
        'Activation energy is the minimum height athletes need to clear a hurdle — raising temperature gives more molecules enough energy to get over; a catalyst lowers the hurdle itself.',
      steps: [
        'Define activation energy Ea as the minimum kinetic energy for a successful collision.',
        'Heat the sample in the sim — faster particles mean more collisions exceed Ea (Boltzmann tail).',
        'Apply the rule of thumb: rate often doubles per 10 °C rise when Ea is unchanged.',
        'Contrast catalysts: they lower Ea without being consumed — exam trap: catalyst does not shift equilibrium.',
      ],
    },
    flashcards: [
      { front: 'Define activation energy (Ea).', back: 'Minimum kinetic energy colliding particles need to react.' },
      { front: 'Why does increasing temperature increase rate?', back: 'Greater fraction of particles have E ≥ Ea; collision frequency also rises.' },
      { front: 'State the approximate rate change per 10 °C.', back: 'Rate often doubles (rule of thumb — not universal but commonly cited).' },
      { front: 'How do catalysts increase rate without shifting equilibrium?', back: 'They provide an alternative route with lower Ea; K unchanged at constant T.' },
      { front: 'Collision theory requirement besides energy?', back: 'Correct orientation of colliding particles.' },
      { front: 'What does the Boltzmann distribution show?', back: 'Spread of molecular speeds/energies at a given temperature — not all particles have the same energy.' },
      { front: 'Effect of higher concentration on rate?', back: 'More particles per unit volume → more frequent collisions (successful fraction similar at same T).' },
      { front: 'Does a catalyst change ΔH?', back: 'No — only lowers Ea; start and end enthalpies unchanged.' },
      { front: 'Why is Ea on an enthalpy profile?', back: 'Peak between reactants and products represents the transition state energy barrier.' },
      { front: 'Exam trap: temperature and Maxwell–Boltzmann?', back: 'Higher T increases spread and mean energy — explain using fraction above Ea, not “all particles faster”.' },
    ],
    sections: [
      {
        type: 'intro',
        content:
          '**Activation energy** (8.2) links collision theory to the measurable effect of temperature on rate — essential for Arrhenius-style reasoning in A Level Chemistry.',
      },
      { type: 'heading', content: 'Collision theory recap' },
      {
        type: 'text',
        content:
          'For a reaction to occur, particles must collide with **energy ≥ Ea** and suitable **orientation**. Increasing temperature increases the **proportion** of particles exceeding Ea (visible in the Maxwell–Boltzmann distribution) and increases collision frequency.',
      },
      { type: 'heading', content: 'Maxwell–Boltzmann distribution' },
      {
        type: 'text',
        content:
          'At higher temperature the peak shifts slightly right and broadens — more particles in the high-energy tail can exceed Ea. Cambridge often asks you to **sketch** two curves on one axis and shade the area above Ea.',
      },
      { type: 'heading', content: 'Catalysts vs temperature' },
      {
        type: 'keyPoints',
        items: [
          'Catalyst lowers Ea — more successful collisions at same T.',
          'Catalyst does not change position of equilibrium (same ΔG).',
          'Do not confuse activation energy with enthalpy change ΔH.',
          'Orientation requirement still applies with a catalyst.',
        ],
      },
      {
        type: 'workedExample',
        question:
          'Explain why the rate of a gas-phase reaction increases when temperature rises from 300 K to 310 K.',
        solution:
          '**Energy:** More molecules have E ≥ Ea (Boltzmann tail expands).\n\n**Frequency:** Faster average speed → more collisions per second.\n\nTogether these increase the rate of successful collisions.',
      },
      {
        type: 'workedExample',
        question: 'A reaction has Ea = 50 kJ mol⁻¹. How does a catalyst affect the rate at constant T?',
        solution:
          'Catalyst provides alternative mechanism with **lower Ea** → greater fraction of collisions succeed **without** changing ΔH or equilibrium constant at that temperature.',
      },
      { type: 'examTip', content: 'Always mention **fraction above Ea** when discussing temperature — not just “particles move faster”.' },
    ],
  },
}
