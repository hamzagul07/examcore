# Question-bank review — adversarial correctness pass

_Second-model (gemini-2.5-pro) re-solved every question. Git-ignored._

- Questions reviewed: **96**
- Flagged: **27** (high severity / wrong maths: **5**)

## 🔴 High severity — wrong maths / unreachable answer

| Question | Topic | Issue | Correct answer |
|---|---|---|---|
| c-5-doppler-effect-q2 | C.5 Doppler effect | The calculation for part (b) is incorrect. The unrounded result is 409.108... Hz, which rounds to 409 Hz at 3 significant figures, not 410 Hz. | (a) 475 Hz, (b) 409 Hz |
| d-3-motion-in-electromagnetic-fields-q4 | D.3 Motion in electromagnetic fields | The model answer calculates the radii of the ion paths to be 10 times larger than the correct value, leading to an incorrect final separation distance. | 0.00403 m |
| e-1-structure-of-the-atom-q2 | E.1 Structure of the atom | SyntaxError: Unterminated string in JSON at position 250 (line 6 column 41) | — |
| e-3-radioactive-decay-q2 | E.3 Radioactive decay | The model answer uses prematurely rounded intermediate values (λ and the logarithm), leading to an intermediate result of 5047 years which rounds to 5050 years. A more precise calculation without intermediate rounding yields 5040.6 years, which rounds to 5040 years. | 5040 years |
| e-3-radioactive-decay-q4 | E.3 Radioactive decay | SyntaxError: Unterminated string in JSON at position 398 (line 2 column 397) | — |

## 🟡 Low severity — likely subtopic-code / minor

| Question | Topic | Issue |
|---|---|---|
| a-2-forces-and-momentum-q1 | A.2 Forces and momentum | The syllabus reference A.2.2 pertains to the conservation of linear momentum, but the question assesses the calculation of impulse and average force, which corresponds to syllabus point A.2.1. |
| a-1-kinematics-q4 | A.1 Kinematics | The syllabus reference 'A.1.3' is incorrect; this question belongs to Topic 2 (Mechanics). |
| a-2-forces-and-momentum-q2 | A.2 Forces and momentum | The syllabus reference 'A.2.4' is not a standard IB Physics code for this core topic (Momentum and Impulse). |
| a-3-work-energy-and-power-q2 | A.3 Work, energy and power | The syllabus reference 'A.3.1' is incorrect; it refers to Relativity (Spacetime diagrams), while the question is about Work and Energy from Mechanics. |
| a-4-rigid-body-mechanics-q4 | A.4 Rigid body mechanics | The syllabus reference 'A.4.2' corresponds to General Relativity (the equivalence principle), not Rigid Body Mechanics. The question is about conservation of energy for a rolling object. |
| a-3-work-energy-and-power-q4 | A.3 Work, energy and power | The syllabus reference A.3.3 corresponds to the Hertzsprung-Russell diagram in Astrophysics, which is incorrect for a mechanics question on work and energy. The correct topic is 2.3. |
| a-4-rigid-body-mechanics-q3 | A.4 Rigid body mechanics | The syllabus reference A.4.4 corresponds to angular momentum, but the question is about rotational equilibrium, which is syllabus point A.4.3. |
| a-5-galilean-and-special-relativity-q1 | A.5 Galilean and special relativity | The syllabus reference A.5.3 (The Lorentz transformations) is incorrect. This question covers A.5.1 (The two postulates of special relativity) and concepts from A.5.6 (Time dilation). |
| b-1-thermal-energy-transfers-q3 | B.1 Thermal energy transfers | The syllabus reference 'B.1.3' is incorrect for a question on the greenhouse effect. This topic is covered under Core Topic 8.2 in the 2016 syllabus or Option D.4 in the 2025 syllabus. |
| b-3-gas-laws-q2 | B.3 Gas laws | The syllabus reference B.3.1 corresponds to 'The first law of thermodynamics', but the question tests the ideal gas law, which is covered in Topic 3.2. |
| b-4-thermodynamics-q4 | B.4 Thermodynamics | The syllabus reference B.4.1 is incomplete; parts (c) and (d) of the question explicitly test entropy, which belongs to syllabus sub-topic B.4.2. |
| c-3-wave-phenomena-q1 | C.3 Wave phenomena | The syllabus reference C.3.2 is incorrect; it refers to fibre optics, while the question is about single-slit diffraction (Core 4.4 or AHL 9.3). |
| c-4-standing-waves-and-resonance-q2 | C.4 Standing waves and resonance | The syllabus reference 'C.4.3' is incorrect. In recent IB Physics syllabi (e.g., first exams 2016 or 2025), standing waves are a core topic (Topic 4), not an option topic (Topic C). |
| c-5-doppler-effect-q3 | C.5 Doppler effect | The syllabus reference 'C.5.3' is incorrect. This topic belongs to the Astrophysics option (Option D in the 2016 and 2025 syllabi), not Engineering Physics (Option C). |
| d-4-induction-q2 | D.4 Induction | Syllabus reference D.4.2 corresponds to 'Stellar processes' in the IB Physics syllabus, not AC generators. The correct reference would be from Topic 11.2. |
| d-4-induction-q3 | D.4 Induction | The syllabus reference 'D.4.3' corresponds to Astrophysics (Stellar processes), not electromagnetic induction (transformers). A more appropriate reference would be from Topic 11.2. |
| e-1-structure-of-the-atom-q3 | E.1 Structure of the atom | The syllabus reference E.1.3 refers to the Schrödinger model, but the question is about the Bohr model, which corresponds to syllabus reference E.1.2. |
| e-3-radioactive-decay-q1 | E.3 Radioactive decay | The syllabus reference E.3.1 corresponds to Astrophysics (Stellar spectra), not Radioactive Decay (which is Topic 7.1). |
| e-3-radioactive-decay-q3 | E.3 Radioactive decay | The syllabus reference E.3.2 is incorrect for a question on radioactive decay. In recent IB Physics syllabi (2016, 2025), option E is Astrophysics or Engineering Physics, neither of which covers this topic. This content belongs to the Medical Physics option (e.g., D.3 in the 2016 syllabus). |
| e-4-fission-q3 | E.4 Fission | The syllabus reference 'E.4.3' is incorrect. In the pre-2025 IB Physics syllabus, Topic E is Astrophysics. In the current (post-2025) syllabus, the correct reference for this content is D.4.3. |
| e-4-fission-q4 | E.4 Fission | The syllabus reference 'E.4.1' is incorrect for the IB Physics curriculum; this topic corresponds to B.4.1 in the 2016 syllabus (Option B: Engineering Physics). |
| e-5-fusion-and-stars-q4 | E.5 Fusion and stars | The syllabus reference E.5.4 (The accelerating universe and redshift) is incorrect; the topic of comparing supernovae mechanisms is covered in E.4.5 or E.2.8. |

