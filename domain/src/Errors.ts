import { Data } from "effect";

export class UnauthenticatedError extends Data.TaggedError("UnauthenticatedError") {}

export class UnauthorisedError extends Data.TaggedError("UnauthorisedError") {}
