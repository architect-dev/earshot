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

### Phase 5: Direct Messages

**Estimated Effort:** 3-4 sessions

- [ ] Create Conversations collection
- [ ] Create Messages collection
- [ ] Build Messages tab:
  - [ ] Conversations list
  - [ ] Unread indicator
  - [ ] Last message preview
  - [ ] Timestamp display
- [ ] Build Conversation screen:
  - [ ] Message list (reverse chronological)
  - [ ] Text input
  - [ ] Send button
  - [ ] Photo picker
  - [ ] Message bubbles (sent/received styling)
  - [ ] Read receipts (delivered/read)
  - [ ] Quoted content display (for hearts/comments)
  - [ ] Mute/unmute conversation toggle
- [ ] Implement heart-to-DM flow
- [ ] Implement comment-to-DM flow
- [ ] Real-time message updates (Firestore listeners)

### Phase 6: Push Notifications

**Estimated Effort:** 1-2 sessions

- [ ] Configure OneSignal account
- [ ] Install OneSignal Expo plugin
- [ ] Request notification permissions
- [ ] Store push tokens in Firestore
- [ ] Set up Cloud Functions for triggers:
  - [ ] New message notification
  - [ ] Friend request notification
- [ ] Handle notification tap (deep linking)

### Phase 7: Analytics & Crash Reporting

**Estimated Effort:** 1 session

- [ ] Configure Google Analytics
- [ ] Implement screen tracking
- [ ] Implement key event tracking:
  - [ ] Signup completed
  - [ ] Post created
  - [ ] Message sent
  - [ ] Friend added
- [ ] Configure Sentry
- [ ] Test crash reporting

### Phase 8: Online Presence

**Estimated Effort:** 1 session

- [ ] Implement lastSeen heartbeat (update every 60 seconds when app active)
- [ ] Add AppState listener to track foreground/background
- [ ] Update FriendRow to show online indicator (green dot if lastSeen < 2 min)
- [ ] Show "Last seen X ago" for offline friends
- [ ] Add usePresence hook for heartbeat management

### Phase 9: Security Hardening

**Estimated Effort:** 1-2 sessions

- [ ] Finalize Firestore security rules
- [ ] Finalize Storage security rules
- [ ] Audit all data access patterns
- [ ] Test blocked user restrictions
- [ ] Test friend-only content access
- [ ] Implement rate limiting (Cloud Functions)
- [ ] Validate all user inputs server-side

### Phase 10: Voice Messages (Optional)

**Estimated Effort:** 1-2 sessions

- [ ] Build VoiceRecorder component:
  - [ ] Record button (hold to record)
  - [ ] Recording indicator
  - [ ] Playback preview before send
  - [ ] Cancel recording
- [ ] Add voice message support to Conversation screen
- [ ] Voice message playback in message bubbles
- [ ] Add voice option to InteractionModal

### Phase 11: Polish & Testing

**Estimated Effort:** 2-3 sessions

- [ ] Loading states for all async operations
- [ ] Error handling and user feedback
- [ ] Empty states (no friends, no posts, no messages)
- [ ] Keyboard handling and avoidance
- [ ] Pull-to-refresh everywhere relevant
- [ ] Test on iOS simulator
- [ ] Test on Android emulator
- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] Performance optimization (memo, virtualized lists)

### Phase 12: Beta Deployment

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
- [ ] Heart a post
- [ ] Comment on a post
- [ ] Send text message
- [ ] Send photo in DM
- [ ] Send voice message
- [ ] Mute/unmute conversation
- [ ] Read receipts working
- [ ] Theme toggle works
- [ ] Push notifications received
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
10. ✅ Push notifications work for messages and requests
11. ✅ App works on both iOS and Android
12. ✅ No critical crashes (Sentry monitored)
13. ✅ Security rules properly restrict access

---

## Post-Demo Roadmap

After gathering feedback from beta testers:

1. **v1.1** - Video support (posts and DMs)
2. **v1.2** - Notification preferences
3. **v1.3** - Performance optimizations based on real usage
4. **v1.4** - Additional polish from user feedback
5. **v2.0** - Public launch preparation
