import {
  IssueCredential,
  OfferCredential,
} from "@hyperledger/identus-sdk/plugins/didcomm";
import { RequestPresentation } from "@hyperledger/identus-sdk/plugins/oea";
import type { DidcommMessage } from "./sdk-types";

type FlightTixProtocolMessage =
  | { kind: "offer"; message: OfferCredential; thid?: string }
  | { kind: "issue"; message: IssueCredential }
  | { kind: "presentationRequest"; message: RequestPresentation }
  | { kind: "ignored" };

export function decodeFlightTixProtocolMessage(
  message: DidcommMessage,
): FlightTixProtocolMessage {
  if (message.piuri === OfferCredential.type) {
    return {
      kind: "offer",
      message: OfferCredential.fromMessage(message),
      thid: message.thid,
    };
  }

  if (message.piuri === IssueCredential.type) {
    return {
      kind: "issue",
      message: IssueCredential.fromMessage(message),
    };
  }

  if (message.piuri === RequestPresentation.type) {
    return {
      kind: "presentationRequest",
      message: RequestPresentation.fromMessage(message),
    };
  }

  return { kind: "ignored" };
}
