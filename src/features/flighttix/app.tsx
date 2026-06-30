"use client";

import {
  CheckCircle2,
  Hand,
  IdCard,
  LoaderCircle,
  Plane,
  Power,
  RotateCcw,
  Send,
  Ticket,
  UserCircle,
  Wrench,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  type Ticket as FlightTicket,
  type IdentusDebugLogEntry,
  identusStatusLabels,
  type Passport,
  type SecurityPresentationRecord,
  type SecurityReviewStatus,
} from "@/features/identus/types";
import type { Flight } from "@/lib/flighttix/domain";
import {
  type FlightTixController,
  type FlightTixTab,
  useFlightTixApp,
} from "./use-flighttix-app";

const tabs: Array<{
  id: FlightTixTab;
  label: string;
  icon: typeof Plane;
}> = [
  { id: "purchase", label: "Purchase", icon: Plane },
  { id: "ticket", label: "Ticket", icon: Ticket },
  { id: "security", label: "Airport Security", icon: Hand },
  { id: "dev", label: "Dev Utils", icon: Wrench },
];

export function FlightTixApp() {
  const app = useFlightTixApp();

  if (app.viewState === "loading") {
    return <LoadingScreen app={app} />;
  }

  return (
    <main className="flighttix-shell">
      <header className="flighttix-topbar">
        <div>
          <p className="flighttix-eyebrow">FlightTxt</p>
          <h1>FlightTix</h1>
        </div>
        <StatusPill app={app} />
      </header>

      <section className="flighttix-workspace">
        <nav className="flighttix-tabs" aria-label="FlightTix tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                aria-current={app.activeTab === tab.id ? "page" : undefined}
                className="flighttix-tab"
                key={tab.id}
                onClick={() => void app.selectTab(tab.id)}
                type="button"
              >
                <Icon aria-hidden size={20} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flighttix-panel">
          {app.activeTab === "purchase" && <PurchasePanel app={app} />}
          {app.activeTab === "ticket" && <TicketPanel ticket={app.ticket} />}
          {app.activeTab === "security" && <SecurityPanel app={app} />}
          {app.activeTab === "dev" && <DevPanel app={app} />}
        </div>
      </section>

      {(app.error || app.message) && (
        <div
          className={app.error ? "flighttix-alert error" : "flighttix-alert"}
        >
          {app.error ?? app.message}
        </div>
      )}

      <DebugPane app={app} />

      {app.activeModal === "register" && <RegisterModal app={app} />}
      {app.activeModal === "profile" && <ProfileModal app={app} />}
    </main>
  );
}

function LoadingScreen({ app }: { app: FlightTixController }) {
  return (
    <main className="flighttix-loading">
      <div className="flighttix-loading-center">
        <h1>FlightTxt</h1>
        <p>powered by</p>
        <Image
          alt="Hyperledger Identus"
          height={77}
          priority
          src="/identus-logo.svg"
          width={260}
        />
        <div className="flighttix-progress">
          <LoaderCircle aria-hidden className="flighttix-spin" size={22} />
          <span>{identusStatusLabels[app.snapshot.status]}</span>
        </div>
        {app.snapshot.error && (
          <div className="flighttix-alert error">{app.snapshot.error}</div>
        )}
        <button
          className="flighttix-button secondary"
          disabled={app.busyAction === "reset" || app.busyAction === "stop"}
          onClick={() => {
            void app.resetWallet().then(() => app.stopWallet());
          }}
          type="button"
        >
          <Power aria-hidden size={18} />
          <span>Tear Down and Stop</span>
        </button>
      </div>
      <DebugPane app={app} />
      <p className="flighttix-version">Identus SDK: v8.0.0</p>
    </main>
  );
}

function StatusPill({ app }: { app: FlightTixController }) {
  return (
    <div className="flighttix-status">
      <span>{identusStatusLabels[app.snapshot.status]}</span>
      {app.snapshot.connectionId && <small>{app.snapshot.connectionId}</small>}
    </div>
  );
}

function PurchasePanel({ app }: { app: FlightTixController }) {
  const selectedFlight = app.selectedFlight;

  return (
    <section className="flighttix-screen flighttix-purchase-screen">
      <button
        aria-label="Profile"
        className="flighttix-icon-button profile"
        onClick={() => void app.openProfile()}
        type="button"
      >
        <UserCircle aria-hidden size={34} />
      </button>

      <div className="flighttix-screen-header centered">
        <p className="flighttix-screen-kicker">Purchase</p>
        <h2>Flight selection</h2>
      </div>

      <form
        className="flighttix-purchase-form"
        onSubmit={(event) => {
          event.preventDefault();
          void app.purchaseTicket();
        }}
      >
        <div className="flighttix-control-card">
          <label className="flighttix-field">
            <span>Choose Flight</span>
            <select
              id="flight-selection"
              name="flight"
              onChange={(event) => app.selectFlight(event.target.value)}
              value={app.selectedFlightId ?? ""}
            >
              {app.flights.map((flight) => (
                <option key={flight.id} value={flight.id}>
                  {formatFlightOption(flight)}
                </option>
              ))}
            </select>
          </label>

          {selectedFlight ? (
            <FlightSummary flight={selectedFlight} />
          ) : (
            <div className="flighttix-empty-state compact">
              <Plane aria-hidden size={28} />
              <p>No flights are available.</p>
            </div>
          )}
        </div>

        <button
          className="flighttix-button primary flighttix-primary-action"
          disabled={!selectedFlight || app.busyAction === "purchase"}
          type="submit"
        >
          <Ticket aria-hidden size={18} />
          <span>Purchase Ticket</span>
        </button>
      </form>
    </section>
  );
}

function FlightSummary({ flight }: { flight: Flight }) {
  return (
    <section className="flighttix-flight-summary">
      <div className="flighttix-route">
        <div>
          <span>Departure</span>
          <strong>{flight.departure}</strong>
        </div>
        <Plane aria-hidden size={22} />
        <div>
          <span>Arrival</span>
          <strong>{flight.arrival}</strong>
        </div>
      </div>
      <dl>
        <div>
          <dt>Price</dt>
          <dd>{formatPrice(flight.price)}</dd>
        </div>
      </dl>
    </section>
  );
}

function TicketPanel({ ticket }: { ticket?: FlightTicket }) {
  return (
    <section className="flighttix-screen flighttix-ticket-screen">
      <div className="flighttix-screen-header centered">
        <p className="flighttix-screen-kicker">Ticket</p>
        <h2>Stored credential</h2>
      </div>

      {!ticket ? (
        <div className="flighttix-empty-state">
          <Ticket aria-hidden size={30} />
          <strong>No ticket credential</strong>
          <p>Purchase a flight to store one in this wallet.</p>
        </div>
      ) : (
        <section className="flighttix-ticket-card">
          <div className="flighttix-route large">
            <div>
              <span>Departure</span>
              <strong>{ticket.departure}</strong>
            </div>
            <Plane aria-hidden size={24} />
            <div>
              <span>Arrival</span>
              <strong>{ticket.arrival}</strong>
            </div>
          </div>

          <dl className="flighttix-details">
            <dt>Ticket Details</dt>
            <dd>
              <span>Price</span>
              <strong>{formatPrice(ticket.price)}</strong>
            </dd>
            <dd>
              <span>Credential</span>
              <strong>Stored in wallet</strong>
            </dd>
          </dl>
        </section>
      )}
    </section>
  );
}

function SecurityPanel({ app }: { app: FlightTixController }) {
  const currentPresentation =
    app.securityPresentations[app.securityPresentations.length - 1];

  return (
    <section className="flighttix-security">
      <div className="flighttix-security-toolbar">
        <button
          className="flighttix-button primary"
          disabled={app.busyAction === "securityProof"}
          onClick={() => void app.requestTicketProof()}
          type="button"
        >
          <Send aria-hidden size={18} />
          <span>Request Proof of Ticket</span>
        </button>
      </div>

      <SecurityPresentationDetails
        app={app}
        presentation={currentPresentation}
      />
      <SecurityPresentationHistory presentations={app.securityPresentations} />
    </section>
  );
}

function SecurityPresentationDetails({
  app,
  presentation,
}: {
  app: FlightTixController;
  presentation?: SecurityPresentationRecord;
}) {
  if (!presentation) {
    return (
      <section className="flighttix-security-card empty">
        <h2>Current Proof Request</h2>
        <p>No ticket proof has been requested in this session.</p>
      </section>
    );
  }

  const canReview =
    Boolean(presentation.proofSentAt) &&
    presentation.reviewStatus === "pending";

  return (
    <section className="flighttix-security-card">
      <div className="flighttix-section-heading">
        <div>
          <h2>Current Proof Request</h2>
          <p>{formatTimestamp(presentation.requestedAt)}</p>
        </div>
        <span className={`flighttix-review-badge ${presentation.reviewStatus}`}>
          {formatReviewStatus(presentation.reviewStatus)}
        </span>
      </div>

      <div className="flighttix-validity-grid">
        <ValidityPill label="Ticket Valid" valid={presentation.ticketValid} />
        <ValidityPill
          label="Passport Valid"
          valid={presentation.passportValid}
        />
      </div>

      <dl className="flighttix-proof-details">
        <div>
          <dt>Presentation ID</dt>
          <dd title={presentation.id}>{shortenIdentifier(presentation.id)}</dd>
        </div>
        <div>
          <dt>Thread ID</dt>
          <dd title={presentation.threadId ?? undefined}>
            {formatDebugValue(presentation.threadId)}
          </dd>
        </div>
        <div>
          <dt>Requested Schema</dt>
          <dd title={presentation.requestedSchemaGuid}>
            {shortenIdentifier(presentation.requestedSchemaGuid)}
          </dd>
        </div>
        <div>
          <dt>Protocol Status</dt>
          <dd>{presentation.protocolStatus}</dd>
        </div>
        <div>
          <dt>Requested</dt>
          <dd>{formatTimestamp(presentation.requestedAt)}</dd>
        </div>
        <div>
          <dt>Proof Sent</dt>
          <dd>{formatMaybeTimestamp(presentation.proofSentAt, "Not sent")}</dd>
        </div>
        <div>
          <dt>Review Recorded</dt>
          <dd>
            {formatMaybeTimestamp(presentation.reviewedAt, "Not recorded")}
          </dd>
        </div>
      </dl>

      <div className="flighttix-security-review-actions">
        <button
          className="flighttix-button primary"
          disabled={!canReview}
          onClick={() =>
            app.reviewSecurityPresentation(presentation.id, "accepted")
          }
          type="button"
        >
          <CheckCircle2 aria-hidden size={18} />
          <span>Accept</span>
        </button>
        <button
          className="flighttix-button secondary danger"
          disabled={!canReview}
          onClick={() =>
            app.reviewSecurityPresentation(presentation.id, "denied")
          }
          type="button"
        >
          <XCircle aria-hidden size={18} />
          <span>Deny</span>
        </button>
      </div>
    </section>
  );
}

function ValidityPill({ label, valid }: { label: string; valid: boolean }) {
  return (
    <div className={`flighttix-validity-pill ${valid ? "valid" : "invalid"}`}>
      {valid ? (
        <CheckCircle2 aria-hidden size={18} />
      ) : (
        <XCircle aria-hidden size={18} />
      )}
      <span>{label}</span>
    </div>
  );
}

function SecurityPresentationHistory({
  presentations,
}: {
  presentations: SecurityPresentationRecord[];
}) {
  return (
    <section className="flighttix-security-card">
      <div className="flighttix-section-heading">
        <div>
          <h2>Presentation History</h2>
          <p>{presentations.length} requests this session</p>
        </div>
      </div>

      {presentations.length === 0 ? (
        <p className="flighttix-history-empty">No previous presentations.</p>
      ) : (
        <div className="flighttix-history-list">
          {presentations.map((presentation) => (
            <div className="flighttix-history-row" key={presentation.id}>
              <time dateTime={presentation.requestedAt}>
                {formatTimestamp(presentation.requestedAt)}
              </time>
              <span>{presentation.protocolStatus}</span>
              <span>{formatReviewStatus(presentation.reviewStatus)}</span>
              <span>
                Ticket {presentation.ticketValid ? "Valid" : "Invalid"} /
                Passport {presentation.passportValid ? "Valid" : "Invalid"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DevPanel({ app }: { app: FlightTixController }) {
  return (
    <section className="flighttix-screen flighttix-dev-screen">
      <div className="flighttix-screen-header">
        <p className="flighttix-screen-kicker">Dev Utils</p>
        <h2>Wallet controls</h2>
      </div>

      <div className="flighttix-dev-grid">
        <section className="flighttix-dev-group">
          <h3>Session</h3>
          <div className="flighttix-dev-actions">
            <button
              className="flighttix-button secondary"
              disabled={app.busyAction === "reset"}
              onClick={() => void app.resetWallet()}
              type="button"
            >
              <RotateCcw aria-hidden size={18} />
              <span>Reset Wallet</span>
            </button>
            <button
              className="flighttix-button secondary"
              disabled={app.busyAction === "startup"}
              onClick={() => void app.startWallet()}
              type="button"
            >
              <Power aria-hidden size={18} />
              <span>Start Up and Connect</span>
            </button>
            <button
              className="flighttix-button secondary"
              disabled={app.busyAction === "stop"}
              onClick={() => void app.stopWallet()}
              type="button"
            >
              <Power aria-hidden size={18} />
              <span>Stop</span>
            </button>
          </div>
        </section>

        <section className="flighttix-dev-group">
          <h3>Credentials</h3>
          <div className="flighttix-dev-actions">
            <button
              className="flighttix-button secondary"
              disabled={app.busyAction === "issuePassport"}
              onClick={() => void app.issueSamplePassport()}
              type="button"
            >
              <IdCard aria-hidden size={18} />
              <span>Issue Passport</span>
            </button>
            <button
              className="flighttix-button secondary"
              disabled={app.busyAction === "issueTicket"}
              onClick={() => void app.issueSampleTicket()}
              type="button"
            >
              <Ticket aria-hidden size={18} />
              <span>Issue Ticket</span>
            </button>
          </div>
        </section>

        <section className="flighttix-dev-group">
          <h3>Proofs</h3>
          <div className="flighttix-dev-actions">
            <button
              className="flighttix-button secondary"
              disabled={app.busyAction === "passportProof"}
              onClick={() => void app.requestPassportProof()}
              type="button"
            >
              <Send aria-hidden size={18} />
              <span>Request Proof of Passport</span>
            </button>
            <button
              className="flighttix-button secondary"
              disabled={app.busyAction === "ticketProof"}
              onClick={() => void app.requestTicketProof()}
              type="button"
            >
              <Send aria-hidden size={18} />
              <span>Request Proof of Ticket</span>
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

function DebugPane({ app }: { app: FlightTixController }) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (log) {
      log.scrollTop = log.scrollHeight;
    }
  });

  const snapshot = app.snapshot;
  const identifiers = [
    {
      label: "Wallet",
      value: identusStatusLabels[snapshot.status],
    },
    { label: "Connection", value: snapshot.connectionId },
    { label: "Issuer DID", value: snapshot.issuerDID },
    { label: "Passport schema", value: snapshot.passportSchemaGuid },
    { label: "Ticket schema", value: snapshot.ticketSchemaGuid },
    { label: "Last event", value: snapshot.lastEvent },
  ];

  return (
    <section className="flighttix-debug-pane" aria-label="Identus debug trace">
      <div className="flighttix-debug-header">
        <div>
          <h2>Debug Trace</h2>
          <p>In-session Identus and app events</p>
        </div>
        <span
          className={`flighttix-debug-badge ${snapshot.debugEvent?.level ?? "info"}`}
        >
          {snapshot.debugEvent?.level ?? "info"}
        </span>
      </div>

      <dl className="flighttix-debug-identifiers">
        {identifiers.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd title={item.value ?? undefined}>
              {formatDebugValue(item.value)}
            </dd>
          </div>
        ))}
      </dl>

      <div
        aria-live="polite"
        aria-relevant="additions"
        className="flighttix-debug-log"
        ref={logRef}
        role="log"
      >
        {app.debugLog.length === 0 ? (
          <p className="flighttix-debug-empty">Waiting for app events...</p>
        ) : (
          app.debugLog.map((entry) => (
            <DebugLogRow entry={entry} key={entry.id} />
          ))
        )}
      </div>
    </section>
  );
}

function DebugLogRow({ entry }: { entry: IdentusDebugLogEntry }) {
  return (
    <div className={`flighttix-debug-entry ${entry.level}`}>
      <time dateTime={entry.timestamp}>{formatLogTime(entry.timestamp)}</time>
      <span>{entry.level}</span>
      <p>{entry.message}</p>
    </div>
  );
}

function RegisterModal({ app }: { app: FlightTixController }) {
  const [name, setName] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [dob, setDob] = useState("1976-03-23");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  return (
    <div className="flighttix-modal-backdrop">
      <section aria-modal className="flighttix-modal" role="dialog">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void app.registerPassport({ name, passportNumber, dob });
          }}
        >
          <fieldset>
            <legend>Passport Information</legend>
            <label className="flighttix-field">
              <span>Name</span>
              <input
                autoComplete="name"
                id="passport-name"
                name="name"
                onChange={(event) => setName(event.target.value)}
                ref={nameInputRef}
                value={name}
              />
            </label>
            <label className="flighttix-field">
              <span>Passport Number</span>
              <input
                autoComplete="off"
                id="passport-number"
                name="passportNumber"
                onChange={(event) => setPassportNumber(event.target.value)}
                value={passportNumber}
              />
            </label>
            <label className="flighttix-field">
              <span>Birthdate</span>
              <input
                autoComplete="off"
                id="passport-dob"
                name="dob"
                onChange={(event) => setDob(event.target.value)}
                type="date"
                value={dob}
              />
            </label>
          </fieldset>
          <div className="flighttix-modal-actions">
            <button
              className="flighttix-button primary"
              disabled={app.busyAction === "register"}
              type="submit"
            >
              <Send aria-hidden size={18} />
              <span>Submit</span>
            </button>
            <button
              className="flighttix-button secondary"
              onClick={app.closeModal}
              type="button"
            >
              <span>Close</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ProfileModal({ app }: { app: FlightTixController }) {
  return (
    <div className="flighttix-modal-backdrop">
      <section aria-modal className="flighttix-modal" role="dialog">
        {!app.passport ? (
          <p className="flighttix-loading-text">Loading Passport Details...</p>
        ) : (
          <PassportDetails passport={app.passport} />
        )}
        <div className="flighttix-modal-actions">
          <button
            className="flighttix-button secondary"
            onClick={app.closeModal}
            type="button"
          >
            <span>Close</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function PassportDetails({ passport }: { passport: Passport }) {
  return (
    <dl className="flighttix-details">
      <dt>Passport Details</dt>
      <dd>
        <span>Name</span>
        <strong>{passport.name}</strong>
      </dd>
      <dd>
        <span>Passport Number</span>
        <strong>{passport.passportNumber}</strong>
      </dd>
      <dd>
        <span>Birthdate</span>
        <strong>{formatDate(passport.dob)}</strong>
      </dd>
    </dl>
  );
}

function formatFlightOption(flight: Flight): string {
  return `${flight.departure} -> ${flight.arrival} - ${formatPrice(flight.price)}`;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(price);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function formatMaybeTimestamp(value: string | undefined, fallback: string) {
  return value ? formatTimestamp(value) : fallback;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function formatReviewStatus(status: SecurityReviewStatus): string {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "denied":
      return "Denied";
    case "not-presented":
      return "Not Presented";
    case "pending":
      return "Pending";
  }
}

function formatDebugValue(value?: string): string {
  return value ? shortenIdentifier(value) : "Not set";
}

function shortenIdentifier(value: string): string {
  if (value.length <= 34) {
    return value;
  }

  return `${value.slice(0, 18)}...${value.slice(-10)}`;
}

function formatLogTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}
