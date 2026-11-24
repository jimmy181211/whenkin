/** EN terms and privacy text. */
import type {
  LegalDocument,
  LegalKind,
} from './legal';

export const enLegalDocuments: Record<LegalKind, LegalDocument> = {
  terms: {
    title: 'Terms of Use',
    summary:
      'Whenkin helps groups share availability and find a time to meet. ' +
      'Creating an event or submitting a response means you agree to ' +
      'these terms.',
    sections: [
      {
        title: 'Using Whenkin',
        paragraphs: [
          'UCSD CSSA, United States, operates Whenkin. You must be at least ' +
            '13 and meet any higher local minimum age. If you are not legally ' +
            'an adult, get permission from a parent or guardian. If you ' +
            'disagree with these terms, do not create events or submit ' +
            'responses.',
        ],
      },
      {
        title: 'Your Content and Conduct',
        paragraphs: [
          'Share only information you have the right to share. A recognizable ' +
            'display name is enough; a legal name is not required. Do not ' +
            'impersonate others or include sensitive information such as health ' +
            'records, financial details, passwords, or government identifiers.',
          'You keep your rights to your content and allow us and our ' +
            'providers to store, display, and process it to operate Whenkin, ' +
            'calculate shared times, provide support, and meet legal ' +
            'obligations.',
          'Do not use Whenkin for unlawful activity, harassment, spam, or ' +
            'unauthorized data collection. Do not falsify others’ responses, ' +
            'bypass safeguards, or overload the service. We may restrict abuse ' +
            'or remove unlawful content as permitted by law.',
        ],
      },
      {
        title: 'Shared Links and Editing',
        paragraphs: [
          'Anyone with an event link can view its details and all saved ' +
            'names, time zones, availability, and shared free times. They can ' +
            'also edit or delete any response through Responders. This applies ' +
            'to existing events too. Share links only with people you want to ' +
            'collaborate with.',
        ],
      },
      {
        title: 'Scheduling and Service Availability',
        paragraphs: [
          'Shared times require every respondent to be free throughout. They ' +
            'reflect saved responses, not a guarantee of attendance. Check ' +
            'dates, time zones, and the final plan with your group; communicate ' +
            'the chosen time outside Whenkin.',
          'Whenkin is currently free. Features may change, and interruptions ' +
            'or data loss are possible. Keep important arrangements elsewhere. ' +
            'Where law permits, the service is provided as available, without ' +
            'guarantees of uninterrupted or error-free operation. Do not rely ' +
            'on it for emergencies or other uses requiring guaranteed ' +
            'availability.',
        ],
      },
      {
        title: 'Your Legal Rights',
        paragraphs: [
          'These terms do not exclude rights or liability that applicable law ' +
            'protects. Where law permits, UCSD CSSA is not liable for indirect ' +
            'or consequential losses from using Whenkin. There is no mandatory ' +
            'arbitration or waiver of statutory consumer rights.',
        ],
      },
      {
        title: 'Privacy, Changes, and Contact',
        paragraphs: [
          'Our Privacy Policy explains how we handle information. You may ' +
            'stop using Whenkin at any time. For questions or data requests, ' +
            'contact j4ouyang@ucsd.edu.',
          'Revised terms carry a new effective date and apply prospectively. ' +
            'We provide additional notice or seek agreement where law requires.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    summary:
      'What Whenkin collects, how it is used and shared, and how to manage your information.',
    sections: [
      {
        title: 'Who Is Responsible',
        paragraphs: [
          'UCSD CSSA, United States, operates Whenkin. Contact ' +
            'j4ouyang@ucsd.edu for privacy questions or requests. This policy ' +
            'covers Whenkin, not other websites linked from it.',
        ],
      },
      {
        title: 'Information We Handle',
        paragraphs: [
          'We store event titles, optional notes, offered dates and hours, ' +
            'time zones, response display names, selected availability, update ' +
            'information, and event and response identifiers. Older events may ' +
            'retain creator names and unused credential hashes until deletion. ' +
            'No legal name, account, email, or payment details are required to ' +
            'schedule.',
          'Your browser supplies a time zone, which you can change; we do not ' +
            'request GPS location. Hosting infrastructure receives IP ' +
            'addresses, browser headers, requested URLs, and request times. IP ' +
            'addresses support abuse limits, and providers may keep operational ' +
            'and security logs. If you email us, we receive your address and ' +
            'message.',
        ],
      },
      {
        title: 'How We Use Information',
        paragraphs: [
          'We use information to save responses, calculate shared times, show ' +
            'local times, protect the service, and answer requests. ' +
            'Administrators may summarize event topics and availability ' +
            'patterns to understand use and improve the service. Shared times ' +
            'are calculated from saved availability without sending it to an AI ' +
            'model.',
          'Where a legal basis is required, processing supports the service ' +
            'you request, legitimate interests in operating and protecting it, ' +
            'or legal obligations. We do not sell or rent personal information ' +
            'or share it for cross-context behavioral advertising.',
        ],
      },
      {
        title: 'Access, Providers, and International Processing',
        paragraphs: [
          'Anyone with an event link can see event details and all saved ' +
            'names, time zones, availability, and shared times, and edit or ' +
            'delete any response. There are no private editing links; this also ' +
            'applies to existing events.',
          'Authorized administrators and providers may access data for ' +
            'operations, security, support, or legal obligations. ChatGPT Sites ' +
            'hosts Whenkin; Neon PostgreSQL stores events and responses. ' +
            'Processing may occur in the United States or other countries where ' +
            'providers operate, with different privacy rules.',
        ],
      },
      {
        title: 'Browser Storage and Tracking',
        paragraphs: [
          'Local browser storage remembers your language and guide dismissal, ' +
            'not responses or drafts. Open an event and select a name in ' +
            'Responders to load a saved response. Unsaved edits remain only ' +
            'while the page is open. Clearing browser storage does not delete ' +
            'server data.',
          'Whenkin adds no advertising or third-party analytics trackers. ' +
            'Hosting providers may use necessary security technologies.',
        ],
      },
      {
        title: 'Retention and Security',
        paragraphs: [
          'Event links expire {retention} after creation. Administrators ' +
            'manually delete events at least {retention} old, including their ' +
            'responses and availability; expired data may remain until cleanup ' +
            'runs. Contact us for earlier deletion. Support messages and ' +
            'security records are kept as needed for requests, protection, and ' +
            'legal obligations; provider backups and logs follow their ' +
            'retention processes.',
          'We use HTTPS, input validation, expiry checks, write limits, and ' +
            'revision checks. Event links provide shared access, including the ' +
            'ability to edit responses.',
        ],
      },
      {
        title: 'Your Choices and Rights',
        paragraphs: [
          'Select your name in Responders to view or edit your ' +
            'response; availability saves automatically. The trash icon ' +
            'deletes a response after confirmation. For event deletion, ' +
            'data access, or other requests, email j4ouyang@ucsd.edu with ' +
            'the event link and your request.',
          'We may verify your connection to the event or response. Depending ' +
            'on applicable law, you may access, correct, delete, or obtain a ' +
            'copy of your data, restrict or object to processing, or complain ' +
            'to a privacy regulator. We handle requests under applicable law.',
        ],
      },
      {
        title: 'Children and Policy Changes',
        paragraphs: [
          'Whenkin is not directed to children under 13. If a child submits ' +
            'personal information, contact us for removal.',
          'Policy changes carry a new effective date, with additional notice ' +
            'of material changes where required. Changes do not retroactively ' +
            'authorize incompatible uses of previously collected information.',
        ],
      },
    ],
  },
};
