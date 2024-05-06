import { Email } from "@chuz/domain";
import { Data, S } from "@chuz/prelude";

// TODO: add more context to errors

export class CredentialNotRecognised extends S.TaggedError<CredentialNotRecognised>()("CredentialNotRecognised", {}) {}

export class EmailAlreadyInUse extends Data.TaggedError("EmailAlreadyInUse")<{ email: Email }> {}

export class CredentialAlreadyInUse extends S.TaggedError<CredentialAlreadyInUse>()("CredentialAlreadyInUse", {}) {}

export class CredentialTooWeak extends Data.TaggedError("CredentialTooWeak") {}

export class NoFallbackCredential extends Data.TaggedError("NoFallbackCredential") {}

export class UserNotFound extends Data.TaggedError("UserNotFound") {}
