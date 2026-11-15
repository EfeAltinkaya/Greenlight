# Greenlight Models training data

Columns: `text`, `label`, `source`, `split`.

Sources: `rules_doc`, `seed_app`, `fy26_report`, `team_written`, `synthetic`.

Test split is **team_written only**.

## items (280 rows)
- by label: {'food': 20, 'durable': 20, 'gift': 20, 'supplies': 20, 'tshirt': 20, 'promo_merch': 20, 'performer': 20, 'venue': 20, 'printing': 20, 'alcohol': 20, 'rideshare': 20, 'airfare': 20, 'lodging': 20, 'other': 20}
- by source: {'team_written': 168, 'rules_doc': 23, 'seed_app': 11, 'synthetic': 78}
- by split: {'test': 112, 'train': 168}

## board (114 rows)
- by label: {'professional': 30, 'philanthropy': 30, 'social': 30, 'arts': 24}
- by source: {'team_written': 48, 'rules_doc': 8, 'fy26_report': 5, 'seed_app': 4, 'synthetic': 49}
- by split: {'test': 32, 'train': 82}

## replies (126 rows)
- by label: {'interested': 20, 'needs_more_info': 20, 'declined': 20, 'out_of_office': 20, 'referral_to_someone_else': 20, 'wrong_person_or_bounce': 14, 'unsubscribe': 12}
- by source: {'team_written': 84, 'synthetic': 42}
- by split: {'test': 56, 'train': 70}
