# Publishing this

Two commands. Both need a browser sign-in the first time, which is why they are here
rather than already done.

## GitHub

```bash
cd gb-repo
gh repo create glassbox --public --source=. --remote=origin --push
```

No `gh`? `brew install gh && gh auth login`, then the line above.

Prefer the web? Create an empty repo at <https://github.com/new> named `glassbox`, then:

```bash
cd gb-repo
git remote add origin https://github.com/chriscarty123/glassbox.git
git branch -M main
git push -u origin main
```

The repo is already initialised and committed — `git log` will show one commit.

## Vercel

```bash
cd gb-repo
npx vercel --prod
```

`vercel.json` already declares no framework and no build command, so leave those blank if
prompted. To claim the `glassbox.vercel.app` hostname, set the project name to `glassbox`
when it asks.

### If the deployment asks visitors to sign in

Your Vercel team (`CloudOps-Game-Time`) has SAML and **Deployment Protection on by
default**, which puts every deployment behind a Vercel login. A public app cannot ship that
way. Turn it off per-project:

**Project → Settings → Deployment Protection → Vercel Authentication → Disabled**

That is a security setting on a SAML team, so it is deliberately your decision, not
something an automated tool should flip for you.

## What is safe to publish

Verified before this repo was committed:

- no hardcoded API keys or tokens anywhere in the source
- no analytics, telemetry or error-reporting endpoints
- the only hardcoded external request is GitHub's public `rate_limit` probe, and only when
  you configure the GitHub connector yourself

Everything else the app contacts is a provider *you* add a key for.

---

## "It loads a Vercel login page instead of the app"

That is the whole problem, and it is one setting — not a build failure, not the CSP, not v0.

Both `glassbox.vercel.app` and the team URL currently return **HTTP 200 to a Vercel login
page**, because your team `CloudOps-Game-Time` has SAML with Deployment Protection on. Every
visitor is asked to sign in to Vercel, so nobody but you can see it.

**Fix:** Vercel dashboard → the `glassbox` project → **Settings → Deployment Protection →
Vercel Authentication → Disabled** → Save. Then redeploy or just reload.

Nothing else needs changing. The app itself was tested against this repo's exact production
CSP headers: all 35 tabs render, the 3D editor loads three.js from unpkg inside a sandboxed
iframe, and there are **zero CSP violations**.

## Do not deploy this through v0

v0 builds React/Next.js apps and will scaffold a project around your input. GlassBox is a
single static HTML file with no build step — pushing it through v0 adds a framework it does
not need and a build that can only fail. Use `npx vercel --prod` from this folder, or import
the GitHub repo in the Vercel dashboard and accept the settings `vercel.json` already
declares (no framework, no build command).
