# Question-bank review — adversarial correctness pass

_Second-model (gemini-2.5-pro) re-solved every question. Git-ignored._

- Questions reviewed: **242**
- Flagged: **38** (high severity / wrong maths: **11**)

## 🔴 High severity — wrong maths / unreachable answer

| Question | Topic | Issue | Correct answer |
|---|---|---|---|
| 1-1-sequences-and-series-arithmetic-and-geometric-q3 | 1.1 Sequences and series: arithmetic and geometric | The model answer incorrectly calculates the time required by solving for t, yielding t > 12.35... and rounding up to 13 years. The correct calculation yields t > 11.94..., which means the minimum number of full years is 12. | 12 years |
| 1-8-systems-of-linear-equations-q1 | 1.8 Systems of linear equations | The model answer is mathematically incorrect; it does not satisfy the second and third equations. | x=117/41, y=-68/41, z=77/41 |
| 2-6-exponential-and-logarithmic-functions-q2 | 2.6 Exponential and logarithmic functions | The final answer is rounded incorrectly. The value 1.79538... should be rounded to 1.80, not 1.79, at 3 significant figures. | x \approx 1.80 |
| 3-4-trigonometric-functions-and-their-graphs-q2 | 3.4 Trigonometric functions and their graphs | The model answer for parts (b) and (c) is mathematically incorrect. The value for t in part (b) is wrong. The calculation in part (c) incorrectly solves sin(...) = 1/3 instead of sin(...) = -1/3, leading to wrong intervals and total time. | a. Maximum depth is 15 m, Minimum depth is 9 m. b. The first time is approximately 0.0405 hours (or 2.4 minutes) after midnight. c. The total time is 15.3 hours. |
| 4-6-the-normal-distribution.pilot.json | The normal distribution | no response after retries | — |
| 4-3-probability-venn-diagrams-and-tree-diagrams.pilot.json | Probability, Venn diagrams and tree diagrams | no response after retries | — |
| 5-9-differential-equations-and-slope-fields-q1 | 5.9 Differential equations and slope fields | The model answer for part (b) incorrectly describes the solution curve's behavior, stating that y increases and that (1, -2) is a local minimum, when it is a local maximum. | (a) The slope is 1. (b) The solution curve is y = -sqrt((x-1)^2 + 4). It has a local maximum at (1, -2). The curve is symmetric about the line x=1, and y decreases as x moves away from 1 in either direction. (c) The slope is zero at all points (1, y) for y ≠ 0. |
| 5-6-definite-integrals-areas-and-volumes-of-revolution-q3 | 5.6 Definite integrals: areas and volumes of revolution | The model answer's numerical evaluation of the definite integral is incorrect. | \frac{\pi(e^{2\pi}-1)}{8} |
| 3-5-trigonometric-identities-and-equations-q3 | 3.5 Trigonometric identities and equations | The last two solutions are incorrect due to a calculation error when finding angles from a negative sine value. | $x \approx 1.13, 2.01, 3.97, 5.45$ |
| sl-4-6-q4 | 4.6 The normal distribution | The model answer's calculation is arithmetically incorrect: $510 - 9.8 = 500.2$, not 500. The stated answer of 500 is the correct rounding of 500.2 to 3 s.f., but the working shown is invalid. | $\mu = 500.2$ |
| 5-4-optimization-and-kinematics-q3 | 5.4 Optimization and kinematics | The displacement in part (b) is incorrect. The definite integral of v(t) from 0 to 5 evaluates to approximately 0.985, not 3.23. | The acceleration at t=3 is approximately -4.49 m/s^2. The displacement at t=5 is approximately 0.985 m. |

## 🟡 Low severity — likely subtopic-code / minor

| Question | Topic | Issue |
|---|---|---|
| 1-2-exponents-and-logarithms-q2 | 1.2 Exponents and logarithms | Syllabus reference AHL 1.4 (Binomial theorem) is incorrect; the question is about solving exponential equations, which is AHL 1.2. |
| 1-2-exponents-and-logarithms-q3 | 1.2 Exponents and logarithms | Syllabus reference AHL 1.3 (Counting principles) is incorrect; the question is about solving logarithmic equations, which is AHL 1.2. |
| 1-1-sequences-and-series-arithmetic-and-geometric-q4 | 1.1 Sequences and series: arithmetic and geometric | Syllabus reference AHL 1.4 does not exist in the IB Maths AA guide. The content fits under AHL 1.1 and AHL 1.2. |
| 1-6-complex-numbers-cartesian-polar-and-euler-form-q4 | 1.6 Complex numbers: Cartesian, polar and Euler form | The syllabus reference AHL 1.12 (geometrical interpretation) is not a good fit for this purely algebraic proof; AHL 1.11 or 1.13 would be more appropriate. |
| 2-2-functions-domain-range-composite-and-inverse-q2 | 2.2 Functions: domain, range, composite and inverse | The syllabus reference AHL 2.3 (Graph transformations) is incorrect; the question is about composite functions and domains, which is AHL 2.2. |
| 2-2-functions-domain-range-composite-and-inverse-q3 | 2.2 Functions: domain, range, composite and inverse | The syllabus reference AHL 2.4 (Odd and even functions) is incorrect; the question is about range, inverse functions and their graphs, which is AHL 2.2. |
| 2-2-functions-domain-range-composite-and-inverse-q4 | 2.2 Functions: domain, range, composite and inverse | The syllabus reference AHL 2.3 (Graph transformations) is incorrect; the question is about composite functions, domain and range, which is AHL 2.2. |
| 2-3-quadratic-functions-and-equations-q1 | 2.3 Quadratic functions and equations | The syllabus reference AHL 2.6 (Polynomials) is incorrect; this content is from SL 2.3 (Quadratic functions). |
| 2-3-quadratic-functions-and-equations-q2 | 2.3 Quadratic functions and equations | The syllabus reference AHL 2.5 (Complex numbers) is incorrect; this content is from SL 2.4 (The discriminant). |
| 2-3-quadratic-functions-and-equations-q3 | 2.3 Quadratic functions and equations | The syllabus reference AHL 2.3 does not exist; this content is from SL 2.3 (Quadratic functions). |
| 2-3-quadratic-functions-and-equations-q4 | 2.3 Quadratic functions and equations | The syllabus reference AHL 2.5 (Complex numbers) is incorrect; this content is from SL 2.3/2.4 (Quadratic equations and roots). |
| 2-6-exponential-and-logarithmic-functions-q1 | 2.6 Exponential and logarithmic functions | The syllabus code AHL 2.6 refers to graph transformations, whereas this question is about laws of logarithms (AHL 1.9). |
| 2-6-exponential-and-logarithmic-functions-q3 | 2.6 Exponential and logarithmic functions | The syllabus code AHL 2.9 refers to finding inverse functions, whereas this question is about solving logarithmic equations (AHL 1.9). |
| 2-6-exponential-and-logarithmic-functions-q4 | 2.6 Exponential and logarithmic functions | The syllabus code AHL 2.6 refers to graph transformations, whereas this question is about laws of logarithms (AHL 1.9). |
| 3-8-vector-equations-of-lines-q3 | 3.8 Vector equations of lines | The syllabus reference should be AHL 3.9 (Angle between two lines), not AHL 3.8. |
| 5-5-integration-as-antidifferentiation-q4 | 5.5 Integration as antidifferentiation | The syllabus reference should be AHL 5.9 (Integration by substitution), not AHL 5.6. |
| 5-2-differentiation-rules-chain-product-and-quotient-q2 | 5.2 Differentiation rules: chain, product and quotient | The primary skill tested is the product rule (AHL 5.2), so the AHL 5.3 reference is misleading for a question set on topic 5.2. |
| 5-2-differentiation-rules-chain-product-and-quotient-q3 | 5.2 Differentiation rules: chain, product and quotient | The primary skill tested is the quotient rule (AHL 5.2), so the AHL 5.3 reference is misleading for a question set on topic 5.2. |
| 5-10-maclaurin-series-q3 | 5.10 Maclaurin series | The model answer's percentage error is slightly inaccurate due to premature rounding of the integral approximation from part (b). |
| 5-4-optimization-and-kinematics-q3 | 5.4 Optimization and kinematics | Syllabus reference AHL 5.14 is for graphical relationships between f, f', f''; this kinematics calculation problem is a better fit for AHL 5.12. |
| 2-2-functions-domain-range-composite-and-inverse-q2 | 2.2 Functions: domain, range, composite and inverse | Syllabus reference SL 2.3 is questionable; the question is primarily about composite functions (SL 2.2) and solving equations (SL 2.7). |
| 2-2-functions-domain-range-composite-and-inverse-q3 | 2.2 Functions: domain, range, composite and inverse | Syllabus reference SL 2.4 is incorrect. The question covers inverse functions (SL 2.2) and rational functions (SL 2.5). |
| 5-2-differentiation-rules-chain-product-and-quotient-q3 | 5.2 Differentiation rules: chain, product and quotient | Syllabus reference should be SL 5.5 (Stationary points), not SL 5.4 (Tangents and normals). |
| sl-4-6-q1 | 4.6 The normal distribution | The syllabus reference SL 4.9 is for Spearman's rank correlation; the normal distribution is SL 4.6. |
| sl-4-6-q2 | 4.6 The normal distribution | The syllabus reference SL 4.9 is for Spearman's rank correlation; the normal distribution is SL 4.6. |
| sl-4-6-q3 | 4.6 The normal distribution | The syllabus reference SL 4.9 is for Spearman's rank correlation; the normal distribution is SL 4.6. |
| 5-6-definite-integrals-areas-and-volumes-of-revolution-q2 | 5.6 Definite integrals: areas and volumes of revolution | The syllabus reference should be SL 5.8 (areas between curves), not SL 5.7 (definite integrals). |

