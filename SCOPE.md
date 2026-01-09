# Earshot - Full Scope Document

**Version:** 1.0  
**Last Updated:** January 9, 2026

---

## Overview

Earshot is a minimal social media application that promotes authentic communication between friends. Inspired by the simplicity of early 2000s email-era communication, Earshot focuses on private, meaningful interactions rather than public metrics and algorithmic feeds.

**Logo:** `))` (representing sound waves)

**Design Philosophy:** Ultra minimal, built around the Rose Pine theme.

**Design Rules:**

- No rounded borders — all sharp corners
- Buttons wrapped in brackets: `[BUTTON TEXT]`

---

## Technical Stack

| Category           | Technology                          |
| ------------------ | ----------------------------------- |
| Framework          | Expo (Managed Workflow)             |
| Platforms          | iOS & Android                       |
| Authentication     | Firebase Auth (Email/Password only) |
| Database           | Cloud Firestore                     |
| Media Storage      | Firebase Storage                    |
| Push Notifications | OneSignal                           |
| Theming            | Custom components (Rose Pine)       |
| Analytics          | Google Analytics                    |
| Crash Reporting    | Sentry                              |

---

## Design System

### Theme: Rose Pine

| Element            | Color Usage         |
| ------------------ | ------------------- |
| Hearts             | Rose (`#eb6f92`)    |
| Comments           | Pine (`#31748f`)    |
| Primary actions    | Gold (`#f6c177`)    |
| Background (dark)  | Base (`#191724`)    |
| Background (light) | Surface (`#faf4ed`) |

### Reusable Components

- **TextInput** - Standard input with validation states
- **Button** - Variants: primary, secondary, success, error, ghost; all wrapped in brackets `[TEXT]`
- **Avatar** - Profile photo display (grey square fallback)
- **Card** - Content containers
- **MediaSlideshow** - Photo/video carousel with indicator
- **MessageBubble** - DM message display
- **PostCard** - Feed post display
- **FriendRow** - Friend list item
- **Badge** - Notification indicators
- **InteractionModal** - Heart/comment modal with quoted content preview
- **VoiceRecorder** - Voice message recording input

---

## User Authentication

### Account Creation

| Field     | Constraints                                                                         |
| --------- | ----------------------------------------------------------------------------------- |
| Username  | Max 24 chars, unique, alphanumeric + underscore only, no spaces                     |
| Full Name | Max 32 chars (single field, not split)                                              |
| Email     | Valid email format, unique                                                          |
| Password  | Industry standard (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char) |

### Authentication Flow

1. **First Launch:** Welcome screen with "Welcome to Earshot" + [NEXT] button
2. **Subsequent Launches:**
   - If authenticated → Route to Feed
   - If not authenticated → Login/Signup screen
3. **Email Verification:** Required before app access
4. **Password Reset:** Via Firebase Auth email flow

### Account Deletion

- Users can fully delete their account
- Deletion removes:
  - All user media (posts, profile photo)
  - All messages sent by user
  - All friendships (removes user from all friends lists)
  - User profile data

---

## Core Features

### 1. CREATE Tab

**Purpose:** Create posts for the user's timeline

**Post Structure:**
| Element | Constraints |
|---------|-------------|
| Media | 1-6 photos OR 1 video (max 1 minute) |
| Text Body | Optional, editable after posting |

**Behavior:**

- Media is displayed as a slideshow
- Indicator shows position (e.g., "1/6")
- Posts appear on user's friends' feeds
- Users can edit text body after posting
- Users can delete entire posts

### 2. FEED Tab

**Purpose:** View friends' posts in reverse chronological order

**Features:**

- Posts sorted newest to oldest
- No algorithmic curation
- Pull-to-refresh functionality

**Post Interactions:**

When user taps heart or comment, a modal opens:

- Modal displays quoted content preview (same as DM appearance)
- If heart: Modal shows preview + action buttons
- If comment: Modal includes text input for comment
- Voice message input option available
- Bottom row: `[CANCEL]` and `[SEND]` buttons
- On send: Creates DM to post author with quoted reference

**Media Behavior:**

- Slideshow with position indicator (bottom right)
- Tap media → Full screen view
- Swipeable through slides in full screen
- Individual media items can be hearted/commented

**Privacy:**

- No public metrics (likes count, comments count not visible)
- All interactions are private DMs

### 3. MESSAGES Tab

**Purpose:** Direct messaging with friends

**Features:**

- List of all friends with message threads
- Each row displays:
  - Profile photo (grey square if none)
  - Friend's name
  - Latest message preview
  - Message timestamp
  - Unread indicator (dot)

**Message Types:**

- Text messages
- Photo messages
- Video messages
- Voice messages
- Heart reactions (to posts/media)
- Comment messages (to posts/media)

**Quote/Reply System:**

- When hearting/commenting on a post, the DM shows the referenced content
- Similar to modern messaging app reply functionality

**Read Receipts:**

- Messages show delivered/read status

**Mute Conversations:**

- Users can mute individual conversations
- Muted conversations still receive messages but don't trigger notifications
- Mute indicator shown in conversation list

### 4. FRIENDS Tab

**Purpose:** Manage friendships

**Features:**

- View current friends list (max 150)
- Fuzzy search existing friends list (for managing friends)
- Search for new users by exact username
- Send friend requests
- View pending incoming requests
- View pending outgoing requests
- Accept/decline incoming requests
- Cancel outgoing requests
- Remove existing friends
- Block users

**Friendship Model:**

- Bi-directional (requires mutual acceptance)
- Maximum 150 friends per user
- No friend recommendations (intentional)

**Blocking:**

- Blocked users cannot:
  - Send friend requests
  - Find user in search
  - View user's content
- Blocking removes existing friendship if present

### 5. PROFILE Tab

**Purpose:** Edit user profile and settings

**Editable Fields:**
| Field | Notes |
|-------|-------|
| Full Name | Max 32 chars |
| Profile Photo | Optional, grey square default |
| Email | Requires re-verification |
| Password | Via secure change flow |
| Username | Max 24 chars, must remain unique |

**Settings:**

- Dark/Light theme toggle

**Actions:**

- Logout
- Delete Account (with confirmation)

---

## Data Models

### User

```
{
  uid: string (Firebase Auth UID)
  username: string (unique, indexed)
  fullName: string
  email: string
  profilePhotoUrl: string | null
  createdAt: timestamp
  updatedAt: timestamp
  friendCount: number
  blockedUsers: string[] (UIDs)
}
```

### Post

```
{
  id: string
  authorId: string (UID)
  textBody: string | null
  media: [{
    type: 'photo' | 'video'
    url: string
    thumbnailUrl: string (for videos)
    order: number
  }]
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Friendship

```
{
  id: string
  requesterId: string (UID)
  addresseeId: string (UID)
  status: 'pending' | 'accepted' | 'declined'
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Conversation

```
{
  id: string
  participants: string[] (2 UIDs)
  lastMessage: {
    text: string
    senderId: string
    timestamp: timestamp
  }
  mutedBy: string[] (UIDs of users who muted)
  updatedAt: timestamp
}
```

### Message

```
{
  id: string
  conversationId: string
  senderId: string
  type: 'text' | 'photo' | 'video' | 'voice' | 'heart' | 'comment'
  content: string | null
  mediaUrl: string | null
  quotedContent: {
    type: 'post' | 'media'
    postId: string
    mediaIndex: number | null
    preview: string
  } | null
  status: 'sent' | 'delivered' | 'read'
  createdAt: timestamp
}
```

### Block

```
{
  id: string
  blockerId: string (UID)
  blockedId: string (UID)
  createdAt: timestamp
}
```

---

## Security & Privacy

### Firestore Security Rules

- Users can only read/write their own profile data
- Users can only read posts from friends
- Users can only read/write messages in their own conversations
- Blocked users cannot access any data related to blocker
- Friend count validated server-side (max 150)

### Media Security

- Firebase Storage rules restrict access to authenticated users
- Profile photos: Public to friends only
- Post media: Accessible only to author's friends
- Message media: Accessible only to conversation participants

### Data Privacy

- No public metrics exposed
- All interactions are private
- No friend recommendations or data mining
- Full account deletion available

### Password Policy

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

---

## Firebase Storage Pricing Considerations

### Current Pricing (as of 2026)

| Tier                  | Storage         | Downloads | Uploads       |
| --------------------- | --------------- | --------- | ------------- |
| Spark (Free)          | 5 GB            | 1 GB/day  | 20K ops/day   |
| Blaze (Pay-as-you-go) | $0.026/GB/month | $0.12/GB  | $0.05/10K ops |

### Cost Projections

**Per User Estimates:**

- Profile photo: ~500 KB
- Average post: 3 photos × 2 MB = 6 MB
- Average message media: 1 MB

**Demo (50 users):**

- Storage: ~50 users × 50 MB average = 2.5 GB (within free tier)
- Bandwidth: Minimal concern at this scale

**Scale Considerations:**

- **1,000 users:** ~50 GB storage = ~$1.30/month
- **10,000 users:** ~500 GB storage = ~$13/month
- **100,000 users:** ~5 TB storage = ~$130/month + significant bandwidth

**When to Reconsider:**

- At 10,000+ active users, evaluate:
  - Cloudinary (better image optimization)
  - AWS S3 + CloudFront (better pricing at scale)
  - Bunny.net (excellent bandwidth pricing)
- Video storage grows fast; consider dedicated video hosting (Mux, Cloudflare Stream) if video usage is high

---

## Third-Party Integrations

### OneSignal (Push Notifications)

- New message notifications
- Friend request notifications
- New post from friend (optional, user preference)

### Google Analytics

- Screen views
- User engagement metrics
- Feature usage tracking
- Funnel analysis (signup, post creation, etc.)

### Sentry (Crash Reporting)

- Automatic crash capture
- Performance monitoring
- Error tracking with context

---

## Future Considerations (Out of Scope for Demo)

- Push notification preferences/settings
- Archive conversations
- Post scheduling
- Draft posts
- Multiple accounts
- App-level passcode/biometric lock
- Media compression options (beyond default 1440p limit)
- Report user/content functionality
- Terms of service & privacy policy screens
