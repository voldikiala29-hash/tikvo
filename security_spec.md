# Security Specification & Test-Driven Hardening

## 1. Data Invariants

1. **User Identity Invariant**: A user document at `/users/{userId}` can only be created, read, updated, or deleted by the authenticated user whose `request.auth.uid == userId`. Blanket queries across users are strictly forbidden.
2. **Sub-Resource Ownership Invariant**: All custom niches, scheduled posts, and generated scripts reside strictly under `/users/{userId}/...`. An authenticated user cannot read, query, create, update, or delete sub-resources under any other user's document path.
3. **Immutability of Identity & Timestamps**: The `userId` field and `createdAt` timestamp of any sub-document cannot be altered on update.
4. **Volumetric & Schema Guarding**: String fields are strictly bound by length (`.size() <= MAX`), document IDs are validated with regex `^[a-zA-Z0-9_\-]+$`, and statuses must be strictly enumerated (`draft`, `queued`, `published`).

## 2. The "Dirty Dozen" Malicious Payloads

1. **Unauthenticated Read**: Attempting to read `/users/victim_123` with `request.auth == null` -> `PERMISSION_DENIED`.
2. **Cross-User Identity Impersonation**: Attacker `user_attacker` attempting to create `/users/user_victim` with spoofed `uid: "user_victim"` -> `PERMISSION_DENIED`.
3. **Ghost Field Injection**: Adding an unallowed field `role: "admin"` on `/users/{userId}` creation -> `PERMISSION_DENIED`.
4. **Oversized String Attack (Denial of Wallet)**: Sending a 50KB string as `name` in `customNiches` when max allowed is 80 chars -> `PERMISSION_DENIED`.
5. **ID Poisoning Attack**: Attempting to create a custom niche with document ID containing path traversal or invalid characters `../../etc/passwd` -> `PERMISSION_DENIED`.
6. **Cross-User Subcollection Creation**: `user_attacker` attempting to insert a scheduled post into `/users/user_victim/scheduledPosts/post_1` -> `PERMISSION_DENIED`.
7. **Identity Tampering on Update**: `user_attacker` attempting to update their post and change `userId` to someone else -> `PERMISSION_DENIED`.
8. **Creation Timestamp Alteration**: Attempting to rewrite `createdAt` on an existing scheduled post -> `PERMISSION_DENIED`.
9. **Status Enumeration Bypass**: Setting `status: "super_admin_verified"` instead of `draft | queued | published` -> `PERMISSION_DENIED`.
10. **Blanket Query Scraping**: Attempting a collection-group query or listing all `/users` without scoping to one's own `userId` -> `PERMISSION_DENIED`.
11. **Foreign Script Hijack**: Attempting to read another user's generated script from `/users/victim_123/generatedScripts/script_456` -> `PERMISSION_DENIED`.
12. **Catch-All Default Deny Trap**: Attempting to read or write to an unmodeled collection `/secret_internal_logs/entry_1` -> `PERMISSION_DENIED`.
