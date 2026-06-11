---
name: sdk-changelog
description: This skill should ONLY be used when the user EXPLICITELY asks to update the SDK changelog, write release notes for `@semble.so/api`, or prepare an entry for `src/packages/sdk/CHANGELOG.md` (typically alongside a version bump). It is NOT for the root/app changelog.
---

# how to use this skill

## 1. get all the relevant diffs

run the command to get all the relevant diffs from which the changelog section will be written:
`git diff development... -- src/contract/src/ src/types/src/`

## 2. write the changelog entry

If not already present, add a new header at the top of `src/packages/sdk/CHANGELOG.md` with the new version and date, then write a summary of the changes based on the diffs you got from step 1.

The notes should list newly added endpoints (and their types) and list any modified endpoints and their updates types. That's it.

## How to write the changelog entry

Write it from the perspective of the SDK / API consumer. Do not reference internal details. Focus on changes that are only visible to the consumer.
