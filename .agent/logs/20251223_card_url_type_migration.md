# Card URL Type Migration Plan

**Date:** 2025-12-23  
**Status:** Planning Phase  

## Overview

Adding a dedicated `urlType` field to the cards table to enable efficient querying by URL type (AUDIO, VIDEO, SOCIAL, etc.) while maintaining backward compatibility.

## Approach: Incremental Migration

### Phase 1: Add Optional Field (Immediate)
- Add `url_type` TEXT column to cards table (nullable)
- Update CardMapper to populate urlType for new cards
- Add indexes for performance
- New cards will be immediately queryable by type

### Phase 2: Hybrid Queries (Temporary)
- Update query services to handle mixed data:
  - Fast indexed lookup for new cards (urlType field)
  - Fallback JSON query for old cards (contentData.metadata.type)
- Use OR conditions to support both data states

### Phase 3: Backfill Migration (Later)
- Run SQL update to populate urlType for existing cards
- Remove fallback JSON queries once migration complete
- Simplify query logic to use only indexed field

## Benefits

✅ **Zero downtime** - No breaking changes  
✅ **Immediate value** - New cards queryable by type right away  
✅ **Gradual migration** - Can backfill when convenient  
✅ **Performance** - Indexed queries for new data  

## Implementation Notes

- URL type classification will use regex-based classifier service
- Known patterns: Spotify episodes → AUDIO, YouTube → VIDEO, etc.
- Fallback to LINK type for unclassified URLs

## Migration SQL (for Phase 3)

```sql
UPDATE cards 
SET url_type = content_data #>> '{metadata,type}'
WHERE type = 'URL' 
  AND url_type IS NULL 
  AND content_data #>> '{metadata,type}' IS NOT NULL;
```

## Next Steps

1. Implement URL classifier service
2. Add urlType field to schema
3. Update CardMapper and query services
4. Test with new cards
5. Plan backfill migration timing
