/**
 * The canonical normalization for quoted annotation text, and the passage
 * map key built on top of it. The implementation lives in @semble/types
 * (utils/annotationCid) so the webapp and extension share the exact same
 * rule — see that file for the full contract. Re-exported here so existing
 * domain/infrastructure imports keep working.
 */
export { normalizeQuotedText, annotationPassageKey } from '@semble/types';
