# GL-Items head report

Greenlight Models are small classifiers we trained on USC club-funding data, on top of the open BAAI bge-small-en-v1.5 encoder (MIT license). They run in your browser, so request text never leaves your device for classification. They suggest; the rules engine and people decide.

## Summary

- **Task:** `items`
- **Encoder mode:** `bge` (`BAAI/bge-small-en-v1.5` mean-pool + L2; browser encoder `Xenova/bge-small-en-v1.5`)
- **Train / test:** 216 / 144 (test = team_written only)
- **Accuracy:** 0.861
- **Macro F1:** 0.858
- **5-fold CV macro F1 (train):** 0.912 ± 0.045 (5 folds)
- **Majority baseline:** acc 0.056, macro F1 0.006 (label `0`)
- **Keyword baseline:** acc 0.625, macro F1 0.664
- **Decision:** Shipped: macro F1 0.858 beats majority 0.006 and keyword 0.664
- **Elapsed:** 4.62s

## Per-label precision / recall

| label | precision | recall | f1 | support |
| --- | ---: | ---: | ---: | ---: |
| alcohol | 1.000 | 0.875 | 0.933 | 8 |
| av_or_production | 0.778 | 0.875 | 0.824 | 8 |
| decorations_rental | 0.700 | 0.875 | 0.778 | 8 |
| donation_to_charity | 0.889 | 1.000 | 0.941 | 8 |
| durable_good | 0.750 | 0.750 | 0.750 | 8 |
| food_catered | 0.636 | 0.875 | 0.737 | 8 |
| food_raw | 1.000 | 0.875 | 0.933 | 8 |
| ground_transport_rideshare_or_rental | 1.000 | 0.875 | 0.933 | 8 |
| merch_promotional | 0.889 | 1.000 | 0.941 | 8 |
| other | 1.000 | 0.500 | 0.667 | 8 |
| printing | 0.857 | 0.750 | 0.800 | 8 |
| prize_or_gift_card | 0.889 | 1.000 | 0.941 | 8 |
| restaurant_meal | 0.889 | 1.000 | 0.941 | 8 |
| subscription | 1.000 | 0.750 | 0.857 | 8 |
| supplies_single_use | 1.000 | 0.625 | 0.769 | 8 |
| talent_or_performer_fee | 0.875 | 0.875 | 0.875 | 8 |
| travel_air_or_hotel | 0.800 | 1.000 | 0.889 | 8 |
| venue_or_staffing | 0.889 | 1.000 | 0.941 | 8 |

## Confusion matrix (test)

| true \ pred | alcohol | av_or_production | decorations_rental | donation_to_charity | durable_good | food_catered | food_raw | ground_transport_rideshare_or_rental | merch_promotional | other | printing | prize_or_gift_card | restaurant_meal | subscription | supplies_single_use | talent_or_performer_fee | travel_air_or_hotel | venue_or_staffing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| alcohol | 7 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| av_or_production | 0 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| decorations_rental | 0 | 1 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| donation_to_charity | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| durable_good | 0 | 0 | 1 | 0 | 6 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| food_catered | 0 | 0 | 0 | 0 | 0 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| food_raw | 0 | 0 | 0 | 0 | 0 | 1 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ground_transport_rideshare_or_rental | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| merch_promotional | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| other | 0 | 0 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| printing | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| prize_or_gift_card | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| restaurant_meal | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 |
| subscription | 0 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 0 | 0 |
| supplies_single_use | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 0 | 0 | 0 | 5 | 0 | 0 | 0 |
| talent_or_performer_fee | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | 0 | 1 |
| travel_air_or_hotel | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 0 |
| venue_or_staffing | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 |

## 10 worst errors (high-confidence mistakes on test)

| text | true | pred | confidence |
| --- | --- | --- | ---: |
| Custom ice sculpture not fitting décor rental | other | decorations_rental | 0.174 |
| Evening catering package with servers for officer retreat dinner | food_catered | restaurant_meal | 0.139 |
| Recording engineer fee for podcast live taping | av_or_production | talent_or_performer_fee | 0.126 |
| Uncooked pasta and sauce kits students assemble themselves | food_raw | food_catered | 0.122 |
| Zipcar day rental for picking up catering trays | ground_transport_rideshare_or_rental | food_catered | 0.117 |
| Temporary chalk for sidewalk announcements | supplies_single_use | printing | 0.115 |
| Workshop facilitator fee for design sprint | talent_or_performer_fee | venue_or_staffing | 0.112 |
| Translator services for guest from abroad | other | travel_air_or_hotel | 0.112 |
| Photo booth props rental for alumni mixer | decorations_rental | av_or_production | 0.108 |
| Champagne toast budget for senior banquet | alcohol | food_catered | 0.096 |

## sklearn classification report

```
                                      precision    recall  f1-score   support

                             alcohol       1.00      0.88      0.93         8
                    av_or_production       0.78      0.88      0.82         8
                  decorations_rental       0.70      0.88      0.78         8
                 donation_to_charity       0.89      1.00      0.94         8
                        durable_good       0.75      0.75      0.75         8
                        food_catered       0.64      0.88      0.74         8
                            food_raw       1.00      0.88      0.93         8
ground_transport_rideshare_or_rental       1.00      0.88      0.93         8
                   merch_promotional       0.89      1.00      0.94         8
                               other       1.00      0.50      0.67         8
                            printing       0.86      0.75      0.80         8
                  prize_or_gift_card       0.89      1.00      0.94         8
                     restaurant_meal       0.89      1.00      0.94         8
                        subscription       1.00      0.75      0.86         8
                 supplies_single_use       1.00      0.62      0.77         8
             talent_or_performer_fee       0.88      0.88      0.88         8
                 travel_air_or_hotel       0.80      1.00      0.89         8
                   venue_or_staffing       0.89      1.00      0.94         8

                            accuracy                           0.86       144
                           macro avg       0.88      0.86      0.86       144
                        weighted avg       0.88      0.86      0.86       144
```
