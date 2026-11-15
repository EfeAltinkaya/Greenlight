# GL-Board head report

Greenlight Models are small classifiers we trained on USC club-funding data, on top of the open BAAI bge-small-en-v1.5 encoder (MIT license). They run in your browser, so request text never leaves your device for classification. They suggest; the rules engine and people decide.

## Summary

- **Task:** `board`
- **Encoder mode:** `bge` (`BAAI/bge-small-en-v1.5` mean-pool + L2; browser encoder `Xenova/bge-small-en-v1.5`)
- **Train / test:** 82 / 32 (test = team_written only)
- **Accuracy:** 0.938
- **Macro F1:** 0.939
- **5-fold CV macro F1 (train):** 0.819 ± 0.055 (5 folds)
- **Majority baseline:** acc 0.250, macro F1 0.100 (label `1`)
- **Decision:** Shipped: macro F1 0.939 beats majority 0.100
- **Elapsed:** 3.36s

## Per-label precision / recall

| label | precision | recall | f1 | support |
| --- | ---: | ---: | ---: | ---: |
| arts | 1.000 | 0.875 | 0.933 | 8 |
| philanthropy | 1.000 | 1.000 | 1.000 | 8 |
| professional | 0.800 | 1.000 | 0.889 | 8 |
| social | 1.000 | 0.875 | 0.933 | 8 |

## Confusion matrix (test)

| true \ pred | arts | philanthropy | professional | social |
| --- | --- | --- | --- | --- |
| arts | 7 | 0 | 1 | 0 |
| philanthropy | 0 | 8 | 0 | 0 |
| professional | 0 | 0 | 8 | 0 |
| social | 0 | 0 | 1 | 7 |

## 10 worst errors (high-confidence mistakes on test)

| text | true | pred | confidence |
| --- | --- | --- | ---: |
| Startup founder social | social | professional | 0.341 |
| Film screening and talkback | arts | professional | 0.334 |

## sklearn classification report

```
              precision    recall  f1-score   support

        arts       1.00      0.88      0.93         8
philanthropy       1.00      1.00      1.00         8
professional       0.80      1.00      0.89         8
      social       1.00      0.88      0.93         8

    accuracy                           0.94        32
   macro avg       0.95      0.94      0.94        32
weighted avg       0.95      0.94      0.94        32
```
