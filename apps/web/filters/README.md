# FLIXTV community ad-filter sources

This file records upstream filter sources used for FLIXTV's optional browser/DNS filtering.
These lists are NOT executed as JavaScript by the FLIXTV page. Use a compatible
content blocker (AdGuard, AdGuard Browser Extension, or uBlock Origin) to subscribe
to the upstream lists.

## 1) AdGuard Base filter (official filter registry)
https://filters.adtidy.org/extension/edge/filters/2.txt

Purpose: general ad blocking rules.

## 2) AdGuard DNS Popup Hosts (DNS-level domain list)
https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt

Source repository:
https://github.com/AdguardTeam/AdGuardSDNSFilter

Purpose: domains opened against the user's will. This is designed for AdGuard DNS
and should be added as a DNS filter, not treated as a cosmetic/browser rule list.

## 3) AdGuard Popups filter (official annoyances subfilter)
https://filters.adtidy.org/extension/edge/filters/19.txt

Purpose: non-functional popups and intrusive overlays.

## Notes
- AdGuard's Annoyances category includes separate subfilters. The Popups filter
  is the relevant dedicated list; enabling the full Annoyances filter as well
  can duplicate rules.
- FLIXTV cannot force a visitor's browser to download or apply these lists.
  Users need a compatible content blocker or AdGuard DNS.
- Cross-origin iframe content (for example vidcore.io) is isolated from FLIXTV
  JavaScript. Browser-level filtering is required for ads created inside it.
- Keep vidcore.io itself allowlisted; block only independently verified ad domains.
- Sources can change upstream. Refresh subscriptions in the blocker rather than
  vendoring a stale copy into the app.
