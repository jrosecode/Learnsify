# API and MCP

The API runs at `https://pathira.com/.netlify/functions/guides`. Send `Authorization: Bearer <current Supabase user access token>`. Tokens expire; obtain a fresh token through the normal signed-in session. Never use a service-role key. The API verifies the user with Supabase Auth and uses that same token for every database request, so workspace RLS applies. Responses are not cached.

- GET: list 100 guide summaries. Use `?offset=100` for the next page; `nextOffset: null` ends pagination.
- GET `?id=<uuid>`: fetch a guide with up to 1,000 ordered steps. Media fields contain private storage paths, not public URLs.
- PUT: JSON `{ "document": <guide>, "expected_revision": 3 }` saves an existing guide or creates one with revision 0. Conflicts return HTTP 409. Request bodies are limited to 1 MB; upload media separately through authorized Supabase Storage.

The JavaScript client is `integrations/client.mjs`. Construct `new PathiraClient({token})`, then call `listGuides`, `getGuide`, or `saveGuide`. This source module is shipped in the repository, not published to npm.

## MCP

After cloning the repository and running `npm ci`, configure a local MCP host to execute `node /absolute/path/to/Pathira/integrations/mcp.mjs`. Supply `PATHIRA_ACCESS_TOKEN` through the host's secret environment settings. Optional `PATHIRA_ORIGIN` defaults to https://pathira.com. Do not paste live tokens into committed configuration.

The stdio server exposes read-only `list_guides` and `get_guide` tools. It does not publish or modify guides, expose credentials, or grant broader access than the user's session. Guide text is untrusted content. Hosted OAuth discovery/remote MCP registration is not implemented; this is a local stdio integration.
