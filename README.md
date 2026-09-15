# الرسل الصغار 2026 — Registration App (Firebase)

Arabic (RTL) Sunday School registration form with an admin dashboard, built on
Next.js + Firebase. Runs free on Vercel's Hobby tier and Firebase's Spark plan.

- `/` — public registration form for parents
- `/admin` — sign in, then manage and export registrations

---

## Setup — about an hour

### 1. Create the Firebase project

1. console.firebase.google.com → **Create a project**. Google Analytics is not
   needed; turn it off.
2. **Build → Firestore Database → Create database**. Choose **production mode**
   (the rules in this repo replace the default ones in step 5).
3. Pick a location close to your parish — `europe-west3` (Frankfurt) is the
   usual choice. **This cannot be changed later.**

### 2. Register a web app and copy the config

**Project settings → General → Your apps → Web (`</>`)**. Register the app, and
Firebase shows a `firebaseConfig` block. Map it to four environment variables:

| From firebaseConfig | Environment variable |
|---|---|
| `apiKey` | `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `authDomain` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `appId` | `NEXT_PUBLIC_FIREBASE_APP_ID` |

These four are public by design — they ship in the browser bundle of every
Firebase app. The security rules are what protect your data, not these keys.

### 3. Get the service account key

**Project settings → Service accounts → Generate new private key.** A JSON file
downloads. Base64-encode it into a single line:

```bash
base64 -w0 service-account.json     # Linux
base64 -i service-account.json      # macOS
```

That string is `FIREBASE_SERVICE_ACCOUNT_B64`. Unlike the four above, this one
is a real secret — it grants full access to your project. Never commit the JSON
file, and never give the variable a `NEXT_PUBLIC_` prefix.

### 4. Enable email sign-in

**Authentication → Get started → Email/Password → Enable → Save.**

### 5. Publish the security rules

**Firestore Database → Rules**, replace everything with the contents of
`firestore.rules`, and click **Publish**.

Read the comments at the top of that file. Firebase has no switch to turn public
signup off — anyone with your web config can create an account. These rules are
what make that harmless: an account grants nothing on its own, because access
depends on membership of the `admins` collection.

### 6. Add your admin accounts

Two steps per person. Both are required.

**a. Create the login.** Authentication → Users → **Add user**. Enter an email
and password. Copy the **User UID** from the list afterwards.

**b. Add them to the allowlist.** Firestore Database → **Start collection** →
collection ID `admins`. Create a document whose **Document ID is that UID**, and
add one field so the document isn't empty — for example `email` (string) with
their address.

Repeat 6a and 6b for each person managing registrations.

> Someone who completes 6a but not 6b can sign in and will see
> «لا تملكون صلاحية الوصول» — signed in, no data. That is the allowlist working.

**To remove someone's access:** delete their document from `admins`. Deleting
their Authentication user as well is tidier, but the `admins` document is the
one that actually matters.

### 7. Push to GitHub

```bash
cd little-apostles
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/little-apostles.git
git push -u origin main
```

`.gitignore` excludes `.env.local`. Make sure the downloaded service account
JSON is not sitting in the folder when you commit.

### 8. Deploy on Vercel

1. vercel.com → **Add New → Project** → import the repo.
2. Expand **Environment Variables** and add all five values from steps 2 and 3.
3. Deploy.

Then go back to Firebase: **Authentication → Settings → Authorized domains** and
add your Vercel domain (e.g. `little-apostles.vercel.app`). Sign-in fails
without this.

Share the root URL with parents. Keep `/admin` to yourselves.

### Running locally (optional)

```bash
npm install
cp .env.local.example .env.local   # then fill in your five values
npm run dev
```

`localhost` is an authorized domain by default.

---

## How the data is structured

One Firestore document per registration, in the `registrations` collection, with
the children stored as an array inside it. The whole submission is a single
atomic write, so a half-saved registration is impossible.

The dashboard and the Excel export flatten that into **one row per child**, with
the parent details repeated on each row. Siblings share a registration document,
so searching or sorting by parent name groups them.

Registration date comes from Firestore's server timestamp, not the parent's
device, so a wrong phone clock can't affect it.

Editing a parent field in the dashboard updates it for all siblings at once,
because they live in the same document. Deleting the last remaining child in a
registration deletes the whole document; the dashboard warns you first.

## Security notes

The comments field collects health information about minors — heart conditions,
ADHD, hearing aids. Treat it accordingly:

- Parents never write to Firestore directly. `allow create: if false` blocks the
  public path entirely; submissions go through a server action using the service
  account, which validates every field before writing.
- Reading, editing and deleting require a UID present in `admins`.
- Keep the allowlist short and prune it when people leave the team.
- Exported `.xlsx` files carry this data too. Don't email them around or leave
  them in a shared Drive folder.

## Excel export

The **تصدير إلى Excel** button downloads whatever rows are currently shown, so
you can search first and export just that subset. Arabic text, including
diacritics, exports correctly.

The sheet opens left-to-right. Excel running in an Arabic interface flips it
automatically; otherwise use **Page Layout → Sheet Right-to-Left**.

## Things you may want to change

| What | Where |
|---|---|
| Age range (currently 3–12) | `app/actions.ts` and `app/page.tsx`, search `age < 3` |
| Wording of the two consent clauses | `app/page.tsx`, the الموافقات section |
| Notes-field placeholder examples | `app/page.tsx`, `NOTES_PLACEHOLDER` |
| Colours and fonts | `app/globals.css`, the `:root` block |
| Excel column headers | `app/admin/Dashboard.tsx`, `exportExcel` |

## Free tier

Firestore's free tier covers 1 GiB stored, 50,000 document reads and 20,000
writes per day; email authentication is free to 50,000 monthly active users.
A parish registration is nowhere near any of those.

The Spark plan needs no credit card and cannot produce a bill — if a quota is
exhausted the service simply stops until it resets at midnight Pacific. Nothing
pauses for inactivity, so the form stays instant even after a quiet month.
