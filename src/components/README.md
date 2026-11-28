# Component catalogue

Look here before writing a component. Add or change a line in the same commit as the component.
The development page `/dev/components` shows the primitives (it returns 404 in production).

## ui/ (primitives, no business knowledge)

| Component | For | Main props |
|---|---|---|
| `Button`, `LinkButton`, `buttonClasses` | Actions and links that look like buttons | `variant` primary, secondary, ghost, danger; `size` md, sm |
| `TextField` | Labelled text input or textarea with hint and errors | `label`, `hint`, `errors`, `multiline` |
| `Select` | Labelled native select, single or multiple | `options`, `multiple`, `placeholder`, `errors` |
| `Checkbox` | Labelled checkbox | children as label |
| `Badge` | Small status label | `variant` neutral, accent, success, warning, error |
| `Card` | Bordered block | `as` |
| `Alert` | Message block | `variant` info, success, warning, error |
| `EmptyState` | Nothing to show | `title`, `action` |
| `Spinner` | Loading indicator | `label` |
| `Icon` | lucide icon with token sizes | `icon`, `size` |
| `PlaceholderImage` | Missing image | |

## forms/

| Component | For |
|---|---|
| `SubmitButton` | Submit with pending state |
| `FormMessage` | Result message of a Server Action (`FormState`) |
| `PasswordField` | Password with optional rules checklist |
| `Honeypot` | Hidden bot trap field |
| `UploadField` | Direct upload with processing wait; puts the file id in a hidden field |

## layout/

| Component | For |
|---|---|
| `Container` | Page width (`content`, `narrow`, `form`) |
| `Navbar`, `Footer` | Site header and footer |
| `PageHeader` | Title block |
| `AuthPage` | Narrow centred page for sign-in style forms |
| `CookieConsentBanner`, `CookieSettingsLink` | Cookie banner and reopen link |

## shared/

| Component | For |
|---|---|
| `UserAvatar` | Profile picture through `/media` with placeholder |
| `OrganisationLogo` | Logo through `/media` with placeholder |

## auth/ (module)

`LoginForm`, `RegisterForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `ResendVerification`.

## Hooks (`src/hooks/`)

| Hook | For |
|---|---|
| `useRecaptcha` | reCAPTCHA v3 token (empty without a site key) |
| `useCaptchaAction` | `useActionState` that adds the token before the action runs |
| `useUpload` | Upload steps and progress |
