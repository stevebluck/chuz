## Todo

- [x] Add config
- [x] Add password hasher
- [x] Add google oauth
- [x] Add cookies
- [x] Add oauth state check
- [x] Add Add Response union
- [x] Add oauth to register page
- [] Add OAuth cancelled message
- [] Add returnTo logic for auth
- [] Add Apple login
- [] Add 2fa login
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
type UserCredentialItems = Data.TaggedEnum<{
  Social: { Social: NonEmptyArray<Social> };
  EmailPassword: { Email: Email; Social: Array<Social> };
}>;

type GetCredentialItems = (id: User.Id) => IO<UserCredentials>;

type SetEmailPasswordCredential = (
  id: User.Id,
  credential: Credential.EmailPassword,
) => IO<void, EmailPassword.AlreadySet>;

type UnsetEmailPasswordCredential = (id: User.Id) => IO<void, EmailPassword.NotSet | Credential.NoFallbackSet>;

type LinkSocialCredential = (
  token: User.Token,
  credential: Credential.Social,
) => IO<Credential.Id, Credential.AlreadyInUse>;

type UnlinkSocialCredential = (
  token: User.Token,
  id: Credential.Id,
) => IO<Credential.Id, Credential.NotFound | Credential.NoFallbackSet>;

// Primary email used for notifications and contact
type SetPrimaryEmail = (credentialId: Credential.Id) => IO<User.Identified, Credential.NotFound>;

type UpdateEmail = (id: User.Id, email: Email) => IO<User.Identified, User.NotFound | EmailAlreadyInUse>;
```
