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

## Added since phase 1

### forms/

| Component | For |
|---|---|
| `AddressField` (`SingleAddressField`, `FullAddressField`) | Google place search with a plain-text fallback; typing after a pick clears the place id |
| `RichTextEditor` | Bold, italic, lists and links; the server cleans the HTML again |
| `OrganisationPicker` | Search published organisations of one type and pick one (hidden id field) |

### shared/

| Component | For |
|---|---|
| `InfiniteList` | Loads the next page when the end scrolls into view, with a "Load more" fallback; cursor kept in the address |
| `MapEmbed` | Address text, and the Google map only after the "maps" cookie category is accepted |
| `RelativeTime` | "3 hours ago" with the full UK date on hover |

### gates/

`LoginRequired`, `VerificationRequired`, `SubscriptionRequired`: the text and next step when a section is not available.

### players/, organisations/, offers/, applications/

`PlayerCard`, `PlayerDirectory`, `PlayerFilters`, `PlayerProfileView`, badges and the profile editor sections; `OrganisationCard`, `OrganisationDirectory`, `OrganisationFilters`, `OrganisationView` and the organisation editor; `OfferCard`, `OfferView`, `OfferForm`, `ApplyBox`, `ManagerOffers`; `ManagerApplications`, `PlayerApplications`.

### messaging/ and notifications/

| Component | For |
|---|---|
| `MessageThread` | Open conversation with optimistic sending, live updates and catch-up after a reconnect |
| `ConversationList` | Conversations with unread dots, refreshed live |
| `MessageBadge`, `NotificationBell` | Navbar icons with unread counts that update live |
| `NotificationList` | Full notification history |

### Hooks added

| Hook | For |
|---|---|
| `useRealtime` (and `RealtimeProvider`) | One shared WebSocket; events by type; "Reconnecting…" banner |
| `useSection` | Result and field errors of one editor form |
| `usePlaceSearch` | Mounts Google's place search the first time a field is used |

### billing/

| Component | For |
|---|---|
| `PricingTable` | Active plans with the buy button and the reason when buying is blocked |
| `SubscriptionPanel` | Plan, status, dates, invoices and the cancel, switch and portal actions |
| `RefreshWhile` | Refreshes the page until a condition is met (waiting for the Stripe webhook) |
