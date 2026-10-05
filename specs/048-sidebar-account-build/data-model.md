# Data model

No database or auth changes.
- Recording name: existing urec.recruiterName.v1, trimmed nonempty string; null displays Add name. Existing storage failure behavior remains.
- Sidebar: expanded/compact, initially expanded, client-memory state survives route navigation while mounted; no persistence schema.
- Account menu: closed/open; selecting name edit closes menu then opens existing TypedNameDialog; cancellation restores account trigger focus.
- Build identity: package release version and optional commit string validated as 7–40 hexadecimal characters. Public text uses first seven characters; missing/invalid metadata uses local build. A pure formatter receives inputs; server resolver alone reads package/environment.
