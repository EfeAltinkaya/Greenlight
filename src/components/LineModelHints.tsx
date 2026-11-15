"use client";
import { useEffect, useState } from "react";
import {
  classifyItem,
  matchVendor as modelMatchVendor,
  type ClassSuggestion,
  type VendorSuggestion,
} from "@/lib/models";
import { didYouMeanVendor, fuzzyVendorSuggestions, shortVendorName } from "@/lib/vendorMatch";
import type { ItemCategory } from "@/data/rules";
import { ModelSuggestion } from "./ModelSuggestion";

/** Debounced Greenlight Models hints for one budget line (category + vendor). */
export function LineModelHints({
  itemId,
  itemText,
  vendorText,
  category,
  onCategory,
  onVendor,
}: {
  itemId: string;
  itemText: string;
  vendorText: string;
  category: ItemCategory;
  onCategory: (c: ItemCategory) => void;
  onVendor: (name: string) => void;
}) {
  const [catSug, setCatSug] = useState<ClassSuggestion | null>(null);
  const [vendors, setVendors] = useState<VendorSuggestion[] | null>(null);
  const [catDismissed, setCatDismissed] = useState("");
  const [venDismissed, setVenDismissed] = useState("");

  useEffect(() => {
    let off = false;
    const t = window.setTimeout(() => {
      void classifyItem(itemText).then((r) => {
        if (off) return;
        if (!r || r.label === category || catDismissed === itemText) setCatSug(null);
        else setCatSug(r);
      });
    }, 400);
    return () => {
      off = true;
      window.clearTimeout(t);
    };
  }, [itemText, category, catDismissed, itemId]);

  useEffect(() => {
    let off = false;
    const t = window.setTimeout(() => {
      void modelMatchVendor(vendorText).then((r) => {
        if (off) return;
        if (venDismissed === vendorText) {
          setVendors(null);
          return;
        }
        if (r?.length) {
          setVendors(r);
          return;
        }
        // Fuse-only fallback when the vendor head is not loaded. Still confirmable, never silent.
        const fuseHits = fuzzyVendorSuggestions(vendorText, { limit: 3 });
        const best = didYouMeanVendor(vendorText);
        if (!best || !fuseHits.length) {
          setVendors(null);
          return;
        }
        setVendors(
          fuseHits.map((h) => ({
            name: shortVendorName(h.name),
            listed: h.vendor.active,
            score: h.confidence,
          })),
        );
      });
    }, 400);
    return () => {
      off = true;
      window.clearTimeout(t);
    };
  }, [vendorText, venDismissed, itemId]);

  const topVendor = vendors?.[0];
  const showVendor = topVendor && topVendor.name.toLowerCase() !== vendorText.trim().toLowerCase();

  return (
    <>
      {catSug && (
        <ModelSuggestion
          task="items"
          text={itemText}
          summary={`Looks like: ${catSug.display} (${Math.round(catSug.p * 100)}%)`}
          correctLabel={category}
          onAccept={() => {
            onCategory(catSug.label as ItemCategory);
            setCatSug(null);
          }}
          onDismiss={() => {
            setCatDismissed(itemText);
            setCatSug(null);
          }}
        />
      )}
      {showVendor && topVendor && (
        <ModelSuggestion
          task="vendor"
          text={vendorText}
          summary={`Did you mean: ${topVendor.name}?`}
          detail={
            vendors!.length > 1
              ? vendors!
                  .slice(0, 3)
                  .map((v) => `${v.name} (${Math.round(v.score * 100)}%)`)
                  .join(" · ")
              : `${Math.round(topVendor.score * 100)}% match · ${topVendor.listed ? "on USG list" : "check list"}`
          }
          correctLabel={vendorText}
          onAccept={() => {
            onVendor(topVendor.name);
            setVendors(null);
          }}
          onDismiss={() => {
            setVenDismissed(vendorText);
            setVendors(null);
          }}
        />
      )}
    </>
  );
}
