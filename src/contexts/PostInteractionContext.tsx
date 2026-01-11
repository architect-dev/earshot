import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { createMessage } from '@/services/messages';
import { getErrorMessage } from '@/utils/errors';
import { type PostWithAuthor, type QuotedContent } from '@/types';
import { PostInteractionModal, type InteractionType } from '@/components/posts';

interface PostInteractionContextValue {
  handleHeartPress: (post: PostWithAuthor) => void;
  handleCommentPress: (post: PostWithAuthor) => void;
}

const PostInteractionContext = createContext<PostInteractionContextValue | undefined>(undefined);

interface PostInteractionProviderProps {
  children: ReactNode;
}

export function PostInteractionProvider({ children }: PostInteractionProviderProps) {
  const { user } = useAuth();
  const [interactionPost, setInteractionPost] = useState<PostWithAuthor | null>(null);
  const [interactionType, setInteractionType] = useState<InteractionType>('heart');
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [sendingInteraction, setSendingInteraction] = useState(false);

  const handleHeartPress = useCallback((post: PostWithAuthor) => {
    setInteractionPost(post);
    setInteractionType('heart');
    setShowInteractionModal(true);
  }, []);

  const handleCommentPress = useCallback((post: PostWithAuthor) => {
    setInteractionPost(post);
    setInteractionType('comment');
    setShowInteractionModal(true);
  }, []);

  const handleSendInteraction = useCallback(
    async (
      conversationId: string,
      messageType: 'heart' | 'comment',
      content: string | undefined,
      heartCount?: number
    ) => {
      if (!interactionPost || !user) return;

      setSendingInteraction(true);
      try {
        // Create quoted content for the post
        const quotedContent: QuotedContent = {
          type: 'post',
          postId: interactionPost.id,
          senderId: interactionPost.author.id,
          preview: {
            authorName: interactionPost.author.fullName,
            authorUsername: interactionPost.author.username,
            text: interactionPost.textBody || undefined,
            mediaUrl: interactionPost.media.length > 0 ? interactionPost.media[0].url : undefined,
          },
        };

        // Send message with quoted post
        await createMessage({
          conversationId,
          senderId: user.uid,
          type: messageType === 'heart' ? 'heart' : 'comment',
          content: messageType === 'heart' ? undefined : content,
          quotedContent,
          heartCount: messageType === 'heart' ? heartCount || 1 : undefined,
        });

        setShowInteractionModal(false);
        setInteractionPost(null);
      } catch (err) {
        Alert.alert('Error', getErrorMessage(err));
        throw err; // Re-throw so modal can handle it
      } finally {
        setSendingInteraction(false);
      }
    },
    [interactionPost, user]
  );

  const closeInteractionModal = useCallback(() => {
    setShowInteractionModal(false);
    setInteractionPost(null);
  }, []);

  const value: PostInteractionContextValue = {
    handleHeartPress,
    handleCommentPress,
  };

  return (
    <PostInteractionContext.Provider value={value}>
      {children}
      <PostInteractionModal
        visible={showInteractionModal}
        onClose={closeInteractionModal}
        onSend={handleSendInteraction}
        post={interactionPost}
        type={interactionType}
        loading={sendingInteraction}
      />
    </PostInteractionContext.Provider>
  );
}

export function usePostInteraction(): PostInteractionContextValue {
  const context = useContext(PostInteractionContext);
  if (context === undefined) {
    throw new Error('usePostInteraction must be used within a PostInteractionProvider');
  }
  return context;
}
