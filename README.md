# React Contact Form on Railway

A Vite/React static frontend served by a small Node server, plus a separate private form API. The frontend proxies `/api/contact` to the API over Railway private networking. The API validates submissions and appends them to `/data/submissions.jsonl` on a persistent volume. Successful responses confirm storage, not email delivery. There is no public submission-list endpoint.

## Run locally

Use Node 22.12 or newer and npm. From this repository:

```sh
npm ci
npm --prefix frontend ci
npm run build
npm test
```

In one terminal, run `npm --prefix api start`. In another, run `npm --prefix frontend start`. Open `http://localhost:3000/contact`. The API uses port 3001 locally; the frontend uses port 3000. Local submissions are saved in `api/data/` when started through npm. Use fictional contact details.

## Deploy

The `.railway/railway.ts` configuration declares the two GitHub-backed services, healthchecks, private API reference, and a 512 MB persistent volume. Install the Railway CLI, sign in, create a new empty project, and link this repository to that project. Run `railway config plan` to review the configuration, then `railway config apply` to apply it. Generate a public Railway domain for `web` on port 3000; leave the API without a public domain.

Service roots are `/frontend` and `/api`. The frontend builds with `npm run build` and starts with `npm start`; the API starts with `npm start`. `API_URL` is a server-only reference to the API's private domain on port 3001. No frontend rebuild is needed to change its runtime API address. Template deployments carry their own generated domain and private references.

## Scope and production changes

This is a single-replica teaching example. It includes a 16 KiB request limit, bounded fields, a honeypot, same-origin browser checks, and a process-local aggregate limit of 30 accepted messages per minute. These do not replace bot protection or a distributed rate limiter. Restarting the API resets the rate window. Origin checks are not authentication.

Messages persist on the API volume; they are not sent by email. Before collecting real personal data, add an appropriate consent/retention policy, operator access controls, backup and recovery procedures, storage monitoring, and stronger abuse protection. For a team inbox, add a suitable email provider or database-backed workflow. Do not scale this JSONL implementation to multiple replicas. Files are not exposed by HTTP and payloads are not logged.

Hosting consumes CPU, RAM, storage, and network resources; the example does not promise free production hosting. Set Railway usage alerts and suitable resource limits before production use.

## Layout

```text
.railway/railway.ts    Project configuration
frontend/src/          React contact page
frontend/server.mjs    Static files, SPA fallback, API proxy
api/server.mjs         Validation and persistent JSONL storage
tests/flow.test.mjs     Local request/persistence checks
```

## License

MIT. See LICENSE.
