# Earshot - Demo Development Plan

**Target:** 50 beta testers  
**Timeline:** Flexible (side project)

---

## Feature Priority Analysis

### Recommendation: Consider Deferring Video Support

**High Value, High Cost Features:**

| Feature            | Value  | Complexity | Recommendation |
| ------------------ | ------ | ---------- | -------------- |
| Video in posts     | Medium | High       | Defer to v1.1  |
| Video in DMs       | Low    | High       | Defer to v1.1  |
| Push notifications | High   | Medium     | Include        |
| Read receipts      | Medium | Low        | Include        |
| Voice messages     | Medium | Medium     | Include        |
| Mute conversations | Medium | Low        | Include        |
| Theme toggle       | Low    | Low        | Include        |

**Rationale for Deferring Video:**

1. **Storage costs:** Videos are 10-50x larger than photos
2. **Complexity:** Requires transcoding, thumbnail generation, streaming
3. **Upload UX:** Progress indicators, background uploads, failure handling
4. **Playback:** Buffer management, quality adaptation
5. **Demo value:** Photos convey the core experience effectively

**Recommendation:** Launch demo with photo-only support. Video can be added post-demo based on user feedback. This reduces initial complexity by ~30%.

---

## Development Phases

### Phase 0: Project Setup ✅

**Estimated Effort:** 1-2 sessions

- [x] Initialize Expo project
- [x] Configure TypeScript
- [x] Set up project structure (folders, aliases)
- [x] Set up Rose Pine theme (dark/light)
- [x] Configure ESLint + Prettier
- [x] Create base reusable components
  - [x] Button (variants: primary, secondary, success, error, ghost; bracket style `[TEXT]`)
  - [x] TextInput (with validation states)
  - [x] Avatar (with grey fallback)
  - [x] LoadingSpinner
  - [x] ScreenContainer
  - [x] Modal (sharp corners, consistent styling)

### Phase 1: Firebase & Authentication ✅

**Estimated Effort:** 2-3 sessions

- [x] Create Firebase project
- [x] Configure Firebase Auth
- [x] Configure Firestore
- [x] Configure Firebase Storage
- [x] Set up Firestore security rules (initial)
- [x] Set up Storage security rules (initial)
- [x] Implement AuthContext
- [x] Build screens:
  - [x] Welcome screen (first launch)
  - [x] Login screen
  - [x] Signup screen
  - [x] Email verification screen
  - [x] Password reset screen
- [x] Implement auth state persistence
- [x] Implement logout functionality

### Phase 2: User Profile ✅

**Estimated Effort:** 1-2 sessions

- [x] Create User collection in Firestore
- [x] Username uniqueness check
- [x] Profile photo upload to Storage
- [x] Build Profile tab:
  - [x] View profile
  - [x] Edit full name
  - [x] Edit profile photo
  - [x] Change email (with re-verification)
  - [x] Change password
  - [x] Change username (with uniqueness check)
  - [x] Dark/Light theme toggle
  - [x] Logout button
  - [x] Delete account (with confirmation)

### Phase 3: Friends System ✅

**Estimated Effort:** 2-3 sessions

- [x] Create Friendships collection
- [x] Create Blocks collection
- [x] Implement friend request logic
- [x] Implement friend acceptance logic
- [x] Implement 150 friend limit validation
- [x] Build Friends tab:
  - [x] Current friends list
  - [x] Fuzzy search existing friends (for managing)
  - [x] Search for new users by exact username
  - [x] Send friend request
  - [x] Pending requests (incoming)
  - [x] Pending requests (outgoing)
  - [x] Accept/decline requests
  - [x] Remove friend
  - [x] Block user
  - [x] View blocked users
  - [x] Unblock user
- [x] Build reusable FriendRow component

### Phase 4: Posts & Feed

**Estimated Effort:** 3-4 sessions

- [x] Create Posts collection
- [x] Implement photo upload (multiple)
- [x] Image processing:
  - [x] Maintain aspect ratio (scale long side to 1440px)
  - [x] Store crop data (scale, x, y) with media
- [x] Build Create tab:
  - [x] Photo picker (up to 6)
  - [x] PhotoEditor system:
    - [x] PhotoStrip (horizontal list with drag-to-reorder)
    - [x] PhotoCropEditor (pinch-to-zoom, pan gestures)
    - [x] Crop indicator with 36px padding on long side
    - [x] Independent crop settings per image
  - [x] Text body input
  - [x] Post submission
  - [x] Upload progress indicator
  - [x] Post success feedback
- [x] Build Feed tab:
  - [x] Fetch friends' posts
  - [x] Reverse chronological sort
  - [x] Pull-to-refresh
  - [x] Infinite scroll pagination
- [x] Build PostCard component:
  - [x] Author info (photo, name)
  - [x] Media slideshow
  - [x] Position indicator (1/6)
  - [x] Text body
  - [x] Heart button (hidden for own posts)
  - [x] Comment button (hidden for own posts)
  - [x] Timestamp display (relative < 1 week, absolute >= 1 week)
  - [x] Three dots button for all posts (owner and non-owner)
  - [x] disableAuthorPress prop to disable author navigation
  - [x] Three dots button for all posts (owner and non-owner)
  - [x] disableAuthorPress prop to disable author navigation
- [x] Build PostInteractionModal component:
  - [x] Quoted content preview (matches DM appearance)
  - [x] Heart mode (preview + send)
  - [x] Comment mode (text input + send)
  - [x] [CANCEL] and [SEND] buttons
- [x] Build MediaSlideshow component:
  - [x] Uses clamped aspect ratio of first media
  - [x] Applies crop data (scale, x, y) to position images
  - [x] Swipeable slides
  - [x] Position indicator and dot navigation
- [x] Build Post Detail page:
  - [x] Dedicated route for viewing a single post (`/post/[id]`)
  - [x] Full post display (same as PostCard but standalone)
  - [x] Heart and comment buttons
  - [x] Navigation from quoted content in messages
  - [x] Back navigation
  - [x] Header with user avatar and name format: "{User name}'s Post"
  - [x] Disable author navigation (disableAuthorPress prop)
  - [x] Three dots button for all posts (owner and non-owner)
  - [x] Non-owner modal with "Open DM" option
- [x] Build User Feed page:
  - [x] Dedicated route for viewing a user's posts (`/user/[id]`)
  - [x] Full screen page with header showing user avatar and name
  - [x] Displays all posts by that user with infinite scroll pagination
  - [x] Heart and comment buttons
  - [x] Navigation from author name click in feed
  - [x] Back navigation
  - [x] Disable author navigation (disableAuthorPress prop)
  - [x] Three dots button for all posts (owner and non-owner)
  - [x] Non-owner modal with "Open DM" option
- [ ] Build MediaViewer (full screen):
  - [ ] Swipeable slides
  - [ ] Pinch-to-zoom
  - [ ] Per-media heart/comment (triggers InteractionModal)
  - [ ] Close gesture/button
- [x] Implement post editing (text + media):
  - [x] Edit text body
  - [x] Add/remove/reorder photos
  - [x] Edit crop settings for existing photos
  - [x] Upload progress indicator
- [x] Implement post deletion
- [x] Reusable components extracted:
  - [x] PhotoEditor system (PhotoStrip, PhotoCropEditor)
  - [x] UploadProgress component
  - [x] usePhotoPicker hook

### Phase 4.5: Fan-Out Feed System (Feed Optimization)

**Estimated Effort:** 3-4 sessions

**Goal:** Migrate the main feed (FeedScreen) from pull-based feed (limited to 30 friends) to fan-out on write pattern for scalable, real-time feed with unlimited friends. Note: User-specific feeds (UserFeedScreen) will continue using direct post queries and are NOT affected by this change.

#### Cloud Functions Setup

- [ ] Initialize Firebase Functions project
- [ ] Configure TypeScript for Functions
- [ ] Set up Firebase Admin SDK
- [ ] Configure function deployment settings (concurrency, memory, timeout)

#### Fan-Out Function (Post Creation)

- [ ] Create `onPostCreate` Cloud Function:
  - [ ] Trigger: `onCreate(posts/{postId})`
  - [ ] Fetch author's friends list efficiently
  - [ ] Use BulkWriter for parallel fan-out writes (not single batch)
  - [ ] Write to `feeds/{friendUid}/items/{postId}` for each friend
  - [ ] Include idempotent writes (docId = postId)
  - [ ] Add guards: skip if no friends, handle errors gracefully
  - [ ] Copy full post data into feed item (all Post fields)
  - [ ] Add `postId` field explicitly (same as document ID, for easy reference)
  - [ ] Add `expireAt` field for TTL (required: createdAt + 30 days)
  - [ ] Handle concurrency and hot spot prevention

#### Backfill Function (Friend Addition)

- [ ] Create `onFriendAdd` Cloud Function:
  - [ ] Trigger: `onCreate(friendships/{friendshipId})` where status='accepted'
  - [ ] Backfill last K posts (e.g., 50) from new friend
  - [ ] Use idempotent writes to avoid duplicates
  - [ ] Handle bidirectional friendship (backfill for both users)

#### Firestore Schema Updates

- [ ] Add `feeds/{viewerUid}/items/{postId}` collection structure
- [ ] Define FeedItem type as superset of Post:
  - [ ] All Post fields (id, authorId, textBody, media, mediaAspectRatio, createdAt, updatedAt)
  - [ ] postId (explicit field, same as document ID - for easy reference in quotedContent, etc.)
  - [ ] expireAt (required Timestamp for TTL - 30 days from createdAt)
  - [ ] Note: FeedItem contains full post data, no need to fetch post separately
- [ ] Enable TTL policy in Firestore:
  - [ ] Go to Google Cloud Console → Firestore → Time-to-live
  - [ ] Create TTL policy for collection group `items` (under `feeds/{uid}/items`)
  - [ ] Set TTL field to `expireAt`
  - [ ] Note: TTL deletions happen within ~24 hours of expiration
- [ ] Create composite index: `feeds/{uid}/items` with `orderBy(createdAt desc)`

#### Security Rules Updates

- [ ] Add rules for `feeds/{viewerUid}/items/{postId}`:
  - [ ] Allow read only for owner (`request.auth.uid == viewerUid`)
  - [ ] Deny all client writes (server-only)
- [ ] Update posts rules if needed (should remain same)

#### Client-Side Implementation

- [ ] Create FeedContext (similar to ConversationsContext):
  - [ ] Support only "main" feed type (NOT user-specific feeds)
  - [ ] Cache feed data for main feed only
  - [ ] Real-time subscription for feed head (limit 30-50)
  - [ ] Pagination for tail using cursor-based `getDocs`
  - [ ] Track scroll position
  - [ ] Track `lastSeenAt` timestamp for "N new posts" feature
  - [ ] Store `unseenNewPosts` array
- [ ] Update feed service functions:
  - [ ] `getFeedHead()` - Real-time subscription for main feed
  - [ ] `getFeedTail(cursor)` - Paginated fetch for main feed
  - [ ] Note: Subscription callback handles "N new posts" detection (compare new posts to `lastSeenAt`)
- [ ] Update FeedScreen to use FeedContext:
  - [ ] Replace `useFeedPosts` hook with `useFeed()` (main feed only)
  - [ ] Implement real-time head subscription
  - [ ] Implement paginated tail loading
  - [ ] Track scroll position
  - [ ] Show "N new posts" banner when scrolled down
  - [ ] Handle banner click (scroll to top, merge unseen posts)
- [ ] Keep UserFeedScreen unchanged:
  - [ ] Continue using existing `useFeedPosts` hook
  - [ ] Continue using direct posts query (`where('authorId', '==', userId)`)
  - [ ] Do NOT use FeedContext for user-specific feeds
  - [ ] Note: User feeds don't need fan-out since they query posts directly
- [ ] Update PostDetailScreen:
  - [ ] Keep using direct post fetch (no feed needed)
- [ ] Remove old main feed query logic only:
  - [ ] Remove `getFeedPosts` with `where('authorId', 'in', ...)` from FeedScreen
  - [ ] Keep `useFeedPosts` hook for UserFeedScreen (still needed)
  - [ ] Clean up batched query logic from FeedScreen only

#### Migration Strategy

- [ ] Enable TTL policy in Firestore:
  - [ ] Go to Google Cloud Console → Firestore → Time-to-live
  - [ ] Create TTL policy for collection group `items` (under `feeds/{uid}/items`)
  - [ ] Set TTL field to `expireAt`
  - [ ] Wait for policy to become active (may take several minutes)
- [ ] Deploy Cloud Functions:
  - [ ] Deploy `onPostCreate` function (fan-out for new posts)
  - [ ] Deploy `onFriendshipWrite` function (backfill for new friendships)
  - [ ] Verify functions are active and working
- [ ] Switch FeedScreen to new feed system:
  - [ ] Update FeedScreen to use FeedContext (new feed system)
  - [ ] Test that new posts appear in feed correctly
  - [ ] Note: Existing posts won't be in feeds (they're mock data, not needed)
  - [ ] Note: User-specific feeds remain unchanged (continue using direct post queries)
- [ ] Cleanup:
  - [ ] Remove old main feed query code from FeedScreen after migration complete
  - [ ] Keep `useFeedPosts` hook for UserFeedScreen (still needed)
  - [ ] No backfill needed - only new posts matter

#### Testing & Validation

- [ ] Test fan-out on post creation:
  - [ ] Verify feed items appear in all friends' feeds
  - [ ] Verify full post data is copied correctly
  - [ ] Verify expireAt is set correctly (createdAt + 30 days)
  - [ ] Test with user having 150 friends
  - [ ] Test error handling (no friends, function failure)
- [ ] Test backfill on friend add:
  - [ ] Verify last 50 posts appear in new friend's feed
  - [ ] Test bidirectional backfill
  - [ ] Verify idempotency (no duplicates)
- [ ] Test client feed loading (main feed only):
  - [ ] Real-time head subscription works for FeedScreen
  - [ ] Pagination works correctly for FeedScreen
  - [ ] "N new posts" banner appears/disappears correctly
  - [ ] Scroll position tracking works
  - [ ] Verify UserFeedScreen still works with existing `useFeedPosts` hook
- [ ] Test edge cases:
  - [ ] User with 0 friends (main feed should be empty)
  - [ ] User with 150 friends (main feed should work correctly)
  - [ ] Post deletion (should remove from feeds via expireAt TTL - future enhancement)
  - [ ] Friend removal (should remove from feeds - future enhancement)
  - [ ] User-specific feed still works independently (not affected by feed system)

### Phase 5: Messages & Conversations

**Estimated Effort:** 5-6 sessions

**Design Philosophy:** Build a unified conversation system that supports both direct messages (DMs) and group chats from the start. DMs are treated as 2-person conversations, allowing seamless integration.

#### Data Model & Infrastructure

- [x] Create Conversations collection (unified for DMs and groups):
  - [x] Participants array (user IDs)
  - [x] Type field (`'dm'` | `'group'`) or derive from participant count
  - [x] Group name (null for DMs, required for groups)
  - [x] Created by (user ID)
  - [x] Created at (timestamp)
  - [x] Last message at (timestamp) - using hybrid approach (timestamp only, no full message object)
  - [x] Unread counts (per participant)
  - [x] Muted by (array of user IDs)
- [x] Create Messages collection:
  - [x] Conversation ID (reference)
  - [x] Sender ID (user ID)
  - [x] Content (text, media URL, voice URL)
  - [x] Type (`'text'` | `'photo'` | `'video'` | `'voice'` | `'heart'` | `'comment'` | `'reaction'`)
  - [x] Quoted content (optional):
    - [x] Type (`'post'` | `'message'`)
    - [x] Post reference (if type='post')
    - [x] Message reference (if type='message') - message ID only (same conversation)
    - [x] Preview data (text preview, media thumbnail, sender info)
    - [x] Constraint: Quoted messages must be from the same conversation
  - [x] Created at (timestamp)
  - [x] Read receipts (array of user IDs who have read)
  - [x] Deleted at (timestamp, optional) - for soft delete
  - [x] Reaction type field (for reaction messages: 'heart', etc.)
  - [x] Reactions as message type (type='reaction' with quotedContent pointing to target message)
- [x] Design services layer to handle both DM and group chat operations:
  - [x] Conversations service (create, get, update, findOrCreateDM, group management)
  - [x] Messages service (create, get, pagination, mark as read, delete, quoted message validation)

#### Core Messaging Features (DM-first implementation)

- [x] Build Messages tab:
  - [x] Unified conversations list (DMs and groups)
  - [x] Unread indicator (per conversation)
  - [x] Last message preview
  - [x] Timestamp display
  - [x] Conversation type indicator (optional)
  - [x] [NEW] button to create new conversations
  - [x] Modal for searching friends to create DMs
  - [x] Fuzzy search for friends in new conversation modal
  - [x] Find or create DM functionality
  - [x] "CREATE GROUP" button (hidden - post v1 feature)
- [x] Build MessageInput component:
  - [x] Text input with multiline support
  - [x] Photo picker button
  - [x] Voice recorder button (placeholder)
  - [x] Send button (appears when text is entered)
  - [x] Quoted content preview
  - [x] Input stays focused after sending (for quick messages)
- [x] Build Conversation screen (works for both DMs and groups):
  - [x] Message list (reverse chronological, infinite scroll - see details below)
  - [x] Text input
  - [x] Send button
  - [x] Photo picker
  - [x] Message bubbles (sent/received styling)
  - [x] Pending messages (50% opacity until confirmed sent)
  - [x] Read receipts (delivered/read)
  - [x] "Beginning of your conversation with {User}" component before first message
  - [ ] Timestamp display improvements:
    - [ ] Instagram-style swipe left to reveal timestamp (hide timestamp by default, show on swipe)
    - [ ] Insert time breaks between messages:
      - [ ] If messages < 24hrs old: insert break if time difference > 1 hour (format: "4:11pm")
      - [ ] If messages >= 24hrs old: insert break when days are different (format: "Jan 10th")
      - [ ] Display breaks centered between message groups
      - [ ] Format: "4:11pm" for same day, "Jan 10th" for different days
  - [ ] Swipe right to reply on message:
    - [ ] Detect swipe right gesture on message bubble
    - [ ] Show visual feedback during swipe (message slides, reply indicator)
    - [ ] On swipe completion, quote the message and focus input
    - [ ] Pre-fill message input with quoted message reference
  - [x] Typing indicators (see details below)
  - [x] Quoted content display:
    - [x] Support quoted posts (from PostInteractionModal)
    - [x] Support quoted messages (text, photo, voice)
    - [x] Clickable quoted content:
      - [x] Quoted post → Navigate to post detail page (handler ready, page not yet built)
      - [x] Quoted message → Scroll to original message in conversation (see details below)
    - [x] Extract QuotedContent component for reuse (message, input, modal variants)
  - [x] Scroll-to-message functionality (when clicking quoted message - basic implementation):
    - [x] Scroll to target message using FlatList.scrollToIndex()
    - [x] Highlight target message briefly (fade animation to highlightHigh)
    - [ ] If not loaded, fetch message with context (10 messages before/after) - TODO
    - [ ] Merge context messages into existing list - TODO
    - [ ] Handle edge cases: deleted quoted message, network failure, very old messages - TODO
  - [x] Long-press on messages to open MessageContextModal
  - [ ] Mute/unmute conversation toggle
  - [x] Conditional UI based on conversation type:
    - [x] DM: Show other user's name/avatar in header
    - [ ] Group: Show group name and participant list/avatars
    - [x] Group: Show sender name in message bubbles
- [x] Implement heart-to-conversation flow:
  - [x] Use `findOrCreateDM()` to ensure DM exists (lazy creation)
  - [x] Send heart message with quoted post content (type='heart', no content)
  - [x] Support sending to group chats (if user is in group with post author)
  - [x] Heart count feature:
    - [x] Add `heartCount` field to Message type (default: 1)
    - [x] In PostInteractionModal heart mode: show hint "tap the heart bubble to add more hearts"
    - [x] Make heart bubble pressable to increment heartCount before sending
    - [x] Display multiple hearts (repeat ❤️ by heartCount) in MessageBubble
    - [x] Update createMessage to handle heartCount
- [x] Implement comment-to-conversation flow:
  - [x] Use `findOrCreateDM()` to ensure DM exists (lazy creation)
  - [x] Send comment message with quoted post content
  - [x] Support sending to group chats (if user is in group with post author)
- [x] Build MessageContextModal component:
  - [x] Triggered by long-press on any message in conversation
  - [x] Shows interaction options based on message state and ownership:
    - [x] Heart message (toggle reaction - inline, not a new message)
    - [x] Reply to message (quote message)
    - [x] Delete message (only for sender's own messages)
  - [x] Modal with sharp corners, flat design (consistent with app style)
  - [x] [CANCEL] button to close
- [x] Implement inline message reactions:
  - [x] Add 'reaction' as message type
  - [x] Reaction messages quote target message (quotedContent with empty preview)t 
  - [x] Support reaction types (starting with 'heart', extensible for future)
  - [x] Toggle reactions (create reaction message if not present, delete if present)
  - [x] Backend functions: toggleMessageReaction, getMessageReactions, getReactionCount, hasUserReacted
  - [x] Reaction messages don't update conversation lastMessageAt (don't bump to top)
  - [x] UI: Display reaction counts and indicators on message bubbles
  - [x] UI: Show which users have reacted (optional: tooltip or expandable list)
  - [x] UI: Filter out reaction messages from main message list (show as reactions on target messages)
- [x] Implement message quoting flow:
  - [x] Triggered from MessageContextModal "Reply" option
  - [x] Show quote preview (text, photo thumbnail, voice indicator) in MessageInput
  - [x] Pre-fill message input with quoted message reference
  - [x] Send new message with quoted message reference
  - [x] Support quoting text, photo, and voice messages
  - [x] Constraint: Messages can only be quoted within the same conversation
- [x] Implement message deletion:
  - [x] Backend: Soft delete (mark as deleted, don't remove from database)
  - [x] Backend: Strip all content (text, media, voice, quoted content)
  - [x] Backend: Only sender can delete their own messages
  - [x] UI: Triggered from MessageContextModal "Delete" option
  - [x] UI: Show "Deleted message" placeholder in conversation
  - [ ] UI: Confirmation modal before deletion - TODO
- [x] Real-time message updates (Firestore listeners for both types)
- [x] Infinite scroll pagination for conversations:
  - [x] Load initial batch (50 messages, reverse chronological)
  - [x] Load more on scroll up (older messages)
  - [x] Track cursor and hasMore state
  - [x] Handle empty conversation state
  - [x] Handle network failures during pagination
- [x] Optimistic UI updates (pending messages):
  - [x] Add pending messages to state immediately on send
  - [x] Show pending messages with 50% opacity
  - [x] Match pending messages with real messages when they arrive (by content + timestamp)
  - [x] Handle send failures (mark as failed, allow retry)
  - [x] Prevent duplicate messages when real message arrives
  - [ ] Handle race conditions (real message arrives before pending is added)
- [x] Scroll-to-message functionality (basic implementation):
  - [x] When quoted message is clicked, check if message is loaded
  - [x] Scroll to target message using FlatList.scrollToIndex()
  - [x] Highlight target message briefly (fade animation to highlightHigh)
  - [ ] If not loaded, fetch message with context (10 messages before/after) - TODO
  - [ ] Merge context messages into existing list - TODO
  - [ ] Handle edge cases: deleted quoted message, network failure, very old messages - TODO
- [x] Typing indicators:
  - [x] Update typing state on text input (debounced, 500ms)
  - [x] Clear typing state on message send or input blur
  - [x] Store typing state in Firestore (conversations/{id}/typing/{userId})
  - [x] Listen to typing updates from other participants
  - [x] Display "User is typing..." below input area
  - [x] Handle multiple users typing in group chats ("Alice and Bob are typing...")
  - [x] Auto-cleanup typing state after 10 seconds of inactivity
  - [x] Handle network failures gracefully
- [x] Add scroll to bottom button
- [x] Automatically scroll to bottom on message send

#### Group Chat Features

- [ ] Build group chat creation flow:
  - [ ] Select participants (must be mutual friends with all existing members)
  - [ ] Name the group chat
  - [ ] Create conversation document with type='group'
  - [ ] Validate mutual friend requirements
  - [ ] Require sending first message immediately after creation
  - [ ] Pre-fill message input with "Send the group a hello message" placeholder/text
- [ ] Group chat UI enhancements:
  - [ ] Display group name in conversation header
  - [ ] Show participant list/avatars in header
  - [ ] Group message bubbles with sender identification
  - [ ] Participant count display
- [ ] Group chat management:
  - [ ] Any member can add participants (must be mutual friends with all existing members)
  - [ ] Any member can remove participants
  - [ ] Any member can rename group chat
  - [ ] Participants can leave group chat
- [x] Update PostInteractionModal:
  - [x] Detect existing conversations (DMs and groups) with post author
  - [x] Show conversation selection UI (DM vs group chats)
  - [x] Allow choosing destination before sending
  - [x] Create new DM if none exists
  - [x] Use QuotedContent component for post preview

### Phase 6: Data Caching & Real-time Subscriptions

**Estimated Effort:** 2-3 sessions

**Goal:** Optimize data fetching by implementing caching and real-time subscriptions to reduce duplicate queries and improve UX.

#### Caching Strategy

- [x] Create FriendsContext:
  - [x] Fetch all friends (max 150) and their profiles on app load/login
  - [x] Cache friends list in context/global state
  - [x] Refresh cache only on friend actions (accept/decline/remove/block)
  - [x] Update `areFriends()` to use cached data instead of querying (context method available)
  - [x] Update feed screen to use cached friends list
  - [x] Update friends screen to use cached friends list
  - [x] Update messages screen to use cached friends list

- [x] Create ConversationsCache:
  - [x] Fetch all conversations on messages screen load
  - [x] For each conversation, fetch first page (50 messages) upfront
  - [x] Cache conversations and their initial messages
  - [x] Update messages list to use cached last messages (no individual fetches)
  - [x] Update conversation screen to use cached initial messages

#### Real-time Subscriptions (Hybrid Approach)

- [x] Active conversation messages:
  - [x] Subscribe to messages query when conversation screen is open
  - [x] Unsubscribe when leaving conversation screen
  - [x] Handle new messages in real-time
  - [x] Merge with cached messages (avoid duplicates)

- [x] Conversations list:
  - [x] Subscribe to conversations query when on messages tab
  - [x] Unsubscribe when leaving messages tab
  - [x] Update conversations in real-time (new messages, unread counts)
  - [x] Update lastMessageAt and unreadCounts automatically

#### Pull + Cache (No Subscriptions)

- [x] Friends list: Keep as pull + cache (changes infrequently)
- [ ] Feed posts: Migrate to fan-out on write pattern (see Phase 4.5 below)

#### Implementation Details

- [x] Use `subscribeToQuery` for conversations and messages
- [x] Implement proper cleanup (unsubscribe on unmount)
- [x] Handle subscription errors gracefully
- [x] Merge real-time updates with cached data
- [x] Prevent duplicate data in lists
- [x] Update optimistic UI to work with subscriptions

### Phase 7: Push Notifications

**Estimated Effort:** 1-2 sessions

- [ ] Configure OneSignal account
- [ ] Install OneSignal Expo plugin
- [ ] Request notification permissions
- [ ] Store push tokens in Firestore
- [ ] Set up Cloud Functions for triggers:
  - [ ] New message notification (DM and group chat)
  - [ ] Friend request notification
  - [ ] Group chat mention notification (future)
- [ ] Handle notification tap (deep linking)

### Phase 8: Analytics & Crash Reporting

**Estimated Effort:** 1 session

- [ ] Configure Google Analytics
- [ ] Implement screen tracking
- [ ] Implement key event tracking:
  - [ ] Signup completed
  - [ ] Post created
  - [ ] Message sent
  - [ ] Friend added
  - [ ] Group chat created
- [ ] Configure Sentry
- [ ] Test crash reporting

### Phase 9: Online Presence

**Estimated Effort:** 1 session

- [x] Implement lastSeen heartbeat (update every 60 seconds when app active)
- [x] Add AppState listener to track foreground/background
- [x] Add usePresence hook for heartbeat management
- [x] Update FriendRow to show online indicator (green dot if lastSeen < 2 min)
- [x] Show "Last seen X ago" for offline friends

### Phase 10: Security Hardening

**Estimated Effort:** 1-2 sessions

- [ ] Finalize Firestore security rules
- [ ] Finalize Storage security rules
- [ ] Audit all data access patterns
- [ ] Test blocked user restrictions
- [ ] Test friend-only content access
- [ ] Test group chat access restrictions (mutual friends only)
- [ ] Implement rate limiting (Cloud Functions)
- [ ] Validate all user inputs server-side

### Phase 11: Voice Messages (Optional)

**Estimated Effort:** 1-2 sessions

- [ ] Build VoiceRecorder component:
  - [ ] Record button (hold to record)
  - [ ] Recording indicator
  - [ ] Playback preview before send
  - [ ] Cancel recording
- [ ] Add voice message support to Conversation screen
- [ ] Voice message playback in message bubbles
- [ ] Add voice option to InteractionModal

### Phase 12: Polish & Testing

**Estimated Effort:** 2-3 sessions

- [ ] Loading states for all async operations
- [ ] Error handling and user feedback
- [ ] Empty states (no friends, no posts, no messages, no group chats)
- [ ] Keyboard handling and avoidance
- [ ] Pull-to-refresh everywhere relevant
- [ ] Test on iOS simulator
- [ ] Test on Android emulator
- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] Performance optimization (memo, virtualized lists)

### Phase 13: Beta Deployment

**Estimated Effort:** 1-2 sessions

- [ ] Create app icons
- [ ] Create splash screen
- [ ] Configure EAS Build
- [ ] Build iOS TestFlight version
- [ ] Build Android APK/Internal testing
- [ ] Set up beta tester access
- [ ] Create minimal onboarding documentation
- [ ] Deploy Cloud Functions to production
- [ ] Monitor Sentry for launch issues

---

## Project Structure

```
earshot/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Auth screens (login, signup, etc.)
│   ├── (tabs)/            # Main tab screens
│   │   ├── create.tsx
│   │   ├── feed.tsx
│   │   ├── messages/
│   │   │   ├── index.tsx
│   │   │   └── [conversationId].tsx
│   │   ├── friends.tsx
│   │   └── profile.tsx
│   ├── _layout.tsx
│   └── index.tsx          # Welcome/entry screen
├── components/
│   ├── ui/                # Base UI components
│   │   ├── Button.tsx
│   │   ├── TextInput.tsx
│   │   ├── Avatar.tsx
│   │   ├── Card.tsx
│   │   └── ...
│   ├── posts/             # Post-related components
│   │   ├── PostCard.tsx
│   │   ├── MediaSlideshow.tsx
│   │   ├── MediaViewer.tsx
│   │   └── InteractionModal.tsx
│   ├── messages/          # Message-related components
│   │   ├── ConversationRow.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── QuotedContent.tsx
│   │   └── VoiceRecorder.tsx
│   └── friends/           # Friend-related components
│       ├── FriendRow.tsx
│       └── FriendRequestRow.tsx
├── contexts/
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── usePosts.ts
│   ├── useMessages.ts
│   ├── useFriends.ts
│   └── useUser.ts
├── services/
│   ├── firebase/
│   │   ├── config.ts
│   │   ├── auth.ts
│   │   ├── firestore.ts
│   │   └── storage.ts
│   ├── onesignal.ts
│   ├── analytics.ts
│   └── sentry.ts
├── theme/
│   ├── index.ts
│   ├── rosePine.ts
│   └── components.ts
├── types/
│   ├── user.ts
│   ├── post.ts
│   ├── message.ts
│   └── friendship.ts
├── utils/
│   ├── validation.ts
│   ├── formatting.ts
│   └── constants.ts
├── firebase/              # Firebase Cloud Functions
│   ├── functions/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── notifications.ts
│   │   │   └── triggers.ts
│   │   └── package.json
│   ├── firestore.rules
│   └── storage.rules
├── app.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## Technical Decisions

### Navigation

- **Expo Router** (file-based routing)
- Tab navigation for main screens
- Stack navigation within tabs

### State Management

- **React Context** for global state (auth, theme)
- **Firestore listeners** for real-time data
- Local component state where appropriate
- No Redux/MobX (overkill for this scope)

### Data Fetching

- Direct Firestore SDK calls
- Real-time listeners for messages and feed
- Pagination with cursors for large lists

### Image Handling

- **expo-image-picker** for selection
- **expo-image-manipulator** for processing
- **expo-image** for optimized display
- Compress before upload (quality: 0.8, max dimension: 1440px on longest axis)
- Maintain aspect ratio (scale long side to 1440px)
- Store crop data (scale, x, y) with each media item
- **react-native-draggable-flatlist** for photo reordering
- **react-native-gesture-handler** and **react-native-reanimated** for crop gestures

### Forms

- Controlled components
- Custom validation (no heavy form libraries)

---

## Testing Strategy

### Manual Testing Checklist

- [ ] Complete signup flow
- [ ] Email verification
- [ ] Login/logout
- [ ] Profile editing
- [ ] Send friend request
- [ ] Accept friend request
- [ ] Remove friend
- [ ] Block/unblock user
- [ ] Create post with photos
- [ ] View feed
  - [x] Heart a post (sends to conversation with quoted post)
  - [x] Comment on a post (sends to conversation with quoted post)
  - [x] Click author name to view user feed
  - [x] Click quoted post to view post detail
  - [x] Three dots menu on posts (owner: edit/delete, non-owner: open DM)
  - [x] Send text message
  - [x] Send photo in DM
  - [ ] Send voice message
  - [x] Quote a message in conversation (text, photo, voice)
  - [x] Click quoted message → scrolls to original message (with highlight animation)
  - [ ] Click quoted post → opens post detail page (handler ready, page not yet built)
  - [ ] View post detail page (from quoted content)
  - [ ] Mute/unmute conversation
  - [x] Read receipts working
- [ ] Create group chat (all participants are mutual friends)
- [ ] Send message to group chat
- [ ] Heart/comment post with group chat selection (choose between DM and group chat)
- [ ] Add participant to group chat
- [ ] Remove participant from group chat
- [ ] Leave group chat
- [ ] Rename group chat
- [ ] Theme toggle works
- [ ] Push notifications received (DM and group chat) - Group chat notifications: **Post v1**
- [ ] Delete post
- [ ] Delete account

### Device Testing

- iOS 15+ (iPhone X and newer)
- Android 10+ (various screen sizes)
- Test both dark and light themes

---

## Risk Mitigation

| Risk                         | Mitigation                                |
| ---------------------------- | ----------------------------------------- |
| Firebase costs spike         | Set billing alerts, defer video support   |
| Push notification issues     | Test thoroughly on real devices           |
| Performance with large feeds | Implement pagination early                |
| Security vulnerabilities     | Security rules audit before beta          |
| App store rejection          | Follow guidelines, no placeholder content |

---

## Definition of Done (Demo)

The demo is ready for beta testers when:

1. ✅ Users can create accounts and log in
2. ✅ Email verification is enforced
3. ✅ Users can edit their profile
4. ✅ Users can find friends by exact username
5. ✅ Users can send/accept/decline friend requests
6. ✅ Users can create posts with photos
7. ✅ Users can view friends' posts in feed
8. ✅ Users can heart/comment on posts (sends DM)
9. ✅ Users can send/receive direct messages
10. ⏸️ Users can create and participate in group chats (Phase 6) - **Post v1**
11. ⏸️ Users can choose group chat when hearting/commenting on posts (if group chat exists) - **Post v1**
12. ✅ Push notifications work for messages and requests
13. ✅ App works on both iOS and Android
14. ✅ No critical crashes (Sentry monitored)
15. ✅ Security rules properly restrict access (including group chat mutual friend validation)

---

## Post-Demo Roadmap

After gathering feedback from beta testers:

1. **v1.1** - Video support (posts and DMs)
2. **v1.2** - Notification preferences
3. **v1.3** - Performance optimizations based on real usage
4. **v1.4** - Additional polish from user feedback
5. **v2.0** - Public launch preparation
