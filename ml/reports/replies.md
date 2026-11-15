# GL-Replies head report

Greenlight Models are small classifiers we trained on USC club-funding data, on top of the open BAAI bge-small-en-v1.5 encoder (MIT license). They run in your browser, so request text never leaves your device for classification. They suggest; the rules engine and people decide.

## Summary

- **Task:** `replies`
- **Encoder mode:** `bge` (`BAAI/bge-small-en-v1.5` mean-pool + L2; browser encoder `Xenova/bge-small-en-v1.5`)
- **Train / test:** 70 / 56 (test = team_written only)
- **Accuracy:** 0.804
- **Macro F1:** 0.796
- **5-fold CV macro F1 (train):** 0.609 ± 0.023 (4 folds)
- **Majority baseline:** acc 0.143, macro F1 0.036 (label `0`)
- **Decision:** Shipped: macro F1 0.796 beats majority 0.036
- **Elapsed:** 4.21s

## Per-label precision / recall

| label | precision | recall | f1 | support |
| --- | ---: | ---: | ---: | ---: |
| declined | 1.000 | 0.625 | 0.769 | 8 |
| interested | 0.800 | 1.000 | 0.889 | 8 |
| needs_more_info | 0.750 | 0.750 | 0.750 | 8 |
| out_of_office | 0.727 | 1.000 | 0.842 | 8 |
| referral_to_someone_else | 1.000 | 0.625 | 0.769 | 8 |
| unsubscribe | 0.800 | 1.000 | 0.889 | 8 |
| wrong_person_or_bounce | 0.714 | 0.625 | 0.667 | 8 |

## Confusion matrix (test)

| true \ pred | declined | interested | needs_more_info | out_of_office | referral_to_someone_else | unsubscribe | wrong_person_or_bounce |
| --- | --- | --- | --- | --- | --- | --- | --- |
| declined | 5 | 0 | 2 | 0 | 0 | 1 | 0 |
| interested | 0 | 8 | 0 | 0 | 0 | 0 | 0 |
| needs_more_info | 0 | 1 | 6 | 1 | 0 | 0 | 0 |
| out_of_office | 0 | 0 | 0 | 8 | 0 | 0 | 0 |
| referral_to_someone_else | 0 | 1 | 0 | 0 | 5 | 0 | 2 |
| unsubscribe | 0 | 0 | 0 | 0 | 0 | 8 | 0 |
| wrong_person_or_bounce | 0 | 0 | 0 | 2 | 0 | 1 | 5 |

## 10 worst errors (high-confidence mistakes on test)

| text | true | pred | confidence |
| --- | --- | --- | ---: |
| Please remove us from the list | declined | unsubscribe | 0.287 |
| Who else is sponsoring? | needs_more_info | interested | 0.245 |
| Sam on the brand team can help | referral_to_someone_else | interested | 0.237 |
| This address is no longer active | wrong_person_or_bounce | unsubscribe | 0.229 |
| I am not at that email anymore | wrong_person_or_bounce | out_of_office | 0.220 |
| What date is the event again? | needs_more_info | out_of_office | 0.215 |
| I left the company last month | wrong_person_or_bounce | out_of_office | 0.206 |
| Budget is allocated for the year | declined | needs_more_info | 0.194 |
| Looping in my colleague who owns this | referral_to_someone_else | wrong_person_or_bounce | 0.182 |
| Contact our LA office instead | referral_to_someone_else | wrong_person_or_bounce | 0.180 |

## sklearn classification report

```
                          precision    recall  f1-score   support

                declined       1.00      0.62      0.77         8
              interested       0.80      1.00      0.89         8
         needs_more_info       0.75      0.75      0.75         8
           out_of_office       0.73      1.00      0.84         8
referral_to_someone_else       1.00      0.62      0.77         8
             unsubscribe       0.80      1.00      0.89         8
  wrong_person_or_bounce       0.71      0.62      0.67         8

                accuracy                           0.80        56
               macro avg       0.83      0.80      0.80        56
            weighted avg       0.83      0.80      0.80        56
```
