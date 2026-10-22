# Incident response

| Severity | Definition | Response |
| --- | --- | --- |
| SEV1 | Data breach, loss of user data, or full outage | Page on-call immediately; freeze deploys; notify leadership and affected users as required |
| SEV2 | Partial outage, publishing failures across customers, auth unavailable | Page on-call; update the status page within 30 minutes |
| SEV3 | Degraded feature or isolated customer impact | Handle in business hours; update the ticket/status page |

## Runbook

1. Acknowledge the alert and assign an incident lead.
2. Check `/api/health` and `/api/health/deep` (cron secret required).
3. Identify the last deploy; if correlated, use the documented image rollback.
4. Preserve logs and request IDs; do not paste secrets or full manuscripts into chat.
5. Notify customers using the status page and support inbox.
6. Write a blameless review within five business days and add a regression test.

## Ownership

- Primary on-call: engineering lead (to be named before launch).
- Backup: platform/DevOps owner.
- Customer communication: support lead.
- Status page: to be provisioned before launch; remove the footer status claim until then.
