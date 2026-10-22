# How Whenkin Works

Whenkin collects availability. The organizer compares responses and communicates the final arrangement outside the website.

## Organizer and Participant Access

```mermaid
flowchart TD
  A[Organizer creates event] --> B[Private organizer link]
  A --> C[Participant invitation link]
  B --> D[View all responses and common ground]
  B --> E{Enable group sharing?}
  E -->|Off by default| F[Participants see only their own availability and response count]
  E -->|On| G[Participants see group availability and common ground]
  C --> H[Select 30-minute blocks]
  H --> I[Fine-tune start and end in 15-minute steps]
  I --> J{Has a name?}
  J -->|No| K[Keep draft and show guidance beside name]
  J -->|Yes| L[Save availability and issue private edit link]
  L --> D
  D --> M[Organizer communicates chosen time through social media]
```

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
