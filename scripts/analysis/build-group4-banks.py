#!/usr/bin/env python3
"""Scale the Study-Loop question bank across all of Group 4 (Stats & Probability).

Authors original, mark-by-mark question banks + official-granularity subtopics
for every Group-4 Math AA topic and writes <slug>.pilot.json for each lesson in
both HL and SL. All questions/answers are ORIGINAL (mathematical facts are free);
every scheme's marks are validated to reconcile with the stated total.

4.5 (Binomial) is already piloted for HL; this reuses that bank for SL 4.5.
"""
import json, os, glob

HL_DIR = "/Users/hamzagul/Documents/examcore/content/courses/ib-maths-aa-hl"
SL_DIR = "/Users/hamzagul/Documents/examcore/content/courses/ib-maths-aa-sl"

def ms(*pairs):
    return [{"text": t, "marks": m} for (t, m) in pairs]

# --- Per-topic content (keyed by our internal topicCode) ------------------
BANKS = {}

BANKS["4.1"] = {
    "subtopics": [
        {"code": "SL 4.1", "title": "Sampling", "detail": "Populations, samples and reliability; sampling techniques (simple random, systematic, stratified, quota, convenience)."},
        {"code": "SL 4.2", "title": "Presenting data", "detail": "Frequency tables, histograms, cumulative frequency graphs, and box-and-whisker plots."},
        {"code": "SL 4.3", "title": "Central tendency and spread", "detail": "Mean, median, mode, grouped data, standard deviation, quartiles, IQR and outliers; the effect of constant changes on the data."},
    ],
    "questions": [
        {"id": "sl-4-1-q1", "prompt": "For the data set $4,\\ 7,\\ 7,\\ 9,\\ 13$, find (a) the mean, (b) the median, (c) the range.", "marks": 4, "commandTerm": "Find", "difficulty": "foundation", "syllabusRef": "SL 4.3", "paper": "P1", "calculator": False,
         "markScheme": ms(("(a) (M1) $\\dfrac{4+7+7+9+13}{5}$", 1), ("(a) (A1) mean $=8$", 1), ("(b) (A1) median $=7$", 1), ("(c) (A1) range $=13-4=9$", 1)),
         "modelAnswer": "(a) Mean $=\\dfrac{4+7+7+9+13}{5}=\\dfrac{40}{5}=8$.\n\n(b) Ordered data, middle value (3rd of 5): median $=7$.\n\n(c) Range $=13-4=9$."},
        {"id": "sl-4-1-q2", "prompt": "The weights (kg) of $8$ dogs are $12,\\ 15,\\ 15,\\ 18,\\ 20,\\ 22,\\ 25,\\ 29$.\n(a) Find the median.\n(b) Find the lower quartile $Q_1$ and the upper quartile $Q_3$.\n(c) Find the interquartile range, and determine whether $29$ is an outlier using the $1.5\\times\\text{IQR}$ rule.", "marks": 6, "commandTerm": "Find", "difficulty": "standard", "syllabusRef": "SL 4.3", "paper": "P2", "calculator": True,
         "markScheme": ms(("(a) (A1) median $=\\dfrac{18+20}{2}=19$", 1), ("(b) (A1) $Q_1=15$", 1), ("(b) (A1) $Q_3=23.5$", 1), ("(c) (A1) $\\text{IQR}=23.5-15=8.5$", 1), ("(c) (M1) upper boundary $Q_3+1.5\\,\\text{IQR}=23.5+12.75=36.25$", 1), ("(c) (A1) $29<36.25$, so $29$ is not an outlier", 1)),
         "modelAnswer": "(a) Median $=\\dfrac{18+20}{2}=19$ kg.\n\n(b) Lower half $12,15,15,18$: $Q_1=\\dfrac{15+15}{2}=15$. Upper half $20,22,25,29$: $Q_3=\\dfrac{22+25}{2}=23.5$.\n\n(c) $\\text{IQR}=23.5-15=8.5$. Upper outlier boundary $=Q_3+1.5\\times\\text{IQR}=23.5+12.75=36.25$. Since $29<36.25$, $29$ is not an outlier."},
        {"id": "sl-4-1-q3", "prompt": "A data set has mean $50$ and standard deviation $8$. Each value is transformed using $y=3x-5$. Find (a) the new mean, (b) the new standard deviation.", "marks": 4, "commandTerm": "Find", "difficulty": "standard", "syllabusRef": "SL 4.3", "paper": "P1", "calculator": False,
         "markScheme": ms(("(a) (M1) $3\\times 50-5$", 1), ("(a) (A1) new mean $=145$", 1), ("(b) (M1) standard deviation scales by $|3|$ only (the $-5$ has no effect)", 1), ("(b) (A1) new s.d. $=3\\times 8=24$", 1)),
         "modelAnswer": "(a) New mean $=3(50)-5=145$.\n\n(b) Adding/subtracting a constant does not change spread; multiplying by $3$ scales the s.d. by $3$: new s.d. $=3\\times 8=24$."},
        {"id": "sl-4-1-q4", "prompt": "A discrete data set takes the values $3,6,9,k$ with frequencies $4,3,2,1$ respectively. The mean is $6$. Find the value of $k$.", "marks": 3, "commandTerm": "Find", "difficulty": "challenge", "syllabusRef": "SL 4.3", "paper": "P1", "calculator": False,
         "markScheme": ms(("(M1) $\\dfrac{3(4)+6(3)+9(2)+k(1)}{4+3+2+1}=6$", 1), ("(M1) $48+k=60$", 1), ("(A1) $k=12$", 1)),
         "modelAnswer": "$\\dfrac{12+18+18+k}{10}=6\\;\\Rightarrow\\;48+k=60\\;\\Rightarrow\\;k=12$."},
    ],
}

BANKS["4.2"] = {
    "subtopics": [
        {"code": "SL 4.4", "title": "Correlation coefficient", "detail": "Pearson's product-moment correlation coefficient $r$: calculation with technology and interpretation of strength and direction."},
        {"code": "SL 4.4", "title": "Scatter diagrams", "detail": "Positive, negative and zero correlation; line of best fit through the mean point $(\\bar{x},\\bar{y})$."},
        {"code": "SL 4.4", "title": "Regression line of $y$ on $x$", "detail": "Finding and using the regression equation to predict; interpolation versus (unreliable) extrapolation."},
    ],
    "questions": [
        {"id": "sl-4-2-q1", "prompt": "The table shows paired data.\n$$\\begin{array}{c|ccccc} x & 1 & 2 & 3 & 4 & 5\\\\\\hline y & 3 & 5 & 4 & 8 & 9\\end{array}$$\n(a) Find Pearson's correlation coefficient $r$.\n(b) Find the equation of the regression line of $y$ on $x$.\n(c) Use it to estimate $y$ when $x=6$.", "marks": 6, "commandTerm": "Find", "difficulty": "standard", "syllabusRef": "SL 4.4", "paper": "P2", "calculator": True,
         "markScheme": ms(("(a) (M1) correct use of technology / formula", 1), ("(a) (A1) $r=0.916$ (3 s.f.)", 1), ("(b) (A1) gradient $=1.5$", 1), ("(b) (A1) $y=1.5x+1.3$", 1), ("(c) (M1) $1.5(6)+1.3$", 1), ("(c) (A1) $y=10.3$", 1)),
         "modelAnswer": "(a) From the GDC, $r=0.916$ (3 s.f.) — a strong positive correlation.\n\n(b) $y=1.5x+1.3$ (gradient $1.5$, intercept $1.3$).\n\n(c) $y=1.5(6)+1.3=10.3$."},
        {"id": "sl-4-2-q2", "prompt": "A study of $30$ students finds a correlation coefficient of $r=-0.87$ between hours of TV watched per week and exam score.\n(a) Describe the correlation.\n(b) A teacher wants to predict the score of a student who watches far more TV than anyone in the study. Explain why the regression line should not be used here.", "marks": 3, "commandTerm": "Describe", "difficulty": "foundation", "syllabusRef": "SL 4.4", "paper": "P1", "calculator": False,
         "markScheme": ms(("(a) (A1) strong", 1), ("(a) (A1) negative", 1), ("(b) (A1) it is extrapolation — prediction outside the range of the data is unreliable", 1)),
         "modelAnswer": "(a) A strong negative correlation.\n\n(b) The value lies outside the range of the sample data, so using the line would be extrapolation, which is unreliable."},
        {"id": "sl-4-2-q3", "prompt": "The regression line of $y$ on $x$ is $y=2.4x-1.6$, and $\\bar{x}=5$.\n(a) Find $\\bar{y}$.\n(b) The correlation coefficient is $r=0.95$. Comment on the reliability of predictions made within the range of the data.", "marks": 4, "commandTerm": "Find", "difficulty": "standard", "syllabusRef": "SL 4.4", "paper": "P2", "calculator": True,
         "markScheme": ms(("(a) (M1) the line passes through $(\\bar{x},\\bar{y})$: $\\bar{y}=2.4(5)-1.6$", 1), ("(a) (A1) $\\bar{y}=10.4$", 1), ("(b) (A1) $r=0.95$ is close to $1$ — strong positive correlation", 1), ("(b) (R1) so predictions within the data range are reliable", 1)),
         "modelAnswer": "(a) The regression line passes through the mean point, so $\\bar{y}=2.4(5)-1.6=10.4$.\n\n(b) Since $r=0.95$ is close to $1$, the correlation is strong and positive, so interpolated predictions are reliable."},
        {"id": "sl-4-2-q4", "prompt": "For a set of $5$ data points, $\\sum x=30$, $\\sum y=40$, $\\sum xy=280$ and $\\sum x^2=220$. Find the equation of the regression line of $y$ on $x$.", "marks": 4, "commandTerm": "Find", "difficulty": "challenge", "syllabusRef": "SL 4.4", "paper": "P2", "calculator": True,
         "markScheme": ms(("(M1) $S_{xx}=220-\\dfrac{30^2}{5}=40$", 1), ("(M1) $S_{xy}=280-\\dfrac{30\\times 40}{5}=40$", 1), ("(A1) gradient $b=\\dfrac{40}{40}=1$", 1), ("(A1) $y=x+2$", 1)),
         "modelAnswer": "$\\bar{x}=6,\\ \\bar{y}=8$. $S_{xx}=220-\\dfrac{30^2}{5}=40$, $S_{xy}=280-\\dfrac{30(40)}{5}=40$. Gradient $b=\\dfrac{S_{xy}}{S_{xx}}=1$; intercept $a=\\bar{y}-b\\bar{x}=8-6=2$. So $y=x+2$."},
    ],
}

BANKS["4.3"] = {
    "subtopics": [
        {"code": "SL 4.5", "title": "Probability of an event", "detail": "Trial, outcome, sample space and event; probability of an event and of its complement; expected number of occurrences."},
        {"code": "SL 4.6", "title": "Combined events", "detail": "$P(A\\cup B)=P(A)+P(B)-P(A\\cap B)$; mutually exclusive events."},
        {"code": "SL 4.6", "title": "Conditional probability & independence", "detail": "$P(A\\mid B)=\\dfrac{P(A\\cap B)}{P(B)}$; testing independence; Venn, tree and sample-space diagrams."},
    ],
    "questions": [
        {"id": "sl-4-3-q1", "prompt": "A fair six-sided die is rolled once. Find the probability of obtaining (a) an even number, (b) a number greater than $4$, (c) a prime number.", "marks": 3, "commandTerm": "Find", "difficulty": "foundation", "syllabusRef": "SL 4.5", "paper": "P1", "calculator": False,
         "markScheme": ms(("(a) (A1) $\\dfrac{3}{6}=\\dfrac{1}{2}$", 1), ("(b) (A1) $\\dfrac{2}{6}=\\dfrac{1}{3}$", 1), ("(c) (A1) $\\dfrac{3}{6}=\\dfrac{1}{2}$ (primes $2,3,5$)", 1)),
         "modelAnswer": "(a) Even $\\{2,4,6\\}$: $\\tfrac{3}{6}=\\tfrac{1}{2}$.\n\n(b) $>4$ is $\\{5,6\\}$: $\\tfrac{2}{6}=\\tfrac{1}{3}$.\n\n(c) Primes $\\{2,3,5\\}$: $\\tfrac{3}{6}=\\tfrac{1}{2}$."},
        {"id": "sl-4-3-q2", "prompt": "In a class of $30$ students, $18$ study Maths ($M$), $15$ study Physics ($P$), and $6$ study neither.\n(a) Find the number who study both subjects.\n(b) Find $P(M\\cap P)$.\n(c) Find $P(M\\mid P)$.", "marks": 5, "commandTerm": "Find", "difficulty": "standard", "syllabusRef": "SL 4.6", "paper": "P2", "calculator": True,
         "markScheme": ms(("(a) (M1) $18+15-x=30-6$", 1), ("(a) (A1) both $=9$", 1), ("(b) (A1) $P(M\\cap P)=\\dfrac{9}{30}=0.3$", 1), ("(c) (M1) $\\dfrac{9}{15}$", 1), ("(c) (A1) $P(M\\mid P)=0.6$", 1)),
         "modelAnswer": "At least one subject: $30-6=24$. Using $|M\\cup P|=|M|+|P|-|M\\cap P|$: $24=18+15-x\\Rightarrow x=9$.\n\n(b) $P(M\\cap P)=\\dfrac{9}{30}=0.3$.\n\n(c) $P(M\\mid P)=\\dfrac{|M\\cap P|}{|P|}=\\dfrac{9}{15}=0.6$."},
        {"id": "sl-4-3-q3", "prompt": "A bag contains $5$ red and $3$ blue balls. Two balls are drawn at random without replacement. Find the probability that (a) both are red, (b) the two balls are different colours.", "marks": 4, "commandTerm": "Find", "difficulty": "standard", "syllabusRef": "SL 4.6", "paper": "P2", "calculator": True,
         "markScheme": ms(("(a) (M1) $\\dfrac{5}{8}\\times\\dfrac{4}{7}$", 1), ("(a) (A1) $\\dfrac{20}{56}=\\dfrac{5}{14}$", 1), ("(b) (M1) $\\dfrac{5}{8}\\cdot\\dfrac{3}{7}+\\dfrac{3}{8}\\cdot\\dfrac{5}{7}$", 1), ("(b) (A1) $\\dfrac{30}{56}=\\dfrac{15}{28}$", 1)),
         "modelAnswer": "(a) $P(RR)=\\dfrac{5}{8}\\times\\dfrac{4}{7}=\\dfrac{20}{56}=\\dfrac{5}{14}\\approx 0.357$.\n\n(b) $P(\\text{different})=P(RB)+P(BR)=\\dfrac{5}{8}\\cdot\\dfrac{3}{7}+\\dfrac{3}{8}\\cdot\\dfrac{5}{7}=\\dfrac{30}{56}=\\dfrac{15}{28}\\approx 0.536$."},
        {"id": "sl-4-3-q4", "prompt": "For two events, $P(A)=0.6$, $P(B)=0.5$ and $P(A\\cup B)=0.8$.\n(a) Find $P(A\\cap B)$.\n(b) Determine, with a reason, whether $A$ and $B$ are independent.\n(c) Find $P(A\\mid B)$.", "marks": 5, "commandTerm": "Find", "difficulty": "challenge", "syllabusRef": "SL 4.6", "paper": "P1", "calculator": False,
         "markScheme": ms(("(a) (M1) $0.8=0.6+0.5-P(A\\cap B)$", 1), ("(a) (A1) $P(A\\cap B)=0.3$", 1), ("(b) (M1) compare with $P(A)\\,P(B)=0.6\\times 0.5=0.3$", 1), ("(b) (A1) equal, so $A$ and $B$ are independent", 1), ("(c) (A1) $P(A\\mid B)=\\dfrac{0.3}{0.5}=0.6$", 1)),
         "modelAnswer": "(a) $0.8=0.6+0.5-P(A\\cap B)\\Rightarrow P(A\\cap B)=0.3$.\n\n(b) $P(A)P(B)=0.6\\times 0.5=0.3=P(A\\cap B)$, so the events are independent.\n\n(c) $P(A\\mid B)=\\dfrac{P(A\\cap B)}{P(B)}=\\dfrac{0.3}{0.5}=0.6$."},
    ],
}

BANKS["4.4"] = {
    "subtopics": [
        {"code": "SL 4.7", "title": "Discrete random variables", "detail": "Discrete random variables and their probability distributions."},
        {"code": "SL 4.7", "title": "Probabilities sum to 1", "detail": "Using $\\sum P(X=x)=1$ to find unknown probabilities or parameters."},
        {"code": "SL 4.7", "title": "Expected value", "detail": "$\\mathrm{E}(X)=\\sum x\\,P(X=x)$; a fair game has $\\mathrm{E}(X)=0$; applications."},
    ],
    "questions": [
        {"id": "sl-4-4-q1", "prompt": "The probability distribution of a discrete random variable $X$ is:\n$$\\begin{array}{c|cccc} x & 1 & 2 & 3 & 4\\\\\\hline P(X=x) & 0.1 & 0.3 & k & 0.2\\end{array}$$\n(a) Find $k$.\n(b) Find $\\mathrm{E}(X)$.", "marks": 3, "commandTerm": "Find", "difficulty": "standard", "syllabusRef": "SL 4.7", "paper": "P1", "calculator": False,
         "markScheme": ms(("(a) (A1) $0.1+0.3+k+0.2=1\\Rightarrow k=0.4$", 1), ("(b) (M1) $1(0.1)+2(0.3)+3(0.4)+4(0.2)$", 1), ("(b) (A1) $\\mathrm{E}(X)=2.7$", 1)),
         "modelAnswer": "(a) Probabilities sum to $1$: $k=1-(0.1+0.3+0.2)=0.4$.\n\n(b) $\\mathrm{E}(X)=1(0.1)+2(0.3)+3(0.4)+4(0.2)=2.7$."},
        {"id": "sl-4-4-q2", "prompt": "Two fair four-sided dice (faces $1,2,3,4$) are rolled and $X$ is the sum of the two numbers.\n(a) Find $P(X=5)$.\n(b) Find $\\mathrm{E}(X)$.", "marks": 4, "commandTerm": "Find", "difficulty": "standard", "syllabusRef": "SL 4.7", "paper": "P2", "calculator": True,
         "markScheme": ms(("(a) (M1) $4$ favourable outcomes out of $16$", 1), ("(a) (A1) $P(X=5)=\\dfrac{4}{16}=\\dfrac{1}{4}$", 1), ("(b) (M1) $\\mathrm{E}(\\text{one die})=2.5$, doubled", 1), ("(b) (A1) $\\mathrm{E}(X)=5$", 1)),
         "modelAnswer": "(a) Sum $=5$ from $(1,4),(2,3),(3,2),(4,1)$: $4$ of $16$ outcomes, so $P=\\tfrac{4}{16}=\\tfrac14$.\n\n(b) Each die has mean $\\tfrac{1+2+3+4}{4}=2.5$, so $\\mathrm{E}(X)=2\\times 2.5=5$."},
        {"id": "sl-4-4-q3", "prompt": "In a game a player gains $5$ points with probability $0.2$ and loses $2$ points with probability $0.8$. Let $X$ be the net gain in points.\n(a) Find $\\mathrm{E}(X)$.\n(b) State, with a reason, whether the game is fair.", "marks": 3, "commandTerm": "Find", "difficulty": "foundation", "syllabusRef": "SL 4.7", "paper": "P1", "calculator": False,
         "markScheme": ms(("(a) (M1) $5(0.2)+(-2)(0.8)$", 1), ("(a) (A1) $\\mathrm{E}(X)=-0.6$", 1), ("(b) (A1) not fair, since $\\mathrm{E}(X)\\ne 0$ (an expected loss of $0.6$ points)", 1)),
         "modelAnswer": "(a) $\\mathrm{E}(X)=5(0.2)+(-2)(0.8)=1-1.6=-0.60$.\n\n(b) The game is not fair because $\\mathrm{E}(X)\\neq 0$; on average a player loses $0.6$ points per game."},
        {"id": "sl-4-4-q4", "prompt": "A discrete random variable $X$ has $P(X=x)=kx$ for $x=1,2,3,4$.\n(a) Find $k$.\n(b) Find $\\mathrm{E}(X)$.", "marks": 4, "commandTerm": "Find", "difficulty": "challenge", "syllabusRef": "SL 4.7", "paper": "P1", "calculator": False,
         "markScheme": ms(("(a) (M1) $k(1+2+3+4)=1$", 1), ("(a) (A1) $k=\\dfrac{1}{10}=0.1$", 1), ("(b) (M1) $\\mathrm{E}(X)=\\sum x\\cdot kx=k(1+4+9+16)$", 1), ("(b) (A1) $\\mathrm{E}(X)=0.1\\times 30=3$", 1)),
         "modelAnswer": "(a) $\\sum P=k(1+2+3+4)=10k=1\\Rightarrow k=0.1$.\n\n(b) $\\mathrm{E}(X)=\\sum x\\,P(X=x)=k\\sum x^2=0.1(1+4+9+16)=0.1\\times 30=3$."},
    ],
}

BANKS["4.6"] = {
    "subtopics": [
        {"code": "SL 4.9", "title": "The normal distribution", "detail": "The normal curve and its properties; the mean, and diagrammatic representation of probabilities as areas."},
        {"code": "SL 4.9", "title": "Normal probability calculations", "detail": "Finding $P(X<a)$ and $P(a<X<b)$ using technology."},
        {"code": "SL 4.9", "title": "Inverse normal", "detail": "Finding a value from a given probability; finding an unknown mean or standard deviation."},
    ],
    "questions": [
        {"id": "sl-4-6-q1", "prompt": "The heights of adults are normally distributed with mean $170$ cm and standard deviation $8$ cm. Find the probability that a randomly chosen adult is (a) shorter than $180$ cm, (b) between $160$ cm and $175$ cm.", "marks": 4, "commandTerm": "Find", "difficulty": "standard", "syllabusRef": "SL 4.9", "paper": "P2", "calculator": True,
         "markScheme": ms(("(a) (M1) $X\\sim N(170,8^2)$, $P(X<180)$", 1), ("(a) (A1) $=0.894$ (3 s.f.)", 1), ("(b) (M1) $P(160<X<175)$", 1), ("(b) (A1) $=0.628$ (3 s.f.)", 1)),
         "modelAnswer": "Let $X\\sim N(170,8^2)$.\n\n(a) $P(X<180)=0.894$ (3 s.f.).\n\n(b) $P(160<X<175)=0.628$ (3 s.f.)."},
        {"id": "sl-4-6-q2", "prompt": "IQ scores are normally distributed with mean $100$ and standard deviation $15$. Find the score that is exceeded by only the top $10\\%$ of the population.", "marks": 3, "commandTerm": "Find", "difficulty": "standard", "syllabusRef": "SL 4.9", "paper": "P2", "calculator": True,
         "markScheme": ms(("(M1) $P(X<k)=0.90$ (inverse normal)", 1), ("(A1) $z=1.28$", 1), ("(A1) $k=100+15(1.28)=119$", 1)),
         "modelAnswer": "Top $10\\%$ means $P(X>k)=0.10$, i.e. $P(X<k)=0.90$. The inverse normal gives $z=1.2816$, so $k=100+15(1.2816)=119$ (3 s.f.)."},
        {"id": "sl-4-6-q3", "prompt": "A random variable $X\\sim N(50,\\,4^2)$. Find (a) $P(X>50)$, (b) $P(46<X<54)$.", "marks": 3, "commandTerm": "Find", "difficulty": "foundation", "syllabusRef": "SL 4.9", "paper": "P2", "calculator": True,
         "markScheme": ms(("(a) (A1) by symmetry $P(X>50)=0.5$", 1), ("(b) (M1) $46$ and $54$ are one s.d. either side of the mean", 1), ("(b) (A1) $P(46<X<54)=0.683$ (3 s.f.)", 1)),
         "modelAnswer": "(a) $50$ is the mean, so $P(X>50)=0.5$.\n\n(b) $46$ and $54$ are $\\mu\\pm\\sigma$, so $P(46<X<54)\\approx 0.683$."},
        {"id": "sl-4-6-q4", "prompt": "A machine fills bottles so that the volume is normally distributed with unknown mean $\\mu$ and standard deviation $5$ ml. It is found that $2.5\\%$ of bottles contain more than $510$ ml. Find $\\mu$.", "marks": 4, "commandTerm": "Find", "difficulty": "challenge", "syllabusRef": "SL 4.9", "paper": "P2", "calculator": True,
         "markScheme": ms(("(M1) $P(X<510)=0.975$", 1), ("(A1) $z=1.96$", 1), ("(M1) $510=\\mu+1.96(5)$", 1), ("(A1) $\\mu=500$ ml (3 s.f.)", 1)),
         "modelAnswer": "$P(X>510)=0.025\\Rightarrow P(X<510)=0.975$, so $z=1.96$. Then $510=\\mu+1.96(5)=\\mu+9.8\\Rightarrow\\mu=500$ ml (3 s.f.)."},
    ],
}

# HL-only topics
BANKS["4.7"] = {
    "subtopics": [
        {"code": "SL 4.6", "title": "Conditional probability", "detail": "$P(A\\mid B)=\\dfrac{P(A\\cap B)}{P(B)}$."},
        {"code": "AHL 4.13", "title": "Bayes' theorem", "detail": "Use of Bayes' theorem for a maximum of three events."},
        {"code": "AHL 4.13", "title": "Total probability", "detail": "The law of total probability; tree diagrams for updating probabilities with new evidence."},
    ],
    "questions": [
        {"id": "ahl-4-13-q1", "prompt": "For two events, $P(A)=0.4$, $P(B\\mid A)=0.3$ and $P(B\\mid A')=0.6$.\n(a) Find $P(B)$.\n(b) Find $P(A\\mid B)$.", "marks": 4, "commandTerm": "Find", "difficulty": "standard", "syllabusRef": "AHL 4.13", "paper": "P1", "calculator": False,
         "markScheme": ms(("(a) (M1) $P(B)=P(A)P(B\\mid A)+P(A')P(B\\mid A')=0.4(0.3)+0.6(0.6)$", 1), ("(a) (A1) $P(B)=0.48$", 1), ("(b) (M1) $P(A\\mid B)=\\dfrac{P(A)P(B\\mid A)}{P(B)}=\\dfrac{0.12}{0.48}$", 1), ("(b) (A1) $P(A\\mid B)=0.25$", 1)),
         "modelAnswer": "(a) Total probability: $P(B)=0.4(0.3)+0.6(0.6)=0.12+0.36=0.48$.\n\n(b) Bayes: $P(A\\mid B)=\\dfrac{P(A\\cap B)}{P(B)}=\\dfrac{0.12}{0.48}=0.25$."},
        {"id": "ahl-4-13-q2", "prompt": "A disease affects $2\\%$ of a population. A test gives a positive result for $95\\%$ of people who have the disease, and a false positive for $8\\%$ of people who do not. A randomly chosen person tests positive. Find the probability that they actually have the disease.", "marks": 4, "commandTerm": "Find", "difficulty": "standard", "syllabusRef": "AHL 4.13", "paper": "P2", "calculator": True,
         "markScheme": ms(("(M1) $P(+)=0.02(0.95)+0.98(0.08)$", 1), ("(A1) $P(+)=0.0974$", 1), ("(M1) $P(D\\mid+)=\\dfrac{0.02(0.95)}{0.0974}$", 1), ("(A1) $P(D\\mid+)=0.195$ (3 s.f.)", 1)),
         "modelAnswer": "Let $D$ be having the disease. $P(+)=P(D)P(+\\mid D)+P(D')P(+\\mid D')=0.02(0.95)+0.98(0.08)=0.0974$.\n\nBayes: $P(D\\mid+)=\\dfrac{0.02(0.95)}{0.0974}=\\dfrac{0.019}{0.0974}=0.195$ (3 s.f.)."},
        {"id": "ahl-4-13-q3", "prompt": "Factories $A$, $B$ and $C$ produce $50\\%$, $30\\%$ and $20\\%$ of all items, with defect rates $1\\%$, $2\\%$ and $3\\%$ respectively. An item chosen at random is found to be defective. Find the probability it was made by factory $C$.", "marks": 4, "commandTerm": "Find", "difficulty": "challenge", "syllabusRef": "AHL 4.13", "paper": "P2", "calculator": True,
         "markScheme": ms(("(M1) $P(\\text{def})=0.5(0.01)+0.3(0.02)+0.2(0.03)$", 1), ("(A1) $P(\\text{def})=0.017$", 1), ("(M1) $P(C\\mid\\text{def})=\\dfrac{0.2(0.03)}{0.017}$", 1), ("(A1) $P(C\\mid\\text{def})=0.353$ (3 s.f.)", 1)),
         "modelAnswer": "$P(\\text{def})=0.5(0.01)+0.3(0.02)+0.2(0.03)=0.005+0.006+0.006=0.017$.\n\n$P(C\\mid\\text{def})=\\dfrac{0.2(0.03)}{0.017}=\\dfrac{0.006}{0.017}=0.353$ (3 s.f.)."},
        {"id": "ahl-4-13-q4", "prompt": "Given that $P(A\\cap B)=0.24$ and $P(B)=0.6$, find $P(A\\mid B)$.", "marks": 2, "commandTerm": "Find", "difficulty": "foundation", "syllabusRef": "SL 4.6", "paper": "P1", "calculator": False,
         "markScheme": ms(("(M1) $P(A\\mid B)=\\dfrac{P(A\\cap B)}{P(B)}=\\dfrac{0.24}{0.6}$", 1), ("(A1) $P(A\\mid B)=0.4$", 1)),
         "modelAnswer": "$P(A\\mid B)=\\dfrac{P(A\\cap B)}{P(B)}=\\dfrac{0.24}{0.6}=0.4$."},
    ],
}

BANKS["4.8"] = {
    "subtopics": [
        {"code": "AHL 4.14", "title": "Continuous random variables", "detail": "Continuous random variables and their probability density functions (pdf)."},
        {"code": "AHL 4.14", "title": "Probabilities as integrals", "detail": "A pdf satisfies $\\int f(x)\\,dx=1$; probabilities are areas: $P(a\\le X\\le b)=\\int_a^b f(x)\\,dx$."},
        {"code": "AHL 4.14", "title": "Mode, median and mean", "detail": "Mode (maximum of $f$), median ($\\int_{-\\infty}^{m} f=0.5$) and mean $\\mathrm{E}(X)=\\int x\\,f(x)\\,dx$."},
    ],
    "questions": [
        {"id": "ahl-4-14-q1", "prompt": "A continuous random variable $X$ has probability density function $f(x)=kx^2$ for $0\\le x\\le 3$, and $f(x)=0$ otherwise.\n(a) Find the value of $k$.\n(b) Find $P(X\\le 2)$.", "marks": 4, "commandTerm": "Find", "difficulty": "standard", "syllabusRef": "AHL 4.14", "paper": "P1", "calculator": False,
         "markScheme": ms(("(a) (M1) $\\displaystyle\\int_0^3 kx^2\\,dx=1\\Rightarrow k\\Big[\\tfrac{x^3}{3}\\Big]_0^3=9k=1$", 1), ("(a) (A1) $k=\\dfrac{1}{9}$", 1), ("(b) (M1) $\\displaystyle\\int_0^2 \\tfrac{1}{9}x^2\\,dx=\\tfrac{1}{9}\\cdot\\tfrac{8}{3}$", 1), ("(b) (A1) $P(X\\le 2)=\\dfrac{8}{27}$", 1)),
         "modelAnswer": "(a) $\\int_0^3 kx^2\\,dx=k\\Big[\\tfrac{x^3}{3}\\Big]_0^3=9k=1\\Rightarrow k=\\tfrac19$.\n\n(b) $P(X\\le 2)=\\int_0^2 \\tfrac19 x^2\\,dx=\\tfrac19\\Big[\\tfrac{x^3}{3}\\Big]_0^2=\\tfrac19\\cdot\\tfrac83=\\dfrac{8}{27}\\approx 0.296$."},
        {"id": "ahl-4-14-q2", "prompt": "The continuous random variable $X$ has pdf $f(x)=\\dfrac{1}{9}x^2$ for $0\\le x\\le 3$. Find $\\mathrm{E}(X)$.", "marks": 2, "commandTerm": "Find", "difficulty": "standard", "syllabusRef": "AHL 4.14", "paper": "P1", "calculator": False,
         "markScheme": ms(("(M1) $\\mathrm{E}(X)=\\displaystyle\\int_0^3 x\\cdot\\tfrac{1}{9}x^2\\,dx=\\tfrac{1}{9}\\Big[\\tfrac{x^4}{4}\\Big]_0^3$", 1), ("(A1) $\\mathrm{E}(X)=\\dfrac{9}{4}=2.25$", 1)),
         "modelAnswer": "$\\mathrm{E}(X)=\\int_0^3 x\\cdot\\tfrac19 x^2\\,dx=\\tfrac19\\int_0^3 x^3\\,dx=\\tfrac19\\Big[\\tfrac{x^4}{4}\\Big]_0^3=\\tfrac19\\cdot\\tfrac{81}{4}=\\dfrac94=2.25$."},
        {"id": "ahl-4-14-q3", "prompt": "The continuous random variable $X$ has pdf $f(x)=\\dfrac{1}{9}x^2$ for $0\\le x\\le 3$. Find the median $m$.", "marks": 3, "commandTerm": "Find", "difficulty": "challenge", "syllabusRef": "AHL 4.14", "paper": "P1", "calculator": False,
         "markScheme": ms(("(M1) $\\displaystyle\\int_0^{m}\\tfrac{1}{9}x^2\\,dx=0.5$", 1), ("(A1) $\\dfrac{m^3}{27}=0.5\\Rightarrow m^3=13.5$", 1), ("(A1) $m=\\sqrt[3]{13.5}=2.38$ (3 s.f.)", 1)),
         "modelAnswer": "The median satisfies $\\int_0^m \\tfrac19 x^2\\,dx=0.5$, i.e. $\\tfrac19\\cdot\\tfrac{m^3}{3}=0.5\\Rightarrow \\tfrac{m^3}{27}=0.5\\Rightarrow m^3=13.5$, so $m=\\sqrt[3]{13.5}=2.38$ (3 s.f.)."},
        {"id": "ahl-4-14-q4", "prompt": "A continuous random variable $X$ has pdf $f(x)=ax$ for $0\\le x\\le 4$, and $0$ otherwise.\n(a) Find $a$.\n(b) Find $\\mathrm{E}(X)$.", "marks": 4, "commandTerm": "Find", "difficulty": "standard", "syllabusRef": "AHL 4.14", "paper": "P1", "calculator": False,
         "markScheme": ms(("(a) (M1) $\\displaystyle\\int_0^4 ax\\,dx=a\\Big[\\tfrac{x^2}{2}\\Big]_0^4=8a=1$", 1), ("(a) (A1) $a=\\dfrac{1}{8}$", 1), ("(b) (M1) $\\mathrm{E}(X)=\\displaystyle\\int_0^4 x\\cdot\\tfrac{1}{8}x\\,dx=\\tfrac{1}{8}\\Big[\\tfrac{x^3}{3}\\Big]_0^4$", 1), ("(b) (A1) $\\mathrm{E}(X)=\\dfrac{8}{3}\\approx 2.67$", 1)),
         "modelAnswer": "(a) $\\int_0^4 ax\\,dx=a\\Big[\\tfrac{x^2}{2}\\Big]_0^4=8a=1\\Rightarrow a=\\tfrac18$.\n\n(b) $\\mathrm{E}(X)=\\int_0^4 x\\cdot\\tfrac18 x\\,dx=\\tfrac18\\int_0^4 x^2\\,dx=\\tfrac18\\Big[\\tfrac{x^3}{3}\\Big]_0^4=\\tfrac18\\cdot\\tfrac{64}{3}=\\dfrac83\\approx 2.67$."},
    ],
}

# --- 4.5 (Binomial): reuse the already-authored HL pilot bank for SL --------
hl_binom = json.load(open(os.path.join(HL_DIR, "4-5-the-binomial-distribution.pilot.json")))
BANKS["4.5"] = {"subtopics": hl_binom["subtopics"], "questions": hl_binom["questionBank"]}

# --- Which topics each level's course actually contains --------------------
HL_TOPICS = ["4.1", "4.2", "4.3", "4.4", "4.6", "4.7", "4.8"]  # 4.5 already piloted
SL_TOPICS = ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"]

def topic_to_file(dirpath, topic):
    matches = [f for f in glob.glob(os.path.join(dirpath, f"{topic.replace('.', '-')}-*.json"))
               if not f.endswith(".pilot.json")]
    return matches[0] if matches else None

def apply(dirpath, topics):
    out = []
    for t in topics:
        src = topic_to_file(dirpath, t)
        if not src:
            out.append((t, "MISSING FILE", 0))
            continue
        lesson = json.load(open(src))
        lesson["subtopics"] = BANKS[t]["subtopics"]
        lesson["questionBank"] = BANKS[t]["questions"]
        lesson["status"] = "pilot"
        lesson["generatorVersion"] = "study-loop-pilot-v1"
        dst = src.replace(".json", ".pilot.json")
        json.dump(lesson, open(dst, "w"), ensure_ascii=False, indent=2)
        out.append((t, os.path.basename(dst), len(BANKS[t]["questions"])))
    return out

# --- Validate every mark scheme reconciles ---------------------------------
problems = []
for t, bank in BANKS.items():
    for q in bank["questions"]:
        s = sum(m["marks"] for m in q["markScheme"])
        if s != q["marks"]:
            problems.append(f"{t}/{q['id']}: total={q['marks']} scheme={s}")
if problems:
    print("MARK MISMATCHES:\n  " + "\n  ".join(problems))
    raise SystemExit(1)
print("All mark schemes reconcile ✓\n")

print("== HL ==")
for t, f, n in apply(HL_DIR, HL_TOPICS):
    print(f"  {t}: {n} questions -> {f}")
print("== SL ==")
for t, f, n in apply(SL_DIR, SL_TOPICS):
    print(f"  {t}: {n} questions -> {f}")
print("\nGroup 4 question-bank scale-out complete.")
