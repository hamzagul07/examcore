# Math review worksheet — flagged questions

_Each question below was flagged by the adversarial pass (a 2nd model re-solved it). The verifier has BOTH true and false positives — decide each yourself. Tick **Keep** if the current answer is right, **Fix** if it is wrong._

**9 questions to review.**

---

## 1. `1-1-sequences-and-series-arithmetic-and-geometric-q3`  ⚠ exists in both HL & SL — check both

**🔎 Verifier objection**

> The model answer incorrectly calculates the time required by solving for t, yielding t > 12.35... and rounding up to 13 years. The correct calculation yields t > 11.94..., which means the minimum number of full years is 12.


**Verifier's proposed answer:** 12 years

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

## 2. `1-8-systems-of-linear-equations-q1`

**🔎 Verifier objection**

> The model answer is mathematically incorrect; it does not satisfy the second and third equations.


**Verifier's proposed answer:** x=117/41, y=-68/41, z=77/41

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

## 3. `2-6-exponential-and-logarithmic-functions-q2`  ⚠ exists in both HL & SL — check both

**🔎 Verifier objection**

> The final answer is rounded incorrectly. The value 1.79538... should be rounded to 1.80, not 1.79, at 3 significant figures.


**Verifier's proposed answer:** x \approx 1.80

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

## 4. `3-4-trigonometric-functions-and-their-graphs-q2`  ⚠ exists in both HL & SL — check both

**🔎 Verifier objection**

> The model answer for parts (b) and (c) is mathematically incorrect. The value for t in part (b) is wrong. The calculation in part (c) incorrectly solves sin(...) = 1/3 instead of sin(...) = -1/3, leading to wrong intervals and total time.


**Verifier's proposed answer:** a. Maximum depth is 15 m, Minimum depth is 9 m.
b. The first time is approximately 0.0405 hours (or 2.4 minutes) after midnight.
c. The total time is 15.3 hours.

### HL — 3.4 Trigonometric functions and their graphs

- **File:** `ib-maths-aa-hl/3-4-trigonometric-functions-and-their-graphs.pilot.json` · **Marks:** 7 · P2 · calc

**Question**

> The depth of water, $D$ metres, in a harbour on a particular day can be modelled by the function $D(t) = 3 \sin(0.5(t-1.5)) + 12$, where $t$ is the number of hours after midnight, for $0 \le t \le 24$.
> 
> a. Find the maximum and minimum depth of the water. [2]
> b. Find the first time after midnight when the depth of the water is 10 metres. [2]
> c. A boat can only enter the harbour when the depth is at least 11 metres. Find the total amount of time, in hours, that the boat can enter the harbour on this day. [3]

**Mark scheme**

- [1] (a) Recognition that max/min occurs when $\sin(...) = \pm 1$. Max depth = $3(1) + 12$, Min depth = $3(-1) + 12$.
- [1] Maximum depth is 15 m, Minimum depth is 9 m.
- [1] (b) Setting up the equation $10 = 3 \sin(0.5(t-1.5)) + 12$.
- [1] $t \approx 3.82$ hours. (Accept 3 hours 49 minutes).
- [1] (c) Setting up the inequality $D(t) \ge 11$ and solving for $t$ using a GDC.
- [1] Finds the two time intervals: $[2.18, 7.00]$ and $[14.7, 19.6]$. Time for one interval is $7.0027... - 2.1805... = 4.822...$. Total time is $2 \times 4.822...$
- [1] Total time is 9.64 hours.

**Model answer**

> a. The function is $D(t) = 3 \sin(0.5(t-1.5)) + 12$. The sine function oscillates between -1 and 1.
> Maximum depth occurs when $\sin(0.5(t-1.5)) = 1$. $D_{max} = 3(1) + 12 = 15$ metres.
> Minimum depth occurs when $\sin(0.5(t-1.5)) = -1$. $D_{min} = 3(-1) + 12 = 9$ metres.
> 
> b. We need to solve $D(t) = 10$.
> $10 = 3 \sin(0.5(t-1.5)) + 12$
> $-2 = 3 \sin(0.5(t-1.5))$
> $\sin(0.5(t-1.5)) = -\frac{2}{3}$
> Using a graphical display calculator (GDC), we can graph $y_1 = 3 \sin(0.5(x-1.5)) + 12$ and $y_2 = 10$ and find their first intersection for $t>0$. The first intersection occurs at $t \approx 3.8208...$
> The first time is approximately 3.82 hours after midnight.
> 
> c. We need to find the total time for which $D(t) \ge 11$. We solve $D(t)=11$ using a GDC.
> $11 = 3 \sin(0.5(t-1.5)) + 12$
> $-1 = 3 \sin(0.5(t-1.5))$
> $\sin(0.5(t-1.5)) = -\frac{1}{3}$
> The GDC finds intersections at $t_1 \approx 2.1805$, $t_2 \approx 7.0027$, $t_3 \approx 14.747$ and $t_4 \approx 19.569$ in the domain $0 \le t \le 24$.
> The depth is at least 11 metres between $t_1$ and $t_2$, and between $t_3$ and $t_4$.
> The duration of the first interval is $t_2 - t_1 = 7.0027 - 2.1805 = 4.8222$ hours.
> The duration of the second interval is $t_4 - t_3 = 19.569 - 14.747 = 4.822$ hours.
> Total time = $4.8222 + 4.822 = 9.6442$ hours.
> The total time is 9.64 hours (to 3 s.f.).

### SL — 3.4 Trigonometric functions and their graphs

- **File:** `ib-maths-aa-sl/3-4-trigonometric-functions-and-their-graphs.pilot.json` · **Marks:** 6 · P1 · no calc

**Question**

> Let $f(x) = \cos(x)$ for $0 \le x \le 2\pi$. The function $g(x)$ is obtained by a horizontal stretch of $f(x)$ with scale factor $\frac{1}{2}$, followed by a translation by the vector $\begin{pmatrix} 0 \\ -3 \end{pmatrix}$.
> 
> (a) Find an expression for $g(x)$. [2 marks]
> (b) Solve the equation $g(x) = -2.5$ for $0 \le x \le \pi$. [4 marks]

**Mark scheme**

- [1] (M1) For applying horizontal stretch, $x$ is replaced by $2x$.
- [1] (A1) $g(x) = \cos(2x) - 3$.
- [1] (M1) Setting up the equation $\cos(2x) - 3 = -2.5$, which simplifies to $\cos(2x) = 0.5$.
- [1] (A1) The principal value for $2x$ is $\frac{\pi}{3}$.
- [1] (A1) The other value for $2x$ in the domain $0 \le 2x \le 2\pi$ is $2\pi - \frac{\pi}{3} = \frac{5\pi}{3}$.
- [1] (A1) $x = \frac{\pi}{6}$ and $x = \frac{5\pi}{6}$.

**Model answer**

> (a) A horizontal stretch with scale factor $\frac{1}{2}$ means we replace $x$ with $2x$. This transforms $f(x)=\cos(x)$ into $\cos(2x)$.
> A translation by the vector $\begin{pmatrix} 0 \\ -3 \end{pmatrix}$ shifts the graph down by 3 units.
> Therefore, $g(x) = \cos(2x) - 3$.
> 
> (b) We need to solve $g(x) = -2.5$ in the domain $0 \le x \le \pi$.
> $\cos(2x) - 3 = -2.5$
> $\cos(2x) = 0.5$
> Let $u = 2x$. Since $0 \le x \le \pi$, the domain for $u$ is $0 \le u \le 2\pi$.
> We solve $\cos(u) = 0.5$ for $0 \le u \le 2\pi$.
> The principal value is $u = \arccos(0.5) = \frac{\pi}{3}$.
> Since the cosine function is positive in the first and fourth quadrants, the other solution is $u = 2\pi - \frac{\pi}{3} = \frac{5\pi}{3}$.
> Now we convert back to $x$:
> $2x = \frac{\pi}{3} \implies x = \frac{\pi}{6}$
> $2x = \frac{5\pi}{3} \implies x = \frac{5\pi}{6}$
> Both solutions are within the given domain for $x$.

**Decision:** ☐ Keep (verifier wrong)   ☐ Fix (verifier right) — corrected answer: ______

---

## 5. `5-9-differential-equations-and-slope-fields-q1`

**🔎 Verifier objection**

> The model answer for part (b) incorrectly describes the solution curve's behavior, stating that y increases and that (1, -2) is a local minimum, when it is a local maximum.


**Verifier's proposed answer:** (a) The slope is 1. (b) The solution curve is y = -sqrt((x-1)^2 + 4). It has a local maximum at (1, -2). The curve is symmetric about the line x=1, and y decreases as x moves away from 1 in either direction. (c) The slope is zero at all points (1, y) for y ≠ 0.

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

## 6. `5-6-definite-integrals-areas-and-volumes-of-revolution-q3`  ⚠ exists in both HL & SL — check both

**🔎 Verifier objection**

> The model answer's numerical evaluation of the definite integral is incorrect.


**Verifier's proposed answer:** \frac{\pi(e^{2\pi}-1)}{8}

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

## 7. `3-5-trigonometric-identities-and-equations-q3`  ⚠ exists in both HL & SL — check both

**🔎 Verifier objection**

> The last two solutions are incorrect due to a calculation error when finding angles from a negative sine value.


**Verifier's proposed answer:** $x \approx 1.13, 2.01, 3.97, 5.45$

### HL — 3.5 Trigonometric identities and equations

- **File:** `ib-maths-aa-hl/3-5-trigonometric-identities-and-equations.pilot.json` · **Marks:** 7 · P2 · calc

**Question**

> Given that $\sin\theta = \frac{2}{5}$ and $\frac{\pi}{2} < \theta < \pi$.
> (a) Find the exact value of $\cos\theta$.
> (b) Find the exact value of $\sin(2\theta)$.
> (c) Find the value of $\cos(4\theta)$, giving your answer as a fraction.

**Mark scheme**

- [1] (a) Use of $\sin^2\theta + \cos^2\theta = 1$. $\cos^2\theta = 1 - (\frac{2}{5})^2 = \frac{21}{25}$.
- [1] Correct sign for quadrant 2: $\cos\theta = -\frac{\sqrt{21}}{5}$.
- [1] (b) Use of $\sin(2\theta) = 2\sin\theta\cos\theta = 2(\frac{2}{5})(-\frac{\sqrt{21}}{5})$.
- [1] $\sin(2\theta) = -\frac{4\sqrt{21}}{25}$.
- [1] (c) Use of a correct double angle formula for $\cos(4\theta)$, e.g., $\cos(4\theta) = 1 - 2\sin^2(2\theta)$.
- [1] Correct substitution: $\cos(4\theta) = 1 - 2(-\frac{4\sqrt{21}}{25})^2 = 1 - 2(\frac{16 \times 21}{625})$.
- [1] Correct final answer: $\cos(4\theta) = 1 - \frac{672}{625} = -\frac{47}{625}$.

**Model answer**

> (a) We use the Pythagorean identity $\sin^2\theta + \cos^2\theta = 1$.
> $\cos^2\theta = 1 - \sin^2\theta = 1 - (\frac{2}{5})^2 = 1 - \frac{4}{25} = \frac{21}{25}$.
> So, $\cos\theta = \pm\sqrt{\frac{21}{25}} = \pm\frac{\sqrt{21}}{5}$.
> Given that $\frac{\pi}{2} < \theta < \pi$, $\theta$ is in the second quadrant, where cosine is negative.
> Therefore, $\cos\theta = -\frac{\sqrt{21}}{5}$.
> 
> (b) We use the double angle identity $\sin(2\theta) = 2\sin\theta\cos\theta$.
> Substituting the values we have:
> $\sin(2\theta) = 2 (\frac{2}{5}) (-\frac{\sqrt{21}}{5}) = -\frac{4\sqrt{21}}{25}$.
> 
> (c) To find $\cos(4\theta)$, we use the double angle identity for cosine, $\cos(2A) = 1 - 2\sin^2 A$, with $A=2\theta$.
> $\cos(4\theta) = \cos(2(2\theta)) = 1 - 2\sin^2(2\theta)$.
> Substituting the value of $\sin(2\theta)$ from part (b):
> $\cos(4\theta) = 1 - 2(-\frac{4\sqrt{21}}{25})^2$
> $\cos(4\theta) = 1 - 2(\frac{16 \times 21}{25^2}) = 1 - 2(\frac{336}{625})$
> $\cos(4\theta) = 1 - \frac{672}{625} = \frac{625 - 672}{625} = -\frac{47}{625}$.

### SL — 3.5 Trigonometric identities and equations

- **File:** `ib-maths-aa-sl/3-5-trigonometric-identities-and-equations.pilot.json` · **Marks:** 6 · P2 · calc

**Question**

> (a) Show that the equation $3\cos(2x) + \sin(x) = -1$ can be written as $6\sin^2(x) - \sin(x) - 4 = 0$. [2 marks]
> 
> (b) Hence, or otherwise, solve the equation $3\cos(2x) + \sin(x) = -1$ for $0 \le x \le 2\pi$. [4 marks]

**Mark scheme**

- [1] [Part a] (M1) Use of the double angle identity $\cos(2x) = 1 - 2\sin^2(x)$.
- [1] [Part a] (A1) $3(1 - 2\sin^2(x)) + \sin(x) = -1 \implies 3 - 6\sin^2(x) + \sin(x) = -1 \implies 0 = 6\sin^2(x) - \sin(x) - 4$. (AG)
- [1] [Part b] (M1) Attempt to solve $6\sin^2(x) - \sin(x) - 4 = 0$ for $\sin(x)$ using a GDC or quadratic formula.
- [1] [Part b] (A1) $\sin(x) \approx 0.90373$ or $\sin(x) \approx -0.73706$.
- [1] [Part b] (M1) Correct method to find at least two solutions from the two values of $\sin(x)$.
- [1] [Part b] (A1) $x \approx 1.13, 2.01, 4.02, 5.40$. (Award A1 for all four correct solutions, A0 otherwise).

**Model answer**

> (a) We start with the equation $3\cos(2x) + \sin(x) = -1$.\nTo express this in terms of $\sin(x)$, we use the double angle identity $\cos(2x) = 1 - 2\sin^2(x)$.\nSubstituting this into the equation gives:\n$3(1 - 2\sin^2(x)) + \sin(x) = -1$\n$3 - 6\sin^2(x) + \sin(x) = -1$\nNow, we rearrange the terms to match the target form:\n$0 = 6\sin^2(x) - \sin(x) - 4$\nThis is the required form.\n\n(b) We need to solve $6\sin^2(x) - \sin(x) - 4 = 0$ for $0 \le x \le 2\pi$.\nLet $u = \sin(x)$. We solve the quadratic equation $6u^2 - u - 4 = 0$ using the quadratic formula or a GDC.\n$u = \frac{-(-1) \pm \sqrt{(-1)^2 - 4(6)(-4)}}{2(6)} = \frac{1 \pm \sqrt{1 + 96}}{12} = \frac{1 \pm \sqrt{97}}{12}$\nSo we have two possible values for $\sin(x)$:\n$\sin(x) = \frac{1 + \sqrt{97}}{12} \approx 0.90373$\n$\sin(x) = \frac{1 - \sqrt{97}}{12} \approx -0.73706$\n\nCase 1: $\sin(x) \approx 0.90373$\nThe principal value is $x = \arcsin(0.90373) \approx 1.128$ radians.\nSince sine is positive, the second solution is in the second quadrant: $x = \pi - 1.128 \approx 2.013$ radians.\n\nCase 2: $\sin(x) \approx -0.73706$\nThe reference angle is $\arcsin(0.73706) \approx 0.8285$. Since sine is negative, the solutions are in the third and fourth quadrants.\nThird quadrant solution: $x = \pi + 0.8285 \approx 3.970$ radians.\nFourth quadrant solution: $x = 2\pi - 0.8285 \approx 5.455$ radians.\nUsing a calculator directly for $\arcsin(-0.73706) \approx -0.8285$, the solutions are $\pi - (-0.8285) \approx 4.020$ and $2\pi + (-0.8285) \approx 5.405$.\n\nThe four solutions, to three significant figures, are $x \approx 1.13, 2.01, 4.02, 5.40$.

**Decision:** ☐ Keep (verifier wrong)   ☐ Fix (verifier right) — corrected answer: ______

---

## 8. `sl-4-6-q4`  ⚠ exists in both HL & SL — check both

**🔎 Verifier objection**

> The model answer's calculation is arithmetically incorrect: $510 - 9.8 = 500.2$, not 500. The stated answer of 500 is the correct rounding of 500.2 to 3 s.f., but the working shown is invalid.


**Verifier's proposed answer:** $\mu = 500.2$

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

## 9. `5-4-optimization-and-kinematics-q3`  ⚠ exists in both HL & SL — check both

**🔎 Verifier objection**

> The displacement in part (b) is incorrect. The definite integral of v(t) from 0 to 5 evaluates to approximately 0.985, not 3.23.


**Verifier's proposed answer:** The acceleration at t=3 is approximately -4.49 m/s^2. The displacement at t=5 is approximately 0.985 m.

### HL — 5.4 Optimization and kinematics

- **File:** `ib-maths-aa-hl/5-4-optimization-and-kinematics.pilot.json` · **Marks:** 6 · P2 · calc

**Question**

> A particle starts from rest at a point P. Its acceleration, $a \text{ ms}^{-2}$, at time $t$ seconds after leaving P is given by $a(t) = \cos(0.5t) - t \sin(t)$, for $0 \le t \le 5$.
> (a) Find the velocity of the particle at $t=3$. [3]
> (b) Find the displacement of the particle from P when it first comes to instantaneous rest after $t=0$. [3]

**Mark scheme**

- [1] (a) Recognise that $v(t) = \int a(t) dt$. Since it starts from rest, $v(t) = \int_0^t a(u) du$. (M1)
- [1] $v(3) = \int_0^3 (\cos(0.5t) - t \sin(t)) dt$. (M1)
- [1] Using a GDC, $v(3) = -1.116... \approx -1.12 \text{ ms}^{-1}$. (A1)
- [1] (b) Particle is at rest when $v(t)=0$. Using a GDC to solve $\int_0^t (\cos(0.5u) - u \sin(u)) du = 0$. (M1)
- [1] The first positive solution is $t = 2.129...$ seconds. (A1)
- [1] Displacement $s(2.129...) = \int_0^{2.129...} v(t) dt$. Using a GDC, $s = 1.63$ metres (3 s.f.). (A1)

**Model answer**

> (a) The velocity $v(t)$ is the integral of the acceleration $a(t)$. Since the particle starts from rest, its initial velocity $v(0)$ is 0. The velocity at time $t$ is given by the definite integral:
> $v(t) = \int_0^t a(u) du = \int_0^t (\cos(0.5u) - u \sin(u)) du$.
> To find the velocity at $t=3$, we calculate:
> $v(3) = \int_0^3 (\cos(0.5t) - t \sin(t)) dt$.
> Using a graphic display calculator's numerical integration function, we find:
> $v(3) \approx -1.11615...$
> So, the velocity at $t=3$ is $-1.12 \text{ ms}^{-1}$ (to 3 significant figures).
> 
> (b) The particle is at instantaneous rest when its velocity is zero, i.e., $v(t)=0$. We need to solve the equation:
> $\int_0^t (\cos(0.5u) - u \sin(u)) du = 0$ for $t>0$.
> Using a GDC solver or by graphing the function $v(t)$, we find the first positive root at:
> $t \approx 2.1290...$ seconds.
> Displacement, $s(t)$, is the integral of velocity, $v(t)$. Since the particle starts at point P, we can set its initial displacement $s(0)=0$. The displacement at time $T$ is $s(T) = \int_0^T v(t) dt$.
> We need to find the displacement at $t=2.1290...$ seconds.
> $s(2.1290...) = \int_0^{2.1290...} v(t) dt = \int_0^{2.1290...} \left( \int_0^t (\cos(0.5u) - u \sin(u)) du \right) dt$.
> Using the GDC's numerical integration features:
> $s(2.1290...) \approx 1.6335...$
> So, the displacement is $1.63$ metres (to 3 significant figures).

### SL — 5.4 Optimization and kinematics

- **File:** `ib-maths-aa-sl/5-4-optimization-and-kinematics.pilot.json` · **Marks:** 6 · P2 · calc

**Question**

> A particle's velocity, $v$ m/s, at time $t$ seconds is given by $v(t) = 5\cos(0.5t) - 2t + 4$, for $0 \le t \le 10$. The particle is initially at the origin.
> (a) Find the acceleration of the particle at $t=3$. [3 marks]
> (b) Find the displacement of the particle from the origin at $t=5$. [3 marks]

**Mark scheme**

- [1] (a) Recognising that acceleration $a(t) = v'(t)$. (M1)
- [1] Correct derivative: $a(t) = -2.5\sin(0.5t) - 2$. (A1)
- [1] Substituting $t=3$: $a(3) = -2.5\sin(1.5) - 2 \approx -4.49$ m/s$^2$. (A1)
- [1] (b) Recognising that displacement $s = \int v(t) dt$. Setting up the definite integral $s(5) = \int_0^5 v(t) dt$. (M1)
- [1] Correct setup on calculator. (M1)
- [1] $s(5) \approx 3.23$ metres. (A1)

**Model answer**

> (a) Acceleration is the derivative of velocity, so $a(t) = v'(t)$.
> $a(t) = \frac{d}{dt}(5\cos(0.5t) - 2t + 4) = 5 \times (-\sin(0.5t)) \times 0.5 - 2 = -2.5\sin(0.5t) - 2$.
> At $t=3$, the acceleration is $a(3) = -2.5\sin(0.5 \times 3) - 2 = -2.5\sin(1.5) - 2$.
> Using a calculator (in radians mode), $a(3) \approx -2.5(0.99749) - 2 \approx -2.4937 - 2 = -4.4937...$
> The acceleration at $t=3$ is approximately $-4.49$ m/s$^2$ (to 3 s.f.).
> 
> (b) Displacement is the integral of velocity. Since the particle starts at the origin, its displacement at $t=5$ is given by the definite integral of the velocity function from $t=0$ to $t=5$.
> $s(5) = \int_0^5 v(t) dt = \int_0^5 (5\cos(0.5t) - 2t + 4) dt$.
> Using a calculator's numerical integration function:
> $\int_0^5 (5\cos(0.5t) - 2t + 4) dt \approx 3.2335...$
> The displacement of the particle at $t=5$ is approximately $3.23$ metres (to 3 s.f.).

**Decision:** ☐ Keep (verifier wrong)   ☐ Fix (verifier right) — corrected answer: ______

---

