"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getFlights } from "@/features/identus/api";
import { BrowserFlightTixWallet } from "@/features/identus/edge-agent";
import type {
  FlightTixWallet,
  IdentusSnapshot,
  Passport,
  RegistrationInput,
  Ticket,
} from "@/features/identus/types";
import type { Flight } from "@/lib/flighttix/domain";

export type FlightTixTab = "purchase" | "ticket" | "security" | "dev";
export type FlightTixModal = "register" | "profile";
export type FlightTixViewState = "loading" | "tabs";

type BusyAction =
  | "startup"
  | "register"
  | "purchase"
  | "securityProof"
  | "reset"
  | "stop"
  | "issuePassport"
  | "issueTicket"
  | "passportProof"
  | "ticketProof";

export interface RegisterFormInput {
  name: string;
  passportNumber: string;
  dob: string;
}

export interface FlightTixController {
  activeModal?: FlightTixModal;
  activeTab: FlightTixTab;
  busyAction?: BusyAction;
  error?: string;
  flights: Flight[];
  message?: string;
  passport?: Passport;
  selectedFlight?: Flight;
  selectedFlightId?: string;
  snapshot: IdentusSnapshot;
  ticket?: Ticket;
  viewState: FlightTixViewState;
  closeModal: () => void;
  issueSamplePassport: () => Promise<void>;
  issueSampleTicket: () => Promise<void>;
  openProfile: () => Promise<void>;
  purchaseTicket: () => Promise<void>;
  registerPassport: (input: RegisterFormInput) => Promise<void>;
  requestPassportProof: () => Promise<void>;
  requestTicketProof: () => Promise<void>;
  resetWallet: () => Promise<void>;
  selectFlight: (flightId: string) => void;
  selectTab: (tab: FlightTixTab) => Promise<void>;
  startWallet: () => Promise<void>;
  stopWallet: () => Promise<void>;
}

const samplePassport: RegistrationInput = {
  name: "Jon Bauer",
  passportNumber: "12345",
  dob: "1976-03-23T00:00:00.000Z",
};

const sampleTicket: Flight = {
  id: "sfo-tyo-dev",
  departure: "SFO",
  arrival: "TYO",
  price: 700,
};

export function useFlightTixApp(): FlightTixController {
  const walletRef = useRef<FlightTixWallet | undefined>(undefined);
  const [activeModal, setActiveModal] = useState<FlightTixModal>();
  const [activeTab, setActiveTab] = useState<FlightTixTab>("purchase");
  const [busyAction, setBusyAction] = useState<BusyAction>();
  const [error, setError] = useState<string>();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [message, setMessage] = useState<string>();
  const [passport, setPassport] = useState<Passport>();
  const [selectedFlightId, setSelectedFlightId] = useState<string>();
  const [snapshot, setSnapshot] = useState<IdentusSnapshot>({
    status: "disconnected",
  });
  const [ticket, setTicket] = useState<Ticket>();
  const [viewState, setViewState] = useState<FlightTixViewState>("loading");

  const selectedFlight = useMemo(
    () =>
      flights.find((flight) => flight.id === selectedFlightId) ?? flights[0],
    [flights, selectedFlightId],
  );

  const wallet = useCallback((): FlightTixWallet => {
    if (!walletRef.current) {
      walletRef.current = new BrowserFlightTixWallet(setSnapshot);
    }

    return walletRef.current;
  }, []);

  const refreshWalletData = useCallback(async () => {
    const currentWallet = wallet();
    const [nextPassport, nextTicket] = await Promise.all([
      currentWallet.readPassport(),
      currentWallet.readTicket(),
    ]);
    setPassport(nextPassport);
    setTicket(nextTicket);
    return { passport: nextPassport, ticket: nextTicket };
  }, [wallet]);

  const showRegisterIfNeeded = useCallback(async () => {
    const loggedIn = await wallet().isLoggedIn();
    if (!loggedIn) {
      setActiveModal("register");
    }
    return loggedIn;
  }, [wallet]);

  const runAction = useCallback(
    async (action: BusyAction, task: () => Promise<void>) => {
      setBusyAction(action);
      setError(undefined);
      setMessage(undefined);

      try {
        await task();
      } catch (caught) {
        const nextError =
          caught instanceof Error ? caught.message : "FlightTix action failed";
        setError(nextError);
      } finally {
        setBusyAction(undefined);
      }
    },
    [],
  );

  const startWallet = useCallback(async () => {
    await runAction("startup", async () => {
      setViewState("loading");
      const currentWallet = wallet();
      await currentWallet.stop().catch(() => undefined);

      const [catalog] = await Promise.all([
        getFlights(),
        currentWallet.start(),
      ]);
      setFlights(catalog);
      setSelectedFlightId((current) => current ?? catalog[0]?.id);
      await delay(2000);
      await refreshWalletData();
      setViewState("tabs");
      await showRegisterIfNeeded();
    });
  }, [refreshWalletData, runAction, showRegisterIfNeeded, wallet]);

  useEffect(() => {
    let mounted = true;

    startWallet().finally(() => {
      if (!mounted) {
        walletRef.current?.stop().catch(() => undefined);
      }
    });

    return () => {
      mounted = false;
      walletRef.current?.stop().catch(() => undefined);
    };
  }, [startWallet]);

  const selectTab = useCallback(
    async (tab: FlightTixTab) => {
      setActiveTab(tab);
      await refreshWalletData();
      await showRegisterIfNeeded();
    },
    [refreshWalletData, showRegisterIfNeeded],
  );

  const openProfile = useCallback(async () => {
    setActiveModal("profile");
    await refreshWalletData();
  }, [refreshWalletData]);

  const closeModal = useCallback(() => {
    setActiveModal(undefined);
  }, []);

  const registerPassport = useCallback(
    async (input: RegisterFormInput) => {
      const trimmedName = input.name.trim();
      const trimmedPassportNumber = input.passportNumber.trim();

      if (trimmedName.length <= 1 || trimmedPassportNumber.length <= 1) {
        setError("Name and Passport Number must be longer than 1 character.");
        return;
      }

      await runAction("register", async () => {
        const currentWallet = wallet();
        await currentWallet.issuePassport({
          name: trimmedName,
          passportNumber: trimmedPassportNumber,
          dob: dateInputToIso(input.dob),
        });

        const issuedPassport = await waitForCredential(() =>
          currentWallet.readPassport(),
        );
        setPassport(issuedPassport);
        await currentWallet.requestProof("passport");
        await waitForWalletEvent(currentWallet, "Presentation sent");
        await waitForLogin(currentWallet);
        setActiveModal(undefined);
        setMessage("Passport credential stored");
      });
    },
    [runAction, wallet],
  );

  const purchaseTicket = useCallback(async () => {
    if (!selectedFlight) {
      setError("No flight selected.");
      return;
    }

    await runAction("purchase", async () => {
      const currentWallet = wallet();
      await currentWallet.issueTicket(selectedFlight);
      const issuedTicket = await waitForCredential(() =>
        currentWallet.readTicket(),
      );
      setTicket(issuedTicket);
      setMessage("Ticket credential stored");
    });
  }, [runAction, selectedFlight, wallet]);

  const requestTicketProof = useCallback(async () => {
    await runAction("securityProof", async () => {
      const currentWallet = wallet();
      await currentWallet.requestProof("ticket");
      await waitForWalletEvent(currentWallet, "Presentation sent");
      setMessage("Ticket proof presented");
    });
  }, [runAction, wallet]);

  const requestPassportProof = useCallback(async () => {
    await runAction("passportProof", async () => {
      const currentWallet = wallet();
      await currentWallet.requestProof("passport");
      await waitForWalletEvent(currentWallet, "Presentation sent");
      setMessage("Passport proof presented");
    });
  }, [runAction, wallet]);

  const resetWallet = useCallback(async () => {
    await runAction("reset", async () => {
      await wallet().reset();
      setPassport(undefined);
      setTicket(undefined);
      setActiveModal("register");
      setMessage("Wallet reset");
    });
  }, [runAction, wallet]);

  const stopWallet = useCallback(async () => {
    await runAction("stop", async () => {
      await wallet().stop();
      setMessage("Wallet stopped");
    });
  }, [runAction, wallet]);

  const issueSamplePassport = useCallback(async () => {
    await runAction("issuePassport", async () => {
      const currentWallet = wallet();
      await currentWallet.issuePassport(samplePassport);
      const issuedPassport = await waitForCredential(() =>
        currentWallet.readPassport(),
      );
      setPassport(issuedPassport);
      await currentWallet.requestProof("passport");
      await waitForWalletEvent(currentWallet, "Presentation sent");
      setMessage("Sample passport credential stored");
    });
  }, [runAction, wallet]);

  const issueSampleTicket = useCallback(async () => {
    await runAction("issueTicket", async () => {
      const currentWallet = wallet();
      await currentWallet.issueTicket(sampleTicket);
      const issuedTicket = await waitForCredential(() =>
        currentWallet.readTicket(),
      );
      setTicket(issuedTicket);
      await currentWallet.requestProof("ticket");
      await waitForWalletEvent(currentWallet, "Presentation sent");
      setMessage("Sample ticket credential stored");
    });
  }, [runAction, wallet]);

  return {
    activeModal,
    activeTab,
    busyAction,
    error,
    flights,
    message: message ?? snapshot.lastEvent,
    passport,
    selectedFlight,
    selectedFlightId,
    snapshot,
    ticket,
    viewState,
    closeModal,
    issueSamplePassport,
    issueSampleTicket,
    openProfile,
    purchaseTicket,
    registerPassport,
    requestPassportProof,
    requestTicketProof,
    resetWallet,
    selectFlight: setSelectedFlightId,
    selectTab,
    startWallet,
    stopWallet,
  };
}

async function waitForCredential<T>(
  readCredential: () => Promise<T | undefined>,
): Promise<T> {
  const credential = await poll(readCredential, 45_000, 2_500);
  if (!credential) {
    throw new Error("Credential was not stored before the timeout.");
  }

  return credential;
}

async function waitForLogin(wallet: FlightTixWallet): Promise<void> {
  const loggedIn = await poll(() => wallet.isLoggedIn(), 20_000, 2_000);
  if (!loggedIn) {
    throw new Error("Passport credential did not satisfy login.");
  }
}

async function waitForWalletEvent(
  wallet: FlightTixWallet,
  expectedEvent: string,
): Promise<void> {
  const completed = await poll(
    () => {
      const lastEvent = wallet.getSnapshot().lastEvent;
      if (lastEvent === expectedEvent) {
        return true;
      }

      if (lastEvent?.startsWith("No matching credential")) {
        throw new Error(lastEvent);
      }

      return undefined;
    },
    20_000,
    1_000,
  );

  if (!completed) {
    throw new Error(`Wallet did not report "${expectedEvent}" before timeout.`);
  }
}

async function poll<T>(
  action: () => T | undefined | false | Promise<T | undefined | false>,
  timeoutMs: number,
  intervalMs: number,
): Promise<T | undefined> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await action();
    if (result) {
      return result;
    }

    await delay(intervalMs);
  }

  return undefined;
}

function dateInputToIso(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
