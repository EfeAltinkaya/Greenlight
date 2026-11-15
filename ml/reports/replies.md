# GL-Replies head report

Greenlight Models are small classifiers we trained on USC club-funding data, on top of the open BAAI bge-small-en-v1.5 encoder (MIT license). They run in your browser, so request text never leaves your device for classification. They suggest; the rules engine and people decide.

## Summary

- **Task:** `replies`
- **Encoder mode:** `bge` (`BAAI/bge-small-en-v1.5` mean-pool + L2; browser encoder `Xenova/bge-small-en-v1.5`)
- **Train / test:** 70 / 70 (test = team_written only)
- **Accuracy:** 0.900
- **Macro F1:** 0.901
- **5-fold CV macro F1 (train):** 0.735 ± 0.075 (5 folds)
- **Majority baseline:** acc 0.143, macro F1 0.036 (label `declined`)
- **Decision:** Shipped: macro F1 0.901 beats majority 0.036
- **Elapsed:** 3.42s

## Per-label precision / recall

| label | precision | recall | f1 | support |
| --- | ---: | ---: | ---: | ---: |
| declined | 1.000 | 1.000 | 1.000 | 10 |
| interested | 0.667 | 1.000 | 0.800 | 10 |
| needs_more_info | 1.000 | 0.700 | 0.824 | 10 |
| out_of_office | 1.000 | 1.000 | 1.000 | 10 |
| referral_to_someone_else | 1.000 | 0.800 | 0.889 | 10 |
| unsubscribe | 0.833 | 1.000 | 0.909 | 10 |
| wrong_person_or_bounce | 1.000 | 0.800 | 0.889 | 10 |

## Confusion matrix (test)

| true \ pred | declined | interested | needs_more_info | out_of_office | referral_to_someone_else | unsubscribe | wrong_person_or_bounce |
| --- | --- | --- | --- | --- | --- | --- | --- |
| declined | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| interested | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| needs_more_info | 0 | 3 | 7 | 0 | 0 | 0 | 0 |
| out_of_office | 0 | 0 | 0 | 10 | 0 | 0 | 0 |
| referral_to_someone_else | 0 | 1 | 0 | 0 | 8 | 1 | 0 |
| unsubscribe | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| wrong_person_or_bounce | 0 | 1 | 0 | 0 | 0 | 1 | 8 |

## 10 worst errors (high-confidence mistakes on test)

| text | true | pred | confidence |
| --- | --- | --- | ---: |
| You'll want our CSR desk — I'll CC them here. | referral_to_someone_else | interested | 0.234 |
| Please email the sponsorship queue, not my personal inbox. | referral_to_someone_else | unsubscribe | 0.233 |
| I left the company last month — please remove me. | wrong_person_or_bounce | unsubscribe | 0.219 |
| I think you meant someone else on the marketing team. | wrong_person_or_bounce | interested | 0.215 |
| We need more on audience majors before routing to marketing. | needs_more_info | interested | 0.204 |
| Can you list the other sponsors already committed? | needs_more_info | interested | 0.195 |
| Interesting — what recognition would our logo receive on site? | needs_more_info | interested | 0.186 |

## sklearn classification report

```
                          precision    recall  f1-score   support

                declined       1.00      1.00      1.00        10
              interested       0.67      1.00      0.80        10
         needs_more_info       1.00      0.70      0.82        10
           out_of_office       1.00      1.00      1.00        10
referral_to_someone_else       1.00      0.80      0.89        10
             unsubscribe       0.83      1.00      0.91        10
  wrong_person_or_bounce       1.00      0.80      0.89        10

                accuracy                           0.90        70
               macro avg       0.93      0.90      0.90        70
            weighted avg       0.93      0.90      0.90        70
```
