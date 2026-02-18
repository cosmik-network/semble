```ts
agent.com.atproto.repo.listRecords

  listRecords(
    params?: ComAtprotoRepoListRecords.QueryParams,
    opts?: ComAtprotoRepoListRecords.CallOptions,
  ): Promise<ComAtprotoRepoListRecords.Response> {
    return this._client.call(
      'com.atproto.repo.listRecords',
      params,
      undefined,
      opts,
    )
  }

  export type QueryParams = {
  /** The handle or DID of the repo. */
  repo: string
  /** The NSID of the record type. */
  collection: string
  /** The number of records to return. */
  limit?: number
  cursor?: string
  /** Flag to reverse the order of the returned records. */
  reverse?: boolean
}

export interface Response {
  success: boolean
  headers: HeadersMap
  data: OutputSchema
}

export interface OutputSchema {
  cursor?: string
  records: Record[]
}

export interface Record {
  $type?: 'com.atproto.repo.listRecords#record'
  uri: string
  cid: string
  value: { [_ in string]: unknown }
}

```
