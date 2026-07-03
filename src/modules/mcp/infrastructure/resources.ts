import { SembleApiClient } from './sembleApiClient';

/**
 * MCP resource definitions — readable context the agent can pull in on demand.
 *
 * There are two kinds:
 *  - {@link resources}: static documents (API reference, conventions, the skill).
 *    Their `read` is a function of the API origin so URIs stay environment-correct.
 *  - {@link resourceTemplates}: parameterized resources (e.g. a specific card or
 *    collection by ID). Their `read` receives the parsed URI variables and an
 *    authenticated {@link SembleApiClient} so the body can be fetched live.
 */
export interface McpResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  /** Returns the resource body. `baseUrl` is the API origin. */
  read: (baseUrl: string) => string;
}

export interface McpResourceTemplate {
  /** RFC 6570 URI template, e.g. `semble://card/{cardId}/full`. */
  uriTemplate: string;
  name: string;
  description: string;
  mimeType: string;
  /** Returns the resource body for the given parsed template variables. */
  read: (
    vars: Record<string, string | string[]>,
    client: SembleApiClient,
  ) => Promise<string>;
}

// ---------------------------------------------------------------------------
// Static resource bodies
// ---------------------------------------------------------------------------

const URL_TYPES_MD = `# Semble URL Types

Every saved URL card has a \`urlType\`. Use it as a filter in search/list tools.
Type is normally derived from the URL's metadata — you rarely set it directly.

| urlType    | Use for                                                            |
| ---------- | ----------------------------------------------------------------- |
| \`article\`  | Blog posts, news, essays, long-form web writing                   |
| \`link\`     | Generic web pages that don't fit another type                     |
| \`book\`     | Books (any store/edition page)                                    |
| \`research\` | Academic papers, preprints, journal articles                      |
| \`audio\`    | Podcasts, recordings, music                                       |
| \`video\`    | YouTube, Vimeo, talks, lectures                                   |
| \`social\`   | Tweets/posts, Bluesky, social-media threads                       |
| \`event\`    | Conferences, meetups, dated happenings                            |
| \`software\` | Repos, libraries, tools, apps                                     |

When the user asks for "papers" prefer \`research\`; for "talks" or "videos"
prefer \`video\`; for "posts" prefer \`social\`.
`;

const CONNECTION_TYPES_MD = `# Semble Connection Types (Discourse Graph)

Connections are typed, directed relationships **from a source to a target**,
where each side is a URL or a card. Use the \`connect_cards\` tool. The
\`connectionType\` is a fixed enum — pick the one whose meaning matches the
direction source → target.

| connectionType | Meaning (source → target)                                       |
| -------------- | -------------------------------------------------------------- |
| \`SUPPORTS\`     | Source provides evidence/argument **for** the target          |
| \`OPPOSES\`      | Source provides evidence/argument **against** the target      |
| \`ADDRESSES\`    | Source responds to / tackles a question or problem in target  |
| \`HELPFUL\`      | Source is generally useful for understanding the target       |
| \`LEADS_TO\`     | Source causes or precedes the target                          |
| \`RELATED\`      | Loose association when nothing more specific fits             |
| \`SUPPLEMENT\`   | Source adds extra material/context to the target             |
| \`EXPLAINER\`    | Source explains or clarifies the target                       |

## Guidance
- **Direction matters.** "A supports B" ≠ "B supports A". Set source/target so
  the verb reads correctly source → target.
- Prefer the most specific type; fall back to \`RELATED\` only when nothing fits.
- Add a \`note\` to capture *why* the connection holds — it's the highest-value part.
- To reverse an existing connection, use \`update_connection\` with \`swap: true\`.
`;

const COLLECTION_GUIDELINES_MD = `# Semble Collection Guidelines

Collections group URL cards around a theme. Each has an \`accessType\`:

- **\`CLOSED\`** (default): only the owner can add cards. Use for personal
  reading lists, project research, private organization.
- **\`OPEN\`**: other users can contribute cards. Use for community knowledge
  bases and shared, collaboratively-curated topics.

## Working with collections
- Create with \`create_collection\`; list your own with \`list_my_collections\`.
- Add a card to collections when saving (\`save_card\` → \`collectionIds\`) or
  afterwards (\`update_card_associations\` → \`addToCollections\`).
- For OPEN collections, \`get_collection_contributors\` shows who has contributed
  (with counts) and \`list_contributed_collections\` shows what a user contributed to.
- \`update_collection\` requires \`name\` even for partial edits — pass the current
  name if you're only changing the description or access type.
`;

const NETWORK_NAVIGATION_MD = `# Navigating the Semble Network

Semble is a social knowledge graph. Typical traversal paths:

## Around a URL
1. \`get_url_metadata(url, includeStats=true)\` — title + counts (libraries, notes,
   collections, connections by type).
2. \`get_url_savers(url)\` — who saved it (each with their card).
3. \`get_url_collections(url)\` — collections containing it.
4. \`get_url_notes(url)\` — what others wrote about it.
5. \`get_url_connections(url, direction=both)\` — typed links in/out.
6. Or call \`get_card_network_context(url)\` to get all of the above at once.

## Around a person
- \`get_account_profile(identifier, includeStats=true)\` — profile + relationship
  flags (isFollowing, followsYou, isSubscribed).
- \`list_user_cards\` / \`list_user_collections\` / \`list_user_connections\`.
- \`follow\` for the feed; \`subscribe\` (with scopes) for notifications.

## Discovery
- \`get_global_feed\` (everyone) and \`get_following_feed\` (people you follow):
  activities are CARD_COLLECTED or CONNECTION_CREATED.
- \`search_network\` (keyword) and \`semantic_search\` (conceptual) across cards.
- \`find_similar_urls(url)\` for "more like this".
- \`search_accounts\` / \`search_collections\` to find people and collections.

## Conventions
- Always surface IDs (cardId, collectionId, connectionId, DIDs) so follow-up
  tools can act on them.
- Default page size is 10; raise \`limit\` only when the user asks for more.
`;

const SKILL_MD = `---
name: semble
description: Work with Semble — search/save URLs as cards, organize them into collections, build a typed discourse graph of connections, and discover via feeds and semantic search. Use when the user asks to find, save, organize, relate, or explore content in Semble.
---

# Semble Skill

## Overview

Semble is a knowledge-management platform on the AT Protocol. Users save URLs as
cards, attach markdown notes, organize cards into collections, and link cards
with **typed connections** (a discourse graph). It's social: you can follow and
subscribe to people and collections, and browse activity feeds.

## Tool map

- **Save/edit**: \`save_card\`, \`update_card_associations\`, \`update_note\`, \`delete_card\`
- **Read cards**: \`get_card\`, \`search_library\`, \`search_network\`, \`list_user_cards\`
- **URL context**: \`get_url_metadata\`, \`get_library_status\`, \`get_url_savers\`,
  \`get_url_notes\`, \`get_url_collections\`, \`get_card_network_context\`
- **Collections**: \`create_collection\`, \`update_collection\`, \`delete_collection\`,
  \`list_my_collections\`, \`get_collection\`, \`get_collection_by_aturi\`,
  \`search_collections\`, \`list_user_collections\`, \`list_contributed_collections\`,
  \`get_collection_followers\`, \`get_collection_contributors\`
- **Connections**: \`connect_cards\`, \`update_connection\`, \`delete_connection\`,
  \`get_url_connections\`, \`list_user_connections\`
- **Accounts**: \`get_my_profile\`, \`get_account_profile\`, \`search_accounts\`
- **Feeds**: \`get_global_feed\`, \`get_following_feed\`
- **Social**: \`follow\`, \`unfollow\`, \`subscribe\`, \`unsubscribe\`,
  \`update_subscription\`, \`get_my_subscriptions\`
- **Notifications**: \`get_notifications\`, \`get_unread_notification_count\`,
  \`mark_notifications_read\`, \`mark_all_notifications_read\`
- **Discovery search**: \`semantic_search\`, \`find_similar_urls\`

## Common workflows

### Save a URL with a note, into a collection
1. (Optional) \`list_my_collections\` to find a target collection ID, or
   \`create_collection\`.
2. \`save_card\` with \`url\`, \`note\` (markdown), and \`collectionIds\`.
3. Return the \`urlCardId\`.

### Find and read
1. \`search_library\` (your own) or \`search_network\` (everyone) for keywords;
   \`semantic_search\` for conceptual questions.
2. Present results as a numbered list with titles and IDs.
3. \`get_card\` for the full content of a specific result.

### Explore a URL deeply
1. \`get_card_network_context(url)\` for a one-shot overview, or step through
   \`get_url_metadata\` → savers → collections → notes → connections.
2. Suggest next actions with concrete IDs: follow a prolific saver, contribute
   to an OPEN collection, save the URL, or connect it to related cards.

### Build the discourse graph
1. Identify two related URLs/cards.
2. \`connect_cards\` with the right \`connectionType\` (read
   \`semble://connection-types\`) and a \`note\` explaining why. Direction matters.

## Conventions
- Notes are markdown.
- Default list/search limit is 10; raise it only when asked.
- Always surface card/collection/connection IDs so the user can act on them.
- "follow" feeds the timeline; "subscribe" drives notifications — they're distinct.

## Error handling
- Empty keyword search → broaden the query or try \`semantic_search\`.
- Unknown card/collection ID → search by title/name instead.
- Destructive tools (\`delete_card\`, \`delete_collection\`, \`delete_connection\`)
  only when the user explicitly asks.
`;

const stripSlash = (s: string) => s.replace(/\/$/, '');

export const resources: McpResource[] = [
  {
    uri: 'semble://api-reference',
    name: 'Semble API Reference',
    description:
      'Pointer to the live OpenAPI spec describing every network.cosmik.* endpoint, with auth, pagination, and enums.',
    mimeType: 'text/markdown',
    read: (baseUrl) => {
      const b = stripSlash(baseUrl);
      return `# Semble API Reference

The full OpenAPI 3 specification is served at:

${b}/api/openapi.json

Interactive docs: ${b}/api/docs

All requests authenticate with a Semble API key sent as
\`Authorization: Bearer sk_...\` or the \`x-api-key\` header.

## Conventions
- All operations live under \`/xrpc/network.cosmik.*\`.
- List endpoints page with \`page\` (1-based) and \`limit\` (default 10).
- Most list endpoints accept \`sortBy\` / \`sortOrder\` (\`asc\`|\`desc\`).

## Enums
- **urlType**: article, link, book, research, audio, video, social, event, software
- **accessType**: OPEN, CLOSED
- **connectionType**: SUPPORTS, OPPOSES, ADDRESSES, HELPFUL, LEADS_TO, RELATED, SUPPLEMENT, EXPLAINER
- **feed source**: margin, semble
- **follow/subscribe targetType**: USER, COLLECTION
- **subscription scopes**: CARD, CONNECTION, COLLECTION_SAVED
- **card sortBy**: createdAt, updatedAt, libraryCount
- **collection sortBy**: name, createdAt, updatedAt, cardCount, addedAt
`;
    },
  },
  {
    uri: 'semble://url-types',
    name: 'Semble URL Types',
    description: 'When to use each of the 9 urlType values.',
    mimeType: 'text/markdown',
    read: () => URL_TYPES_MD,
  },
  {
    uri: 'semble://connection-types',
    name: 'Semble Connection Types',
    description:
      'The discourse-graph connectionType enum and how to choose the right typed relationship (direction matters).',
    mimeType: 'text/markdown',
    read: () => CONNECTION_TYPES_MD,
  },
  {
    uri: 'semble://collection-guidelines',
    name: 'Semble Collection Guidelines',
    description: 'OPEN vs CLOSED collections and the contributor model.',
    mimeType: 'text/markdown',
    read: () => COLLECTION_GUIDELINES_MD,
  },
  {
    uri: 'semble://network-navigation',
    name: 'Semble Network Navigation',
    description:
      'How to traverse the Semble graph: URL → savers → collections → notes → connections → feeds.',
    mimeType: 'text/markdown',
    read: () => NETWORK_NAVIGATION_MD,
  },
  {
    uri: 'skill://semble/SKILL.md',
    name: 'Semble Agent Skill',
    description: "Workflow instructions for using Semble's MCP tools effectively.",
    mimeType: 'text/markdown',
    read: () => SKILL_MD,
  },
];

export const resourceTemplates: McpResourceTemplate[] = [
  {
    uriTemplate: 'semble://card/{cardId}/full',
    name: 'Semble Card (full)',
    description:
      'Full card payload for a given card ID — content plus the collections it belongs to and who saved it.',
    mimeType: 'application/json',
    read: async (vars, client) => {
      const result = await client.get('/network.cosmik.card.get', {
        cardId: vars.cardId,
      });
      return JSON.stringify(result, null, 2);
    },
  },
  {
    uriTemplate: 'semble://collection/{collectionId}/full',
    name: 'Semble Collection (full)',
    description: 'Full collection payload including its URL cards, for a given collection ID.',
    mimeType: 'application/json',
    read: async (vars, client) => {
      const result = await client.get('/network.cosmik.collection.get', {
        collectionId: vars.collectionId,
      });
      return JSON.stringify(result, null, 2);
    },
  },
];
