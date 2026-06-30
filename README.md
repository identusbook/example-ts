# FlightTix - Identus TypeScript Example App

FlightTix is a Next.js and TypeScript demo for the [Hyperledger Identus](https://hyperledger-identus.github.io/docs/) self-sovereign identity stack. It ports the [identusbook/example-ios](https://github.com/identusbook/example-ios) companion app flow to a browser wallet.

The app runs an Identus edge agent in the browser, talks to a single Cloud Agent through local Next API routes, and uses an Identus Mediator for DIDComm message delivery. The demo models a Traveller who:

- registers and receives a Passport Credential,
- buys a flight and receives a Ticket Credential,
- presents the Ticket Credential to a Security Officer at airport security.

This README covers running the full stack locally for development.

---

## Demo Video

Watch the TypeScript demo walkthrough:

[![FlightTix TypeScript demo walkthrough](https://img.youtube.com/vi/hCAY4gZv0ho/hqdefault.jpg)](https://youtu.be/hCAY4gZv0ho)

[Watch on YouTube](https://youtu.be/hCAY4gZv0ho)

---

## Architecture

```txt
                    your machine

  Browser / Next app at http://localhost:3000
  -------------------------------------------------
  FlightTix UI
  BrowserFlightTixWallet
  Hyperledger Identus SDK edge agent
  Pluto wallet store in IndexedDB
          |
          | DIDComm through mediator DID service endpoints
          v
  Identus Mediator
  REST/DIDComm :8080

  Next API routes
  /api/flighttix/*
          |
          | Cloud Agent REST calls
          v
  Identus Cloud Agent
  REST http://localhost:8000/cloud-agent
          |
          v
  PRISM Node, Postgres, Vault, and other local services
```

Two local backends matter to the app:

| Backend | Purpose | Default endpoint |
| --- | --- | --- |
| Mediator | DIDComm message routing and wallet mailbox | `http://localhost:8080` |
| Cloud Agent | Connections, issuer DID, schemas, credentials, presentations | `http://localhost:8000/cloud-agent` |

The repo keeps the backend stack under `.identus/`, which is ignored by Git. The infra script clones or updates the official [Cloud Agent](https://github.com/hyperledger-identus/cloud-agent.git) and [Mediator](https://github.com/hyperledger-identus/mediator.git) repositories, then runs their Docker workflows.

---

## Prerequisites

- Node.js with npm.
- Docker with `docker compose`.
- Git and curl, used by the infra script.

---

## Part 1 - Configure the app

Create the local environment file and install dependencies:

```bash
cp .env.example .env.local
npm install
```

The defaults target local services:

| Setting | Default |
| --- | --- |
| Mediator | `http://localhost:8080` |
| Cloud Agent | `http://localhost:8000/cloud-agent` |
| Cloud Agent image tag | `2.0.0` |
| PRISM Node image tag | `2.6.0` |
| Mediator image tag | `1.2.1` |
| Wallet IndexedDB name | `flighttix-wallet` |

Keep `.env.local` in the repository root. Next.js loads `.env*` files from the project root, including when source files live under `src/`.

---

## Part 2 - Run the Identus backend

Bootstrap the local backend repositories, start the services, and check health:

```bash
npm run infra:bootstrap
npm run infra:start
npm run infra:health
```

`infra:start` also bootstraps if needed. Running `infra:bootstrap` first makes the clone/update step explicit.

The health command checks:

- Mediator `/health`
- Mediator `/version`
- Mediator `/did`
- Mediator `/invitationOOB`
- Cloud Agent `/_system/health`

Stop local services:

```bash
npm run infra:stop
```

---

## Part 3 - Run the TypeScript app

Start Next.js:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On launch, the app starts the browser wallet and:

1. loads the flight catalog,
2. fetches the Mediator DID,
3. starts the Identus SDK edge agent,
4. creates or reuses the Cloud Agent connection,
5. creates or reuses the issuer DID,
6. creates or reuses the Passport schema,
7. opens the registration modal if the wallet has no valid Passport Credential.

The Debug Trace panel shows connection IDs, issuer DID, schema GUIDs, and in-session Identus events.

---

## Demo Flow

1. Register as the Traveller.
   The app asks the Airline to issue a Passport Credential, stores it in the browser wallet, and requests a Passport proof to mark the wallet as logged in.

2. Buy a flight on the Purchase tab.
   The Airline issues a Ticket Credential for the selected flight, and the wallet stores it.

3. Inspect the Ticket tab.
   The tab shows the Ticket Credential claims stored in the wallet.

4. Request proof on the Airport Security tab.
   The Security Officer requests a Ticket proof. The wallet presents a matching Ticket Credential if it has one.

5. Accept or deny the presentation.
   The app records the Security Review locally for the current browser session.

The Dev Utils tab can reset the wallet, restart the agent, stop the wallet, issue sample credentials, and request Passport or Ticket proofs.

---

## Configuration

App-facing values live in `.env.local`.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_MEDIATOR_URL` | Mediator URL used by the Next route handler that fetches mediator health, version, DID, and OOB invitation. |
| `CLOUD_AGENT_URL` | Server-side Cloud Agent REST base URL used by Next API routes. |
| `NEXT_PUBLIC_CLOUD_AGENT_URL` | Browser-visible Cloud Agent URL kept in the env template. Current route handlers use `CLOUD_AGENT_URL`. |
| `CLOUD_AGENT_SCHEMA_BASE_URL` | Base URL embedded into schema URLs used for credential offers and proof requests. The Cloud Agent container must be able to resolve it. |
| `CLOUD_AGENT_API_KEY` | Optional Cloud Agent API key. The local script starts the Cloud Agent with API keys disabled. |
| `FLIGHTTIX_CLOUD_AGENT_LABEL` | Label used when creating or reusing the Cloud Agent connection. |
| `FLIGHTTIX_PASSPORT_SCHEMA_ID` | Stable JSON Schema `$id` for Passport credentials. |
| `FLIGHTTIX_TICKET_SCHEMA_ID` | Stable JSON Schema `$id` for Ticket credentials. |
| `FLIGHTTIX_WALLET_DB_NAME` | IndexedDB database name used by the Identus SDK Pluto store. |

Infra overrides are read from the shell environment by `scripts/identus-infra.sh`. Export them or pass them inline when starting services:

```bash
IDENTUS_CLOUD_AGENT_PORT=8010 \
CLOUD_AGENT_URL=http://localhost:8010/cloud-agent \
npm run infra:start
```

Useful infra overrides:

```bash
IDENTUS_CLOUD_AGENT_VERSION=2.0.0
IDENTUS_PRISM_NODE_VERSION=2.6.0
IDENTUS_MEDIATOR_VERSION=1.2.1
IDENTUS_CLOUD_AGENT_PORT=8000
IDENTUS_MEDIATOR_PORT=8080
IDENTUS_MEDIATOR_MONGO_PORT=27017
IDENTUS_MEDIATOR_PUBLIC_HOST=192.168.1.25
IDENTUS_MEDIATOR_SERVICE_ENDPOINTS="http://localhost:8080;ws://localhost:8080/ws"
CLOUD_AGENT_SCHEMA_BASE_URL=http://192.168.1.25:8000/cloud-agent
```

The mediator DID service endpoints and the Cloud Agent schema URL must be reachable from the components that dereference them. If `host.docker.internal` does not resolve in your Docker environment, use the host LAN IP for `CLOUD_AGENT_SCHEMA_BASE_URL` and `IDENTUS_MEDIATOR_PUBLIC_HOST`.

---

## Browser Wallet Storage

The browser wallet uses the Identus SDK Pluto store with IndexedDB. The app also keeps local session keys in `localStorage`, including:

- seed,
- Cloud Agent connection ID,
- issuer DID,
- Passport and Ticket schema GUIDs,
- credential thread IDs,
- pending proof kind,
- login marker.

Dev Utils -> Reset Wallet clears the app keys and asks the browser to delete the wallet IndexedDB database. Clearing site data removes the wallet. This demo does not implement seed export, recovery, hardened key storage, or cross-device sync.

---

## Troubleshooting

| Symptom | Check |
| --- | --- |
| App stays on startup or reports a Cloud Agent request failure | Run `npm run infra:health` and confirm `CLOUD_AGENT_URL` points at the running Cloud Agent. |
| Wallet cannot mediate or receive messages | Confirm the mediator is healthy and the DID service endpoints resolve from the browser environment. Set `IDENTUS_MEDIATOR_PUBLIC_HOST` when auto-detection chooses the wrong host. |
| Credential issuance or proof requests time out | Confirm `CLOUD_AGENT_SCHEMA_BASE_URL` resolves from inside the Cloud Agent container. Use the host LAN IP if `host.docker.internal` fails. |
| Ports are already in use | Override `IDENTUS_CLOUD_AGENT_PORT`, `IDENTUS_MEDIATOR_PORT`, or `IDENTUS_MEDIATOR_MONGO_PORT` before running `npm run infra:start`. |
| Ticket proof is not presented | Buy a ticket first, or use Dev Utils -> Issue Ticket before requesting proof. |
| Passport proof or login fails after changing schemas | Use Dev Utils -> Reset Wallet, then register again. |

---

## Sanity Checks

```bash
npm run lint
npm run build
```
