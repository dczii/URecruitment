# Research and decisions

Source: supplied `public/user-logo.png`. Dominant opaque red: #BE2026; lettering: #000000. User explicitly selected logo colors, white and black. Live website requests were denied by the egress proxy; no website values are claimed.

Choose white canvas/cards, #111111 text, #F5F5F5 muted/secondary, #595959 supporting text; red primary/accent/ring. Dark uses neutral blacks, #FF6970 primary and #111111 primary text. Solid contrast: white on red 6.13:1, muted light 6.42:1, dark primary 6.75:1, dark accent 6.02:1. Full token table is in the analysis plan and design/tokens.md.

All screen color usage is already semantic. Root layout currently forces dark, so remove that class for the requested white default. Logo lettering requires a white backing in retained dark states. Neutral on-track/due-soon statuses require labels/icons and a due-soon outline. Chart aliases must be independent of these neutral statuses. Keep chart labels/patterns as a requirement for future charts.

Installed Next layout guidance was read before changing the root layout. Pencil MCP is unavailable; encrypted visual documents remain pending supported-tool reconciliation. Spec Kit skills/scripts are now installed after rebasing onto main; this feature is registered as 046-brand-theme. Local Supabase Postgres previously failed extraction due to disk capacity, so use the real /settings route for database-independent shell/dialog browser validation and report data routes separately.
