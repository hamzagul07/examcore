# Math review worksheet — flagged questions

_Each question below was flagged by the adversarial pass (a 2nd model re-solved it). The verifier has BOTH true and false positives — decide each yourself. Tick **Keep** if the current answer is right, **Fix** if it is wrong._

**10 questions to review.**

---

## 1. `1-8-systems-of-linear-equations-q1`

**🔎 Verifier objection**

> The model answer is incorrect. The provided solution (x=1, y=-2, z=3) does not satisfy the second and third equations of the system.


**Verifier's proposed answer:** x = 117/41, y = -68/41, z = 77/41

### HL — 1.8 Systems of linear equations

- **File:** `ib-maths-aa-hl/1-8-systems-of-linear-equations.pilot.json` · **Marks:** 3 · P2 · calc

**Question**

> A system of linear equations is given by:
> $2x - y + 3z = 13$
> $x + 3y - z = -4$
> $-3x + 2y + z = -10$
> Solve the system of equations.

**Mark scheme**

- [1] Evidence of an attempt to use a GDC to solve the system (e.g., setting up the matrix or using equation solver).
- [1] $x=1$
- [1] $y=-2, z=3$

**Model answer**

> The system of equations can be represented by the augmented matrix:
> $\begin{pmatrix} 2 & -1 & 3 & 13 \\ 1 & 3 & -1 & -4 \\ -3 & 2 & 1 & -10 \end{pmatrix}$
> Using the simultaneous equation solver or matrix functions on a GDC, we find the solution.
> The solution is $x=1, y=-2, z=3$.

**Decision:** ☐ Keep (verifier wrong)   ☐ Fix (verifier right) — corrected answer: ______

---

## 2. `2-6-exponential-and-logarithmic-functions-q2`  ⚠ exists in both HL & SL — check both

**🔎 Verifier objection**

> The final answer is rounded incorrectly. The value 1.79538... should be rounded to 1.80, not 1.79, when giving the answer to 3 significant figures.


**Verifier's proposed answer:** 1.80

### HL — 2.6 Exponential and logarithmic functions

- **File:** `ib-maths-aa-hl/2-6-exponential-and-logarithmic-functions.pilot.json` · **Marks:** 5 · P2 · calc

**Question**

> Solve the equation $5^{2x-1} = 3^{x+2}$, giving your answer correct to 3 significant figures.

**Mark scheme**

- [1] Taking logarithms of both sides (any base).
- [1] Correct application of power law: $(2x-1)\ln 5 = (x+2)\ln 3$.
- [1] Attempt to expand and rearrange to isolate terms in $x$. e.g. $2x\ln 5 - x\ln 3 = 2\ln 3 + \ln 5$.
- [1] Correctly isolating $x$: $x = \frac{2\ln 3 + \ln 5}{2\ln 5 - \ln 3}$.
- [1] $x \approx 1.79$.

**Model answer**

> Given the equation $5^{2x-1} = 3^{x+2}$.
> Since the bases are different, we take the natural logarithm (or any other base logarithm) of both sides:
> $\ln(5^{2x-1}) = \ln(3^{x+2})$
> 
> Using the power law of logarithms, $\ln(a^b) = b \ln a$:
> $(2x-1)\ln 5 = (x+2)\ln 3$
> 
> Expand the brackets:
> $2x\ln 5 - \ln 5 = x\ln 3 + 2\ln 3$
> 
> Rearrange the equation to group terms with $x$ on one side and constant terms on the other:
> $2x\ln 5 - x\ln 3 = 2\ln 3 + \ln 5$
> 
> Factor out $x$ from the left-hand side:
> $x(2\ln 5 - \ln 3) = 2\ln 3 + \ln 5$
> 
> Isolate $x$ by dividing:
> $x = \frac{2\ln 3 + \ln 5}{2\ln 5 - \ln 3}$
> 
> Now, use a calculator to find the numerical value:
> $x \approx \frac{2(1.09861...) + 1.60943...}{2(1.60943...) - 1.09861...}$
> $x \approx \frac{2.19722... + 1.60943...}{3.21887... - 1.09861...}$
> $x \approx \frac{3.80666...}{2.12026...}$
> $x \approx 1.79538...$
> 
> Rounding the answer to 3 significant figures, we get:
> $x \approx 1.79$

### SL — 2.6 Exponential and logarithmic functions

- **File:** `ib-maths-aa-sl/2-6-exponential-and-logarithmic-functions.pilot.json` · **Marks:** 5 · P2 · calc

**Question**

> Solve the equation $5^{2x-1} = 3^{x+2}$, giving your answer correct to three significant figures.

**Mark scheme**

- [1] (M1) Taking logarithms on both sides (e.g., ln or log).
- [1] (M1) Correct use of the power rule of logarithms: $(2x-1)\ln 5 = (x+2)\ln 3$.
- [1] (M1) Expanding and attempting to collect terms in $x$: $2x\ln 5 - \ln 5 = x\ln 3 + 2\ln 3$.
- [1] (M1) Isolating $x$: $x(2\ln 5 - \ln 3) = 2\ln 3 + \ln 5 \implies x = \frac{2\ln 3 + \ln 5}{2\ln 5 - \ln 3}$.
- [1] (A1) $x \approx 1.80$.

**Model answer**

> The equation to solve is $5^{2x-1} = 3^{x+2}$.
> 
> Since the bases are different, we take the natural logarithm (ln) of both sides:
> $\ln(5^{2x-1}) = \ln(3^{x+2})$
> 
> Using the power rule for logarithms, $\ln(a^b) = b\ln a$, we can bring the exponents down:
> $(2x-1)\ln 5 = (x+2)\ln 3$
> 
> Now, expand both sides of the equation:
> $2x\ln 5 - \ln 5 = x\ln 3 + 2\ln 3$
> 
> To solve for $x$, we need to collect all terms involving $x$ on one side and constant terms on the other:
> $2x\ln 5 - x\ln 3 = 2\ln 3 + \ln 5$
> 
> Factor out $x$ from the left-hand side:
> $x(2\ln 5 - \ln 3) = 2\ln 3 + \ln 5$
> 
> Finally, isolate $x$ by dividing:
> $x = \frac{2\ln 3 + \ln 5}{2\ln 5 - \ln 3}$
> 
> Now, we use a calculator to find the numerical value:
> $x \approx \frac{2(1.09861...) + 1.60943...}{2(1.60943...) - 1.09861...}$
> $x \approx \frac{2.19722... + 1.60943...}{3.21887... - 1.09861...}$
> $x \approx \frac{3.80666...}{2.12026...}$
> $x \approx 1.79538...$
> 
> Rounding to three significant figures, we get $x \approx 1.80$.

**Decision:** ☐ Keep (verifier wrong)   ☐ Fix (verifier right) — corrected answer: ______

---

## 3. `sl-4-1-q3`  ⚠ exists in both HL & SL — check both

**🔎 Verifier objection**

> The stated answer is a full sentence with calculation steps, not just the final numerical result. The numerical results themselves are correct.


**Verifier's proposed answer:** [object Object]

### HL — 4.1 Descriptive statistics

- **File:** `ib-maths-aa-hl/4-1-descriptive-statistics.pilot.json` · **Marks:** 4 · P1 · no calc

**Question**

> A data set has mean $50$ and standard deviation $8$. Each value is transformed using $y=3x-5$. Find (a) the new mean, (b) the new standard deviation.

**Mark scheme**

- [1] (a) (M1) $3\times 50-5$
- [1] (a) (A1) new mean $=145$
- [1] (b) (M1) standard deviation scales by $|3|$ only (the $-5$ has no effect)
- [1] (b) (A1) new s.d. $=3\times 8=24$

**Model answer**

> (a) New mean $=3(50)-5=145$.
> 
> (b) Adding/subtracting a constant does not change spread; multiplying by $3$ scales the s.d. by $3$: new s.d. $=3\times 8=24$.

### SL — 4.1 Descriptive statistics

- **File:** `ib-maths-aa-sl/4-1-descriptive-statistics.pilot.json` · **Marks:** 4 · P1 · no calc

**Question**

> A data set has mean $50$ and standard deviation $8$. Each value is transformed using $y=3x-5$. Find (a) the new mean, (b) the new standard deviation.

**Mark scheme**

- [1] (a) (M1) $3\times 50-5$
- [1] (a) (A1) new mean $=145$
- [1] (b) (M1) standard deviation scales by $|3|$ only (the $-5$ has no effect)
- [1] (b) (A1) new s.d. $=3\times 8=24$

**Model answer**

> (a) New mean $=3(50)-5=145$.
> 
> (b) Adding/subtracting a constant does not change spread; multiplying by $3$ scales the s.d. by $3$: new s.d. $=3\times 8=24$.

**Decision:** ☐ Keep (verifier wrong)   ☐ Fix (verifier right) — corrected answer: ______

---

## 4. `sl-4-6-q4`  ⚠ exists in both HL & SL — check both

**🔎 Verifier objection**

> The model answer contains a calculation error. From the equation 510 = μ + 9.8, the solution is μ = 510 - 9.8 = 500.2, not 500. The stated answer is only correct because of rounding to three significant figures.


**Verifier's proposed answer:** 500.2 ml

### HL — 4.6 The normal distribution

- **File:** `ib-maths-aa-hl/4-6-the-normal-distribution.pilot.json` · **Marks:** 4 · P2 · calc

**Question**

> A machine fills bottles so that the volume is normally distributed with unknown mean $\mu$ and standard deviation $5$ ml. It is found that $2.5\%$ of bottles contain more than $510$ ml. Find $\mu$.

**Mark scheme**

- [1] (M1) $P(X<510)=0.975$
- [1] (A1) $z=1.96$
- [1] (M1) $510=\mu+1.96(5)$
- [1] (A1) $\mu=500$ ml (3 s.f.)

**Model answer**

> $P(X>510)=0.025\Rightarrow P(X<510)=0.975$, so $z=1.96$. Then $510=\mu+1.96(5)=\mu+9.8\Rightarrow\mu=500$ ml (3 s.f.).

### SL — 4.6 The normal distribution

- **File:** `ib-maths-aa-sl/4-6-the-normal-distribution.pilot.json` · **Marks:** 4 · P2 · calc

**Question**

> A machine fills bottles so that the volume is normally distributed with unknown mean $\mu$ and standard deviation $5$ ml. It is found that $2.5\%$ of bottles contain more than $510$ ml. Find $\mu$.

**Mark scheme**

- [1] (M1) $P(X<510)=0.975$
- [1] (A1) $z=1.96$
- [1] (M1) $510=\mu+1.96(5)$
- [1] (A1) $\mu=500$ ml (3 s.f.)

**Model answer**

> $P(X>510)=0.025\Rightarrow P(X<510)=0.975$, so $z=1.96$. Then $510=\mu+1.96(5)=\mu+9.8\Rightarrow\mu=500$ ml (3 s.f.).

**Decision:** ☐ Keep (verifier wrong)   ☐ Fix (verifier right) — corrected answer: ______

---

## 5. `5-10-maclaurin-series-q3`

**🔎 Verifier objection**

> The model answer's result for the percentage error is slightly inaccurate due to premature rounding of the approximation and the calculator value before the final calculation.


**Verifier's proposed answer:** 0.00646%

### HL — 5.10 Maclaurin series

- **File:** `ib-maths-aa-hl/5-10-maclaurin-series.pilot.json` · **Marks:** 6 · P2 · calc

**Question**

> Consider the function $f(x) = \arctan(x^2)$.
> (a) Find the first two non-zero terms of the Maclaurin series for $f(x)$.
> (b) Hence, find an approximation for $\int_0^{0.5} \arctan(x^2) \, dx$.
> (c) By comparing your approximation to the value obtained from a calculator, calculate the percentage error of your approximation.

**Mark scheme**

- [1] (a) Recall $\arctan(u) = u - \frac{u^3}{3} + \dots$ and substitute $u=x^2$. (M1)
- [1] $\arctan(x^2) = x^2 - \frac{(x^2)^3}{3} + \dots = x^2 - \frac{x^6}{3} + \dots$ (A1)
- [1] (b) Integrate the series from (a) term by term: $\int_0^{0.5} (x^2 - \frac{x^6}{3}) \, dx = [\frac{x^3}{3} - \frac{x^7}{21}]_0^{0.5}$. (M1)
- [1] Substitute limits and evaluate: $\frac{(0.5)^3}{3} - \frac{(0.5)^7}{21} \approx 0.0412946...$ (A1)
- [1] (c) Find the exact value using a calculator ($\,\approx 0.0412973...\,$) and apply the percentage error formula. (M1)
- [1] Percentage error = $|\frac{0.0412946... - 0.0412973...}{0.0412973...}| \times 100\% \approx 0.00651\%$. (A1)

**Model answer**

> (a) The standard Maclaurin series for $\arctan(u)$ is $u - \frac{u^3}{3} + \frac{u^5}{5} - \dots$.
> We substitute $u=x^2$ into this series.
> $\arctan(x^2) = (x^2) - \frac{(x^2)^3}{3} + \dots = x^2 - \frac{x^6}{3} + \dots$.
> 
> (b) To approximate the integral, we integrate the series from part (a) term by term.
> $\int_0^{0.5} \arctan(x^2) \, dx \approx \int_0^{0.5} (x^2 - \frac{x^6}{3}) \, dx$
> $= [\frac{x^3}{3} - \frac{x^7}{21}]_0^{0.5}$
> $= (\frac{(0.5)^3}{3} - \frac{(0.5)^7}{21}) - (0)$
> $= \frac{0.125}{3} - \frac{0.0078125}{21}$
> $\approx 0.0416666... - 0.0003720... \approx 0.0412946$.
> 
> (c) First, we find the more accurate value of the integral using a calculator: $\int_0^{0.5} \arctan(x^2) \, dx \approx 0.04129731$.
> Next, we calculate the percentage error using the formula:
> Percentage Error = $|\frac{\text{Approximation} - \text{Exact Value}}{\text{Exact Value}}| \times 100\%$
> Percentage Error = $|\frac{0.0412946 - 0.04129731}{0.04129731}| \times 100\%$
> Percentage Error = $|\frac{-0.00000271}{0.04129731}| \times 100\% \approx 0.00656\%$. (Accept answers rounding to 0.0065 or 0.0066).

**Decision:** ☐ Keep (verifier wrong)   ☐ Fix (verifier right) — corrected answer: ______

---

## 6. `5-3-tangents-normals-and-the-second-derivative-q2`  ⚠ exists in both HL & SL — check both

**🔎 Verifier objection**

> The intermediate values for the second derivative test are incorrect, although the final conclusion and coordinates are correct.


### HL — 5.3 Tangents, normals and the second derivative

- **File:** `ib-maths-aa-hl/5-3-tangents-normals-and-the-second-derivative.pilot.json` · **Marks:** 7 · P2 · calc

**Question**

> Consider the function $h(t) = 5\cos(t) - \sin(2t)$ for $0 \le t \le 2\pi$.
> (a) Find the values of $t$ for which $h'(t)=0$. Give your answers to 3 significant figures. [3 marks]
> (b) Hence, find the coordinates of the local minimum point of $h(t)$. Justify your answer. [4 marks]

**Mark scheme**

- [1] (a) Differentiates to find $h'(t) = -5\sin(t) - 2\cos(2t)$.
- [1] Sets $h'(t)=0$ and attempts to solve using a GDC.
- [1] Finds the correct values $t \approx 3.47$ and $t \approx 5.96$.
- [1] (b) Finds the second derivative, $h''(t) = -5\cos(t) + 4\sin(2t)$.
- [1] Evaluates the second derivative at the stationary points, e.g., $h''(3.466...) \approx 6.55$.
- [1] Since $h''(3.466...) > 0$, this corresponds to a local minimum.
- [1] Finds the y-coordinate $h(3.466...) \approx -5.41$. The coordinates are $(3.47, -5.41)$.

**Model answer**

> (a) First, we find the derivative of $h(t)$.
> $h(t) = 5\cos(t) - \sin(2t)$
> $h'(t) = -5\sin(t) - \cos(2t) \cdot 2 = -5\sin(t) - 2\cos(2t)$
> 
> To find the stationary points, we set $h'(t)=0$.
> $-5\sin(t) - 2\cos(2t) = 0$
> Using a graphical display calculator (GDC) to solve for $t$ in the interval $0 \le t \le 2\pi$, we find:
> $t \approx 3.4668...$ and $t \approx 5.9579...$
> To 3 significant figures, the values are $t \approx 3.47$ and $t \approx 5.96$.
> 
> (b) To determine the nature of these stationary points, we use the second derivative test. First, we find $h''(t)$.
> $h''(t) = \frac{d}{dt}(-5\sin(t) - 2\cos(2t)) = -5\cos(t) - 2(-\sin(2t) \cdot 2) = -5\cos(t) + 4\sin(2t)$
> 
> Now we evaluate $h''(t)$ at each of the stationary points found in part (a).
> For $t \approx 3.4668$:
> $h''(3.4668) = -5\cos(3.4668) + 4\sin(2 \cdot 3.4668) \approx 6.55$
> Since $h''(3.4668) > 0$, this stationary point is a local minimum.
> 
> For $t \approx 5.9579$:
> $h''(5.9579) = -5\cos(5.9579) + 4\sin(2 \cdot 5.9579) \approx -6.55$
> Since $h''(5.9579) < 0$, this stationary point is a local maximum.
> 
> The question asks for the coordinates of the local minimum point. We use $t \approx 3.4668$.
> $h(3.4668) = 5\cos(3.4668) - \sin(2 \cdot 3.4668) \approx -5.413...$
> 
> The coordinates of the local minimum point, to 3 significant figures, are $(3.47, -5.41)$.

### SL — 5.3 Tangents, normals and the second derivative

- **File:** `ib-maths-aa-sl/5-3-tangents-normals-and-the-second-derivative.pilot.json` · **Marks:** 6 · P1 · no calc

**Question**

> Let $g(x) = \frac{4}{x} + 2x^2$ for $x \neq 0$.
> (a) Find $g'(x)$ and $g''(x)$. [3 marks]
> (b) Find the equation of the normal to the curve of $g$ at the point where $x=-1$. [3 marks]

**Mark scheme**

- [2] (a) For rewriting $g(x) = 4x^{-1} + 2x^2$. $g'(x) = -4x^{-2} + 4x$. (A1)(A1)
- [1] $g''(x) = 8x^{-3} + 4$. (A1)
- [1] (b) Substitutes $x=-1$ into $g'(x)$ to find gradient of tangent, $m_T = g'(-1) = -4(-1)^{-2} + 4(-1) = -8$. (M1)
- [1] Correctly finds gradient of normal, $m_N = -\frac{1}{-8} = \frac{1}{8}$. (A1)
- [1] Finds y-coordinate $g(-1)=-2$ and forms correct equation, e.g. $y - (-2) = \frac{1}{8}(x - (-1))$. (A1)

**Model answer**

> (a) First, rewrite $g(x)$ using a negative exponent: $g(x) = 4x^{-1} + 2x^2$.
> Using the power rule for differentiation, the first derivative is:
> $g'(x) = (-1) \cdot 4x^{-2} + (2) \cdot 2x^1 = -4x^{-2} + 4x$, which can be written as $g'(x) = -\frac{4}{x^2} + 4x$.
> To find the second derivative, we differentiate $g'(x)$:
> $g''(x) = (-2) \cdot (-4)x^{-3} + 4 = 8x^{-3} + 4$, which can be written as $g''(x) = \frac{8}{x^3} + 4$.
> 
> (b) To find the equation of the normal, we first need the gradient of the tangent at $x=-1$. This is $m_T = g'(-1)$.
> $m_T = -4(-1)^{-2} + 4(-1) = -4(1) - 4 = -8$.
> The gradient of the normal, $m_N$, is the negative reciprocal of the tangent's gradient.
> $m_N = -\frac{1}{m_T} = -\frac{1}{-8} = \frac{1}{8}$.
> Next, we find the y-coordinate of the point on the curve at $x=-1$.
> $y = g(-1) = \frac{4}{-1} + 2(-1)^2 = -4 + 2 = -2$. The point is $(-1, -2)$.
> Using the point-gradient form $y - y_1 = m(x - x_1)$, the equation of the normal is:
> $y - (-2) = \frac{1}{8}(x - (-1))$
> $y + 2 = \frac{1}{8}(x + 1)$
> This can be rearranged to $8y + 16 = x + 1$, or $x - 8y - 15 = 0$.

**Decision:** ☐ Keep (verifier wrong)   ☐ Fix (verifier right) — corrected answer: ______

---

## 7. `5-6-definite-integrals-areas-and-volumes-of-revolution-q3`  ⚠ exists in both HL & SL — check both

**🔎 Verifier objection**

> The numerical evaluation of the definite integral is incorrect. The value of the integral is approximately 66.81, not 40.60.


**Verifier's proposed answer:** 210

### HL — 5.6 Definite integrals: areas and volumes of revolution

- **File:** `ib-maths-aa-hl/5-6-definite-integrals-areas-and-volumes-of-revolution.pilot.json` · **Marks:** 5 · P2 · calc

**Question**

> The region R is bounded by the curve $y = e^x \sin(x)$, the x-axis, and the lines $x=0$ and $x=\pi$. Find the volume of the solid formed when R is rotated $2\pi$ radians about the x-axis.

**Mark scheme**

- [1] Recognising the need to use the volume of revolution formula, $V = \pi \int_a^b y^2 \, dx$.
- [1] Correctly setting up the integral. $V = \pi \int_0^\pi (e^x \sin(x))^2 \, dx$.
- [1] Simplifying the integrand. $V = \pi \int_0^\pi e^{2x} \sin^2(x) \, dx$.
- [1] Evidence of using a calculator to evaluate the integral.
- [1] Correct final answer. $V \approx 127.5$ (or $40.6\pi$).

**Model answer**

> The volume of a solid formed by rotating a region bounded by a curve $y=f(x)$, the x-axis, and lines $x=a$ and $x=b$ about the x-axis is given by the formula:
> $V = \pi \int_a^b y^2 \, dx$.
> In this case, $y = e^x \sin(x)$, $a=0$, and $b=\pi$. Note that for $x \in [0, \pi]$, $\sin(x) \ge 0$ and $e^x > 0$, so the curve is above the x-axis.
> The setup for the volume is:
> $V = \pi \int_0^\pi (e^x \sin(x))^2 \, dx$
> $V = \pi \int_0^\pi e^{2x} \sin^2(x) \, dx$.
> This integral is difficult to compute by hand, so we use a calculator.
> Using a graphic display calculator or other numerical integration tool:
> $\int_0^\pi e^{2x} \sin^2(x) \, dx \approx 40.599...$
> Therefore, the volume is:
> $V = \pi \times 40.599... \approx 127.536...$
> Rounding to three significant figures, the volume is $128$ cubic units.

### SL — 5.6 Definite integrals: areas and volumes of revolution

- **File:** `ib-maths-aa-sl/5-6-definite-integrals-areas-and-volumes-of-revolution.pilot.json` · **Marks:** 4 · P1 · no calc

**Question**

> The region R is enclosed by the graph of $y = \sqrt{x-1}$, the x-axis, and the line $x=5$. Find the volume of the solid generated when R is revolved $360^\circ$ about the x-axis.

**Mark scheme**

- [1] Correctly states the formula for the volume of revolution $V = \pi \int_a^b y^2 \, dx$.
- [1] Correctly identifies the limits of integration (lower limit is $x=1$) and substitutes $y^2 = x-1$. Integral is $V = \pi \int_1^5 (x-1) \, dx$.
- [1] Correct integration and substitution of limits: $\pi [\frac{x^2}{2} - x]_1^5 = \pi ( (\frac{25}{2} - 5) - (\frac{1}{2} - 1) )$.
- [1] Correct final answer: $8\pi$.

**Model answer**

> The volume of a solid generated by revolving a region about the x-axis is given by the formula $V = \pi \int_a^b y^2 \, dx$. 
> Here, the function is $y = \sqrt{x-1}$, so $y^2 = x-1$. 
> The region is bounded by $x=5$. We need to find the lower bound, which is where the curve intersects the x-axis. This occurs when $y=0$, so $\sqrt{x-1}=0$, which gives $x=1$. 
> So, the limits of integration are from $a=1$ to $b=5$. 
> Setting up the integral: 
> $V = \pi \int_1^5 (x-1) \, dx$. 
> Now, we integrate: 
> $V = \pi [\frac{x^2}{2} - x]_1^5$. 
> Substitute the limits: 
> $V = \pi [ (\frac{5^2}{2} - 5) - (\frac{1^2}{2} - 1) ]$. 
> $V = \pi [ (\frac{25}{2} - \frac{10}{2}) - (\frac{1}{2} - \frac{2}{2}) ]$. 
> $V = \pi [ \frac{15}{2} - (-\frac{1}{2}) ]$. 
> $V = \pi [ \frac{15}{2} + \frac{1}{2} ] = \pi [\frac{16}{2}] = 8\pi$. 
> The volume of the solid is $8\pi$ cubic units.

**Decision:** ☐ Keep (verifier wrong)   ☐ Fix (verifier right) — corrected answer: ______

---

## 8. `5-9-differential-equations-and-slope-fields-q1`

**🔎 Verifier objection**

> Part (b) incorrectly describes the solution curve as having a local minimum at (1, -2). It is a local maximum.


**Verifier's proposed answer:** (a) 1. (b) The curve has a local maximum at (1, -2). (c) The slope is zero at all points with coordinates (1, y) where y ≠ 0.

### HL — 5.9 Differential equations and slope fields

- **File:** `ib-maths-aa-hl/5-9-differential-equations-and-slope-fields.pilot.json` · **Marks:** 5 · P1 · no calc

**Question**

> A slope field is drawn for the differential equation $\frac{\mathrm{d}y}{\mathrm{d}x} = \frac{x-1}{y}$.
> 
> (a) Calculate the slope at the point $(3, 2)$.
> 
> (b) On a copy of the slope field, sketch the solution curve that passes through the point $(1, -2)$.
> 
> (c) Find the coordinates of any points where the slope is zero.

**Mark scheme**

- [1] (a) Substitute $(3,2)$ into the differential equation: $\frac{3-1}{2}$.
- [0] Slope is $1$.
- [1] (b) Curve drawn passing through $(1, -2)$.
- [1] Curve follows the direction of the slope field, showing a local minimum at $(1, -2)$.
- [1] (c) Set the numerator of the differential equation to zero: $x-1=0$.
- [1] $x=1$. The slope is zero at all points $(1, y)$ for $y \neq 0$.

**Model answer**

> (a) To find the slope at the point $(3, 2)$, we substitute $x=3$ and $y=2$ into the expression for $\frac{\mathrm{d}y}{\mathrm{d}x}$.
> 
> $\frac{\mathrm{d}y}{\mathrm{d}x} = \frac{3-1}{2} = \frac{2}{2} = 1$.
> 
> The slope at $(3, 2)$ is $1$.
> 
> (b) To sketch the solution curve, we start at the point $(1, -2)$. At this point, the slope is $\frac{1-1}{-2} = 0$, so the curve has a horizontal tangent. Following the direction of the line segments on the slope field, the curve will be symmetric about the line $x=1$, increasing in $y$ as $x$ moves away from $1$ in either direction.
> 
> (c) The slope $\frac{\mathrm{d}y}{\mathrm{d}x}$ is zero when the numerator is zero, provided the denominator is non-zero. 
> 
> $x-1 = 0 \Rightarrow x=1$.
> 
> The slope is zero for all points on the line $x=1$, except where the function is undefined, which is when $y=0$. Therefore, the slope is zero at all points with coordinates $(1, y)$ where $y \neq 0$.

**Decision:** ☐ Keep (verifier wrong)   ☐ Fix (verifier right) — corrected answer: ______

---

## 9. `1-1-sequences-and-series-arithmetic-and-geometric-q3`  ⚠ exists in both HL & SL — check both

**🔎 Verifier objection**

> The final answer for part (a) is incorrect due to a calculation error. The correct calculation is 5000 * (1.003)^48, which is approximately 5771.58, not 5751.58.


**Verifier's proposed answer:** (a) 5771.58 USD. (b) 20 complete years.

### HL — 1.1 Sequences and series: arithmetic and geometric

- **File:** `ib-maths-aa-hl/1-1-sequences-and-series-arithmetic-and-geometric.pilot.json` · **Marks:** 7 · P2 · calc

**Question**

> Clara invests 15,000 US dollars (USD) in an account that pays a nominal annual interest rate of 4.2%, compounded monthly.
> (a) Find the value of her investment after 5 years, giving your answer to two decimal places. [3]
> (b) The rate of inflation is predicted to be 1.8% per year. Determine the real value of her investment after 5 years, to two decimal places. [2]
> (c) Find the minimum number of full years it will take for the real value of her investment to exceed 20,000 USD. [2]

**Mark scheme**

- [1] (M1) For part (a), correct identification of parameters for compound interest: $n=5 \times 12 = 60$ and monthly rate is $\frac{4.2}{12} = 0.35\%$.
- [1] (M1) For part (a), correct substitution into compound interest formula: $FV = 15000(1.0035)^{60}$.
- [1] (A1) For part (a), $FV = 18507.58$ USD.
- [1] (M1) For part (b), correct method to find real value: $\frac{\text{Nominal Value}}{(1.018)^5}$.
- [1] (A1) For part (b), Real value = $16927.87$ USD.
- [1] (M1) For part (c), sets up the correct inequality $\frac{15000(1.0035)^{12t}}{(1.018)^t} > 20000$.
- [1] (A1) For part (c), finds $t > 12.35...$ leading to 13 years.

**Model answer**

> (a) Using the compound interest formula $FV = PV \left(1 + \frac{r}{100k}\right)^{nk}$ with $PV=15000$, $r=4.2$, $n=5$, $k=12$. The number of compounding periods is $N = 5 \times 12 = 60$. The monthly interest rate is $\frac{4.2\%}{12} = 0.35\%$. Value after 5 years = $15000 \left(1 + \frac{0.042}{12}\right)^{60} = 15000 (1.0035)^{60} \approx 18507.581...$. The value is 18,507.58 USD.
> 
> (b) To find the real value, we discount the future value by the rate of inflation over 5 years. Real Value = $\frac{\text{Future Value}}{(1 + \text{inflation rate})^n} = \frac{18507.58}{(1 + 0.018)^5} \approx 16927.865...$. The real value is 16,927.87 USD.
> 
> (c) Let $t$ be the number of years. The real value after $t$ years is $R(t) = \frac{15000(1.0035)^{12t}}{(1.018)^t}$. We need to solve $R(t) > 20000$. Using a calculator's solver or graphing function for $\frac{15000(1.0035)^{12t}}{(1.018)^t} = 20000$, we find $t \approx 12.35$. Since the question asks for the minimum number of full years, we must round up. It will take 13 years for the real value to exceed 20,000 USD.

### SL — 1.1 Sequences and series: arithmetic and geometric

- **File:** `ib-maths-aa-sl/1-1-sequences-and-series-arithmetic-and-geometric.pilot.json` · **Marks:** 5 · P2 · calc

**Question**

> Clara invests 5000 US dollars (USD) in an account that pays a nominal annual interest rate of 3.6%, compounded monthly.
> (a) Calculate the value of her investment after 4 years. Give your answer correct to two decimal places. [3 marks]
> (b) Find the minimum number of complete years required for her investment to at least double in value. [2 marks]

**Mark scheme**

- [1] (a) Correct substitution into compound interest formula: $FV = 5000(1 + \frac{3.6}{100 \times 12})^{12 \times 4}$.
- [1] Correct intermediate calculation: $FV = 5000(1.003)^{48}$.
- [1] 5751.58 USD (accept 5751.57 or 5751.58).
- [1] (b) Setting up the inequality $5000(1.003)^{12t} \ge 10000$ or equation $2 = (1.003)^{12t}$.
- [1] $t \ge 19.28...$ years. The minimum number of complete years is 20.

**Model answer**

> (a) We use the compound interest formula $FV = PV(1 + \frac{r}{100k})^{kn}$.
> Here, $PV = 5000$, $r=3.6$, $k=12$ (monthly), and $n=4$ years.
> $FV = 5000\left(1 + \frac{3.6}{100 \times 12}\right)^{12 \times 4}$
> $FV = 5000(1 + 0.003)^{48}$
> $FV = 5000(1.003)^{48} \approx 5751.575...$
> To two decimal places, the value is 5751.58 USD.
> 
> (b) We want to find the smallest integer number of years, $t$, for the value to be at least double, i.e., $\ge 10000$ USD.
> $5000(1.003)^{12t} \ge 10000$
> $(1.003)^{12t} \ge 2$
> Using a GDC solver or logarithms:
> $12t \ln(1.003) \ge \ln(2)$
> $t \ge \frac{\ln(2)}{12 \ln(1.003)} \approx 19.28$ years.
> Since the question asks for the minimum number of *complete* years, we must round up to the next integer, as after 19 years the amount has not yet doubled.
> Check: 
> After 19 years: $5000(1.003)^{12 \times 19} \approx 9883.64 < 10000$.
> After 20 years: $5000(1.003)^{12 \times 20} \approx 10243.34 > 10000$.
> Therefore, 20 complete years are required.

**Decision:** ☐ Keep (verifier wrong)   ☐ Fix (verifier right) — corrected answer: ______

---

## 10. `2-5-rational-functions-and-their-graphs-q2`  ⚠ exists in both HL & SL — check both

**🔎 Verifier objection**

> The model answer incorrectly describes the location of the graph's branches relative to the asymptotes. The intercepts (0,4) and (4,0) are both in the top-right quadrant, not the top-left.


**Verifier's proposed answer:** The sketch should show one branch in the top-right quadrant (relative to the asymptotes' intersection at (-0.5, -0.5)), passing through the intercepts (0,4) and (4,0). The other branch is in the bottom-left quadrant.

### HL — 2.5 Rational functions and their graphs

- **File:** `ib-maths-aa-hl/2-5-rational-functions-and-their-graphs.pilot.json` · **Marks:** 6 · P1 · no calc

**Question**

> Let $g(x) = \frac{3x+5}{x-2}$, for $x \in \mathbb{R}, x \neq 2$.
> (a) Sketch the graph of $y=g(x)$, clearly indicating any asymptotes and axes intercepts. [4]
> (b) Find an expression for $g^{-1}(x)$. [2]

**Mark scheme**

- [1] (a) (A1) Correct vertical asymptote $x=2$ and horizontal asymptote $y=3$ shown on sketch.
- [1] (A1) Correct intercepts: x-intercept $(-\frac{5}{3}, 0)$ and y-intercept $(0, -\frac{5}{2})$ shown on sketch.
- [2] (A2) Correct shape and position of the two branches. Award (A1) for one correct branch.
- [1] (b) (M1) Attempt to rearrange $y = \frac{3x+5}{x-2}$ to make $x$ the subject, e.g. $y(x-2) = 3x+5$.
- [1] (A1) $g^{-1}(x) = \frac{2x+5}{x-3}$.

**Model answer**

> (a) Asymptotes:
> Vertical: $x-2=0 \implies x=2$.
> Horizontal: $y = \frac{3}{1} = 3$.
> Intercepts:
> y-intercept (set $x=0$): $g(0) = \frac{5}{-2} = -2.5$. Point is $(0, -2.5)$.
> x-intercept (set $g(x)=0$): $3x+5=0 \implies x = -\frac{5}{3}$. Point is $(-\frac{5}{3}, 0)$.
> The sketch should show two hyperbolic branches in the regions defined by the asymptotes, passing through the calculated intercepts.
> 
> (b) Let $y = \frac{3x+5}{x-2}$. To find the inverse, swap $x$ and $y$ and solve for $y$.
> $x = \frac{3y+5}{y-2}$
> $x(y-2) = 3y+5$
> $xy - 2x = 3y+5$
> $xy - 3y = 2x+5$
> $y(x-3) = 2x+5$
> $y = \frac{2x+5}{x-3}$
> Therefore, $g^{-1}(x) = \frac{2x+5}{x-3}$.

### SL — 2.5 Rational functions and their graphs

- **File:** `ib-maths-aa-sl/2-5-rational-functions-and-their-graphs.pilot.json` · **Marks:** 6 · P1 · no calc

**Question**

> Let $g(x) = \frac{4-x}{2x+1}$.
> (a) Find the equations of the vertical and horizontal asymptotes of the graph of $g$. [2]
> (b) Find the coordinates of the x-intercept and y-intercept of the graph of $g$. [2]
> (c) Sketch the graph of $g$, clearly showing and labelling the asymptotes and intercepts. [2]

**Mark scheme**

- [1] Vertical asymptote: $2x+1=0 \Rightarrow x = -\frac{1}{2}$.
- [1] Horizontal asymptote: $y = -\frac{1}{2}$.
- [1] y-intercept: $x=0 \Rightarrow g(0) = 4$. Coordinates $(0,4)$.
- [1] x-intercept: $g(x)=0 \Rightarrow 4-x=0 \Rightarrow x=4$. Coordinates $(4,0)$.
- [1] Correct shape with two branches in the correct quadrants relative to asymptotes.
- [1] All asymptotes and intercepts correctly labelled on the sketch.

**Model answer**

> (a) The vertical asymptote is found by setting the denominator to zero: $2x+1=0$, which gives $x = -0.5$. The horizontal asymptote is found from the ratio of the coefficients of $x$: $y = \frac{-1}{2} = -0.5$.
> 
> (b) For the y-intercept, set $x=0$: $g(0) = \frac{4-0}{2(0)+1} = 4$. The coordinates are $(0,4)$. For the x-intercept, set $g(x)=0$: $\frac{4-x}{2x+1}=0 \Rightarrow 4-x=0 \Rightarrow x=4$. The coordinates are $(4,0)$.
> 
> (c) The sketch should show the vertical asymptote at $x=-0.5$ and the horizontal asymptote at $y=-0.5$. The graph has two branches. One branch is in the top-left quadrant (relative to the asymptotes' intersection), passing through the y-intercept $(0,4)$. The other branch is in the bottom-right quadrant, passing through the x-intercept $(4,0)$. All these features must be clearly labelled on the axes.

**Decision:** ☐ Keep (verifier wrong)   ☐ Fix (verifier right) — corrected answer: ______

---

