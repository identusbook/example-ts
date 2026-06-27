# FlightTix Identus TypeScript Example

FlightTix is a Next app port of the Identus iOS companion example. It demonstrates a Traveller wallet receiving a Passport credential, purchasing a flight as a Ticket credential, and presenting that ticket to airport security.

## Local App

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Local Identus Infra

The repo keeps local infrastructure lightweight. Scripts clone the official Hyperledger Identus Cloud Agent and Mediator repositories into `.identus/`, which is ignored by Git, then run their official Docker workflows.

```bash
cp .env.example .env.local
npm run infra:bootstrap
npm run infra:start
npm run infra:health
```

Defaults:

- Mediator: `http://localhost:8080`
- Cloud Agent: `http://localhost:8000/cloud-agent`
- Cloud Agent image tag: `2.0.0`
- PRISM Node image tag: `2.6.0`
- Mediator image tag: `1.2.1`

Useful overrides:

```bash
IDENTUS_CLOUD_AGENT_VERSION=2.0.0
IDENTUS_PRISM_NODE_VERSION=2.6.0
IDENTUS_MEDIATOR_VERSION=1.2.1
IDENTUS_CLOUD_AGENT_PORT=8000
IDENTUS_MEDIATOR_PORT=8080
IDENTUS_MEDIATOR_MONGO_PORT=27017
IDENTUS_MEDIATOR_SERVICE_ENDPOINTS="http://localhost:8080;ws://localhost:8080/ws"
```

The example defaults to a single Cloud Agent. The Cloud Agent schema URL must be reachable from inside the Cloud Agent container; `.env.example` uses `http://host.docker.internal:8000/cloud-agent` for that purpose.

Stop local services:

```bash
npm run infra:stop
```

## Sanity Checks

```bash
npm run lint
npm run build
```
