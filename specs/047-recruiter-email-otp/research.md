# Research

Official Supabase guidance uses @supabase/ssr for cookie sessions, refresh in Next.js proxy and verified getUser/getClaims rather than trusting getSession. This app intentionally uses server clients only. Email OTP uses signInWithOtp({options:{shouldCreateUser:false}}), a template containing {{ .Token }}, and verifyOtp({type:"email"}). Resend custom SMTP needs no SDK.

References: https://supabase.com/docs/guides/auth/server-side/creating-a-client ; https://supabase.com/docs/guides/auth/auth-email-passwordless ; https://resend.com/docs/send-with-smtp . Installed Next.js authentication/cookies guides were consulted. Existing database tests require a synchronous cached accessor; guarding its async HTTP transport preserves this API while checking every real operation.
