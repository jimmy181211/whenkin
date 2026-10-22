# How Whenkin Works

Whenkin collects availability. The organizer compares responses and communicates the final arrangement outside the website.

## Participant Privacy

The organizer controls **Let participants see group availability**. It is **off by default**. The server applies this setting before sending response data to the browser.

```mermaid
flowchart TD
  O["Private Organizer Link"] --> OA["Authenticate Organizer"]
  OA --> OV["View All Responses and Common Ground"]
  OA --> T["Set Group Sharing: Off by Default"]
  I["Participant Invitation Link"] --> P["Server Checks Current Group-Sharing Setting"]
  E["Private Response Edit Link"] --> V{"Valid Response Token?"}
  V -->|No| X["Reject Request"]
  V -->|Yes| P
  T --> R["Next Participant Request or Refresh"]
  R --> P
  P --> S{"Group Sharing On?"}
  S -->|"No: Default"| H["Return Only Own Saved Response if Authenticated, Plus Response Count"]
  H --> HU["Hide Other Respondents and Common Ground"]
  S -->|Yes| G["Return Group Responses and Suggested Times"]
  G --> GU["Show Group Availability, Common Ground, and Respondents"]
  HU --> W["Edit Only Own Response with Its Private Token"]
  GU --> W
```

| Access | Group Sharing Off | Group Sharing On | Editing Rights |
| --- | --- | --- | --- |
| Organizer with a valid private organizer link | All responses and common ground | All responses and common ground | Change event hours, meeting length, and group-sharing setting |
| Participant invitation link without a private response token | Event details, response count, and the participant's local draft | Event details, response count, and group view | Submit a new response; an existing response still requires its own private edit token |
| Participant with a valid private response edit link | Own saved response and response count | Own response plus group view | Edit only the response belonging to that token |

With sharing off, the API excludes other respondents' names, time zones, and availability, and returns no common-ground suggestions. The participant page hides the Group Availability tab, common-ground panel, and respondent list. The organizer retains access to all responses.

Sharing changes visibility; it does not grant permission to edit another response or delete existing responses. Only the organizer can change the setting. Invalid private credentials are rejected. A name alone does not grant access to a saved response.

The same participant and private edit links continue to work when the organizer changes the setting. The server reevaluates access on each request; open pages refresh every ten seconds and when focused.

## Website and Storage

```mermaid
flowchart LR
  D[Desktop and Mobile Browser] <-->|HTTPS requests| S[ChatGPT Sites Website and Server]
  S <-->|Server-only database connection| N[(Neon PostgreSQL)]
  S --> A[Validate organizer and participant edit tokens]
  A --> P[Return only data allowed by event privacy setting]
  P --> D
```

The website is public. Event access permissions are enforced by the server independently of the site's public audience. Private tokens stay in link fragments and local browser storage; requests authenticate with an authorization header. Neon stores token hashes, availability ranges as actual UTC instants, and the event privacy setting.

## Editing and Navigation

```mermaid
flowchart TD
  A[Edit name, time zone, or availability] --> B[Keep local draft]
  B --> C{Valid name supplied?}
  C -->|Yes| D[Save automatically]
  C -->|No| E[Save focuses name field and shows inline error]
  B --> F{Leaving with unsaved changes?}
  F -->|In-app navigation| G[Keep editing or leave without saving dialog]
  F -->|Browser close, reload, or navigation| H[Standard browser unsaved-changes warning]
  D --> I[Show saved status and clear dirty draft]
```

English and Spanish interface titles use Title Case. English, Simplified Chinese, and Spanish share the same scheduling data. Time-zone changes only change clock labels; 30-minute display blocks retain the original 15-minute precision, including partial blocks and repeated daylight-saving hours.

## Editing Event Hours

The private organizer page can change From, Until, and Meeting Length after creation. Hours apply to every existing event date in the event time zone. Saving atomically replaces the event windows, clips saved availability to their intersection, increments schedule and response revisions, and retains the same invitation and private edit links. Old schedule submissions are rejected so stale tabs cannot restore removed times. Open pages refresh every ten seconds and when focused; unsaved participant drafts are clipped to the new windows.
