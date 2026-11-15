"""Deterministic 384-d hash embedding matching src/lib/models/math.ts embedFallback."""
from __future__ import annotations

import math
import re
from typing import Iterable

DIM = 384


def embed_fallback(text: str, dim: int = DIM) -> list[float]:
    v = [0.0] * dim
    lower = text.lower()
    for i, ch in enumerate(lower):
        code = ord(ch)
        v[code % dim] += 1.0
        v[(i * 31 + code) % dim] += 0.25
    for w in filter(None, re.split(r"\s+", lower)):
        h = 0
        for ch in w:
            h = (h * 131 + ord(ch)) % dim
        v[h] += 3.0
        v[(h * 7) % dim] += 1.5
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n for x in v]


def embed_many(texts: Iterable[str]) -> list[list[float]]:
    return [embed_fallback(t) for t in texts]
