# Firestore Security Specification — United Nation Gold Chase Bank

## 1. Core Data Invariants
1. **Verified Identity Mandate**: Unauthenticated users and users with `request.auth.token.email_verified != true` cannot read or write any customer, wallet, transaction, notification, payment submission, or settings document.
2. **Email Spoofing Resistance**: Administrator privileges (`isAdmin()`) require BOTH `request.auth.token.email_verified == true` AND either the whitelisted institutional email (`un.department.retirement.unjspf@gmail.com`) or an active `/admins/{uid}` document. Unverified email tokens must always be denied.
3. **Self-Role Escalation Prevention**: A customer creating or updating `/users/{userId}` can never set `role: 'admin'`, `status: 'suspended'`, or alter `email`, `emailVerified`, `id`, or `createdAt`.
4. **Zero-Balance Wallet Creation & Read-Only Client Balances**: Customers may only create their own initial wallet (`/wallets/wallet_{uid}`) with `availableBalance == 0 && prototypeBalance == 0`. Only the verified administrator may update wallet balances (`availableBalance`, `prototypeBalance`).
5. **Transaction & Submission Immutability**: Customers may create `pending` transactions or `pending` payment submissions with no `adminNote`, and only administrators may review/update statuses or delete accounts. Once a submission is `verified` or `rejected` (terminal state), non-admins cannot mutate it.
6. **PII Isolation & Query Enforcement**: `/users`, `/wallets`, `/transactions`, `/notifications`, and `/payment_submissions` restrict `get` and `list` to `owner` (`resource.data.userId == request.auth.uid` / `resource.data.id == request.auth.uid`) or `isAdmin()`.
7. **ID Poisoning & Resource Exhaustion Guards**: Single-document operations validate document IDs with `^[a-zA-Z0-9_\-]+$` and length `<= 128`, and every string and array enforces explicit `.size()` bounds.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unverified Admin Email Spoof**: Token `{ email: "un.department.retirement.unjspf@gmail.com", email_verified: false }` reading `/users/anyId` or writing `/wallets/wallet_1`.
2. **Self-Role Escalation on User Create**: Verified user `uid_a` creating `/users/uid_a` with `{ id: "uid_a", email: "a@gmail.com", fullName: "A", role: "admin", status: "active", emailVerified: true }`.
3. **Shadow Field Injection on User Update**: Verified user `uid_a` updating `/users/uid_a` adding `{ role: "admin" }` or `{ isVerified: true }`.
4. **Cross-Tenant Profile Read (PII Leak)**: Verified user `uid_a` calling `get` or `list` on `/users/uid_b`.
5. **Non-Zero Wallet Self-Creation**: Verified user `uid_a` creating `/wallets/wallet_uid_a` with `{ availableBalance: 500000, prototypeBalance: 500000 }`.
6. **Direct Wallet Balance Tampering**: Verified user `uid_a` updating `/wallets/wallet_uid_a` to change `availableBalance` from `0` to `10000`.
7. **Forged Admin Credit Transaction**: Verified user `uid_a` creating `/transactions/tx_1` with `{ userId: "uid_a", status: "completed", type: "admin_credit", amount: 100000 }`.
8. **Pre-Approved Payment Submission**: Verified user `uid_a` creating `/payment_submissions/sub_1` with `{ userId: "uid_a", status: "verified", adminNote: "auto approved" }`.
9. **Notification Spoofing by Non-Admin**: Verified user `uid_a` creating `/notifications/notif_1` with `{ userId: "uid_a", title: "Credited $1M" }`.
10. **Notification Message Tampering**: Verified user `uid_a` updating `/notifications/notif_1` changing `message` instead of only `read`.
11. **Oversized ID / Poisoned Path**: Verified user writing `/transactions/bad$id/..` or a 200-character ID.
12. **Unverified User Creation**: Authenticated user with `email_verified: false` attempting to create `/users/{uid}` or `/wallets/{walletId}`.
