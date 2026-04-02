Localhost Client Development

When working with a development environment (Authorization Server and Client), it may be difficult for developers to publish in-progress client metadata at a public URL so that authorization servers can access it. This may even be true for development environments using a containerized Authorization Server and local DNS, because of SSRF protections against local IP ranges.

To make development workflows easier, a special exception is made for clients with client_id having origin http://localhost (with no port number specified). Authorization Servers are encouraged to support this exception - including in production environments - but it is optional.

In a localhost client_id scenario, the Authorization Server should verify that the scheme is http, and that the hostname is exactly localhost with no port specified. IP addresses (127.0.0.1, etc) are not supported. The path parameter must be empty (/).

In the Authorization Request, the redirect_uri must match one of those supplied (or a default). Path components must match, but port numbers are not matched.

Some metadata fields can be configured via query parameter in the client_id URL (with appropriate URL encoding):

    redirect_uri (string, multiple query parameters allowed, optional): allows declaring a local redirect/callback URL, with path component matched but port numbers ignored. The default values (if none are supplied) are http://127.0.0.1/ and http://[::1]/.
    scope (string with space-separated values, single query parameter allowed, optional): the set of scopes which might be requested by the client. Default is atproto.

The other parameters in the virtual client metadata document will be:

    client_id (string): the exact client_id (URL) used to generate the virtual document
    client_name (string): a value chosen by the Authorization Server (e.g. "Development client")
    response_types (array of strings): must include code
    grant_types (array of strings): authorization_code and refresh_token
    token_endpoint_auth_method: none
    application_type: native
    dpop_bound_access_tokens: true

Note that this works as a public client, not a confidential client.
Identity Authentication

As mentioned in the introduction, OAuth 2.0 generally provides only Authorization (authz), and additional standards like OpenID/OIDC are used for Authentication (authn). The atproto profile of OAuth requires authentication of account identity and supports the use case of simple identity authentication without additional resource access authorization.

In atproto, account identity is anchored in the account DID, which is the permanent, globally unique, publicly resolvable identifier for the account. The DID resolves to a DID document which indicates the current PDS host location for the account. That PDS (combined with an optional entryway) is the authorization authority and the OAuth Authorization Server for the account. When speaking to any Authorization Server, it is critical (mandatory) for clients to confirm that it is actually the authoritative server for the account in question, which means independently resolving the account identity (by DID) and confirming that the Authorization Server matches. It is also critical (mandatory) to confirm at the end of an authorization flow that the Authorization Server actually authorized the expected account. The reason this is necessary is to confirm that the Authorization Server is authoritative for the account in question. Otherwise a malicious server could authenticate arbitrary accounts (DIDs) to the client.

Clients can start an auth flow in one of two ways:

    starting with a public account identifier, provided by the user: handle or DID
    starting with a server hostname, provided by the user: PDS or entryway, mapping to either Resource Server and/or Authorization Server

One use case for starting with a server instead of an account identifier is when the user does not remember their full account handle or only knows their account email. Another is for authentication when a user’s handle is broken. The user will still need to know their hosting provider in these situations.

When starting with an account identifier, the client must resolve the atproto identity to a DID document. If starting with a handle, it is critical (mandatory) to bidirectionally verify the handle by checking that the DID document claims the handle (see atproto Handle specification). All handle resolution techniques and all atproto-blessed DID methods must be supported to ensure interoperability with all accounts.

In some client environments, it may be difficult to resolve all identity types. For example, handle resolution may involve DNS TXT queries, which are not directly supported from browser apps. Client implementations might use alternative techniques (such as DNS-over-HTTP) or could make use of a supporting web service to resolve identities.

Because authorization flows are security-critical, any caching of identity resolution should choose cache lifetimes carefully. Cache lifetimes of less than 10 minutes are recommended for auth flows specifically.

The resolved DID should be bound to the overall auth session and should be used as the primary account identifier within client app code. Handles (when verified) are acceptable to display in user interfaces, but may change over time and need to be re-verified periodically. When passing an account identifier through to the Authorization Server as part of the Authorization Request in the login_hint, it is recommended to use the exact account identifier supplied by the user (handle or DID) to ensure any sign-in flow is consistent (users might not recognize their own account DID).

At the end of the auth flow, when the client does an initial token fetch, the Authorization Server must return the account DID in the sub field of the JSON response body. If the entire auth flow started with an account identifier, it is critical for the client to verify that this DID matches the expected DID bound to the session earlier; the linkage from account to Authorization Server will already have been verified in this situation.

If the auth flow instead starts with a server (hostname or URL), the client will first attempt to fetch Resource Server metadata (and resolve to Authorization Server if found) and then attempt to fetch Authorization Server metadata. See "Authorization Server" section for server metadata fetching. If either is successful, the client will end up with an identified Authorization Server. The Authorization Request flow will proceed without a login_hint or account identifier being bound to the session, but the Authorization Server issuer will be bound to the session.

After the auth flow continues and an initial token request succeeds, the client will parse the account identifier from the sub field in the token response. At this point, the client still cannot trust that it has actually authenticated the indicated account. It is critical for the client to resolve the identity (DID document), extract the declared PDS host, confirm that the PDS (Resource Server) resolves to the Authorization Server bound to the session by fetching the Resource Server metadata, and fetch the Authorization Server metadata to confirm that the issuer field matches the Authorization Server origin (see draft-ietf-oauth-v2-1 section 7.3.1 regarding this last point).

To reiterate, it is critical for all clients - including those only interested in atproto Identity Authentication - to go through the entire Authorization flow and to verify that the account identifier (DID) in the sub field of the token response is consistent with the Authorization Server hostname/origin (issuer).
