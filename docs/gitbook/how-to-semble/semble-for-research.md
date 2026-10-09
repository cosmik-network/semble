---
hidden: true
icon: flask-gear
---

# Semble for Research

Semble helps you share what you're reading, follow what your field is reading, and hear back when the network learns something about the links you care about. Below are a few ways researchers use it today.&#x20;

## At a glance

<table><thead><tr><th>If you want to…</th><th>Try this</th><th data-hidden>Effort</th></tr></thead><tbody><tr><td>Hear what others say about a paper or post you saved</td><td><a href="semble-for-research.md#get-updates-on-the-links-you-care-about">Save it as a card</a> and let the notifications come to you</td><td>One click</td></tr><tr><td>Get alerts when a curator or collection you trust adds something</td><td><a href="semble-for-research.md#set-alerts-for-the-curators-and-collections-you-trust">Subscribe to them</a>, as you would set a Scholar alert</td><td>Two clicks</td></tr><tr><td>Point others to the best commentary and critiques of a paper</td><td><a href="semble-for-research.md#share-your-expertise-through-connections">Connect them to the paper</a> with a typed relation</td><td>A few clicks</td></tr><tr><td>Share your reference library, or part of it</td><td><a href="semble-for-research.md#share-your-zotero-library">Sync Zotero collections</a> with the Zemble plugin</td><td>Install a plugin</td></tr><tr><td>Keep a public, up-to-date reading list for your topic</td><td><a href="semble-for-research.md#maintain-a-living-literature-review">Run a living literature review</a> as a Semble collection</td><td>Create a collection</td></tr><tr><td>Share what you find at a conference with people who can't be there</td><td><a href="semble-for-research.md#share-a-conference-with-people-who-cant-be-there">Start an open conference collection</a></td><td>Create a collection</td></tr><tr><td>Let people outside your lab see what it's reading</td><td><a href="semble-for-research.md#open-up-your-labs-discord-or-slack">Pipe your Discord or Slack links</a> into a collection</td><td>Set up a bot</td></tr><tr><td>Get your writing to people who'd want to read it</td><td><a href="semble-for-research.md#help-your-writing-find-its-readers">Connect your post to what it references</a></td><td>A few clicks per post, or automate it</td></tr><tr><td>Keep working in your own notes tool</td><td><a href="semble-for-research.md#integrate-your-own-tool-for-thought">Integrate your tool for thought</a> through the Semble API or MCP</td><td>Some scripting</td></tr></tbody></table>

New to Semble? Start with the [quickstart.md](../getting-started/quickstart.md "mention").

## Get updates on the links you care about

Saving a link to Semble does more than store it: you get notified when someone else on the network connects something to it. You don't need to manage a reading list for this to pay off. Add the papers, posts and preprints you care about and let the network bring context back to you.

What comes back is a [connection](../basic-concepts/connections.md): another link, tied to yours with a typed relation and an optional note.

* **A rebuttal.** Someone links a response to an essay you saved with an `opposes` relation, and you read the two together.
* **A summary.** Someone attaches an `explainer` to a long post still sitting in your queue, so you get the gist before you get to it.
* **The surrounding discussion.** Every link has a [Semble page](../basic-concepts/semble-page.md) that gathers the blog posts, threads and papers people have connected to it from around the web.

A connection notifies everyone who holds that card, so one person's thirty seconds of curation reaches every reader of the piece. We call this pattern [sensors, not just bookmarks](https://blog.cosmik.network/sensors-not-bookmarks).

## Set alerts for the curators and collections you trust

If you already use Google Scholar alerts to stay updated on new citations to articles you care about, [subscriptions](https://blog.cosmik.network/subscriptions-launch) will feel familiar. Subscribe to a person or a collection and their new activity reaches you as a notification, so it doesn't get lost in your feed.

| Scholar alert you may have     | Semble equivalent                       | You're notified when…                                  |
| ------------------------------ | --------------------------------------- | ------------------------------------------------------ |
| New citations of a paper       | Save the paper as a card                | Someone connects another link to it                    |
| New articles by an author      | Subscribe to a person                   | They add a card or create a connection                 |
| New results for a topic search | Subscribe to a collection on that topic | A card is added to it, or someone saves or connects it |

Two things differ from Scholar. The alerts cover any kind of link, so you hear about blog posts, preprints, datasets and threads as well as published papers. And each one comes from a person you chose to trust, where Scholar's come from a search match.

To subscribe to a collection, follow it and then click the bell. To subscribe to a person, use the subscription settings on their profile. Following alone adds their activity to your feed; subscribing turns it into notifications.

Subscriptions also suit shared work. Subscribe to an open collection your lab or reading group curates together and you'll see each card your collaborators add.

## Share your expertise through connections

You know your field well enough to tell which commentary on a paper is worth reading. A [connection](../basic-concepts/connections.md) lets you mark that for everyone else. Link the paper to the piece that matters, pick a relation type, and add a note saying why.

| You've spotted…                                | Connect it as | Example                                                    |
| ---------------------------------------------- | ------------- | ---------------------------------------------------------- |
| A thoughtful blog post about a paper           | `helpful`     | An essay that puts the paper's claims in context           |
| A social media post that explains a paper well | `explainer`   | A thread that walks through the key findings               |
| Related work the paper is missing              | `related`     | An earlier study the authors didn't cite (maybe yours ;) ) |
| An important critique in another paper         | `opposes`     | A paper whose evidence contradicts the original claim      |

Your connection appears on the paper's Semble page and notifies everyone who has saved it. Each connection shows who made it, so readers can weigh it by its curator.

A paper's reference list is fixed on publication, and the discussion that follows is scattered across blogs and social platforms. Connections gather that discussion in one place and keep it growing. It takes you a few seconds, and it saves every later reader (or your future self) the search.

You can create a connection from any card in Semble, or with the browser extension while you read.

## Share your Zotero library

[Zemble](https://chrisshank.github.io/zemble/), built by [Chris Shank](https://semble.so/profile/chrisshank.com), is a Zotero plugin that connects your library to Semble. It suits you if you'd like to share references publicly and see what others are reading around them.

* **Publish the collections you choose.** Sync a Zotero collection to a Semble collection. You don't have to share your whole library.
* **See Semble activity inside Zotero.** New columns show who else has added an item, which collections it sits in, and what it's connected to.
* **Save and open items on Semble** from within Zotero.
* **Carry your tags and connections over** from Zotero, if you turn that setting on.

Many researchers have built reading lists and literature surveys in Zotero over years, with no good way to share them. [A quick Semble search](https://semble.so/search/collections?query=zotero) shows example Zotero collections researchers have published.

Remember that anything you publish to Semble is public, so sync only the collections you're happy to share.

## Maintain a living literature review

A Semble collection can be the backend for a literature review that stays current. You add papers to the collection as you find them, and your website displays it.

Nick Vincent's [Data Counterfactuals](https://datacounterfactuals.org/) site works this way. Its [Related Work](https://datacounterfactuals.org/collections) page is hosted on Semble, which keeps it easy to update and open to comments.

A reference list that lives only in your page's HTML is hard to find and hard to follow. Putting the same list on Semble indexes it on the AT Protocol, which gives you three things:

* **Discovery.** Your references show up in Semble search and feeds, and on the Semble page of every paper you include.
* **Followers.** People can follow or subscribe to the collection and see each new addition.
* **Signal back.** You see who collects the papers you added and what they connect to them. That's a practical way to spot a link you missed, or to find others working in your area.

You can also make a collection [open](https://blog.cosmik.network/3mejtzath722t) so that others can add to it.

## Share a conference with people who can't be there

If you're attending a conference, a Semble collection is a simple way to share the papers, posts and other references you come across. People who couldn't make it can follow the collection and keep up from afar.

It complements live-posting from an event. The feed carries the live conversation. The collection holds the links, where they stay findable and can be connected to other work after the conference ends.

For an example see this [post](https://bsky.app/profile/rafmbatista.bsky.social/post/3mrsdqevkws2x) and [collection](https://semble.so/profile/rafmbatista.bsky.social/collections/3mrqcs4ckb22b) by Rafael Batista.

To try it at your next conference:

1. Create a collection named for the event and make it open, so anyone can contribute.
2. Share the link with the conference hashtag or account.
3. Add links as you see them in talks, posters and hallway conversations.

Not attending? Check whether someone has already started a collection for the event, and follow it.

## Open up your lab's Discord or Slack

Most labs already share a steady stream of links in a chat channel. A bot can publish those links to a Semble collection, from one channel or from all of them. Your group's curation becomes visible to the wider network without anyone changing how they work.

People outside the lab can follow the collection without joining the chat. It also helps the right people find your group: the links show what you're working on, and some followers will come and join the conversation.

Two community-built bridges for Discord:

| Tool                                                            | What it does                                                               | Built by              |
| --------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------- |
| [disjecta](https://disjecta.portable.agency/)                   | Syncs URLs from any Discord channel to a Semble collection                 | @burrito.space        |
| [ATProto-links-bot](https://github.com/borgr/ATProto-links-bot) | Relays paper links from a lab Discord to Semble, Bluesky, Mastodon and RSS | @lchoshen.bsky.social |

## Help your writing find its readers

When you publish a post, preprint or note, add it to Semble and connect it to the links it references. Everyone who already holds one of those links gets a notification about your piece.

You can do this by hand, or automate it with the [Semble API](https://docs.cosmik.network/semble-api/semble-api) so that each new post is added and connected as you publish. The [next section](semble-for-research.md#integrate-your-own-tool-for-thought) shows an example.

An announcement post reaches your followers, an audience you have to build first. Connection notifications reach people who have shown interest in what you're writing about, whether or not they follow you. That matters most if you're new to a field or work in a niche one.

Think of it as citation alerts for the open web, with two differences:

* **Any kind of source.** Connections work for blog posts, podcasts and social posts as well as papers, and they arrive in minutes instead of months.
* **Everything you've saved.** You hear about new work connected to anything in your library, not only to papers you wrote.

Read more in [Connecting with your readers on Semble](https://blog.cosmik.network/connecting-readers).

Semble isn't yet built for this at high volume. If you add many connections at once, people holding those cards will get many notifications. Batching that activity is one fix we're looking at.

## Integrate your own tool for thought

You can keep your notes where they are and let an integration publish to Semble for you. The pattern from the previous section then runs on its own.

Anthony, who writes as [The Paper Pilot](https://paperpilot.dev/), synced his digital garden to Semble. Every page in the garden is a card, and every reference a page makes is a connection. His [open source](https://paperpilot.dev/garden/open-source) page, for example, has its own [Semble page](https://semble.so/url?id=https://paperpilot.dev/garden/open-source).

What you get from an integration like this:

* **No extra publishing step.** You write in your own tool and the cards and connections follow.
* **Readers find you through your references.** People holding the links you cite are notified, with no announcement post needed.
* **Context flows back.** Each note has a Semble page where you can see who saved it and what they connected to it.
* **Your data stays yours.** Cards and connections are records in your own AT Protocol account, readable by other apps.

Two ways to build one:

| Route      | Good for                                                                   | Docs                                                            |
| ---------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Semble API | A script or plugin that syncs notes, pages or bookmarks                    | [Semble API](https://docs.cosmik.network/semble-api/semble-api) |
| Semble MCP | An AI assistant that saves links from your notes and connects them for you | [Semble MCP](https://docs.cosmik.network/semble-mcp/semble-mcp) |

If you build one, tell us at hello@cosmik.network or tag us [@semble.so](https://bsky.app/profile/semble.so) on Bluesky/AT Protocol.

## Further reading

* [Sensors, not just bookmarks](https://blog.cosmik.network/sensors-not-bookmarks) — how a saved link brings context back to you
* [Connecting with your readers on Semble](https://blog.cosmik.network/connecting-readers) — how connections help writing find its audience
* [Lab Notes #008: Semble Connections](https://blog.cosmik.network/connections-intro) — the connection types and why they exist
* [Introducing Semble Subscriptions](https://blog.cosmik.network/subscriptions-launch) — notifications for the collections and curators you choose
* Monthly updates for [June](https://blog.cosmik.network/updates-june-2026), [July](https://blog.cosmik.network/updates-july-2026), [August](https://blog.cosmik.network/updates-august-26) and [September](https://blog.cosmik.network/updates-sep-26) 2026 — where most of the community examples on this page first appeared
