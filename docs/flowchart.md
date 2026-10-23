# How Whenkin Works

Everyone uses the same event link and sees the same page. Each person keeps a private link for editing their own response.

## Shared Event Flow

```mermaid
flowchart TD
  C["Choose Dates or Weekdays and Hours"] --> E["Create Event"]
  E --> L["Share One Link"]
  L --> R["Enter Name and Mark Availability"]
  R --> N["Save to Neon"]
  N --> P["Primary: Everyone Free"]
  N --> S["Secondary: All but One Free"]
  P --> G["Everyone Sees Common Ground"]
  S --> G
```

There is no meeting-length setting and no participant limit. Only saved responses enter the calculation. An empty response counts as unavailable. Times are shown in the viewer’s selected time zone.

## Finding Common Ground

The server sorts the start and end of availability ranges. At each boundary it updates who is free. It combines touching periods only if the available group stays the same.

A primary result includes every respondent. A secondary result excludes exactly one fixed respondent for its entire duration. A result never joins two halves where different people are missing. Gaps remain separate. Primary results come first, then secondary results, without discarding later matching periods.

## Saving and Editing

The same Edit/Done control works with a mouse or touch. Enter a name before editing; changes save automatically. Only a valid private response token can update that response. Viewing the group does not grant permission to change anyone else’s selections.

Date mode stores real instants in PostgreSQL `timestamptz`. Weekday mode retains its existing reference-week projection. Display-zone changes preserve availability. English, Chinese, and Spanish use the same scheduling data.

## Expiry and Manual Cleanup

```mermaid
flowchart TD
  C["Event Created"] --> A["Link Works for One Calendar Year"]
  A --> E["Deadline Reached: Link Stops Working"]
  E --> W["Data Waits for Manual Cleanup"]
  W --> M["Administrator Runs Cleanup Method"]
  M --> D["Delete Old Event, Dates, Responses, and Availability"]
```

Editing does not extend the deadline. Cleanup removes only events whose creation anniversary is at least one year ago. It processes batches until finished, preserving younger events. There is no scheduled ChatGPT task or automatic backend job.
