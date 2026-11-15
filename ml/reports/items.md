# GL-Items head report

Greenlight Models are small classifiers we trained on USC club-funding data, on top of the open BAAI bge-small-en-v1.5 encoder (MIT license). They run in your browser, so request text never leaves your device for classification. They suggest; the rules engine and people decide.

## Summary

- **Task:** `items`
- **Encoder mode:** `bge` (`BAAI/bge-small-en-v1.5` mean-pool + L2; browser encoder `Xenova/bge-small-en-v1.5`)
- **Train / test:** 168 / 112 (test = team_written only)
- **Accuracy:** 0.929
- **Macro F1:** 0.927
- **5-fold CV macro F1 (train):** 0.774 ± 0.042 (5 folds)
- **Majority baseline:** acc 0.071, macro F1 0.010 (label `0`)
- **Keyword baseline:** acc 0.214, macro F1 0.171
- **Decision:** Shipped: macro F1 0.927 beats majority 0.010 and keyword 0.171
- **Elapsed:** 6.22s

## Per-label precision / recall

| label | precision | recall | f1 | support |
| --- | ---: | ---: | ---: | ---: |
| airfare | 1.000 | 1.000 | 1.000 | 8 |
| alcohol | 1.000 | 0.875 | 0.933 | 8 |
| durable | 0.778 | 0.875 | 0.824 | 8 |
| food | 0.889 | 1.000 | 0.941 | 8 |
| gift | 1.000 | 1.000 | 1.000 | 8 |
| lodging | 1.000 | 1.000 | 1.000 | 8 |
| other | 1.000 | 1.000 | 1.000 | 8 |
| performer | 0.889 | 1.000 | 0.941 | 8 |
| printing | 0.875 | 0.875 | 0.875 | 8 |
| promo_merch | 0.778 | 0.875 | 0.824 | 8 |
| rideshare | 1.000 | 0.875 | 0.933 | 8 |
| supplies | 1.000 | 0.625 | 0.769 | 8 |
| tshirt | 0.889 | 1.000 | 0.941 | 8 |
| venue | 1.000 | 1.000 | 1.000 | 8 |

## Confusion matrix (test)

| true \ pred | airfare | alcohol | durable | food | gift | lodging | other | performer | printing | promo_merch | rideshare | supplies | tshirt | venue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| airfare | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| alcohol | 0 | 7 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| durable | 0 | 0 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| food | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| gift | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| lodging | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| other | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| performer | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| printing | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | 1 | 0 | 0 | 0 | 0 |
| promo_merch | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | 0 | 0 | 0 | 0 |
| rideshare | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 7 | 0 | 0 | 0 |
| supplies | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 5 | 0 | 0 |
| tshirt | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 0 |
| venue | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 |

## 10 worst errors (high-confidence mistakes on test)

| text | true | pred | confidence |
| --- | --- | --- | ---: |
| Club uniforms and jerseys | durable | tshirt | 0.170 |
| Keg for graduate social | alcohol | food | 0.155 |
| Lyft to venue for performers | rideshare | performer | 0.149 |
| Color flyers for club fair | printing | promo_merch | 0.144 |
| Amazon robot kits single use supplies | supplies | durable | 0.142 |
| Name tags and stickers for conference | supplies | promo_merch | 0.138 |
| Paper plates and napkins for mixer | supplies | printing | 0.120 |
| Table runner with club branding | promo_merch | durable | 0.115 |

## sklearn classification report

```
              precision    recall  f1-score   support

     airfare       1.00      1.00      1.00         8
     alcohol       1.00      0.88      0.93         8
     durable       0.78      0.88      0.82         8
        food       0.89      1.00      0.94         8
        gift       1.00      1.00      1.00         8
     lodging       1.00      1.00      1.00         8
       other       1.00      1.00      1.00         8
   performer       0.89      1.00      0.94         8
    printing       0.88      0.88      0.88         8
 promo_merch       0.78      0.88      0.82         8
   rideshare       1.00      0.88      0.93         8
    supplies       1.00      0.62      0.77         8
      tshirt       0.89      1.00      0.94         8
       venue       1.00      1.00      1.00         8

    accuracy                           0.93       112
   macro avg       0.94      0.93      0.93       112
weighted avg       0.94      0.93      0.93       112
```
