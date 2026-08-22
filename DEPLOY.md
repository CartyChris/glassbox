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
