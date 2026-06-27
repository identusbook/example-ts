# FlightTix

FlightTix is a sample airline ticketing wallet where identity, ticket purchase, and airport security checks are modeled as verifiable credential flows.

## Language

**Traveller**:
The person using the app and holding credentials in their wallet.
_Avoid_: User, customer, passenger

**Airline**:
The issuer of Passport and Ticket credentials.
_Avoid_: Issuer app, backend user

**Security Officer**:
The verifier who requests proof that the Traveller holds a valid Ticket credential.
_Avoid_: Verifier user, guard

**Passport Credential**:
A verifiable credential containing the Traveller's passport information; possession of this credential is the app's login condition.
_Avoid_: Account, session, profile credential

**Ticket Credential**:
A verifiable credential representing the Traveller's selected flight.
_Avoid_: Booking, order, receipt

**Flight**:
A purchasable route option with a departure airport, arrival airport, and price.
_Avoid_: Offer, product

**Wallet**:
The Traveller's holder-side credential store and DIDComm agent state.
_Avoid_: Account database, cache

**Cloud Agent**:
The server-side Identus agent that creates connections, manages issuer DIDs and schemas, issues credentials, and requests presentations.
_Avoid_: API server, backend

**Mediator**:
The DIDComm relay that stores and forwards messages for the Traveller's wallet.
_Avoid_: Message broker, queue
