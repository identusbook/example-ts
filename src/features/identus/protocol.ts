import type { DidcommMessage } from "./sdk-types";

type OfferCredential =
  import("@hyperledger/identus-sdk/plugins/didcomm").OfferCredential;
type IssueCredential =
  import("@hyperledger/identus-sdk/plugins/didcomm").IssueCredential;
type RequestPresentation =
  import("@hyperledger/identus-sdk/plugins/oea").RequestPresentation;

type FlightTixProtocolMessage =
  | { kind: "offer"; message: OfferCredential; thid?: string }
  | { kind: "issue"; message: IssueCredential; thid?: string }
  | { kind: "presentationRequest"; message: RequestPresentation }
  | { kind: "ignored" };

export async function decodeFlightTixProtocolMessage(
  message: DidcommMessage,
): Promise<FlightTixProtocolMessage> {
  const [{ IssueCredential, OfferCredential }, { RequestPresentation }] =
    await Promise.all([
      import("@hyperledger/identus-sdk/plugins/didcomm"),
      import("@hyperledger/identus-sdk/plugins/oea"),
    ]);

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
      thid: message.thid,
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
