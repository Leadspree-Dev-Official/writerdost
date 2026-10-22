# Appwrite production checklist

- [ ] Use a custom API domain with valid TLS so browser sessions are first-party.
- [ ] Set a short session duration and verify “sign out all devices.”
- [ ] Enable email verification emails; keep the app-side publish gate from Task 4.2.
- [ ] Set password policy to at least 12 characters and block breached/common passwords if available.
- [ ] Review project auth and database rate limits.
- [ ] Restrict the server API key to `databases.read`, `databases.write`, `users.read`, `users.write`; rotate quarterly.
- [ ] Require MFA on every administrator account.
- [ ] Confirm data region and backup policy; record it in the privacy policy.
- [ ] Run `npm run appwrite:setup` against staging, then production, before deploying the matching app version.
- [ ] Verify row-security and table permissions after any schema change.
