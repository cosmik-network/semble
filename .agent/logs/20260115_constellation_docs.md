# docs

Include front/back template

## [This](https://constellation.microcosm.blue/) is a [constellation 🌌](https://github.com/at-microcosm/links/tree/main/constellation) API server from [microcosm](https://github.com/at-microcosm) ✨

​

Constellation is a self-hosted JSON API to an atproto-wide index of PDS record back-links, so you can query social interactions in real time. It can answer questions like:

​

- [How many people liked a liked a bluesky post?](https://constellation.microcosm.blue/links/count/distinct-dids?target=at%3A//did%3Aplc%3A44ybard66vv44zksje25o7dz/app.bsky.feed.post/3lhhz7k2yqk2h&collection=app.bsky.feed.like&path=.subject.uri)

- [Who are all the bluesky followers of an identity?](https://constellation.microcosm.blue/links/distinct-dids?target=did:plc:oky5czdrnfjpqslsw2a5iclo&collection=app.bsky.graph.follow&path=.subject)

- [What are all the replies to a Frontpage submission?](https://constellation.microcosm.blue/links?target=at://did:plc:nlromb2qyyl6rszaluwhfy6j/fyi.unravel.frontpage.post/3lhd2ivyc422n&collection=fyi.unravel.frontpage.comment&path=.post.uri)

- [What are _all_ the sources of links to an identity?](https://constellation.microcosm.blue/links/all?target=did:plc:vc7f4oafdgxsihk4cry2xpze)

- and more

​

It works by recursively walking _all_ records coming through the firehose, searching for anything that looks like a link. Links are indexed by the target they point at, the collection the record came from, and the JSON path to the link in that record.

​

This server has indexed 11,744,499,567 links between 2,383,990,783 targets and sources from 23,015,562 identities over 2 days.

(indexing new records in real time, backfill coming soon!)

​

You're welcome to use this public instance! Please do not build the torment nexus. If you want to be nice, put your project name and bsky username (or email) in your user-agent header for api requests.

​

## API Endpoints

​

### `GET /xrpc/blue.microcosm.links.getBacklinks`

​

A list of records linking to any record, identity, or uri.

​

#### Query parameters:

​

- `subject`: required, must url-encode. Example: `at://did:plc:vc7f4oafdgxsihk4cry2xpze/app.bsky.feed.post/3lgwdn7vd722r`

- `source`: required. Example: `app.bsky.feed.like:subject.uri`

- `did`: optional, filter links to those from specific users. Include multiple times to filter by multiple users. Example: `did=did:plc:vc7f4oafdgxsihk4cry2xpze&did=did:plc:vc7f4oafdgxsihk4cry2xpze`

- `limit`: optional. Default: `16`. Maximum: `100`

​

**Try it:**

​

### `GET /xrpc/blue.microcosm.links.getManyToManyCounts`

Download

```
https://constellation.microcosm.blue/links?target=https%3A//semble.so/&collection=pub.leaflet.document&path=.pages[pub.leaflet.pages.linearDocument].blocks[pub.leaflet.pages.linearDocument%23block].block.facets[].features[pub.leaflet.richtext.facet%23link].uri

{
  "total": 6,
  "linking_records": [
    {
      "did": "did:plc:6z5botgrc5vekq7j26xnvawq",
      "collection": "pub.leaflet.document",
      "rkey": "3m6mpbihiy22o"
    },
    {
      "did": "did:plc:s2rczyxit2v5vzedxqs326ri",
      "collection": "pub.leaflet.document",
      "rkey": "3m5gcukfzhc2p"
    },
    {
      "did": "did:plc:b2p6rujcgpenbtcjposmjuc3",
      "collection": "pub.leaflet.document",
      "rkey": "3m52o6mcd6c2z"
    },
    {
      "did": "did:plc:6z5botgrc5vekq7j26xnvawq",
      "collection": "pub.leaflet.document",
      "rkey": "3m3au34v5ms2m"
    },
    {
      "did": "did:plc:btxrwcaeyodrap5mnjw2fvmz",
      "collection": "pub.leaflet.document",
      "rkey": "3lz2rud4d3s26"
    },
    {
      "did": "did:plc:2cxgdrgtsmrbqnjkwyplmp43",
      "collection": "pub.leaflet.document",
      "rkey": "3lxsy2asc5224"
    }
  ],
  "cursor": null
}

// example record for doc and pub
{
  "tags": [],
  "$type": "pub.leaflet.document",
  "pages": [
    {
      "id": "019b4fbc-c9b8-7bba-995f-0407b19747eb",
      "$type": "pub.leaflet.pages.linearDocument",
      "blocks": [
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "$type": "pub.leaflet.blocks.text",
            "facets": [],
            "plaintext": "Most of the discussions I see about ATProto interoperability focus on lexicons. E.g. how to share lexicons, how to coordinate on defining and modifying them, what namespace should they be under, and so on. As much as I think these discussions are important, I don’t think they should hold apps back from exploring forms of interoperability that don't require sharing lexicons."
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "$type": "pub.leaflet.blocks.text",
            "facets": [],
            "plaintext": "From the context of Semble, I see two forms of interoperability making sense. Perhaps these will also work for other folks' use-cases."
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "$type": "pub.leaflet.blocks.header",
            "level": 1,
            "facets": [],
            "plaintext": "Lexicon Mapping"
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "$type": "pub.leaflet.blocks.text",
            "facets": [
              {
                "index": {
                  "byteEnd": 144,
                  "byteStart": 132
                },
                "features": [
                  {
                    "did": "did:plc:3zzkrrjtsmo7nnwnvhex3auj",
                    "$type": "pub.leaflet.richtext.facet#didMention"
                  }
                ]
              },
              {
                "index": {
                  "byteEnd": 220,
                  "byteStart": 184
                },
                "features": [
                  {
                    "$type": "pub.leaflet.richtext.facet#code"
                  }
                ]
              },
              {
                "index": {
                  "byteEnd": 283,
                  "byteStart": 264
                },
                "features": [
                  {
                    "$type": "pub.leaflet.richtext.facet#code"
                  }
                ]
              },
              {
                "index": {
                  "byteEnd": 307,
                  "byteStart": 297
                },
                "features": [
                  {
                    "uri": "https://notes.cosmik.network/3m7t343lpjk2n",
                    "$type": "pub.leaflet.richtext.facet#link"
                  }
                ]
              }
            ],
            "plaintext": "The first type of interop is taking a record of one lexicon and mapping it to another. For example, if someone bookmarks a url with @kipclip.com, Semble can listen to the firehose for community.lexicon.bookmarks.bookmark record creation events and convert it to a network.cosmik.card record (with provenance). The bookmark would then show up as a card in Semble."
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "alt": "a diagram showing a community lexicon bookmark record being converted to a semble card record",
            "$type": "pub.leaflet.blocks.image",
            "image": {
              "$type": "blob",
              "ref": {
                "$link": "bafkreiazlipvddqdvnyqmtkz5lvp4uy2rjb5wpq3sbyih4gzqo2nvvlazy"
              },
              "mimeType": "image/png",
              "size": 324258
            },
            "aspectRatio": {
              "width": 3588,
              "height": 1839
            }
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "$type": "pub.leaflet.blocks.text",
            "facets": [
              {
                "index": {
                  "byteEnd": 78,
                  "byteStart": 67
                },
                "features": [
                  {
                    "uri": "https://notes.wesleyfinck.org/3m3au34v5ms2m",
                    "$type": "pub.leaflet.richtext.facet#link"
                  }
                ]
              }
            ],
            "plaintext": "For these cases, I think it’s important that it’s an opt-in “integration” where various settings can be configured. E.g. how to convert tags to collections (if at all). This approach also ensures the user consents to their non-Semble data being visible in Semble."
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "alt": "a mock up of an integration configuration screen in semble showing options for importing links from leaflet publications",
            "$type": "pub.leaflet.blocks.image",
            "image": {
              "$type": "blob",
              "ref": {
                "$link": "bafkreif7j2kn3mmoctfrhl7iumzhkzqo4tamt6jmfat5sx7v27ylzdcb2e"
              },
              "mimeType": "image/png",
              "size": 2984786
            },
            "aspectRatio": {
              "width": 5182,
              "height": 3369
            }
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "$type": "pub.leaflet.blocks.text",
            "facets": [],
            "plaintext": "Above is an example of how various ATmosphere integrations could be enabled and configured in Semble. Picture the list on the left including Kipclip as well."
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "$type": "pub.leaflet.blocks.header",
            "level": 1,
            "facets": [],
            "plaintext": "Activity Types"
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "$type": "pub.leaflet.blocks.text",
            "facets": [],
            "plaintext": "The other type of interop doesn’t require any kind of record mapping. Instead, the original record is displayed as a separate activity type in the app. In Semble, this could show up in our explore feed as different feed activities."
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "alt": "a mock up of two different semble feed activity types: \"posted about\" which shows a link an account posted about on bluesky, and \"monomarked\" showing a link an account saved on monomarks.",
            "$type": "pub.leaflet.blocks.image",
            "image": {
              "$type": "blob",
              "ref": {
                "$link": "bafkreih5amyzs5msxbw7j2vlehmjwq3enlad2g6leqoimgyof3znvyk3zu"
              },
              "mimeType": "image/png",
              "size": 412493
            },
            "aspectRatio": {
              "width": 2555,
              "height": 1574
            }
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "$type": "pub.leaflet.blocks.text",
            "facets": [
              {
                "index": {
                  "byteEnd": 129,
                  "byteStart": 116
                },
                "features": [
                  {
                    "did": "did:plc:e3fsm7lfx33k3gvflqzie3mj",
                    "$type": "pub.leaflet.richtext.facet#didMention"
                  }
                ]
              }
            ],
            "plaintext": "The example here demonstrates how we could show links from Bluesky posts as well as bookmarks from other apps, like @monomarks.at. This could also be configurable by letting users toggle which activity types they want to see in their feed."
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "$type": "pub.leaflet.blocks.text",
            "facets": [],
            "plaintext": "What’s nice about this approach is that the notion of an “activity” keeps things flexible without needing to introduce new concepts into Semble."
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "$type": "pub.leaflet.blocks.text",
            "facets": [],
            "plaintext": "Furthermore, these activities could still show up on the users Semble profile, but instead of being under the Card tab, they could show up in an Activity tab (not yet implemented!)."
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "alt": "a mockup of an activity tab on a semble profile showing the same activities as above",
            "$type": "pub.leaflet.blocks.image",
            "image": {
              "$type": "blob",
              "ref": {
                "$link": "bafkreiapxvx7a2hf2umv6e74t5xpiqlo4zi5ac6p4lt6k6a36q3lqpcxby"
              },
              "mimeType": "image/png",
              "size": 4967325
            },
            "aspectRatio": {
              "width": 8128,
              "height": 4668
            }
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "$type": "pub.leaflet.blocks.header",
            "level": 1,
            "facets": [],
            "plaintext": "A Pragmatic Approach"
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "$type": "pub.leaflet.blocks.text",
            "facets": [],
            "plaintext": "On the protocol builder spectrum of pragmatism vs rigour, I see the discussions around shared lexicon best practices leaning towards the right. For a healthy ecosystem in the nascent stages we find ourselves, though, I think we’ll want a spread of solutions across the spectrum."
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "alt": "a spectrum with \"pragmatic\" on the left and \"rigorous\" on the right. Lexicon mapping and activity types are closer to the left while shared lexicons are closer to the right.",
            "$type": "pub.leaflet.blocks.image",
            "image": {
              "$type": "blob",
              "ref": {
                "$link": "bafkreibe5hptk3y2xsuelmmtys67eh7zcv5z6i4kzuniwbi6uzwxsfiuxu"
              },
              "mimeType": "image/png",
              "size": 165885
            },
            "aspectRatio": {
              "width": 2555,
              "height": 1574
            }
          }
        },
        {
          "$type": "pub.leaflet.pages.linearDocument#block",
          "block": {
            "$type": "pub.leaflet.blocks.text",
            "facets": [],
            "plaintext": "I’m excited to hear other ideas!"
          }
        }
      ]
    }
  ],
  "title": "Two Types of Interoperability Without Sharing Lexicons",
  "author": "did:plc:6z5botgrc5vekq7j26xnvawq",
  "description": "Sharing lexicons is not the only way to leverage atproto’s interoperability",
  "publication": "at://did:plc:6z5botgrc5vekq7j26xnvawq/pub.leaflet.publication/3ly4c4cmyn22t",
  "publishedAt": "2025-12-24T10:44:58.554Z"
}

{
  "name": "Wesley's notes",
  "$type": "pub.leaflet.publication",
  "base_path": "notes.wesleyfinck.org",
  "description": "",
  "preferences": {
    "showComments": true,
    "showInDiscover": true
  }
}
```
