# Greenlight Models training data

Honest framing: Greenlight Models are small classifiers we trained on USC club-funding data, on top of the open BAAI bge-small-en-v1.5 encoder (MIT license). They run in your browser, so request text never leaves your device for classification. They suggest; the rules engine and people decide.

## Schema

Columns: `text`, `label`, `source`, `split`

- **source**: `rules_doc` | `seed_app` | `fy26_report` | `team_written` | `synthetic`
- **split**: `train` | `test`
- Test split is **team_written only**, never synthetic, ≥8 examples per label.
- Synthetic is at most **60%** of the training split.

## items.csv (GL-Items)

Total rows: 360
Splits: {'test': 144, 'train': 216}
Sources: {'team_written': 144, 'rules_doc': 72, 'seed_app': 54, 'fy26_report': 36, 'synthetic': 54}

Per label (total / train / test / team_written_test):
- `alcohol`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)
- `av_or_production`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)
- `decorations_rental`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)
- `donation_to_charity`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)
- `durable_good`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)
- `food_catered`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)
- `food_raw`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)
- `ground_transport_rideshare_or_rental`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)
- `merch_promotional`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)
- `other`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)
- `printing`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)
- `prize_or_gift_card`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)
- `restaurant_meal`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)
- `subscription`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)
- `supplies_single_use`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)
- `talent_or_performer_fee`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)
- `travel_air_or_hotel`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)
- `venue_or_staffing`: 20 total, 12 train, 8 test (team_written test=8), synthetic train=3 (25%)

## board.csv (GL-Board)

Total rows: 120
Splits: {'test': 40, 'train': 80}
Sources: {'team_written': 52, 'rules_doc': 24, 'seed_app': 20, 'fy26_report': 16, 'synthetic': 8}

Per label (total / train / test / team_written_test):
- `arts`: 30 total, 20 train, 10 test (team_written test=10), synthetic train=2 (10%)
- `philanthropy`: 30 total, 20 train, 10 test (team_written test=10), synthetic train=2 (10%)
- `professional`: 30 total, 20 train, 10 test (team_written test=10), synthetic train=2 (10%)
- `social`: 30 total, 20 train, 10 test (team_written test=10), synthetic train=2 (10%)

## replies.csv (GL-Replies)

Total rows: 140
Splits: {'test': 70, 'train': 70}
Sources: {'team_written': 77, 'rules_doc': 21, 'seed_app': 21, 'fy26_report': 14, 'synthetic': 7}

Per label (total / train / test / team_written_test):
- `declined`: 20 total, 10 train, 10 test (team_written test=10), synthetic train=1 (10%)
- `interested`: 20 total, 10 train, 10 test (team_written test=10), synthetic train=1 (10%)
- `needs_more_info`: 20 total, 10 train, 10 test (team_written test=10), synthetic train=1 (10%)
- `out_of_office`: 20 total, 10 train, 10 test (team_written test=10), synthetic train=1 (10%)
- `referral_to_someone_else`: 20 total, 10 train, 10 test (team_written test=10), synthetic train=1 (10%)
- `unsubscribe`: 20 total, 10 train, 10 test (team_written test=10), synthetic train=1 (10%)
- `wrong_person_or_bounce`: 20 total, 10 train, 10 test (team_written test=10), synthetic train=1 (10%)

## Regeneration

```bash
python ml/generate_data.py
```
