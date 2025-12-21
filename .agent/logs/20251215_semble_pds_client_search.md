```ts
  getRecord(
    params?: ComAtprotoRepoGetRecord.QueryParams,
    opts?: ComAtprotoRepoGetRecord.CallOptions,
  ): Promise<ComAtprotoRepoGetRecord.Response> {
    return this._client
      .call('com.atproto.repo.getRecord', params, undefined, opts)
      .catch((e) => {
        throw ComAtprotoRepoGetRecord.toKnownErr(e)
      })
  }

  export type QueryParams = {
  /** The handle or DID of the repo. */
  repo: string
  /** The NSID of the record collection. */
  collection: string
  /** The Record Key. */
  rkey: string
  /** The CID of the version of the record. If not specified, then return the most recent version. */
  cid?: string
}

export interface Response {
  success: boolean
  headers: HeadersMap
  data: OutputSchema
}

export interface OutputSchema {
  uri: string
  cid?: string
  value: { [_ in string]: unknown }
}
```

```ts
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

```ts
  applyWrites(
    data?: ComAtprotoRepoApplyWrites.InputSchema,
    opts?: ComAtprotoRepoApplyWrites.CallOptions,
  ): Promise<ComAtprotoRepoApplyWrites.Response> {
    return this._client
      .call('com.atproto.repo.applyWrites', opts?.qp, data, opts)
      .catch((e) => {
        throw ComAtprotoRepoApplyWrites.toKnownErr(e)
      })
  }

  export interface InputSchema {
  /** The handle or DID of the repo (aka, current account). */
  repo: string
  /** Can be set to 'false' to skip Lexicon schema validation of record data across all operations, 'true' to require it, or leave unset to validate only for known Lexicons. */
  validate?: boolean
  writes: ($Typed<Create> | $Typed<Update> | $Typed<Delete>)[]
  /** If provided, the entire operation will fail if the current repo commit CID does not match this value. Used to prevent conflicting repo mutations. */
  swapCommit?: string
}

export interface Create {
  $type?: 'com.atproto.repo.applyWrites#create'
  collection: string
  /** NOTE: maxLength is redundant with record-key format. Keeping it temporarily to ensure backwards compatibility. */
  rkey?: string
  value: { [_ in string]: unknown }
}

export interface Response {
  success: boolean
  headers: HeadersMap
  data: OutputSchema
}

export interface OutputSchema {
  commit?: ComAtprotoRepoDefs.CommitMeta
  results?: (
    | $Typed<CreateResult>
    | $Typed<UpdateResult>
    | $Typed<DeleteResult>
  )[]
}

export interface CreateResult {
  $type?: 'com.atproto.repo.applyWrites#createResult'
  uri: string
  cid: string
  validationStatus?: 'valid' | 'unknown' | (string & {})
}
```
