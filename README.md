# BMPI — Bitcoin Media Pressure Index

> How much of Bitcoin market behaviour is driven by media pressure?

BMPI is a browser-based index that measures abnormal media activity around Bitcoin using global news data (GDELT).

---

## Live Calculator

https://parfenovichdmitry.github.io/bmpi-index/

---

## Technology

This project is **NOT built in Python**.

It is a pure frontend application:

- HTML — structure
- CSS — UI
- JavaScript — logic + API calls

Runs directly in the browser (GitHub Pages ready).

---

## What is BMPI?

BMPI (Bitcoin Media Pressure Index) is a score in range **[0, 1]**:

- 0 → calm market (organic movement)
- 1 → extreme media-driven pressure

It is based on:

- number of news articles (mentions)
- average tone of coverage

---

## Formula
z₁ = clip[(mentions − 173.3) / 256.4, −3, 3]
z₂ = clip[(−0.7214 − tone) / 1.1607, −3, 3]

raw = 0.60·z₁ + 0.40·z₂

BMPI = 1 / (1 + e^(−raw))


---

## Calibration

| Parameter | Value |
|----------|------|
| μ_mentions | 173.3 |
| σ_mentions | 256.4 |
| μ_tone | −0.7214 |
| σ_tone | 1.1607 |

---

## Interpretation

| BMPI | Zone | Meaning |
|------|------|--------|
| 0.00–0.47 | CALM | Organic market |
| 0.47–0.53 | NORMAL | Neutral |
| 0.53–0.59 | ELEVATED | Narrative building |
| 0.59–0.65 | ALERT | High risk |
| 0.65–1.00 | MANIPULATION | Extreme |

---

## Key Results (Pipeline v2)

Dataset:

- 3,800 days (2015–2026)
- 29 major BTC events (balanced preset)

Results:

- Avg BMPI = **0.4985**
- Media explains ~**29.75%** of abnormal moves
- Excess share ≈ **52.76%**

---

## Event-Level Results

- Mean media impact: **16.86%**
- Max impact: **49.68%**

---

## BMPI Distribution

| Zone | Share |
|------|------|
| CALM | 31.63% |
| NORMAL | 38.13% |
| ELEVATED | 22.21% |
| ALERT | 5.87% |
| MANIPULATION | 2.16% |

---

## Correlation Insights

- mentions → BMPI: **r up to 0.79**
- mentions → media effect: **r up to 0.69**
- tone → weak signal

**Main driver = media volume, not tone**

---

## Robustness

Across presets and windows:

- Excess/media: **53% – 60%**
- Excess/abnormal: **9.5% – 16.8%**
- Results stable across all configurations

---

## Key Insight

BMPI captures:

**information-driven (not fundamental) price movement**

Markets are partially driven by:

- narratives
- media cycles
- attention shocks


---

## Deployment (GitHub Pages)

1. Upload files
2. Go to Settings → Pages
3. Select:
    - branch: main
    - folder: /root

---

## Notes

- GDELT API may return empty results → retry
- Old dates (<2016) may have low coverage
- Use SENSITIVE preset if needed

---

## Research Context

BMPI is part of a broader research pipeline including:

- abnormal return modeling
- event detection
- media impact estimation
- robustness analysis

---

## License

MIT