# Sigma graph library

## Data Schema / Graph Data Model

### Node Types

The graph consists of four primary node types:

1. **Users** - User DIDs (Decentralized Identifiers)
   - Source: `users.id`
   - Display: `users.handle` or DID

2. **URLs** - Web resources saved as URL cards
   - Source: `cards.url` where `cards.type = 'URL'`
   - Metadata: `cards.urlType`, `cards.contentData`

3. **Collections** - Curated groups of cards
   - Source: `collections.id`
   - Display: `collections.name`
   - Metadata: `collections.description`, `collections.accessType`

4. **Note Cards** - User annotations and notes
   - Source: `cards.id` where `cards.type = 'NOTE'`
   - Metadata: `cards.contentData`

### Edge Types

The graph relationships are derived from the following sources:

#### 1. Follow Relationships

**User → User** (social follows)

```sql
SELECT followerId, targetId
FROM follows
WHERE targetType = 'user'
```

**User → Collection** (collection follows)

```sql
SELECT followerId, targetId
FROM follows
WHERE targetType = 'collection'
```

#### 2. Authorship (User → URL)

Inferred from URL card creation:

```sql
SELECT authorId as userId, url
FROM cards
WHERE type = 'URL' AND url IS NOT NULL
```

#### 3. Note Connections (Note → URL)

Inferred from note cards referencing parent URL cards:

```sql
SELECT n.id as noteCardId, p.url
FROM cards n
JOIN cards p ON n.parentCardId = p.id
WHERE n.type = 'NOTE' AND p.type = 'URL'
```

#### 4. Collection Memberships (Collection ↔ URL)

Inferred from collection-card relationships:

```sql
SELECT cc.collectionId, c.url
FROM collection_cards cc
JOIN cards c ON cc.cardId = c.id
WHERE c.type = 'URL' AND c.url IS NOT NULL
```

Alternative (include metadata):

```sql
SELECT
  cc.collectionId,
  c.url,
  cc.addedBy,
  cc.addedAt
FROM collection_cards cc
JOIN cards c ON cc.cardId = c.id
WHERE c.url IS NOT NULL
```

### Additional Relationship Data

The `connections` table provides explicit curator-defined relationships between nodes:

```sql
SELECT
  curatorId,
  sourceType,  -- 'URL' or 'CARD'
  sourceValue, -- URL string or Card UUID
  targetType,  -- 'URL' or 'CARD'
  targetValue, -- URL string or Card UUID
  connectionType, -- SUPPORTS, OPPOSES, etc.
  note
FROM connections
```

These can be used to create typed/weighted edges with semantic meaning (e.g., "supports", "opposes").

---

## **Sigma.js + Next.js Setup**

### **1. Install**

```bash
npm install sigma graphology @react-sigma/core @react-sigma/layout-forceatlas2
```

### **2. Dynamic Import Component**

Create `components/Graph.tsx` (no `'use client'` needed—dynamic import handles it):

```typescript
'use client';
import { SigmaContainer, useSigma } from '@react-sigma/core';
import { useEffect, useState } from 'react';
import Graph from 'graphology';

export default function GraphView() {
  const [graph, setGraph] = useState<Graph | null>(null);

  useEffect(() => {
    const g = new Graph();
    g.addNode('a', { x: 0, y: 0, size: 10, label: 'Node A' });
    g.addNode('b', { x: 1, y: 1, size: 15, label: 'Node B' });
    g.addEdge('a', 'b');
    setGraph(g);
  }, []);

  if (!graph) return null;

  return (
    <SigmaContainer style={{ height: '600px', background: '#1e1e1e' }} graph={graph}>
      <GraphEvents />
    </SigmaContainer>
  );
}
```

### **3. Events & Camera Controls**

```typescript
function GraphEvents() {
  const sigma = useSigma();

  const zoomToNode = (nodeId: string) => {
    const node = sigma.getGraph().getNodeAttributes(nodeId);
    sigma.getCamera().animate(
      { x: node.x, y: node.y, ratio: 0.3 },
      { duration: 800 }
    );
  };

  return (
    <Controls zoomToNode={zoomToNode} />
  );
}
```

### **4. Page Integration**

```typescript
import dynamic from 'next/dynamic';

const Graph = dynamic(() => import('@/components/Graph'), { ssr: false });

export default function Page() {
  return <Graph />;
}
```

### **5. Force Layout**

Add physics with `useLayoutForceAtlas2()` hook from `@react-sigma/layout-forceatlas2` [^3]:

```typescript
import { useLayoutForceAtlas2 } from '@react-sigma/layout-forceatlas2';

function GraphWithPhysics({ graph }: { graph: Graph }) {
  const { start, stop } = useLayoutForceAtlas2({
    settings: { gravity: 0.5 },
  });

  useEffect(() => {
    start();
    return () => stop();
  }, []);
  return null;
}
```

**Key notes:** Always use `ssr: false` [^2]. Sigma uses WebGL [^1]—canvas rendering, not DOM elements.

[^1]: [Introduction | sigma.js](https://www.sigmajs.org/docs/) (27%)

[^2]: [Frequently Asked Questions | React Sigma](https://sim51.github.io/react-sigma/docs/faq/) (21%)

[^3]: [react-sigma / sigmaJS example using a force layout?](https://stackoverflow.com/questions/78805061/react-sigma-sigmajs-example-using-a-force-layout) (20%)

[^4]: [Introduction | React Sigma - GitHub Pages](https://sim51.github.io/react-sigma/docs/start-introduction/) (18%)

[^5]: [SEO: Dynamic Imports for Components](https://nextjs.org/learn/seo/dynamic-import-components) (6%)

[^6]: [SEO: Dynamic Imports | Next.js](https://nextjs.org/learn/seo/dynamic-imports) (5%)

[^7]: [React Sigma | React Sigma - GitHub Pages](https://sim51.github.io/react-sigma/) (3%)
