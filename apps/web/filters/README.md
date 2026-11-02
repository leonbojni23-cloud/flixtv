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


## 4) FLIXTV gambling pop-up blocklist (custom)
Subscription URL:
https://raw.githubusercontent.com/leonbojni23-cloud/flixtv/main/apps/web/filters/flixtv-gambling-popups.txt

This custom list blocks selected gambling/casino domains only when they are
opened as third-party pop-up tabs. It includes Stake, bet365, 1xBet, Shuffle,
Roobet, BC.Game, Gamdom, and Rainbet. Candidate domains were cross-checked
against public gambling-site lists and traffic rankings; this is a curated
starting point, not a complete global list.

Import this URL into AdGuard's custom filters. It requires a compatible AdGuard
filtering engine. AdGuard's documentation notes that $popup support varies by
product/version, with limitations in Chromium MV3. It may not catch every
redirect or pop-up technique.

Sources:
- https://www.semrush.com/trending-websites/al/gambling
- https://igamingcrypto.io/analytics/


## 5) Large maintained general-purpose lists

Use these in a compatible blocker (AdGuard app/extension, uBlock Origin, or Brave custom filters).
Do not paste the list contents into app.js; filter syntax is not executable page JavaScript.

### EasyList (general ads)
https://easylist.to/easylist/easylist.txt

### EasyPrivacy (trackers and privacy)
https://easylist.to/easylist/easyprivacy.txt

### AdGuard Base (AdGuard-optimized)
https://filters.adtidy.org/extension/ublock/filters/2_optimized.txt

### AdGuard Popups / Annoyances
https://filters.adtidy.org/extension/ublock/filters/19.txt

### Optional: one community-compiled mega-list
https://raw.githubusercontent.com/SamirPaulb/filter-lists/refs/heads/main/filters.txt

The community mega-list aggregates 70+ sources and includes ads, trackers, malware,
phishing, and annoyance rules. It is maintained by a third party, not AdGuard.
Review its source list and update history before enabling it. Do not enable it
alongside every component list above: substantial overlap can cause duplicate
rules, slower updates, and site breakage.

Recommended conservative setup: AdGuard Base + EasyList + AdGuard Popups.
Add EasyPrivacy if tracker blocking is also desired. Choose the community mega-list
as an alternative bundle, not as an extra layer on top of all component lists.

Important: these are subscriptions for a compatible content blocker. They do not
become active for FLIXTV visitors just because the URLs are written in this repository.
The FLIXTV JavaScript popup guard cannot inspect or block requests inside a
cross-origin VidCore iframe.
