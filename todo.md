## Todo

- [x] Add config
- [x] Add password hasher
- [x] Add google oauth
- [x] Add cookies
- [x] Add oauth state check
- [x] Add oauth to register page
- [x] Add response type
- [x] Add password reset
- [x] Add returnTo logic for auth
- [] Add OAuth cancelled message
- [] Add Apple login
- [] Add 2fa login
- [] Add social auth linking
- [] Add metrics for errors and other things?

// TODO: handle when the user cancels:
// ?\_tag=google&error=access_denied&state=register%2Bd7c2f4f3-e91b-4376-b4e0-ec236688fd5a

## Features

- Users
- Auth
- Social login providers
- Subscriptions
- Update notifications
- Feedback widget
- User management
- Dark mode
- Home page

# Add credential

- user can set email/pass if they already have a social credential
- user can unset email/psss if they already have a social credential
- user can link a social account
- user can unlink a social account if they have at least one other credential

```ts
type UserCredential = Data.TaggedEnum<{
  Social: { Social: NonEmptyArray<Social> };
  EmailPassword: { Email: Email; Social: Array<Social> };
}>;

type FindCredentials = (id: User.Id) => IO<UserCredentials>;

type SetEmailPasswordCredential = (
  id: User.Id,
  credential: Credential.EmailPassword,
) => IO<void, EmailPassword.AlreadySet>;

type UnsetEmailPasswordCredential = (id: User.Id) => IO<void, EmailPassword.NotSet | Credential.NoFallbackSet>;

type LinkCredential = (token: User.Token, credential: Credential.Social) => IO<Credential.Id, Credential.AlreadyInUse>;

type UnlinkCredential = (
  token: User.Token,
  id: Credential.Id,
) => IO<Credential.Id, Credential.NotFound | Credential.NoFallbackSet>;

// Primary email used for notifications and contact
type SetPrimaryEmail = (credentialId: Credential.Id) => IO<User.Identified, Credential.NotFound>;

type UpdateEmail = (id: User.Id, email: Email) => IO<User.Identified, User.NotFound | EmailAlreadyInUse>;
```
