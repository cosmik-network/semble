How to use the generated server and client

The generated server

The generated server wraps @atproto/xrpc-server, which itself wraps Express. You call createServer(), register
typed handlers against each NSID method, then attach the underlying Express router to your app.

The handler contract (from the generated types):

// For a query (GET):
type HandlerReqCtx = {
auth: HA // your auth verifier's credentials
params: QueryParams // typed query params — page?, limit?, urlType?, etc.
input: undefined // queries have no body
req: express.Request
res: express.Response
}
type Handler = (ctx: HandlerReqCtx) => Promise<HandlerOutput> | HandlerOutput

// HandlerOutput is one of:
// { encoding: 'application/json'; body: OutputSchema; headers?: ... } ← success
// { status: number; message?: string; error?: 'Unauthorized' } ← error

Registering a handler — getMyUrlCards:

import { createServer } from '@semble/types/api/server'
import { GetUrlCardsUseCase } from '../application/useCases/queries/GetUrlCardsUseCase'

const server = createServer()

server.network.cosmik.semble.cards.getMyUrlCards({
auth: myAuthVerifier, // your existing JWT/OAuth verifier
handler: async ({ auth, params }) => {
const callerDid = auth.credentials.did

      const result = await getUrlCardsUseCase.execute({
        userId: callerDid,
        callingUserId: callerDid,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy as any,
        sortOrder: params.sortOrder as any,
        urlType: params.urlType as any,
        uncollected: params.uncollected,
      })

      if (result.isErr()) {
        return { status: 500, error: 'Unauthorized', message: result.error.message }
      }

      // TypeScript enforces the OutputSchema shape here:
      // { cards: UrlCard[], pagination: Pagination, sorting: CardSorting }
      return {
        encoding: 'application/json',
        body: result.value,
      }
    },

})

Compare that to the existing GetMyUrlCardsController — the logic is identical, you're just dropping the Controller
base class and the manual res.json() / this.ok() calls. The framework handles serialization and HTTP status codes
based on what you return.

Registering a procedure handler — addUrlToLibrary:

server.network.cosmik.semble.cards.addUrlToLibrary({
auth: myAuthVerifier,
handler: async ({ auth, input }) => {
const curatorId = auth.credentials.did

      // input.body is typed: { url: string; note?: string; collectionIds?: string[]; viaCardId?: string }
      const result = await addUrlToLibraryUseCase.execute({
        url: input.body.url,
        note: input.body.note,
        collectionIds: input.body.collectionIds ?? [],
        curatorId,
        viaCardId: input.body.viaCardId,
      })

      if (result.isErr()) {
        // The error union is typed: 'Unauthorized' | 'InvalidUrl'
        return { status: 400, error: 'InvalidUrl', message: result.error.message }
      }

      return {
        encoding: 'application/json',
        body: { urlCardId: result.value.urlCardId, noteCardId: result.value.noteCardId },
      }
    },

})

Attaching to your existing Express app (src/shared/infrastructure/http/app.ts):

// After all your existing app.use('/api/...') calls:
app.use(server.xrpc.router)

// The XRPC server registers routes at /xrpc/<nsid>, so these become:
// GET /xrpc/network.cosmik.semble.cards.getMyUrlCards
// POST /xrpc/network.cosmik.semble.cards.addUrlToLibrary

The server.xrpc.router is a plain Express router, so it slots in anywhere in the middleware stack.

---

The generated client

The generated AtpBaseClient extends XrpcClient from @atproto/xrpc. You construct it with a fetch handler (a
function that makes HTTP requests) and call methods through a namespace tree that mirrors the NSID structure.

Construction:

import { AtpBaseClient } from '@semble/types/api/client'

const client = new AtpBaseClient({
service: 'https://api.semble.so',
headers: {
Authorization: `Bearer ${accessToken}`,
},
})

// Or with a custom fetch function for full control:
const client = new AtpBaseClient(async (url, reqInit) => {
const res = await fetch(url, {
...reqInit,
headers: {
...reqInit.headers,
Authorization: `Bearer ${getToken()}`,
},
})
return res
})

Calling a query:

// params are typed: { page?: number; limit?: number; sortBy?: string; ... }
const res = await client.network.cosmik.semble.cards.getMyUrlCards({
page: 1,
limit: 20,
urlType: 'article',
})

// res.data is typed: { cards: UrlCard[]; pagination: Pagination; sorting: CardSorting }
console.log(res.data.cards)
console.log(res.data.pagination.totalCount)

Calling a procedure:

// data is typed: { url: string; note?: string; collectionIds?: string[]; viaCardId?: string }
const res = await client.network.cosmik.semble.cards.addUrlToLibrary({
url: 'https://example.com/article',
note: 'interesting read',
collectionIds: ['abc-123'],
})

// res.data is typed: { urlCardId: string; noteCardId?: string }
console.log(res.data.urlCardId)

Typed error handling:

The generated client wraps errors into typed classes matching the errors you declared in the lexicon:

import { UnauthorizedError } from '@semble/types/api/client/types/network/cosmik/semble/cards/addUrlToLibrary'

try {
await client.network.cosmik.semble.cards.addUrlToLibrary({ url: '...' })
} catch (err) {
if (err instanceof UnauthorizedError) {
// redirect to login
}
throw err
}

---

What replaces what

┌────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────┐
│ Current │ With generated code │
├────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
│ GetMyUrlCardsController class │ Plain handler function passed to │
│ extending Controller │ server.network.cosmik.semble.cards.getMyUrlCards() │
├────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
│ req.query (untyped strings) │ ctx.params (typed: page?: number, uncollected?: boolean) │
├────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
│ req.body (untyped) │ ctx.input.body (typed InputSchema) │
├────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
│ this.ok(res, data) / │ Return { encoding, body } or { status, error } │
│ this.unauthorized(res) │ │
├────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
│ apiClient.getMyUrlCards(params) in the │ client.network.cosmik.semble.cards.getMyUrlCards(params) │
│ frontend │ │
├────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
│ Manual type imports from @semble/types │ Types inferred from the return value — no separate import needed │
└────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────┘

The biggest practical difference on the server: query params arrive pre-coerced to their declared types. page comes
in as number, not "1" — the XRPC server handles the string→number coercion from the URL query string based on the
lexicon schema. That's something you currently do manually with parseInt(page as string)
