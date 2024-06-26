import { Email } from "@chuz/domain";
import { Data } from "@chuz/prelude";

// TODO: add more context to errors

export class CredentialNotRecognised extends Data.TaggedError("CredentialNotRecognised") {}

export class EmailAlreadyInUse extends Data.TaggedError("EmailAlreadyInUse")<{ email: Email }> {}

export class CredentialAlreadyInUse extends Data.TaggedError("CredentialAlreadyInUse") {}

export class NoFallbackCredential extends Data.TaggedError("NoFallbackCredential") {}

export class UserNotFound extends Data.TaggedError("UserNotFound") {}
