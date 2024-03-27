## Todo

- [x] Add config
- [x] Add password hasher
- [x] Add google oauth
- [x] Add cookies
- [x] Add oauth state check
- [x] Add Add Response union
- [] Add oauth to register page
- [] Add returnTo logic for auth
- [] Add Apple login
- [] Add 2fa login

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
