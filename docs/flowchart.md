# How Whenkin Works

Whenkin collects availability. The organizer compares responses and communicates the final arrangement outside the website.

## Big Picture

```mermaid
flowchart TD
  H["Main Page"] -->|"Create Event"| O["Organizer View"]
  O -->|"Share Participant Link"| P["Participant View"]
  O -->|"Save Event or Change Its Hours"| N["Save Event and Responses to Neon"]
  P -->|"Submit or Update Availability"| N
  N --> C["Whenkin Calculates Best Meeting Times"]
  C -->|"Show Ranked Suggestions"| O
  O -->|"Choose and Communicate a Time"| F["Social Media or Other External Channel"]
```

Creating an event saves its details and opens the organizer view. Responses and event changes feed the same stored event; Whenkin returns updated suggestions for the full meeting length. Existing invitation and private edit links continue to work.

See [Calculating the Best Meeting Time](#calculating-the-best-meeting-time) for ranking, [Participant Privacy](#participant-privacy) for access rules, [Website and Storage](#website-and-storage) for storage details, and [Editing and Navigation](#editing-and-navigation) for saving and returning home.

## Calculating the Best Meeting Time

```mermaid
flowchart TB
  subgraph candidates["Find Possible Times"]
    direction LR
    A["Load Event Hours, Length,<br/>and Responses from Neon"] --> B["Try 15-Minute Starts<br/>That Fit the Full Meeting"]
    B --> C["Count People Free<br/>for the Entire Meeting"]
  end
  subgraph results["Rank and Display"]
    direction LR
    D["Most Available First<br/>Then Earliest Start"] --> E["Drop Zero Attendance<br/>Skip Nearby Equal Counts"]
    E --> F["Show Ranked Times in Local Time<br/>or No Suggestions Yet"]
  end
  candidates --> results
```

The single Neon step uses the event's current saved data; see [Website and Storage](#website-and-storage). Overlapping or touching event windows are combined before calculation. Candidate starts are 15 minutes apart, even though the selection grid uses 30-minute blocks. Each candidate must fit the entire meeting length within the event hours.

Only people who have responded enter the count. A person counts as available only when their saved availability covers the whole meeting; separate people's partial availability cannot be combined to cover it. **Best Fit** means the highest attendance count, with the earliest start breaking a tie. It does not require everyone to be available.

To keep the list useful, skip a candidate if a kept suggestion has the same attendee count and starts less than one meeting length away. Keep up to 20 suggestions, show five initially, and reveal five more at a time. Times are displayed in the viewer's chosen time zone. The organizer can always view these results; participant access follows [Participant Privacy](#participant-privacy).

## Participant Privacy

Participants see their own saved response and the response count. Only the organizer sees all responses, participant names, and ranked meeting suggestions. The availability grid always edits the current person's response; there are no personal/group tabs or sharing setting.

A valid private response token is required to load or update that person's saved availability. A valid organizer token is required to see all responses or edit event hours. Legacy sharing flags do not grant access.

## Website and Storage

```mermaid
flowchart LR
  D[Desktop and Mobile Browser] <-->|HTTPS requests| S[ChatGPT Sites Website and Server]
  S <-->|Server-only database connection| N[(Neon PostgreSQL)]
  S --> A[Validate organizer and participant edit tokens]
  A --> P[Return data allowed by organizer or response token]
  P --> D
```

The website is public. Event access permissions are enforced by the server independently of the site's public audience. Private tokens stay in link fragments and local browser storage; requests authenticate with an authorization header. Neon stores token hashes, availability ranges as actual UTC instants, and event/response revisions.

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

On phones, drag the time-label column to scroll the grid in any mode. Mark/Clear gestures inside the blocks edit availability. Mobile 30-minute blocks are 26 pixels high by default; desktop blocks remain 32 pixels high. The wider mobile grid uses smaller outer margins.
