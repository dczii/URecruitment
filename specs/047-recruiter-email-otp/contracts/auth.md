# Server action contract

requestCode(email): Zod-normalized valid email → {ok:true} with generic acknowledgement or {ok:false,error} with safe validation/service/throttle message. Unknown approval returns the same acknowledgement without sending.
verifyCode(email,code): six ASCII digits preserving leading zeros → {ok:true} only after provider verification and current UUID/email approval; otherwise safe error. Successful action redirects to /dashboard.
logout(): clears provider session and application age cookie; redirects to /login. No input, no typed-name mutation.
Protected data HTTP transport: verified current user + valid age marker + active UUID/email approval required before any privileged request.
