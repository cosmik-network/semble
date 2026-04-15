/**
 * List of known bot DIDs that should be filtered from feeds by default
 *
 * To add a new bot DID, append it to this array.
 * To remove a bot from the filter list, remove its DID from this array.
 */
export const KNOWN_BOT_DIDS: string[] = [
  'did:plc:4j7exarb62djxycrgdfhuulr', // sensemaker.computer
  'did:plc:65sucjiel52gefhcdcypynsr', // phi.zzstoatzz.io
  'did:plc:mxzuau6m53jtdsbqe6f4laov', // void.comind.network
  'did:plc:lchy7sgr7rl42qqzquljpdbq', // dot.atdot.fyi
];
