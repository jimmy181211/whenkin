/** EN terms and privacy text. */
import type {
  LegalDocument,
  LegalKind,
} from './legal';

export const enLegalDocuments: Record<LegalKind, LegalDocument> = {
  terms: {
    title: 'Terms of Use',
    summary:
      'Whenkin helps people share availability and find a time to meet. These terms explain the responsibilities that come with using it.',
    sections: [
      {
        title: 'About Whenkin',
        paragraphs: [
          'UCSD CSSA, United States, operates Whenkin. By creating an event or submitting availability, you agree to these terms. If you do not agree, do not create events or submit responses. Contact us at j4ouyang@ucsd.edu with questions.',
        ],
      },
      {
        title: 'Who Can Use Whenkin',
        paragraphs: [
          'You must be at least 13 and meet any higher minimum age required where you live. If you are below the age of legal adulthood, use Whenkin with permission from a parent or guardian. Whenkin is not directed to children under 13.',
        ],
      },
      {
        title: 'Your Events and Responses',
        paragraphs: [
          'Provide information you are entitled to share. Use a display name that lets your organizer recognize you; a legal name is not required. Do not impersonate others or put sensitive information, such as health records, financial details, passwords, or government identifiers, in event names or notes.',
          'You retain your rights to your content. You allow us and our service providers to store, display, and process it as needed to operate Whenkin, calculate suggestions, and handle support or legal obligations.',
        ],
      },
      {
        title: 'Shared Links and Editing',
        paragraphs: [
          'Everyone with the event link can see event details, saved responses, names, time zones, availability, and shared free times. Everyone with that link can also edit any response by selecting a person in Responders. This applies to existing events too. Share the link with the people you want to collaborate with.',
        ],
      },
      {
        title: 'Acceptable Use',
        paragraphs: [
          'Do not use Whenkin for unlawful activity, harassment, spam, or collecting information without authority. Use shared editing responsibly. Do not deliberately falsify responses, bypass safeguards, or overload the service. We may restrict abusive use or remove unlawful content as permitted by law.',
        ],
      },
      {
        title: 'Scheduling and Service Availability',
        paragraphs: [
          'Shared free times show only periods when every respondent is available throughout. Suggestions reflect saved responses and do not guarantee attendance. Check dates, time zones, and the final arrangement with your group. The organizer communicates the chosen time outside Whenkin.',
          'Whenkin is currently free to use. Features and availability may change, and interruptions or data loss are possible. Keep your own copy of important arrangements. To the extent permitted by law, the service is provided as available without warranties of uninterrupted or error-free operation. It is not intended for emergencies or other uses requiring guaranteed availability.',
        ],
      },
      {
        title: 'Your Legal Rights',
        paragraphs: [
          'Nothing in these terms excludes liability or rights that cannot be excluded under applicable law. Where the law permits, UCSD CSSA is not responsible for indirect or consequential losses arising from use of Whenkin. These terms do not impose mandatory arbitration or waive your statutory consumer rights.',
        ],
      },
      {
        title: 'Privacy, Changes, and Contact',
        paragraphs: [
          'Our Privacy Policy explains how we handle information. You can stop using Whenkin at any time and contact j4ouyang@ucsd.edu about your data or these terms.',
          'We will post revised terms with a new effective date. Changes apply prospectively; where required by law, we will provide additional notice or seek agreement.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    summary:
      'Your availability helps your group plan. Here is what Whenkin collects, who can see it, and how to request changes or deletion.',
    sections: [
      {
        title: 'Who Is Responsible',
        paragraphs: [
          'UCSD CSSA, United States, operates Whenkin and is responsible for the information described here. Contact j4ouyang@ucsd.edu for privacy questions or requests. This policy covers Whenkin, rather than other websites you may visit from it.',
        ],
      },
      {
        title: 'Information We Handle',
        paragraphs: [
          'Events include a title, optional notes, possible dates and hours, and time zone. Older events may also contain an optional creator name. Responses include a display name, time zone, selected availability, and update information. We also store event and response identifiers. Historical unused credential hashes may remain until the event is deleted. A legal name, account, email address, and payment details are not required to schedule.',
          'Your browser supplies its time zone for local time labels; you may choose another. We do not request precise GPS location. Requests also expose technical information such as IP address, browser headers, requested URL, and time to our hosting infrastructure. IP addresses are used for abuse rate limits; hosting providers may maintain operational and security logs. If you email us, we receive your address and message.',
        ],
      },
      {
        title: 'How We Use Information',
        paragraphs: [
          'We use this information to save and update events and responses, find periods when everyone is available, display local times, protect the service, and answer requests. Suggestions are calculated from saved availability, not by sending it to an AI model.',
          'Where a legal basis is required, we process information to provide the service you request, pursue legitimate interests in operating and protecting it, or meet legal obligations, as applicable. We do not sell or rent personal information or share it for cross-context behavioral advertising.',
        ],
      },
      {
        title: 'Who Can See and Edit Your Information',
        paragraphs: [
          'Everyone with the event link can view all saved names, time zones, availability, and shared free times, and edit any response. There are no private editing links. This includes existing events. Authorized administrators and providers may access data as needed for operations, security, support, or legal obligations.',
        ],
      },
      {
        title: 'Providers and International Processing',
        paragraphs: [
          'ChatGPT Sites hosts the website and server, and Neon PostgreSQL stores events and responses. These providers and their infrastructure process data to deliver and secure the service. Processing may occur in the United States or other countries where providers operate, whose privacy rules may differ from yours.',
        ],
      },
      {
        title: 'Browser Storage and Tracking',
        paragraphs: [
          'Whenkin uses local browser storage for your language preference and whether you completed or skipped the guide. It does not restore responses or drafts from browser storage. Opening an event starts a blank form; select a person in Responders to load a saved response in any browser. Pending edits remain only while the page is open.',
          'You can clear browser storage without deleting server data. Whenkin does not add advertising or third-party analytics trackers. Hosting providers may use necessary security technologies.',
        ],
      },
      {
        title: 'Retention and Security',
        paragraphs: [
          'Events and all their links expire {retention} after creation. There is no participant limit. Administrators run cleanup manually to delete events at least {retention} old, together with their responses and availability. Expired data may remain stored until that manual operation is run. Contact us if you need earlier deletion. Support messages and security records are retained as needed to handle requests, protect the service, and meet legal obligations; provider backups and logs follow their retention processes.',
          'We use HTTPS, input validation, expiry checks, write limits, and revision checks to protect the service. Everyone with an event link can edit its responses; the link is the shared access point.',
        ],
      },
      {
        title: 'Your Choices and Requests',
        paragraphs: [
          'Open the event link and select your name in Responders to view or edit your response. Availability saves automatically. Use the trash icon beside a name to delete a response after confirmation. For event deletion, data access, or other privacy requests, email j4ouyang@ucsd.edu with the ordinary event link and describe your request.',
          'We may need to verify that you control the relevant event or response before acting. Depending on applicable law, you may have rights to access, correct, delete, obtain a copy of, restrict, or object to processing, and complain to a privacy regulator. We handle requests according to applicable law.',
        ],
      },
      {
        title: 'Children and Policy Changes',
        paragraphs: [
          'Whenkin is not directed to children under 13, and they should not submit personal information. If you believe a child has done so, contact us to request removal.',
          'We will update the effective date when this policy changes and provide additional notice of material changes where required. Changes do not retroactively authorize incompatible uses of information already collected.',
        ],
      },
    ],
  },
};
