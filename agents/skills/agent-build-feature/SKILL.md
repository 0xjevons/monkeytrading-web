---
name: agent-build-feature
description: >
  Use when implementing a feature — "build #12", "implement this feature", "start the next
  feature". Confirms the feature is ready to build, builds all of it on one branch for one PR
  (parallel subagents allowed), self-reviews it with agent-code-review, checks its dev scenario in
  a browser on a production build, opens the PR through agent-create-pr, and checks the scenario
  again on `main` after merge. Merges, deploys, and issue writes need the user's approval.
---

# agent-build-feature

Build one ready feature end to end on one branch, so the team reviews it once, checks it in dev,
and it goes live at merge. Features are planned with
[agent-plan-feature](../agent-plan-feature/SKILL.md); a bug fix or a refactor that is not a feature
goes straight through [git-workflow](../../rules/git-workflow.md) and
[agent-create-pr](../agent-create-pr/SKILL.md).

## Dev

Dev is a production build checked in a browser: a local `npm run build && npm start` until the
repository is connected to Vercel, and the PR's preview deployment once it is
([no-guessing-current-state](../../rules/no-guessing-current-state.md) says how to tell). A merge
deploys production, so the dev scenario passes before the PR is marked ready, not after.

The scenario's check is a script that drives a browser, so anyone can run it again:

- Use Playwright from a scratch directory outside the repository, at an exact version of the
  official `playwright` package (`npm view playwright version`); it never becomes a dependency of
  this repo. Keep the script beside that install so its imports resolve.
- Write the run's output — the script, screenshots, and results — to the gitignored
  `agents/.processes/dev-runs/<YYYY-MM-DD-HHMM>-<kebab-slug>/`.
- Drive the page the way a visitor does: by role and accessible name (`getByRole`), with the
  keyboard where the scenario says so, and at the mobile and desktop widths it names.
- When the change alters what the page loads or renders, run Lighthouse in its mobile
  configuration on the same build, as
  [web-implementation](../web-implementation/SKILL.md#performance) describes, and keep its report
  in the run directory.
- When a preview deployment is protected and the run cannot reach it, run the scenario on a local
  production build of the same commit and say so. Never change protection settings
  ([no-deploy](../../rules/no-deploy.md)).

## Before the first edit

- **Ready.** Read the feature issue (`gh issue view <n> --comments`). A planned feature carries the
  `ready-to-build` label, every blocker is done — including any engine issue in a
  `Blocked by 0xjevons/monkeytrading#<n>` line — and its acceptance criteria cite their sources. If
  a decision is open, stop and name it. Build nothing of a feature that is not ready, not even the
  parts that look settled.
- **An issue the plan did not write.** Check the same things: every decision its design needs is
  made, its criteria have sources, and it has a dev scenario. Name each gap and ask the user to fill
  it or confirm the issue is ready; never decide that alone.
- **Whole scope.** List what the feature needs on the live page: its copy and the engine README or
  decision each claim comes from, components, `src/lib` logic and tests, metadata, headers and CSP,
  assets, and anything the owner must set at Vercel. A feature is complete when its dev scenario
  passes in a browser on a production build. Anything the issue does not cover is a question for
  the user now, not a later PR.
- **Size.** Estimate the PR from that scope, counting production code and tests as
  [agent-plan-feature](../agent-plan-feature/SKILL.md#what-a-feature-is) does, and again when
  planning the build (the interfaces the subagents build against) shows more than the issue
  suggested. When the issue records why a large feature has no seam and the estimate has not grown
  past its size, build it. Otherwise, past about 5k lines, look for a seam as agent-plan-feature
  describes and propose any split to the user before the first edit; past about 10k, build one PR
  only when they agree there is no seam. An agreed split changes the plan: re-plan through
  agent-plan-feature, then build the first resulting feature once its issue is ready.
- **Branch.** One pushed branch for the feature, named for its issue per git-workflow.
- Load [think-before-coding](../../rules/think-before-coding.md),
  [development-checklist](../../rules/development-checklist.md), and the `*-implementation` skill
  for every area the feature touches.

## Building

- Build the narrowest end-to-end path first, then widen it, so the branch builds and renders at
  every step.
- Parallel work is fine: split by area across subagents, each in its own worktree on a local
  branch, and merge each into the feature branch. Never push a branch or open a PR per part, and
  never stack PRs for one feature.
- Map every acceptance criterion to code and a test. Test where the behaviour lives: vitest unit
  tests for logic in `src/lib`, and the dev scenario's browser check for what only a browser shows
  — rendering, keyboard use, motion, and the absence of third-party requests.

## Before review

- Run the local checks per git-workflow.
- Self-review with [agent-code-review](../agent-code-review/SKILL.md), multi-agent at `medium` or
  higher: fix every accepted Critical, High, and Medium finding and run it again until a run accepts
  none, as [agent-create-pr](../agent-create-pr/SKILL.md#before-a-pr-is-ready-for-review) requires
  before the PR is marked ready.
- Show the user the dev scenario — steps, expected result, and the build it runs on — and on their
  yes write it into the issue's dev scenario section, replacing the planned text.
- The scenario's browser check passes in dev on the PR's head commit.
- Put what promotion needs in the PR body: anything the owner must set at Vercel, ordering against
  an engine change, and rollback when a revert is not enough.

## Merge and dev run

- Open the PR with agent-create-pr, ending `Part of #<feature>`: the feature closes after its run
  on `main`, not at merge.
- Answer review with [agent-address-pr-comments](../agent-address-pr-comments/SKILL.md), aiming for
  one round.
- The merge is the promotion: it deploys production once Vercel is connected, and it happens only
  on the owner's go-ahead, as [agent-create-pr](../agent-create-pr/SKILL.md#merging) describes.
- After merge, run the dev scenario on `main`: against the production deployment once Vercel is
  connected — reading a page is not a deploy — or on a local production build of `main` until then.
  Show the user the result, and on their yes record it on the issue and close it.

## Rules

- One feature never spans several pushed branches or PRs.
- Never build part of a feature that is not ready.
- Never write to a GitHub issue without the user's yes to the exact text.
- Never merge, deploy, or change an environment without explicit per-action approval.
