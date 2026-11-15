# GL-Board head report

Greenlight Models are small classifiers we trained on USC club-funding data, on top of the open BAAI bge-small-en-v1.5 encoder (MIT license). They run in your browser, so request text never leaves your device for classification. They suggest; the rules engine and people decide.

## Summary

- **Task:** `board`
- **Encoder mode:** `bge` (`BAAI/bge-small-en-v1.5` mean-pool + L2; browser encoder `Xenova/bge-small-en-v1.5`)
- **Train / test:** 80 / 40 (test = team_written only)
- **Accuracy:** 0.950
- **Macro F1:** 0.948
- **5-fold CV macro F1 (train):** 0.938 ± 0.038 (5 folds)
- **Majority baseline:** acc 0.250, macro F1 0.100 (label `arts`)
- **Decision:** Shipped: macro F1 0.948 beats majority 0.100
- **Elapsed:** 2.99s

## Per-label precision / recall

| label | precision | recall | f1 | support |
| --- | ---: | ---: | ---: | ---: |
| arts | 1.000 | 1.000 | 1.000 | 10 |
| philanthropy | 0.909 | 1.000 | 0.952 | 10 |
| professional | 0.909 | 1.000 | 0.952 | 10 |
| social | 1.000 | 0.800 | 0.889 | 10 |

## Confusion matrix (test)

| true \ pred | arts | philanthropy | professional | social |
| --- | --- | --- | --- | --- |
| arts | 10 | 0 | 0 | 0 |
| philanthropy | 0 | 10 | 0 | 0 |
| professional | 0 | 0 | 10 | 0 |
| social | 0 | 1 | 1 | 8 |

## 10 worst errors (high-confidence mistakes on test)

| text | true | pred | confidence |
| --- | --- | --- | ---: |
| Founder office hours for early-stage student startups | social | professional | 0.361 |
| Hiking day trip signup for Griffith Observatory trail | social | philanthropy | 0.279 |

## sklearn classification report

```
              precision    recall  f1-score   support

        arts       1.00      1.00      1.00        10
philanthropy       0.91      1.00      0.95        10
professional       0.91      1.00      0.95        10
      social       1.00      0.80      0.89        10

    accuracy                           0.95        40
   macro avg       0.95      0.95      0.95        40
weighted avg       0.95      0.95      0.95        40
```
