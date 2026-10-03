# ADR-0004: Approved recruiter email OTP

Accepted by explicit user instruction, 2026-10-02. Replaces the no-sign-in/no-email assumptions in constitution II/VIII and ADR-0001 only for recruiter authentication.

Supabase Auth generates/verifies email OTP and manages sessions; Resend provides custom SMTP. Individually approved emails only, no public signup. Approval is checked by UUID and normalized email at every privileged data request. Existing database/Storage permissions remain private and server-only. Typed-name auditing remains required. No candidate/client or other product email is introduced. No real candidate data is authorized; OQ-1 remains open.

Initial user approval is provisioned operationally from the user instruction, not public fixtures/seeds. SMTP/DNS/provider configuration and live provisioning require a separately reviewed operational step; local tests use fictional identities and mock delivery. Spec: ../../specs/047-recruiter-email-otp/spec.md.
