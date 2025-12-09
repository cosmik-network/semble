get notified for the following:

    someone saves a url to library or collection directly from your card (include a "via" field in lexicon)
    someone adds your collection to one of their collections
    someone collections one of your bsky posts

all of which can be configured (toggled on / off) on the settings page

```typescript
export interface NotificationItem {
  id: string;
  user: User;
  card: UrlCard;
  createdAt: Date;
  collections: Collection[];
  type: NotificationType;
  read: boolean;
}
```

types:

    "user added your card to [their library | collections]" USER_ADDED_YOUR_CARD
    "user added your bsky post to [their library | collections]" USER_ADDED_YOUR_BSKY_POST
    "user added your collection to [their library | collections]" USER_ADDED_YOUR_COLLECTION
