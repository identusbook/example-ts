import type {
  Agent,
  Apollo,
  MessageEventArg,
  Pluto,
} from "@hyperledger/identus-sdk";

export type IdentusSdk = typeof import("@hyperledger/identus-sdk");
export type IdentusAgent = Agent;
export type IdentusApollo = Apollo;
export type IdentusPluto = Pluto;
export type DidcommMessage = MessageEventArg[number];
export type DidcommMessageBatch = MessageEventArg;
export type VerifiableCredential = Awaited<
  ReturnType<IdentusAgent["verifiableCredentials"]>
>[number];
