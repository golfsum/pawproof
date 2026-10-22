# PawProof admin Agent Assist integration (pilot)

Only authenticated PawProof admin pages load this widget. The PawProof server
verifies Firebase admin access before requesting a short-lived AppsResolve
employee token. No external API key is ever sent to the browser.

## Required configuration
1. Deploy a verified AppsResolve Agent Assist build with its database migrations
   and secrets configured.
2. Allowlist the origin `https://pawproof.app` in the AppsResolve workspace.
3. Generate an AppsResolve workspace API key and ensure the PawProof admin email
   is an active member of that workspace.
4. Configure the PawProof web deployment:
   - `NEXT_PUBLIC_APPSRESOLVE_AGENT_WORKSPACE_ID`: public workspace UUID
   - `APPSRESOLVE_AGENT_API_KEY`: private server-only workspace API key
5. Validate the secure token endpoint, widget load, CSP, mobile display,
   sign-out behavior, and unavailable-service fallback.

The widget is feature-gated: no workspace ID means no embed script loads.

## Not yet connected
This pilot does **not** transmit PawProof customer IDs, pet data, payments,
or support ticket details. A separately authorized, read-only PawProof customer
API connector and trusted customer-context mapping are required before asking
account-specific questions. Never infer account permissions from a client-side ID.
