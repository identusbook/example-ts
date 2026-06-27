"use client";

import {
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
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  type Ticket as FlightTicket,
  identusStatusLabels,
  type Passport,
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
  return (
    <section className="flighttix-view">
      <button
        aria-label="Profile"
        className="flighttix-icon-button profile"
        onClick={() => void app.openProfile()}
        type="button"
      >
        <UserCircle aria-hidden size={34} />
      </button>

      <label className="flighttix-field">
        <span>Choose Flight:</span>
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

      <button
        className="flighttix-button primary"
        disabled={!app.selectedFlight || app.busyAction === "purchase"}
        onClick={() => void app.purchaseTicket()}
        type="button"
      >
        <Ticket aria-hidden size={18} />
        <span>Purchase Ticket</span>
      </button>
    </section>
  );
}

function TicketPanel({ ticket }: { ticket?: FlightTicket }) {
  return (
    <section className="flighttix-view compact">
      {!ticket ? (
        <p className="flighttix-loading-text">Loading Ticket Details...</p>
      ) : (
        <dl className="flighttix-details">
          <dt>Your Ticket Details:</dt>
          <dd>Departure: {ticket.departure}</dd>
          <dd>Arrival: {ticket.arrival}</dd>
          <dd>Price: {formatPrice(ticket.price)}</dd>
        </dl>
      )}
    </section>
  );
}

function SecurityPanel({ app }: { app: FlightTixController }) {
  return (
    <section className="flighttix-view compact">
      <button
        className="flighttix-button primary"
        disabled={app.busyAction === "securityProof"}
        onClick={() => void app.requestTicketProof()}
        type="button"
      >
        <Send aria-hidden size={18} />
        <span>Request Proof of Ticket</span>
      </button>
    </section>
  );
}

function DevPanel({ app }: { app: FlightTixController }) {
  return (
    <section className="flighttix-dev">
      <button
        className="flighttix-button secondary"
        disabled={app.busyAction === "reset"}
        onClick={() => void app.resetWallet()}
        type="button"
      >
        <RotateCcw aria-hidden size={18} />
        <span>Reset Wallet</span>
      </button>

      <div className="flighttix-button-row">
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
      <div className="flighttix-button-row">
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
      <dd>Name: {passport.name}</dd>
      <dd>Passport Number: {passport.passportNumber}</dd>
      <dd>Birthdate: {formatDate(passport.dob)}</dd>
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
