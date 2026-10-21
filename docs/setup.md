# Setup and deployment

## 1. Set up Neon

Create a free Neon project called `whenkin`. If your only organization is managed by Vercel, create a separate organization from the profile menu in the Neon Console and choose the Free plan. [Neon’s organization guide](https://neon.com/docs/manage/orgs-manage) explains this step. Copy its PostgreSQL connection string into your local `DATABASE_URL` environment variable. Keep this string private.

Run `npm run migrate`. The script creates the tables and remembers which migrations have already run. It does not print the connection string.

For local development, also put the connection string in `.dev.vars`, using `.dev.vars.example` as a guide.

## 2. Connect Cloudflare

Run `npx wrangler login` and sign in to your Cloudflare account. Check the account before publishing:

```sh
npx wrangler whoami
```

The Worker is called `whenkin` in `wrangler.jsonc`. You may change this name before the first deployment if needed. The product shown to visitors is Whenkin.

## 3. Add the database secret

```sh
npx wrangler secret put DATABASE_URL
```

Enter your connection string at the hidden prompt. Do not put it in the configuration file, source code, GitHub issues, or README.

## 4. Check and deploy

```sh
npm test
npm run deploy
```

Wrangler prints the public `workers.dev` address after deployment. This publishes both the website and API in your Cloudflare account.

Open `/api/health` at that address. `{"ready":true}` means the database and schema are reachable. Create an event and test it in another browser before sharing it with a group.

## Publishing later changes

Run the tests and `npm run deploy` again. The included GitHub workflow checks pull requests and pushes; it does not deploy or need Cloudflare credentials. You can later connect Cloudflare Workers Builds to the repository for automatic deployments.

## Data and permissions

- Event links are unlisted, not password-protected. Anyone who has a link can view that event’s names and availability.
- Editing a response requires its secret edit link. A matching name is not enough.
- Confirming a final time requires the separate organizer link.
- Edit secrets travel in URL fragments, not query strings, and are removed from the address bar after being saved on the device.
- The database stores only hashes of these secrets. Responses never include those hashes.
- The API checks time ranges and permissions on the server and rejects conflicting saves from older tabs.
- The Worker limits write requests per IP address. No precise location, camera, or microphone permission is requested.

## Visual style

The user supplied the Whenkin name, tagline, and logo reference. The interface uses the same deep teal, lime, overlapping rounded shapes, and soft background. Brand text is in `src/brand.ts`; colors are at the top of `src/styles.css`. The icon is a scalable rendering of the overlapping shapes in the reference.

## Website languages

The header has a language selector: English, 简体中文, and Español. English is the default until someone chooses another language. Their choice stays on that device. Calendar labels and times follow the chosen language, while the selected time zone stays independent. Event titles, notes, and names stay as entered.

Translations live in `src/lib/i18n.ts`. Add both a Chinese and Spanish translation when adding website text. Keep placeholders such as `{count}` and `{zone}` intact.

## Give GitHub access to this repository

If uploading returns “Resource not accessible by integration,” check that the connected GitHub App is installed on the account that owns the repository. In GitHub Settings → Applications → Installed GitHub Apps, choose Configure, then Only select repositories, add `whenkin`, and save. Read access to a public repository does not by itself give the connection write access.
