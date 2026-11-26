/** English terms and privacy text. */
import type { LegalDocument, LegalKind } from './legal';

export const enLegalDocuments: Record<LegalKind, LegalDocument> = {
  terms: {
    title: 'Terms of Use',
    summary: 'By creating an event or submitting a response, you agree to these terms.',
    sections: [
      {
        title: 'Using Whenkin',
        paragraphs: [
          'Whenkin is operated by UCSD CSSA in the United States. You must be at least ' +
            '13, meet any higher local minimum age, and have parental permission if ' +
            'you are not legally an adult.',
          'Share only information you have the right to share. A display name is enough; ' +
            'do not include sensitive information. Do not impersonate others, alter their ' +
            'responses without permission, harass, spam, collect data without authorization, ' +
            'or disrupt the service. We may restrict abuse or remove unlawful content.',
          'You keep your content rights and allow us and our providers to store, display, ' +
            'and process it to run Whenkin, provide support, and meet legal obligations.',
        ],
      },
      {
        title: 'Shared Links',
        paragraphs: [
          'Anyone with an event link can view its details, names, time zones, and ' +
            'availability, and edit or delete any response. This includes existing events. ' +
            'Share links only with people you trust.',
        ],
      },
      {
        title: 'Scheduling and Service Limits',
        paragraphs: [
          'Shared times reflect saved responses, not guaranteed attendance. Confirm dates, ' +
            'time zones, and the final plan with your group.',
          'Whenkin is currently free. Features may change, and outages or data loss may ' +
            'occur. Keep important arrangements elsewhere. Where law permits, we provide ' +
            'the service as available, without guarantees of uninterrupted or error-free ' +
            'operation. Do not use it for emergencies.',
        ],
      },
      {
        title: 'Your Legal Rights',
        paragraphs: [
          'These terms do not limit rights or liability protected by law. Where law ' +
            'permits, UCSD CSSA is not liable for indirect or consequential losses. ' +
            'There is no mandatory arbitration or waiver of statutory consumer rights.',
        ],
      },
      {
        title: 'Privacy, Updates, and Contact',
        paragraphs: [
          'See our Privacy Policy for how we handle information. For questions or data ' +
            'requests, contact j4ouyang@ucsd.edu.',
          'Updated terms show a new effective date and apply going forward. We give ' +
            'additional notice or seek agreement where law requires.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    summary: 'What we collect, how we use it, and your choices.',
    sections: [
      {
        title: 'Information We Collect',
        paragraphs: [
          'We store event details, time zones, response names and availability, identifiers, ' +
            'and update records. Older events may retain creator names and unused credential ' +
            'hashes. No account, legal name, email, or payment details are required.',
          'We detect your time zone, not GPS location. Providers receive IP addresses, ' +
            'browser headers, URLs, and request times, and may keep operational and ' +
            'security logs. Emails to us include your address and message.',
          'Browser storage remembers language and guide dismissal, not responses or drafts. ' +
            'Clearing it does not delete server data. We add no advertising or third-party ' +
            'analytics trackers; providers may use security tools.',
        ],
      },
      {
        title: 'How We Use Information',
        paragraphs: [
          'We use data to run Whenkin, calculate shared times, prevent abuse, and answer ' +
            'requests. Administrators may analyze event topics and availability patterns ' +
            'to improve the service. Shared-time calculations do not send data to AI models.',
          'Where required, legal bases are the requested service, legitimate interests in ' +
            'operating and protecting it, or legal obligations. We do not sell or rent ' +
            'personal information or share it for behavioral advertising.',
        ],
      },
      {
        title: 'Who Can Access Data',
        paragraphs: [
          'Anyone with an event link can view its details and all responses, and edit or ' +
            'delete any response. This includes existing events; there are no private ' +
            'editing links.',
          'Authorized administrators and providers may access data for operations, security, ' +
            'support, or legal obligations. ChatGPT Sites hosts Whenkin; Neon PostgreSQL ' +
            'stores its data. Providers may process data in the United States or other ' +
            'countries with different privacy rules.',
        ],
      },
      {
        title: 'Retention and Security',
        paragraphs: [
          'Links expire {retention} after creation. Administrators manually delete events ' +
            'at least {retention} old and their responses and availability. Expired data ' +
            'may remain until cleanup runs. Contact us for earlier deletion.',
          'Support and security records are kept as needed for those purposes or by law. ' +
            'Provider backups and logs follow their rules. We use HTTPS, input checks, ' +
            'and abuse limits; links still allow shared editing.',
        ],
      },
      {
        title: 'Your Choices and Rights',
        paragraphs: [
          'Use Responders to view, edit, or delete responses. For other data requests, ' +
            'including event deletion, email j4ouyang@ucsd.edu with the event link. ' +
            'We may verify your connection to the data.',
          'Depending on applicable law, you may access, correct, delete, or obtain a copy ' +
            'of your data, restrict or object to processing, or complain to a privacy ' +
            'regulator. We handle requests under applicable law.',
        ],
      },
      {
        title: 'Contact and Policy Updates',
        paragraphs: [
          'UCSD CSSA, United States, operates Whenkin. For privacy questions or removal of ' +
            'children’s data, email j4ouyang@ucsd.edu. Whenkin is not directed to children ' +
            'under 13. This policy does not cover linked websites.',
          'Updates show a new effective date, with additional notice where required. ' +
            'They do not retroactively permit incompatible uses of previously collected data.',
        ],
      },
    ],
  },
};
