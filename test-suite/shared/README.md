# Shared helpers

Use real backend calls for disposable fixture setup and supporting-role actions. Client journeys must be confirmed through the browser. Keep users in separate sessions except when deliberately checking logout/account switching.


14 November continuation: test_live_roles.py covers changed-role persistence, targeted WebSocket user_roles_updated events, no event for unchanged roles and unknown-user behavior. The event contains data.user_id only; clients re-fetch authoritative identity. The browser clears role-scoped cached results before displaying the new role and rechecks on reconnect/focus without polling.
