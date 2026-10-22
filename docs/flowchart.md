# How Whenkin works

Whenkin helps people choose a meeting time without a long conversation about who is free.

## The organizer and participants

```mermaid
flowchart TD
    A[Organizer creates an event] --> B[Choose dates, hours, time zone, and meeting length]
    B --> C[Save event and get a sharing link]
    C --> D[Participant opens the link on a phone or computer]
    D --> E[Read the device time zone]
    E --> F{Use a different time zone?}
    F -->|Yes| G[Search and choose a city or time zone]
    F -->|No| H[Paint available times on the grid]
    G --> H
    H --> I[Save the actual times in PostgreSQL]
    I --> J[Compare complete meeting-length windows]
    J --> K[Rank the times by how many respondents can attend]
    K --> L[Show times in each viewer's chosen time zone]
    L --> M[Organizer confirms a final time]
    M --> N[Download a calendar invitation]
```

## The website and database

```mermaid
flowchart TD
    D[Desktop website] <-->|Load events and save availability| W[ChatGPT Sites server]
    M[Mobile website] <-->|Load events and save availability| W
    W <-->|Check private edit and organizer links| P[(Neon PostgreSQL)]
    W <-->|Save and compare timestamptz values| P
    W --> R[Return event data and confirmed meeting time]
    R --> D
    R --> M
```

The phone and computer use the same website, server, and database.

## What happens to a time

```mermaid
flowchart TD
    A[Participant marks 10 AM in Los Angeles] --> B[Convert the date and local time to an actual moment]
    B --> C[Store the start and end as timestamptz]
    C --> D[Compare actual moments for all participants]
    D --> E{Who is viewing?}
    E -->|Organizer in New York| F[Show New York dates and hours]
    E -->|Participant elsewhere| G[Show that participant's selected time zone]
```

Changing the display zone never moves availability. It only changes the clock labels. The event keeps the organizer’s time-zone preference so it can be used again later.
