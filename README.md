# Ledger

A private balance tracker for you and your family. No backend, no cloud
database, it saves your data as JSON files inside this same GitHub repo
using the GitHub API, straight from the browser.

## How it works

- Each person gets a file at `data/users/<username>.json`
- Signing up hashes the password (SHA-256) before saving it, so the raw
  password never touches GitHub
- Every change (balance edit, new pending entry, marking something
  returned) writes the updated file back to the repo through the
  GitHub REST API
- Because the file lives in the repo, signing in from any device pulls
  the same data

## Setup steps

1. **Make the repo private.** Settings > General > Danger Zone > Change
   visibility. Anyone who can see the repo can see the JSON files, and
   files, and those contain balances (passwords are hashed, balances
   are not). Private Pages needs a GitHub Pro / Team / Enterprise
   account; if you're on the free plan, either accept the repo stays
   public or just use this locally without publishing it.
2. **Edit `js/config.js`** and fill in:
   - `owner`: your GitHub username
   - `repo`: this repository's name
   - `branch`: usually `main`
3. **Create a personal access token**
   - Go to GitHub > Settings > Developer settings > Personal access
     tokens > Fine-grained tokens (or classic)
   - Give it `repo` access, scoped to this one repository if you use
     a fine-grained token
   - Copy the token, you will paste it into the site once per device
4. **Push these files to your repo** and turn on GitHub Pages
   (Settings > Pages > Deploy from branch > main).
5. **Open the site.** The first screen asks for the token, paste it in.
   It is saved in that browser's local storage only, never committed.
6. **Sign up** with a username and password for yourself, and again
   for each family member. Each person gets their own balance and
   their own pending list.

## Notes

- The token grants write access to the whole repo, keep it private
  and do not paste it into a shared or public computer.
- If you ever want to revoke access, delete the token from GitHub
  Settings and it stops working everywhere immediately.
- Data is capped at the last 100 activity log lines per account to
  keep the files small, balances and pending entries are never
  trimmed.
