# Requirements Document

## Introduction

The Rugby Agency Platform is a web application that connects rugby players with clubs, universities, unions, and brands. It provides a searchable database of player and organisation profiles, enables private messaging between parties, allows players to manage their career information, and allows organisations to post job offers and opportunities that players can apply to. The platform serves as a centralised hub for the rugby ecosystem, facilitating professional connections and career development.

## Glossary

- **Player**: A registered rugby player who maintains a profile on the platform
- **Club**: A rugby club organisation that can post job offers and interact with players
- **University**: A university sports programme with similar functionality to a Club
- **Union**: A rugby union body with similar functionality to a Club
- **Brand**: A commercial brand or sponsor with similar functionality to a Club
- **Organisation**: A collective term for Clubs, Universities, Unions, and Brands
- **Profile**: A public-facing page containing information about a Player or Organisation
- **Job Offer**: A position or opportunity posted by an Organisation that Players can apply to
- **Application**: A Player's submission of interest in a Job Offer
- **Conversation**: A private messaging thread between two parties (Player–Organisation or Player–Player); an active Conversation is one containing at least one Message
- **Message**: A single text communication sent within a Conversation, with a maximum length of 2000 characters
- **Platform**: The Rugby Agency Platform web application
- **System**: The Rugby Agency Platform web application

---

## Requirements

### Requirement 1: Player Profile Management

**User Story:** As a player, I want to create and manage my profile, so that clubs and organisations can discover me and assess my suitability for opportunities.

#### Acceptance Criteria

1. WHEN a player registers on the Platform, THE System SHALL create a player profile with a unique identifier, display name, and registration date
2. WHEN a player submits profile updates, THE System SHALL save the updated information and display it on the player's public profile within 5 seconds
3. THE System SHALL allow a player to add and edit the following career information on their profile: current club, position(s), nationality, date of birth, height, weight, career history, achievements, and a personal biography (maximum 2000 characters)
4. WHEN a player uploads a profile photo, THE System SHALL accept image files in JPEG or PNG format up to 5 MB in size and display the photo on the player's profile
5. IF a player uploads a profile photo in an unsupported format or exceeding 5 MB, THEN THE System SHALL reject the upload and return an error message specifying the accepted formats and size limit
6. WHEN a player sets their profile visibility to private, THE System SHALL restrict profile access to only parties with whom the player has an active Conversation
7. WHEN a player submits a profile update, THE System SHALL validate all required fields (display name and date of birth) first, and IF any required field is empty, THEN THE System SHALL reject the update and return a descriptive validation error identifying the missing field

---

### Requirement 2: Organisation Profile Management

**User Story:** As an organisation (club, university, union, or brand), I want to create and manage our profile, so that players can learn about us and consider opportunities we offer.

#### Acceptance Criteria

1. WHEN an organisation registers on the Platform, THE System SHALL create an organisation profile with a unique identifier, organisation name, organisation type (Club, University, Union, or Brand), and registration date
2. WHEN an organisation submits profile updates, THE System SHALL save the updated information and display it on the organisation's public profile within 5 seconds
3. THE System SHALL allow an organisation to add and edit the following information on their profile: location, founded year (between 1800 and the current year), league or division (where applicable), description of how the organisation operates (maximum 2000 characters), contact email address, contact phone number, and a logo image
4. WHEN an organisation uploads a logo, THE System SHALL accept image files in JPEG or PNG format up to 5 MB in size and display the logo on the organisation's profile
5. IF an organisation uploads a logo in an unsupported format or exceeding 5 MB, THEN THE System SHALL reject the upload and return an error message specifying the accepted formats and size limit
6. WHEN an organisation submits a profile update, THE System SHALL validate all required fields (organisation name and organisation type) first, and IF any required field is empty, THEN THE System SHALL reject the update and return a descriptive validation error identifying the missing field

---

### Requirement 3: Player Directory

**User Story:** As an organisation, I want to browse and search a database of player profiles, so that I can identify players who match our requirements.

#### Acceptance Criteria

1. THE System SHALL provide a searchable player directory that displays all players whose profiles are set to public visibility, and WHEN no filters are applied, THE System SHALL return all public player profiles paginated at 50 results per page
2. WHEN a user submits a search query on the player directory, THE System SHALL perform a case-insensitive partial match against player name and biography and return all matching public player profiles within 3 seconds
3. THE System SHALL allow filtering of the player directory by the following criteria: position, nationality, age range, and current club
4. WHEN a user applies filters to the player directory, THE System SHALL return only player profiles that satisfy all selected filter criteria
5. WHEN the player directory returns results, THE System SHALL display each result with at minimum the player's name, position, nationality, and profile photo
6. WHEN a player has no profile photo, THE System SHALL display a default placeholder image in place of the profile photo
7. WHEN a search or filter returns no results, THE System SHALL display a message informing the user that no players match the search criteria

---

### Requirement 4: Organisation Directory

**User Story:** As a player, I want to browse and search a database of organisation profiles, so that I can discover clubs, universities, unions, and brands that interest me.

#### Acceptance Criteria

1. THE System SHALL provide a searchable organisation directory that displays all registered organisations paginated at 50 results per page
2. WHEN a user submits a search query on the organisation directory, THE System SHALL perform a case-insensitive partial match against organisation name and description and return all matching organisation profiles within 3 seconds
3. THE System SHALL allow filtering of the organisation directory by organisation type (Club, University, Union, Brand) and by location
4. WHEN a user applies filters to the organisation directory, THE System SHALL return only organisation profiles that satisfy all selected filter criteria
5. WHEN the organisation directory returns results, THE System SHALL display each result with at minimum the organisation's name, type, location, and logo
6. WHEN an organisation has no logo, THE System SHALL display a default placeholder image in place of the logo
7. WHEN a search or filter returns no results, THE System SHALL display a message informing the user that no organisations match the search criteria

---

### Requirement 5: Job Offers

**User Story:** As an organisation, I want to post job offers and opportunities, so that players can discover and apply to positions that match their goals.

#### Acceptance Criteria

1. WHEN an organisation submits a new job offer, THE System SHALL create the job offer with a unique identifier, title, description, requirements, location, position type (full-time, part-time, or trial), and posting date, and associate it with the posting organisation
2. WHEN an organisation publishes a job offer, THE System SHALL display the job offer on the organisation's profile and in the platform-wide job offer listing within 5 seconds
3. WHEN an organisation updates a job offer, THE System SHALL save the changes and display the updated information within 5 seconds
4. WHEN an organisation closes a job offer, THE System SHALL mark it as closed and remove it from active listings while retaining it in the organisation's historical records
5. WHEN an organisation submits a job offer, THE System SHALL validate all required fields (title and description) first
6. IF the title or description field is empty when an organisation submits a job offer, THEN THE System SHALL reject the submission and return a descriptive validation error identifying the missing field
7. WHEN a user filters the job offer listing, THE System SHALL allow filtering by organisation type, location, and position type (full-time, part-time, or trial)

---

### Requirement 6: Job Offer Applications

**User Story:** As a player, I want to apply to job offers posted by organisations, so that I can express interest in opportunities that suit my career.

#### Acceptance Criteria

1. WHEN a player submits an application to an open job offer, THE System SHALL record the application with a unique identifier, the player's identifier, the job offer identifier, and the submission timestamp
2. WHEN a player submits an application, THE System SHALL deliver an in-platform notification to the posting organisation within 60 seconds
3. WHEN an organisation views a job offer's applications, THE System SHALL display all received applications with the applicant's name, playing position, and a link to their profile
4. IF a player attempts to apply to a job offer they have already applied to, THEN THE System SHALL reject the duplicate application and inform the player that they have already applied
5. IF a player attempts to apply to a closed job offer, THEN THE System SHALL reject the application and inform the player that the job offer is no longer accepting applications
6. WHEN a player views their own profile, THE System SHALL display a list of all job offers the player has applied to, with the application status shown as one of: Pending, Reviewed, Accepted, or Rejected

---

### Requirement 7: Private Messaging

**User Story:** As a player or organisation, I want to send and receive private messages, so that I can communicate directly with other parties on the platform.

#### Acceptance Criteria

1. WHEN a user initiates a new Conversation with another registered party, THE System SHALL create a Conversation thread with a unique identifier and record the participants and creation timestamp
2. IF a user attempts to initiate a Conversation with a party that does not exist or is not registered on the Platform, THEN THE System SHALL reject the request and inform the user that the recipient could not be found
3. WHEN a user sends a Message within a Conversation, THE System SHALL deliver the Message to the recipient and display it in the Conversation thread within 5 seconds of the send action
4. WHEN a user receives a new Message that has been successfully delivered, THE System SHALL display an unread notification indicator on the user's messaging interface
5. WHEN a user opens a Conversation containing unread Messages, THE System SHALL mark all Messages in that Conversation as read and remove the unread notification indicator
6. THE System SHALL allow a user to view a list of all their active Conversations (those containing at least one Message), ordered by the most recently updated Conversation first
7. IF a user attempts to send a Message with empty or whitespace-only content, THEN THE System SHALL reject the Message and inform the user that the Message cannot be empty
8. IF a user attempts to send a Message exceeding 2000 characters, THEN THE System SHALL reject the Message and inform the user of the character limit
9. WHEN a user sends a Message, THE System SHALL persist the Message so that both participants can retrieve the full Conversation history at any time

---

### Requirement 8: Notifications

**User Story:** As a user, I want to receive notifications about relevant activity, so that I can stay informed without having to manually check the platform.

#### Acceptance Criteria

1. WHEN a player receives a new Message, THE System SHALL generate an in-platform notification for the player containing the event type and the sender's name
2. WHEN an organisation receives a new Message, THE System SHALL generate an in-platform notification for the organisation containing the event type and the sender's name
3. WHEN an organisation receives a new application to one of their job offers, THE System SHALL generate an in-platform notification for the organisation containing the event type and the job offer title
4. WHEN a user views their notifications, THE System SHALL display each notification with the event type, the name or title of the linked entity, and the timestamp
5. WHEN a user dismisses a notification, THE System SHALL mark it as read, remove it from the active notification list, and decrement the unread notification count by one
6. WHILE a user is logged in, THE System SHALL display the count of unread notifications in the platform navigation interface, showing "0" when there are no unread notifications
7. WHEN a notification is generated, THE System SHALL persist it until the user explicitly dismisses it, ensuring it remains retrievable across sessions
8. WHEN a user opens the notification panel, THE System SHALL mark all visible notifications as read without requiring explicit dismissal of each one

---

### Requirement 9: Authentication and Account Management

**User Story:** As a user, I want to securely register and log in to the platform, so that my profile and communications are protected.

#### Acceptance Criteria

1. WHEN a new user registers, THE System SHALL require a valid email address (matching standard email format) and a password between 8 and 128 characters; IF the email is already registered, THE System SHALL reject the registration and inform the user that the email is already in use; WHEN registration succeeds, THE System SHALL send a verification email and restrict the account to read-only access until the email is verified
2. WHEN a registered user submits valid credentials, THE System SHALL authenticate the user and grant access to their account within 3 seconds
3. IF a user submits incorrect credentials, THEN THE System SHALL reject the login attempt and return a generic error message that does not reveal which field was incorrect
4. IF a user fails to authenticate 5 consecutive times, THEN THE System SHALL lock the account for 15 minutes and inform the user of the lockout duration
5. WHEN a user requests a password reset, THE System SHALL send a single-use password reset link to the registered email address that expires after 60 minutes
6. WHEN an authenticated user logs out, THE System SHALL invalidate the user's session and redirect them to the login page
7. IF a user attempts to access a protected resource without an active session, THEN THE System SHALL redirect the user to the login page

---

### Requirement 10: Role-Based Access Control

**User Story:** As a platform administrator, I want users to have appropriate permissions based on their account type, so that players and organisations can only perform actions relevant to their role.

#### Acceptance Criteria

1. IF an authenticated Player attempts to edit a player profile that is not their own, THEN THE System SHALL block the action and return an authorisation error indicating the action is not permitted for their account type
2. IF an authenticated Organisation attempts to edit an organisation profile or manage (create, update, or close) job offers that do not belong to their account, THEN THE System SHALL block the action and return an authorisation error indicating the action is not permitted for their account type
3. IF a user who is not an authenticated Player attempts to submit an application to a job offer, THEN THE System SHALL block the action and return an authorisation error indicating the action is not permitted for their account type
4. WHEN a user attempts to perform an action outside their role permissions, THE System SHALL block the action entirely and return an authorisation error message indicating the action is not permitted for the user's account type
5. IF a user attempts to read or send Messages within a Conversation they are not a participant of, THEN THE System SHALL block the action and return an authorisation error
6. IF a user attempts to delete a Message they did not author, THEN THE System SHALL block the action and return an authorisation error
