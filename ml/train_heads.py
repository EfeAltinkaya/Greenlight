#!/usr/bin/env python3
"""Train multinomial logistic regression heads on cached embeddings.

Usage: python ml/train_heads.py --task items|board|replies

Writes:
  public/models/heads/{task}.json
  ml/reports/{task}.md
  ml/reports/{task}_preds.json

Ships a real head only if macro F1 beats majority (and keyword for items);
otherwise writes a stub head (`ready: false`, `stub: true`) that index.ts skips.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
HEADS = REPO / "public" / "models" / "heads"
REPORTS = ROOT / "reports"
VERSION = "1.0.0"
ENCODER_BROWSER = "Xenova/bge-small-en-v1.5"
LICENSE = "MIT"

CARD = {
    "items": {
        "does": "Guesses which budget line category a description fits (GL-Items).",
        "neverDoes": "Decide money, change rules, or submit an application.",
        "limits": "Suggests a budget line category only. Never approves, denies, or awards money.",
        "reportWrong": "Click Not right on a suggestion, or email the Greenlight team with the text and the correct category.",
    },
    "board": {
        "does": "Ranks which USG funding board best matches an event description.",
        "neverDoes": "Decide money or lock the board without an officer.",
        "limits": "Suggests a funding board from the event description. Officers confirm before submit.",
        "reportWrong": "Click Not right on a suggestion, or email the Greenlight team with the text and the correct board.",
    },
    "replies": {
        "does": "Classifies a pasted sponsor reply (interested, needs more info, declined, OOO, referral, bounce, unsubscribe).",
        "neverDoes": "Send email, commit a sponsor, or decide funding.",
        "limits": "Labels inbound sponsor email tone. Officers confirm the next step.",
        "reportWrong": "Click Not right on a suggestion, or email the Greenlight team with the reply and the correct label.",
    },
}

FRAMING = (
    "Greenlight Models are small classifiers we trained on USC club-funding data, "
    "on top of the open BAAI bge-small-en-v1.5 encoder (MIT license). They run in your "
    "browser, so request text never leaves your device for classification. They suggest; "
    "the rules engine and people decide."
)

ITEM_KEYWORDS: dict[str, list[str]] = {
    "food_catered": ["cater", "buffet", "boxed lunch", "tray"],
    "food_raw": ["grocery", "raw", "ingredient", "costco", "uncooked", "diy"],
    "restaurant_meal": ["restaurant", "dine-in", "sit-down", "dinner receipt"],
    "merch_promotional": ["merch", "t-shirt", "tee", "hoodie", "sticker", "branded", "swag", "tote"],
    "prize_or_gift_card": ["gift card", "prize", "raffle", "award card"],
    "durable_good": ["durable", "equipment", "speaker", "camera", "retained", "inventory", "owned"],
    "venue_or_staffing": ["venue", "room reservation", "staffing", "facility", "auditorium", "rental fee"],
    "av_or_production": ["av", "audio", "lighting", "mic", "production", "soundboard", "projector"],
    "printing": ["print", "flyer", "poster", "booklet", "banner"],
    "decorations_rental": ["décor", "decor", "balloon", "backdrop", "linen", "centerpiece"],
    "travel_air_or_hotel": ["flight", "airfare", "hotel", "lodging", "airbnb"],
    "ground_transport_rideshare_or_rental": ["uber", "lyft", "rideshare", "van rental", "zipcar", "charter"],
    "talent_or_performer_fee": ["honorarium", "dj", "performer", "speaker fee", "band", "artist"],
    "subscription": ["subscription", "saas", "annual plan", "canva", "notion", "adobe", "zoom pro"],
    "supplies_single_use": ["disposable", "single-use", "napkin", "utensil", "consumable"],
    "alcohol": ["alcohol", "beer", "wine", "liquor", "champagne", "cocktail", "bar package"],
    "donation_to_charity": ["donation", "charity", "nonprofit", "remittance", "charitable"],
    "other": ["miscellaneous", "uncategorized", "other", "contingency", "wire fee"],
}


def keyword_predict(texts: list[str], labels: list[str]) -> list[str]:
    default = labels[0]
    preds = []
    for text in texts:
        t = text.lower()
        best_label, best_hits = default, 0
        for lab in labels:
            hits = sum(1 for kw in ITEM_KEYWORDS.get(lab, []) if kw in t)
            if hits > best_hits:
                best_hits, best_label = hits, lab
        preds.append(best_label if best_hits > 0 else default)
    return preds


def majority_baseline(y_train: np.ndarray, y_test: np.ndarray) -> tuple[float, float, str]:
    values, counts = np.unique(y_train, return_counts=True)
    maj = values[counts.argmax()]
    preds = np.full_like(y_test, maj)
    return (
        float(accuracy_score(y_test, preds)),
        float(f1_score(y_test, preds, average="macro", zero_division=0)),
        str(maj),
    )


def worst_errors(texts, y_true, y_pred, probs, labels, k=10):
    rows = []
    for i, (text, truth, pred) in enumerate(zip(texts, y_true, y_pred)):
        if truth == pred:
            continue
        rows.append(
            {
                "text": text,
                "true": truth,
                "pred": pred,
                "confidence": float(probs[i].max()),
                "true_prob": float(probs[i][labels.index(truth)]) if truth in labels else 0.0,
            }
        )
    rows.sort(key=lambda r: r["confidence"], reverse=True)
    return rows[:k]


def build_head(
    *,
    task: str,
    labels: list[str],
    coef: np.ndarray | None,
    intercept: np.ndarray | None,
    metrics: dict,
    ship: bool,
    stub_reason: str | None,
    fixtures: list[dict],
) -> dict:
    n, dim = len(labels), 384
    card = CARD[task]
    if ship and coef is not None and intercept is not None:
        return {
            "task": task,
            "ready": True,
            "stub": False,
            "dim": dim,
            "labels": labels,
            "coef": coef.astype(float).tolist(),
            "intercept": intercept.astype(float).tolist(),
            "pooling": "mean",
            "encoder": ENCODER_BROWSER,
            "baseModel": ENCODER_BROWSER,
            "license": LICENSE,
            "version": VERSION,
            "trainedAt": datetime.now(timezone.utc).isoformat(),
            "metrics": {
                "accuracy": metrics["accuracy"],
                "macroF1": metrics["macroF1"],
                "nTrain": metrics["nTrain"],
                "note": None,
            },
            "framing": FRAMING,
            "limits": card["limits"],
            "does": card["does"],
            "neverDoes": card["neverDoes"],
            "reportWrong": card["reportWrong"],
            "fixtures": fixtures,
        }
    # Stub: zero head that index.ts skips via ready=false / stub=true
    return {
        "task": task,
        "ready": False,
        "stub": True,
        "dim": dim,
        "labels": labels,
        "coef": [[0.0] * dim for _ in range(n)],
        "intercept": [0.0] * n,
        "pooling": "mean",
        "encoder": ENCODER_BROWSER,
        "baseModel": ENCODER_BROWSER,
        "license": LICENSE,
        "version": VERSION,
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "metrics": {
            "accuracy": metrics.get("accuracy"),
            "macroF1": metrics.get("macroF1"),
            "nTrain": metrics.get("nTrain", 0),
            "note": stub_reason or "Stub head; did not beat baseline.",
        },
        "framing": FRAMING,
        "limits": card["limits"],
        "does": card["does"],
        "neverDoes": card["neverDoes"],
        "reportWrong": card["reportWrong"],
        "fixtures": fixtures,
        "stubReason": stub_reason,
    }


def train_task(task: str) -> dict:
    t0 = time.time()
    sys.path.insert(0, str(ROOT))
    from embed import embed_and_cache, encoder_mode  # noqa: WPS433

    df = pd.read_csv(ROOT / "data" / f"{task}.csv")
    texts = df["text"].astype(str).tolist()
    X = embed_and_cache(texts, name=task)
    mode = encoder_mode()

    train_mask = df["split"].to_numpy() == "train"
    test_mask = df["split"].to_numpy() == "test"
    assert (df.loc[test_mask, "source"] == "team_written").all()
    assert not (df.loc[test_mask, "source"] == "synthetic").any()

    le = LabelEncoder()
    y_all = le.fit_transform(df["label"].astype(str))
    labels = list(le.classes_)

    X_train, y_train = X[train_mask], y_all[train_mask]
    X_test, y_test = X[test_mask], y_all[test_mask]
    texts_test = df.loc[test_mask, "text"].astype(str).tolist()
    y_test_labels = df.loc[test_mask, "label"].astype(str).tolist()

    clf = LogisticRegression(
        multi_class="multinomial",
        class_weight="balanced",
        max_iter=2000,
        solver="lbfgs",
    )

    min_class = int(np.min(np.bincount(y_train)))
    n_splits = max(2, min(5, min_class))
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    cv_scores = cross_val_score(clf, X_train, y_train, cv=cv, scoring="f1_macro")

    clf.fit(X_train, y_train)
    probs = clf.predict_proba(X_test)
    y_pred_idx = probs.argmax(axis=1)
    y_pred = le.inverse_transform(y_pred_idx)

    acc = float(accuracy_score(y_test, y_pred_idx))
    macro_f1 = float(f1_score(y_test, y_pred_idx, average="macro", zero_division=0))
    prec, rec, f1s, support = precision_recall_fscore_support(
        y_test, y_pred_idx, labels=list(range(len(labels))), zero_division=0
    )
    cm = confusion_matrix(y_test, y_pred_idx, labels=list(range(len(labels))))

    maj_acc, maj_f1, maj_label = majority_baseline(y_train, y_test)

    kw_acc = kw_f1 = None
    if task == "items":
        kw_preds = keyword_predict(texts_test, labels)
        kw_idx = le.transform(kw_preds)
        kw_acc = float(accuracy_score(y_test, kw_idx))
        kw_f1 = float(f1_score(y_test, kw_idx, average="macro", zero_division=0))

    beats_majority = macro_f1 > maj_f1 + 1e-9
    beats_keyword = True if kw_f1 is None else macro_f1 > kw_f1 + 1e-9
    ship = beats_majority and beats_keyword

    metrics = {
        "accuracy": acc,
        "macroF1": macro_f1,
        "cvMacroF1Mean": float(cv_scores.mean()),
        "cvMacroF1Std": float(cv_scores.std()),
        "cvFolds": int(n_splits),
        "majorityAccuracy": maj_acc,
        "majorityMacroF1": maj_f1,
        "majorityLabel": maj_label,
        "keywordAccuracy": kw_acc,
        "keywordMacroF1": kw_f1,
        "beatsMajority": beats_majority,
        "beatsKeyword": beats_keyword,
        "shipped": ship,
        "encoderMode": mode,
        "nTrain": int(train_mask.sum()),
        "nTest": int(test_mask.sum()),
        "elapsedSec": round(time.time() - t0, 2),
        "perLabel": {
            labels[i]: {
                "precision": float(prec[i]),
                "recall": float(rec[i]),
                "f1": float(f1s[i]),
                "support": int(support[i]),
            }
            for i in range(len(labels))
        },
    }

    errors = worst_errors(texts_test, y_test_labels, list(y_pred), probs, labels, k=10)

    # Preds for JS parity: include embeddings so Node tests don't use embedFallback
    all_probs = clf.predict_proba(X)
    preds_out = []
    for i, text in enumerate(texts):
        p = all_probs[i]
        preds_out.append(
            {
                "text": text,
                "label": str(df.iloc[i]["label"]),
                "embedding": X[i].astype(float).tolist(),
                "probs": {labels[j]: float(p[j]) for j in range(len(labels))},
            }
        )

    # Fixtures: first test example per label (with embedding) for offline demos
    fixtures = []
    seen = set()
    for i, row in df[test_mask].iterrows():
        lab = str(row["label"])
        if lab in seen:
            continue
        seen.add(lab)
        idx = int(i)
        fixtures.append(
            {
                "text": str(row["text"]),
                "label": lab,
                "embedding": X[idx].astype(float).tolist(),
            }
        )
        if len(fixtures) >= len(labels):
            break

    HEADS.mkdir(parents=True, exist_ok=True)
    REPORTS.mkdir(parents=True, exist_ok=True)

    if ship:
        reason_line = f"Shipped: macro F1 {macro_f1:.3f} beats majority {maj_f1:.3f}" + (
            f" and keyword {kw_f1:.3f}" if kw_f1 is not None else ""
        )
        head = build_head(
            task=task,
            labels=labels,
            coef=clf.coef_,
            intercept=clf.intercept_,
            metrics=metrics,
            ship=True,
            stub_reason=None,
            fixtures=fixtures,
        )
    else:
        reason = (
            f"macro F1 {macro_f1:.3f} did not beat majority {maj_f1:.3f}"
            + (f" and/or keyword {kw_f1:.3f}" if kw_f1 is not None else "")
        )
        reason_line = f"NOT shipped (stub): {reason}"
        head = build_head(
            task=task,
            labels=labels,
            coef=None,
            intercept=None,
            metrics=metrics,
            ship=False,
            stub_reason=reason,
            fixtures=fixtures,
        )

    (HEADS / f"{task}.json").write_text(json.dumps(head) + "\n", encoding="utf-8")
    (REPORTS / f"{task}_preds.json").write_text(
        json.dumps(preds_out) + "\n", encoding="utf-8"
    )

    cm_rows = [
        "| true \\ pred | " + " | ".join(labels) + " |",
        "| --- | " + " | ".join(["---"] * len(labels)) + " |",
    ]
    for i, lab in enumerate(labels):
        cm_rows.append("| " + lab + " | " + " | ".join(str(int(x)) for x in cm[i]) + " |")

    per_label_lines = [
        "| label | precision | recall | f1 | support |",
        "| --- | ---: | ---: | ---: | ---: |",
    ]
    for lab, m in metrics["perLabel"].items():
        per_label_lines.append(
            f"| {lab} | {m['precision']:.3f} | {m['recall']:.3f} | {m['f1']:.3f} | {m['support']} |"
        )

    err_lines = ["| text | true | pred | confidence |", "| --- | --- | --- | ---: |"]
    for e in errors:
        clipped = e["text"].replace("|", "/")[:80]
        err_lines.append(
            f"| {clipped} | {e['true']} | {e['pred']} | {e['confidence']:.3f} |"
        )

    report = f"""# GL-{task.title()} head report

{FRAMING}

## Summary

- **Task:** `{task}`
- **Encoder mode:** `{mode}` (`BAAI/bge-small-en-v1.5` mean-pool + L2; browser encoder `{ENCODER_BROWSER}`)
- **Train / test:** {metrics['nTrain']} / {metrics['nTest']} (test = team_written only)
- **Accuracy:** {acc:.3f}
- **Macro F1:** {macro_f1:.3f}
- **5-fold CV macro F1 (train):** {metrics['cvMacroF1Mean']:.3f} ± {metrics['cvMacroF1Std']:.3f} ({n_splits} folds)
- **Majority baseline:** acc {maj_acc:.3f}, macro F1 {maj_f1:.3f} (label `{maj_label}`)
"""
    if kw_f1 is not None:
        report += f"- **Keyword baseline:** acc {kw_acc:.3f}, macro F1 {kw_f1:.3f}\n"
    report += f"- **Decision:** {reason_line}\n"
    report += f"- **Elapsed:** {metrics['elapsedSec']}s\n"
    if mode == "hash":
        report += (
            "\n> **Note:** BAAI download failed or was unavailable; training used a "
            "deterministic 384-d hash embedding fallback. Re-run with network access "
            "to ship a real BGE-backed head.\n"
        )

    report += "\n## Per-label precision / recall\n\n"
    report += "\n".join(per_label_lines) + "\n"
    report += "\n## Confusion matrix (test)\n\n"
    report += "\n".join(cm_rows) + "\n"
    report += "\n## 10 worst errors (high-confidence mistakes on test)\n\n"
    report += "\n".join(err_lines) if errors else "_No errors on test set._"
    report += "\n\n## sklearn classification report\n\n```\n"
    report += classification_report(y_test, y_pred_idx, target_names=labels, zero_division=0)
    report += "```\n"

    (REPORTS / f"{task}.md").write_text(report, encoding="utf-8")
    print(reason_line)
    print(f"Wrote {HEADS / f'{task}.json'}")
    print(f"Wrote {REPORTS / f'{task}.md'}")
    print(f"Wrote {REPORTS / f'{task}_preds.json'}")
    elapsed = time.time() - t0
    if elapsed > 60:
        print(f"WARNING: task took {elapsed:.1f}s (>60s target)", file=sys.stderr)
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--task", choices=["items", "board", "replies"], required=True)
    args = parser.parse_args()
    train_task(args.task)


if __name__ == "__main__":
    main()
