# REBORN — Telegram bot & Discord poster setup

Everything below is a one-time setup done on your phone or computer — no
coding. When it says "env var", that means: vercel.com → your project →
**Settings → Environment Variables** → Add → then **Deployments → Redeploy**
so they take effect.

## 1. Telegram admin bot (asks nothing of Claude, costs no credits)

What you get: message your bot `/code` and it answers with the current
hourly guest code. `/next` shows the next 3 codes. `/status` checks the
site is up. It answers **only you** — everyone else gets silence.

1. In Telegram, open **@BotFather** → `/newbot` → pick a name/username →
   copy the **bot token** it gives you (looks like `123456:ABC-DEF...`).
   (You can reuse the old @Rebornbeta1_Bot token instead if you have it.)
2. Get your own Telegram ID: message **@userinfobot** — it replies with
   your numeric id.
3. Env vars on Vercel:
   - `TELEGRAM_BOT_TOKEN` = the bot token
   - `TELEGRAM_ADMIN_ID` = your numeric id
   - `TELEGRAM_WEBHOOK_SECRET` = any random string you invent (e.g. mash
     the keyboard, 20+ characters)
4. Redeploy, then visit this URL once in any browser (fill in the two
   placeholders):

   ```
   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://reborn-app-nine.vercel.app/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>
   ```

   It should reply `{"ok":true,...}`.
5. Message your bot `/code`. Done forever.

## 2. Discord hourly code poster (for the Patreon supporters channel)

What you get: every hour, the current guest code is posted automatically
into a Discord channel. Lock that channel to your Patreon supporter role
and paying supporters always have the working code.

1. In Discord: your private channel → **Edit channel → Integrations →
   Webhooks → New Webhook → Copy Webhook URL**.
2. Env vars on Vercel:
   - `DISCORD_WEBHOOK_URL` = that URL
   - `CRON_KEY` = another random string you invent
3. Redeploy. Test it by visiting (once):
   `https://reborn-app-nine.vercel.app/api/discord-post?key=<CRON_KEY>`
   → the code should appear in the channel.
4. Make it hourly, free: create an account at **cron-job.org** → Create
   cronjob → URL = the test URL from step 3 → schedule = every hour at
   minute 0 → save. (Vercel's own cron can't run hourly on the free plan;
   cron-job.org can, free.)

## 3. Patreon → Discord role (from where the other chat left off)

1. **patreon.com/settings/apps** → Discord → **Connect**, authorize.
2. Patreon → your paid tier → **edit → Discord role benefits** → pick your
   server → create/choose the `Supporter` role.
3. In Discord **Server Settings → Roles**: drag the Patreon bot's role
   ABOVE `Supporter`.
4. Private channel → **Permissions**: `@everyone` View Channel ❌,
   `Supporter` View Channel ✅.
5. Subscribers who link Discord to their Patreon account get the role —
   and with it, the hourly-code channel — automatically.

## Notes

- The site's login secrets are separate env vars: `REBORN_USER`,
  `REBORN_PASS` (master login), `REBORN_ROTATE_SECRET` (what the hourly
  codes are computed from). If you ever change `REBORN_ROTATE_SECRET`,
  nothing else needs updating — the bot and the Discord poster compute
  codes from the same place.
- Wrong password 5 times in 15 minutes = locked out for 15 minutes
  (shows a "locked" page instead of the sign-in box).
- The `/code` page (master login) keeps working as before and stays the
  zero-setup fallback.
