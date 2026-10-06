# Research

## Account placement
Decision: Bottom sidebar account trigger with recording name and explicit sign-out menu item.
Rationale: shadcn documents SidebarFooter for sticky user menus/settings/actions, with icon collapse support. Source: https://ui.shadcn.com/docs/components/base/sidebar (researched 2026-10-03). Existing app already stores a typed name; preserving it avoids introducing a second identity system.
Alternatives: A permanently visible logout row costs footer space; header controls scatter navigation/account functions.

## Motion
Decision: 200ms transform/opacity transition, no bounce, immediate keyboard/reduced-motion state.
Rationale: Emil skill recommends purposeful occasional motion, custom curves, interruptibility and compositor properties. Width animation would violate the requested performance principles; FLIP bridges the instantaneous layout change without scaling content.
Alternatives: Width/grid animation triggers repeated layout. Motion dependency is unnecessary. Pure snapping lacks requested pointer continuity.

## Build identity
Decision: Existing package version plus validated deployment commit prefix; local fallback.
Rationale: package.json currently says 0.1.0; release version alone cannot distinguish successive builds. Metadata stays server-side except the small display string.
Alternatives: Hard-coded footer version drifts; remote lookup adds network and is prohibited.

## Clarification pass
No blocking UX clarification: existing typed name is the safest scoped interpretation; mobile retains the established Sheet; login excluded. Issue tracking is optional and is not an implementation prerequisite.
