import { Email } from "@chuz/domain";
import { Data } from "@chuz/prelude";

// TODO: add more context to errors

export class OAuthProviderError extends Data.TaggedError("OAuthProviderError")<{ error: unknown }> {}

export class CredentialNotRecognised extends Data.TaggedError("CredentialNotRecognised") {}

export class CredentialAlreadyExists extends Data.TaggedError("CredentialAlreadyExists") {}

export class NoFallbackCredential extends Data.TaggedError("NoFallbackCredential") {}

export class StateDoesNotMatch extends Data.TaggedError("StateDoesNotMatch") {}

export class EmailAlreadyInUse extends Data.TaggedError("EmailAlreadyInUse")<{ email: Email }> {}

export class UserNotFound extends Data.TaggedError("UserNotFound") {}
