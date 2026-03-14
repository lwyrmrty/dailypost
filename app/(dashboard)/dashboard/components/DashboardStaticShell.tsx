'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DashboardPostEditor, { type RewriteSelectionRequest } from './DashboardPostEditor';
import {
  COMPOSER_IMAGE_MAX_COUNT,
  ComposerImageDto,
  getComposerImageValidationMessage,
} from '@/lib/composer-images';
import { toast } from '@/lib/toast';

interface PostBlock {
  type: 'post';
  platform: 'linkedin' | 'x';
  content: string;
  isThread?: boolean;
  threadParts?: string[];
}

interface TextBlock {
  type: 'text';
  content: string;
}

interface SourceBlock {
  type: 'source';
  title: string;
  url: string;
  subtitle: string;
}

type ContentBlock = PostBlock | TextBlock | SourceBlock;

interface Message {
  role: 'user' | 'assistant';
  content?: string;
  blocks?: ContentBlock[];
}

interface DashboardStaticShellProps {
  html: string;
  userId?: string | null;
  userFirstName?: string | null;
}

interface EditablePostOption {
  id: string;
  platform: 'linkedin' | 'x';
  html: string;
}

interface DraftEditPayload {
  index: number;
  content: string;
}

interface TopicPromptResponse {
  prompt?: string;
}

interface ComposerImageView extends ComposerImageDto {
  isUploading?: boolean;
}

const LOADING_MESSAGES = [
  'Researching...',
  'Pondering...',
  'Tinkering...',
  'Writing...',
  'Magic-making...',
  'Almost there...',
];

const EMPTY_STATE_IMAGE_URL = 'https://cdn.prod.website-files.com/69af8998456ec24b29704c58/69b43398b0f22cc7e5fc0043_thinkingcreative.webp';

function isPostBlock(block: ContentBlock): block is PostBlock {
  return block.type === 'post';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function postBlockToHtml(post: PostBlock) {
  const paragraphs = post.isThread && post.threadParts?.length
    ? post.threadParts
    : post.content.split('\n').map((line) => line.trim()).filter(Boolean);

  return plainTextToHtml(paragraphs.join('\n\n'));
}

function plainTextToHtml(content: string) {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function htmlToPlainText(html: string) {
  if (typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.innerHTML = html;

    return Array.from(container.querySelectorAll('p'))
      .map((paragraph) => paragraph.textContent?.trim() ?? '')
      .filter(Boolean)
      .join('\n\n');
  }

  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function extractFirstUrl(text: string) {
  const match = text.match(/https?:\/\/[^\s<>"')\]]+/i);
  return match ? match[0].replace(/[),.;!?]+$/, '') : null;
}

function buildUrlCard(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const pathBits = parsed.pathname.split('/').filter(Boolean);
    const lastBit = pathBits[pathBits.length - 1] || host;
    const readableTitle = decodeURIComponent(lastBit)
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

    return {
      title: readableTitle.length > 8 ? readableTitle : url,
      subtitle: host.includes('linkedin.com') ? 'LinkedIn' : host,
      isLinkedIn: host.includes('linkedin.com'),
    };
  } catch {
    return {
      title: url,
      subtitle: 'Link',
      isLinkedIn: url.includes('linkedin.com'),
    };
  }
}

interface ComposerImageTileProps {
  image: ComposerImageView;
  isActiveDrag?: boolean;
  onDelete: () => void;
  onOpen: () => void;
  tileRef?: (node: HTMLDivElement | null) => void;
  interactionProps?: React.HTMLAttributes<HTMLDivElement>;
  style?: React.CSSProperties;
}

function ComposerImageTile({
  image,
  isActiveDrag = false,
  onDelete,
  onOpen,
  tileRef,
  interactionProps,
  style,
}: ComposerImageTileProps) {
  return (
    <div
      ref={tileRef}
      className="uploadimage-block"
      onClick={onOpen}
      style={{
        opacity: image.isUploading ? 0.7 : 1,
        cursor: image.isUploading ? 'progress' : isActiveDrag ? 'grabbing' : 'grab',
        touchAction: 'none',
        ...style,
      }}
      {...interactionProps}
    >
      <img
        src={image.publicUrl}
        loading="lazy"
        alt={image.originalName}
        className="fullimage"
        draggable={false}
      />
      <button
        type="button"
        aria-label={`Delete ${image.originalName}`}
        disabled={Boolean(image.isUploading)}
        draggable={false}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        style={{
          position: 'absolute',
          top: '4px',
          left: '4px',
          zIndex: 2,
          width: '18px',
          height: '18px',
          border: 'none',
          borderRadius: '999px',
          background: 'rgba(3, 28, 37, 0.78)',
          color: '#fff',
          cursor: image.isUploading ? 'default' : 'pointer',
          display: 'grid',
          placeItems: 'center',
          padding: 0,
          fontSize: '11px',
          lineHeight: 1,
        }}
      >
        X
      </button>
    </div>
  );
}

interface SortableComposerImageTileProps {
  image: ComposerImageView;
  isAnyImageDragging: boolean;
  isActiveDrag: boolean;
  onDelete: () => void;
  onOpen: () => void;
}

function SortableComposerImageTile({
  image,
  isAnyImageDragging,
  isActiveDrag,
  onDelete,
  onOpen,
}: SortableComposerImageTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: image.id,
    disabled: Boolean(image.isUploading),
  });

  return (
    <ComposerImageTile
      image={image}
      isActiveDrag={isActiveDrag}
      onDelete={onDelete}
      onOpen={onOpen}
      tileRef={setNodeRef}
      interactionProps={{
        ...attributes,
        ...listeners,
      }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 0,
        boxShadow: isAnyImageDragging && !isDragging
          ? '0 6px 14px rgba(3, 28, 37, 0.08)'
          : '0 0 0 rgba(0, 0, 0, 0)',
        filter: isDragging ? 'brightness(1.02)' : undefined,
        opacity: isDragging ? 0.14 : undefined,
      }}
    />
  );
}

function AssistantSourceCard({ source }: { source: SourceBlock }) {
  return (
    <div className="aichat-block">
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="newsrow"
        style={{ textDecoration: 'none' }}
      >
        <div className="articlecontent">
          <div className="alignrow">
            <div className="articleicon">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="articleico">
                <path d="M11 17H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M11 14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="8" r="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 10C3 8.89543 3.89543 8 5 8H7V18.5C7 19.8807 6.38071 21 5 21C3.61929 21 3 19.8807 3 18.5V10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 21H17C19.2091 21 21 19.2091 21 17V5C21 3.89543 20.1046 3 19 3H9C7.89543 3 7 3.89543 7 5V18C7 19.6569 6.65685 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div
              className="newstitle"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {source.title}
            </div>
          </div>
          <div className="newssubtitle">{source.subtitle}</div>
        </div>
      </a>
      <div className="glancechat-label">Posties • source</div>
    </div>
  );
}

function UserMessage({ message }: { message: Message }) {
  const content = message.content || '';
  const url = extractFirstUrl(content);
  const card = url ? buildUrlCard(url) : null;
  const textWithoutUrl = url ? content.replace(url, '').trim() : content.trim();

  return (
    <div className="aichat-block user">
      {card && (
        <a
          href={url ?? '#'}
          target="_blank"
          rel="noreferrer"
          className="newsrow"
          style={{ textDecoration: 'none' }}
        >
          <div className="articlecontent">
            <div className="alignrow">
              <div className={`articleicon${card.isLinkedIn ? ' linkedin' : ''}`}>
                {card.isLinkedIn ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="articleico sm">
                    <path fillRule="evenodd" clipRule="evenodd" d="M9.42857 8.96884H13.1429V10.8193C13.6783 9.75524 15.0503 8.79887 17.1114 8.79887C21.0623 8.79887 22 10.9167 22 14.8028V22H18V15.6878C18 13.4748 17.4646 12.2266 16.1029 12.2266C14.2143 12.2266 13.4286 13.5722 13.4286 15.6878V22H9.42857V8.96884ZM2.57143 21.83H6.57143V8.79887H2.57143V21.83ZM7.14286 4.54958C7.14286 4.88439 7.07635 5.21593 6.94712 5.52526C6.81789 5.83458 6.62848 6.11565 6.3897 6.3524C6.15092 6.58915 5.86745 6.77695 5.55547 6.90508C5.24349 7.0332 4.90911 7.09915 4.57143 7.09915C4.23374 7.09915 3.89937 7.0332 3.58739 6.90508C3.27541 6.77695 2.99193 6.58915 2.75315 6.3524C2.51437 6.11565 2.32496 5.83458 2.19574 5.52526C2.06651 5.21593 2 4.88439 2 4.54958C2 3.87339 2.27092 3.22489 2.75315 2.74675C3.23539 2.26862 3.88944 2 4.57143 2C5.25341 2 5.90747 2.26862 6.3897 2.74675C6.87194 3.22489 7.14286 3.87339 7.14286 4.54958Z" fill="currentColor" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="articleico">
                    <path d="M11 17H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M11 14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="8" r="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M3 10C3 8.89543 3.89543 8 5 8H7V18.5C7 19.8807 6.38071 21 5 21C3.61929 21 3 19.8807 3 18.5V10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 21H17C19.2091 21 21 19.2091 21 17V5C21 3.89543 20.1046 3 19 3H9C7.89543 3 7 3.89543 7 5V18C7 19.6569 6.65685 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div
                className="newstitle"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {card.title}
              </div>
            </div>
            <div className="newssubtitle">{card.subtitle}</div>
          </div>
        </a>
      )}
      {textWithoutUrl && (
        <div className="tldrchat-bubble user">
          <div className="chattext">
            <p>{textWithoutUrl}</p>
          </div>
        </div>
      )}
      <div className="glancechat-label">You • just now</div>
    </div>
  );
}

function renderRichChatText(content: string) {
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let bulletItems: string[] = [];

  const flushBullets = () => {
    if (bulletItems.length === 0) {
      return;
    }

    nodes.push(
      <ul
        key={`bullets-${nodes.length}`}
        style={{
          listStyleType: 'disc',
          paddingLeft: '22px',
          margin: '0 0 12px 0',
        }}
      >
        {bulletItems.map((item, index) => (
          <li key={index} style={{ marginBottom: '6px' }}>
            {item}
          </li>
        ))}
      </ul>
    );
    bulletItems = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushBullets();
      nodes.push(<p key={`space-${nodes.length}`}><br /></p>);
      return;
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      bulletItems.push(trimmed.replace(/^[-*•]\s+/, ''));
      return;
    }

    flushBullets();
    nodes.push(<p key={`paragraph-${nodes.length}`}>{trimmed}</p>);
  });

  flushBullets();
  return nodes;
}

function AssistantPieces({ message }: { message: Message }) {
  if (message.blocks?.length) {
    return (
      <>
        {message.blocks.map((block, index) => {
          if (block.type === 'text') {
            return (
              <div key={`text-${index}`} className="aichat-block">
                <div className="tldrchat-bubble">
                  <div className="chattext">
                    {renderRichChatText(block.content)}
                  </div>
                </div>
                <div className="glancechat-label">Posties • just now</div>
              </div>
            );
          }

          if (block.type === 'source') {
            return <AssistantSourceCard key={`${block.url}-${index}`} source={block} />;
          }

          return null;
        })}
      </>
    );
  }

  if (!message.content) {
    return null;
  }

  return (
    <div className="aichat-block">
      <div className="tldrchat-bubble">
        <div className="chattext">
          {renderRichChatText(message.content)}
        </div>
      </div>
      <div className="glancechat-label">Posties • just now</div>
    </div>
  );
}

function LoadingMessage() {
  const [messageIndex, setMessageIndex] = useState(() => Math.floor(Math.random() * LOADING_MESSAGES.length));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let swapTimeout: ReturnType<typeof setTimeout> | undefined;
    const enterTimeout = setTimeout(() => setVisible(true), 20);

    const interval = setInterval(() => {
      setVisible(false);
      swapTimeout = setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        setVisible(true);
      }, 180);
    }, 1500);

    return () => {
      clearTimeout(enterTimeout);
      clearTimeout(swapTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="aichat-block">
      <div className="tldrchat-bubble">
        <div className="chattext">
          <p
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(6px)',
              transition: 'opacity 180ms ease, transform 180ms ease',
            }}
          >
            {LOADING_MESSAGES[messageIndex]}
          </p>
        </div>
      </div>
      <div className="glancechat-label">Posties • now</div>
    </div>
  );
}

export default function DashboardStaticShell({ html, userId, userFirstName }: DashboardStaticShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const composerImageBlobUrlsRef = useRef<string[]>([]);
  const suppressImageClickRef = useRef(false);
  const hadPostOptionsRef = useRef(false);
  const latestPostSignatureRef = useRef('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chatContainer, setChatContainer] = useState<HTMLElement | null>(null);
  const [postContainer, setPostContainer] = useState<HTMLElement | null>(null);
  const [postWrapperContainer, setPostWrapperContainer] = useState<HTMLElement | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hey${userFirstName ? ` ${userFirstName}` : ''}! Drop in a topic, paste in a news article or LinkedIn link, or just ask me to write something from scratch.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activePostIndex, setActivePostIndex] = useState(0);
  const [editablePostOptions, setEditablePostOptions] = useState<EditablePostOption[]>([]);
  const [showEmptyStateOverlay, setShowEmptyStateOverlay] = useState(true);
  const [isEmptyStateFading, setIsEmptyStateFading] = useState(false);
  const [topicPromptHistory, setTopicPromptHistory] = useState<Record<string, string[]>>({});
  const [topicLoadingTopic, setTopicLoadingTopic] = useState<string | null>(null);
  const [composerImages, setComposerImages] = useState<ComposerImageView[]>([]);
  const [imageError, setImageError] = useState('');
  const [uploadingImageCount, setUploadingImageCount] = useState(0);
  const [lightboxImageId, setLightboxImageId] = useState<string | null>(null);
  const [draggingImageId, setDraggingImageId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishConfirmationArmed, setPublishConfirmationArmed] = useState(false);
  const [publishSuccessFlash, setPublishSuccessFlash] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const hasAutoSentSourceUrl = useRef(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    rootRef.current.innerHTML = html;
    rootRef.current.style.height = '100dvh';
    rootRef.current.style.maxHeight = '100dvh';
    rootRef.current.style.minHeight = '100dvh';
    rootRef.current.style.overflow = 'hidden';

    const pageWrapper = rootRef.current.querySelector('.pagewrapper') as HTMLElement | null;
    const pageContainer = rootRef.current.querySelector('.pagecontainer') as HTMLElement | null;
    const containerCard = rootRef.current.querySelector('.containtercard') as HTMLElement | null;
    const inspoColumn = rootRef.current.querySelector('.inspocolumn') as HTMLElement | null;
    const chatColumn = rootRef.current.querySelector('.chatcolumn') as HTMLElement | null;
    const postColumn = rootRef.current.querySelector('.postcolumn') as HTMLElement | null;
    const postWrapper = rootRef.current.querySelector('.postwrapper') as HTMLElement | null;
    const contentSide = rootRef.current.querySelector('.contentside') as HTMLElement | null;
    const posterRow = rootRef.current.querySelector('.posterrow') as HTMLElement | null;
    const postButtonFaces = rootRef.current.querySelector('.postbutton .facesrow.lite') as HTMLElement | null;
    const postButtonLabel = rootRef.current.querySelector('.postbutton .alignrow > div:not(.linkedin-logo)') as HTMLElement | null;

    if (pageWrapper) {
      pageWrapper.style.boxSizing = 'border-box';
      pageWrapper.style.height = '100dvh';
      pageWrapper.style.minHeight = '100dvh';
      pageWrapper.style.maxHeight = '100dvh';
      pageWrapper.style.overflow = 'hidden';
    }

    if (pageContainer) {
      pageContainer.style.height = '100%';
      pageContainer.style.maxHeight = '100%';
      pageContainer.style.minHeight = '0';
      pageContainer.style.overflow = 'hidden';
    }

    if (containerCard) {
      containerCard.style.height = '100%';
      containerCard.style.maxHeight = '100%';
      containerCard.style.minHeight = '0';
      containerCard.style.overflow = 'hidden';
    }

    if (inspoColumn) {
      inspoColumn.style.height = '100%';
      inspoColumn.style.maxHeight = '100%';
      inspoColumn.style.minHeight = '0';
      inspoColumn.style.overflow = 'hidden';
    }

    if (chatColumn) {
      chatColumn.style.height = '100%';
      chatColumn.style.maxHeight = '100%';
      chatColumn.style.minHeight = '0';
      chatColumn.style.display = 'flex';
      chatColumn.style.flexDirection = 'column';
      chatColumn.style.overflow = 'hidden';
    }

    if (postColumn) {
      postColumn.style.height = '100%';
      postColumn.style.maxHeight = '100%';
      postColumn.style.minHeight = '0';
      postColumn.style.overflow = 'hidden';
    }

    if (postWrapper) {
      postWrapper.style.position = 'relative';
      postWrapper.style.height = '100%';
      postWrapper.style.maxHeight = '100%';
      postWrapper.style.minHeight = '0';
      postWrapper.style.overflow = 'hidden';
    }

    if (contentSide) {
      contentSide.style.width = '100%';
      contentSide.style.maxWidth = '440px';
    }

    if (posterRow) {
      posterRow.style.display = 'none';
    }

    if (postButtonFaces) {
      postButtonFaces.remove();
    }

    if (postButtonLabel) {
      postButtonLabel.textContent = 'Post to LinkedIn';
    }
  }, [html]);

  useEffect(() => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;
    const mainElement = rootRef.current?.closest('main') as HTMLElement | null;

    const previousHtmlOverflow = htmlElement.style.overflow;
    const previousHtmlHeight = htmlElement.style.height;
    const previousBodyOverflow = bodyElement.style.overflow;
    const previousBodyHeight = bodyElement.style.height;
    const previousMainOverflow = mainElement?.style.overflow ?? '';
    const previousMainHeight = mainElement?.style.height ?? '';

    htmlElement.style.overflow = 'hidden';
    htmlElement.style.height = '100%';
    bodyElement.style.overflow = 'hidden';
    bodyElement.style.height = '100%';

    if (mainElement) {
      mainElement.style.overflow = 'hidden';
      mainElement.style.height = '100dvh';
    }

    return () => {
      htmlElement.style.overflow = previousHtmlOverflow;
      htmlElement.style.height = previousHtmlHeight;
      bodyElement.style.overflow = previousBodyOverflow;
      bodyElement.style.height = previousBodyHeight;

      if (mainElement) {
        mainElement.style.overflow = previousMainOverflow;
        mainElement.style.height = previousMainHeight;
      }
    };
  }, []);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    const nextChatContainer = rootRef.current.querySelector('#dashboard-chat-root') as HTMLElement | null;
    const nextPostContainer = rootRef.current.querySelector('#dashboard-post-root') as HTMLElement | null;
    const nextPostWrapperContainer = rootRef.current.querySelector('.postwrapper') as HTMLElement | null;

    if (nextChatContainer) {
      nextChatContainer.innerHTML = '';
    }

    setChatContainer(nextChatContainer);
    setPostContainer(nextPostContainer);
    setPostWrapperContainer(nextPostWrapperContainer);
  }, [html]);

  const generateTopicStarter = useCallback(async (topic: string) => {
    const topicKey = topic.trim().toLowerCase();
    if (!topicKey || topicLoadingTopic) {
      return;
    }

    try {
      setTopicLoadingTopic(topicKey);
      const response = await fetch('/api/dashboard/topic-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          priorPrompts: topicPromptHistory[topicKey] || [],
        }),
      });

      const data = await response.json() as TopicPromptResponse;
      const nextPrompt = data.prompt?.trim();
      if (!response.ok || !nextPrompt) {
        throw new Error('Failed to generate topic starter');
      }

      setInput(nextPrompt);
      setTopicPromptHistory((prev) => ({
        ...prev,
        [topicKey]: [...(prev[topicKey] || []), nextPrompt].slice(-6),
      }));
    } catch (error) {
      console.error('Failed to generate topic starter:', error);
      setInput(`Write me a post about ${topic}.`);
    } finally {
      setTopicLoadingTopic(null);
    }
  }, [topicLoadingTopic, topicPromptHistory]);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    const topicPills = Array.from(rootRef.current.querySelectorAll('.dashboard-topic-pill'));
    topicPills.forEach((pill) => {
      const element = pill as HTMLElement;
      const labelElement = element.querySelector('div');
      const topic = element.getAttribute('data-topic') || '';
      const isLoading = topic.trim().toLowerCase() === topicLoadingTopic;

      element.style.opacity = isLoading ? '0.72' : '1';
      element.style.pointerEvents = topicLoadingTopic ? 'none' : 'auto';
      element.style.transition = 'opacity 180ms ease';

      if (labelElement) {
        labelElement.textContent = isLoading ? 'Loading...' : topic;
      }
    });
  }, [html, topicLoadingTopic]);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    const topicPillContainer = rootRef.current.querySelector('.topicspills');
    if (!topicPillContainer) {
      return;
    }

    const handleTopicClick = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('.dashboard-topic-pill') as HTMLElement | null;
      if (!anchor) {
        return;
      }

      event.preventDefault();
      const topic = anchor.getAttribute('data-topic') || anchor.textContent?.trim() || '';
      void generateTopicStarter(topic);
    };

    topicPillContainer.addEventListener('click', handleTopicClick);
    return () => {
      topicPillContainer.removeEventListener('click', handleTopicClick);
    };
  }, [generateTopicStarter, html]);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    const sidebarLinks = Array.from(rootRef.current.querySelectorAll('.sidemenu .menulink'));
    if (sidebarLinks.length === 0) {
      return;
    }

    const settingsLink = sidebarLinks[2] as HTMLAnchorElement | undefined;
    const logoutLink = sidebarLinks[sidebarLinks.length - 1] as HTMLAnchorElement | undefined;

    const handleSettingsClick = (event: Event) => {
      event.preventDefault();
      router.push('/settings');
    };

    const handleLogoutClick = (event: Event) => {
      event.preventDefault();
      void signOut({ callbackUrl: '/login' });
    };

    if (settingsLink) {
      settingsLink.href = '/settings';
      settingsLink.addEventListener('click', handleSettingsClick);
    }

    if (logoutLink) {
      logoutLink.href = '/';
      logoutLink.addEventListener('click', handleLogoutClick);
    }

    return () => {
      if (settingsLink) {
        settingsLink.removeEventListener('click', handleSettingsClick);
      }

      if (logoutLink) {
        logoutLink.removeEventListener('click', handleLogoutClick);
      }
    };
  }, [router, html]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';

    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 22;
    const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
    const borderTop = Number.parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(computedStyle.borderBottomWidth) || 0;
    const maxHeight = lineHeight * 4 + paddingTop + paddingBottom + borderTop + borderBottom;

    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [input]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || loading || !userId) {
      return;
    }

    const userMessage: Message = { role: 'user', content: messageText.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          userId,
          draftOptions: editablePostOptions.map((option, index) => ({
            index,
            platform: option.platform,
            content: htmlToPlainText(option.html),
          })),
          activeDraftIndex: activePostIndex,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process message');
      }

      if (data.blocks) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.reply,
            blocks: data.blocks,
          },
        ]);
      } else {
        if (Array.isArray(data.draftEdits)) {
          setEditablePostOptions((prev) => prev.map((option, index) => {
            const matchingEdit = (data.draftEdits as DraftEditPayload[]).find((edit) => edit.index === index);
            if (!matchingEdit) {
              return option;
            }

            return {
              ...option,
              html: plainTextToHtml(matchingEdit.content),
            };
          }));
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.reply || 'Sorry, I could not generate a response.',
          },
        ]);
      }
    } catch (error) {
      console.error('Dashboard chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [activePostIndex, editablePostOptions, loading, messages, userId]);

  useEffect(() => {
    const sourceUrl = searchParams.get('sourceUrl');
    if (!sourceUrl || hasAutoSentSourceUrl.current || !userId || loading) {
      return;
    }

    hasAutoSentSourceUrl.current = true;
    void sendMessage(sourceUrl);
    router.replace('/dashboard');
  }, [loading, router, searchParams, sendMessage, userId]);

  const latestPostOptions = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      const posts = message.blocks?.filter(isPostBlock) ?? [];

      if (posts.length > 0) {
        return posts.slice(0, 3);
      }
    }

    return [];
  }, [messages]);

  const latestPostSignature = useMemo(
    () => latestPostOptions.map((post) => `${post.platform}::${post.content}`).join('\n---\n'),
    [latestPostOptions]
  );

  useEffect(() => {
    setActivePostIndex(0);
  }, [latestPostSignature]);

  useEffect(() => {
    if (latestPostSignature === latestPostSignatureRef.current) {
      return;
    }

    latestPostSignatureRef.current = latestPostSignature;
    setEditablePostOptions(
      latestPostOptions.map((post, index) => ({
        id: `${post.platform}-${index}`,
        platform: post.platform,
        html: postBlockToHtml(post),
      }))
    );
  }, [latestPostOptions, latestPostSignature]);

  useEffect(() => {
    const hasPosts = editablePostOptions.length > 0;

    if (!hasPosts) {
      hadPostOptionsRef.current = false;
      setShowEmptyStateOverlay(true);
      setIsEmptyStateFading(false);
      return;
    }

    if (!hadPostOptionsRef.current) {
      hadPostOptionsRef.current = true;
      setShowEmptyStateOverlay(true);
      setIsEmptyStateFading(false);

      const frame = window.requestAnimationFrame(() => {
        setIsEmptyStateFading(true);
      });

      const timeout = window.setTimeout(() => {
        setShowEmptyStateOverlay(false);
        setIsEmptyStateFading(false);
      }, 1000);

      return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(timeout);
      };
    }
  }, [editablePostOptions.length]);

  const activePost = editablePostOptions[activePostIndex] ?? editablePostOptions[0] ?? null;

  useEffect(() => {
    setPublishConfirmationArmed(false);
  }, [activePost?.id, publishing]);

  useEffect(() => {
    setPublishSuccessFlash(false);
  }, [activePost?.id]);

  useEffect(() => {
    if (!publishConfirmationArmed) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setPublishConfirmationArmed(false);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [publishConfirmationArmed]);

  useEffect(() => {
    if (!publishSuccessFlash) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setPublishSuccessFlash(false);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [publishSuccessFlash]);

  useEffect(() => {
    const currentBlobUrls = composerImages
      .map((image) => image.publicUrl)
      .filter((url) => url.startsWith('blob:'));

    for (const blobUrl of composerImageBlobUrlsRef.current) {
      if (!currentBlobUrls.includes(blobUrl)) {
        URL.revokeObjectURL(blobUrl);
      }
    }

    composerImageBlobUrlsRef.current = currentBlobUrls;
  }, [composerImages]);

  useEffect(() => () => {
    for (const blobUrl of composerImageBlobUrlsRef.current) {
      URL.revokeObjectURL(blobUrl);
    }
  }, []);

  const resetComposerImages = useCallback(async () => {
    if (!userId) {
      setComposerImages([]);
      return;
    }

    try {
      setImageError('');

      const response = await fetch('/api/dashboard/images', {
        method: 'DELETE',
      });
      const data = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset images');
      }

      setComposerImages([]);
    } catch (error) {
      console.error('Failed to reset composer images:', error);
      setImageError(error instanceof Error ? error.message : 'Failed to reset images.');
    }
  }, [userId]);

  useEffect(() => {
    void resetComposerImages();
  }, [resetComposerImages]);

  const persistComposerImageOrder = useCallback(async (nextImages: ComposerImageView[]) => {
    const persistedIds = nextImages
      .filter((image) => !image.isUploading)
      .map((image) => image.id);

    if (persistedIds.length === 0) {
      return;
    }

    const response = await fetch('/api/dashboard/images', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: persistedIds }),
    });

    const data = await response.json() as { error?: string; images?: ComposerImageDto[] };

    if (!response.ok) {
      throw new Error(data.error || 'Failed to reorder images');
    }

    setComposerImages((data.images || []).map((image) => ({
      ...image,
      isUploading: false,
    })));
  }, []);

  const handleComposerImageUpload = useCallback(async (selectedFiles: FileList | null) => {
    if (!userId || !selectedFiles?.length) {
      return;
    }

    const files = Array.from(selectedFiles);
    const nextImageCount = composerImages.length + files.length;

    if (nextImageCount > COMPOSER_IMAGE_MAX_COUNT) {
      setImageError(`LinkedIn supports up to ${COMPOSER_IMAGE_MAX_COUNT} images per post.`);
      return;
    }

    for (const file of files) {
      const validationMessage = getComposerImageValidationMessage(file.type, file.size);
      if (validationMessage) {
        setImageError(validationMessage);
        return;
      }
    }

    const temporaryImages: ComposerImageView[] = files.map((file, index) => ({
      id: `temp-${crypto.randomUUID()}`,
      publicUrl: URL.createObjectURL(file),
      originalName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      width: null,
      height: null,
      sortOrder: composerImages.length + index,
      linkedinImageUrn: null,
      createdAt: new Date().toISOString(),
      isUploading: true,
    }));

    setImageError('');
    setUploadingImageCount((prev) => prev + files.length);
    setComposerImages((prev) => [...prev, ...temporaryImages]);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));

      const response = await fetch('/api/dashboard/images', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json() as { error?: string; images?: ComposerImageDto[] };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      const temporaryIds = new Set(temporaryImages.map((image) => image.id));
      const uploadedImages = (data.images || []).map((image) => ({
        ...image,
        isUploading: false,
      }));

      setComposerImages((prev) => [
        ...prev.filter((image) => !temporaryIds.has(image.id)),
        ...uploadedImages,
      ]);
    } catch (error) {
      console.error('Failed to upload composer images:', error);
      const temporaryIds = new Set(temporaryImages.map((image) => image.id));
      setComposerImages((prev) => prev.filter((image) => !temporaryIds.has(image.id)));
      setImageError(error instanceof Error ? error.message : 'Failed to upload images.');
    } finally {
      setUploadingImageCount((prev) => Math.max(0, prev - files.length));
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  }, [composerImages.length, userId]);

  const deleteComposerImage = useCallback(async (imageId: string) => {
    const previousImages = composerImages;
    const nextImages = previousImages.filter((image) => image.id !== imageId);

    setComposerImages(nextImages);
    setLightboxImageId((prev) => (prev === imageId ? null : prev));
    setImageError('');

    try {
      const response = await fetch(`/api/dashboard/images/${imageId}`, {
        method: 'DELETE',
      });

      const data = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete image');
      }
    } catch (error) {
      console.error('Failed to delete composer image:', error);
      setComposerImages(previousImages);
      setImageError(error instanceof Error ? error.message : 'Failed to delete image.');
    }
  }, [composerImages]);

  const moveComposerImage = useCallback(async (sourceImageId: string, targetImageId: string) => {
    if (uploadingImageCount > 0) {
      setImageError('Please wait for uploads to finish before reordering.');
      return;
    }

    const previousImages = composerImages;
    const sourceIndex = previousImages.findIndex((image) => image.id === sourceImageId);
    const targetIndex = previousImages.findIndex((image) => image.id === targetImageId);

    if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
      return;
    }

    const nextImages = arrayMove(previousImages, sourceIndex, targetIndex).map((image, index) => ({
      ...image,
      sortOrder: index,
    }));

    setComposerImages(nextImages);
    setImageError('');

    try {
      await persistComposerImageOrder(nextImages);
    } catch (error) {
      console.error('Failed to reorder composer images:', error);
      setComposerImages(previousImages);
      setImageError(error instanceof Error ? error.message : 'Failed to reorder images.');
    }
  }, [composerImages, persistComposerImageOrder, uploadingImageCount]);

  const handleComposerImageDragStart = useCallback((event: DragStartEvent) => {
    suppressImageClickRef.current = false;
    setDraggingImageId(String(event.active.id));
  }, []);

  const handleComposerImageDragEnd = useCallback((event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;

    suppressImageClickRef.current = true;
    setDraggingImageId(null);

    window.setTimeout(() => {
      suppressImageClickRef.current = false;
    }, 0);

    if (overId && activeId !== overId) {
      void moveComposerImage(activeId, overId);
    }
  }, [moveComposerImage]);

  const handleComposerImageDragCancel = useCallback(() => {
    suppressImageClickRef.current = true;
    setDraggingImageId(null);

    window.setTimeout(() => {
      suppressImageClickRef.current = false;
    }, 0);
  }, []);

  const publishActiveDraft = useCallback(async () => {
    const failPublish = (message: string) => {
      setPublishError(message);
      toast.error(message);
    };

    if (!userId) {
      return;
    }

    if (!activePost) {
      failPublish('Generate a LinkedIn draft before posting.');
      return;
    }

    if (activePost.platform !== 'linkedin') {
      failPublish('Only LinkedIn drafts can be published from this screen.');
      return;
    }

    if (uploadingImageCount > 0) {
      failPublish('Please wait for image uploads to finish before posting.');
      return;
    }

    const content = htmlToPlainText(activePost.html);
    if (!content.trim()) {
      failPublish('Add some post text before publishing.');
      return;
    }

    const persistedImages = composerImages.filter((image) => !image.isUploading);

    try {
      setPublishing(true);
      setPublishError('');

      const response = await fetch('/api/linkedin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post',
          content,
          composerImageIds: persistedImages.map((image) => image.id),
          clearComposerImages: persistedImages.length > 0,
        }),
      });

      const data = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish');
      }

      setComposerImages([]);
      setLightboxImageId(null);
      setPublishSuccessFlash(true);
      toast.success('Posted to LinkedIn.');
    } catch (error) {
      console.error('Failed to publish draft to LinkedIn:', error);
      failPublish(error instanceof Error ? error.message : 'Failed to publish.');
    } finally {
      setPublishing(false);
    }
  }, [activePost, composerImages, uploadingImageCount, userId]);

  const copyActiveDraftToClipboard = useCallback(async () => {
    if (!activePost) {
      return;
    }

    const content = htmlToPlainText(activePost.html).trim();
    if (!content) {
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      setCopiedPostId(activePost.id);
    } catch (error) {
      console.error('Failed to copy draft to clipboard:', error);
    }
  }, [activePost]);

  const rewriteSelectedText = useCallback(async ({
    selectedText,
    paragraphText,
    beforeText,
    afterText,
  }: RewriteSelectionRequest) => {
    if (!activePost || !userId) {
      return null;
    }

    const draftText = htmlToPlainText(activePost.html).trim();
    if (!draftText || !selectedText.trim() || !paragraphText.trim()) {
      return null;
    }

    try {
      const response = await fetch('/api/dashboard/rewrite-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          selectedText,
          paragraphText,
          beforeText,
          afterText,
          draftText,
          platform: activePost.platform,
        }),
      });

      const data = await response.json() as {
        replacement?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to rewrite selected text.');
      }

      return data.replacement?.trim() || null;
    } catch (error) {
      console.error('Failed to rewrite selected text:', error);
      return null;
    }
  }, [activePost, userId]);

  useEffect(() => {
    if (!copiedPostId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedPostId((current) => (current === copiedPostId ? null : current));
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [copiedPostId]);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    const postButton = rootRef.current.querySelector('.postbutton') as HTMLAnchorElement | null;
    const postButtonLabel = rootRef.current.querySelector('.postbutton .alignrow > div:not(.linkedin-logo)') as HTMLElement | null;

    if (!postButton) {
      return;
    }

    const canPublish = Boolean(userId && activePost && activePost.platform === 'linkedin' && !publishing);
    postButton.style.opacity = canPublish ? '1' : '0.55';
    postButton.style.pointerEvents = userId ? 'auto' : 'none';
    postButton.style.cursor = canPublish ? 'pointer' : 'not-allowed';

    if (postButtonLabel) {
      postButtonLabel.textContent = publishing
        ? 'Posting...'
        : publishSuccessFlash
          ? 'Posted!'
          : publishConfirmationArmed
            ? 'Confirm posting to LinkedIn'
            : 'Post to LinkedIn';
    }

    const handlePostClick = (event: Event) => {
      event.preventDefault();

      if (!userId) {
        return;
      }

      if (publishing) {
        return;
      }

      if (!publishConfirmationArmed) {
        setPublishConfirmationArmed(true);
        return;
      }

      void publishActiveDraft();
    };

    postButton.addEventListener('click', handlePostClick);
    return () => {
      postButton.removeEventListener('click', handlePostClick);
    };
  }, [activePost, publishActiveDraft, publishConfirmationArmed, publishSuccessFlash, publishing, userId]);

  const handleSuggestedPromptClick = useCallback((prompt: string) => {
    const nextPrompt = prompt.trim();
    if (!nextPrompt) {
      return;
    }

    if (!userId || loading) {
      setInput(nextPrompt);
      return;
    }

    setInput('');
    void sendMessage(nextPrompt);
  }, [loading, sendMessage, userId]);

  const chatMarkup = useMemo(() => (
    <div className="glancewidget-tabs" style={{ height: '100%', minHeight: 0 }}>
      <div
        data-widget="chat"
        className="tldrchat-wrapper chat"
        style={{ height: '100%', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <div
          className="tldrchats"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {messages.map((message, index) => (
            <div key={index} className="tldrchat-message-group">
              {message.role === 'user' ? (
                <UserMessage message={message} />
              ) : (
                <AssistantPieces message={message} />
              )}
            </div>
          ))}
          {loading && <LoadingMessage />}
          <div ref={messagesEndRef} />
        </div>
        <div
          className="glancechat-messaging"
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 2,
            flexShrink: 0,
          }}
        >
          <div className="suggested-prompts-wrapper dashboard-suggested-prompts-wrapper">
            <a href="#" className="suggested-prompt-pill dashboard-suggested-prompt-pill w-inline-block" onClick={(event) => {
              event.preventDefault();
              handleSuggestedPromptClick('Re-write all three, make subtle changes to what we have.');
            }}>
              <div>Vary Subtle</div>
            </a>
            <a href="#" className="suggested-prompt-pill dashboard-suggested-prompt-pill w-inline-block" onClick={(event) => {
              event.preventDefault();
              handleSuggestedPromptClick('Re-write all three, make strong changes to what we have.');
            }}>
              <div>Vary Strong</div>
            </a>
            <a href="#" className="suggested-prompt-pill dashboard-suggested-prompt-pill w-inline-block" onClick={(event) => {
              event.preventDefault();
              handleSuggestedPromptClick('Make this shorter');
            }}>
              <div>Make Shorter</div>
            </a>
            <a href="#" className="suggested-prompt-pill dashboard-suggested-prompt-pill w-inline-block" onClick={(event) => {
              event.preventDefault();
              handleSuggestedPromptClick('Make this longer');
            }}>
              <div>Make Longer</div>
            </a>
          </div>
          <div
            className="glancechat-field"
            style={{
              minHeight: '60px',
              height: 'auto',
              alignItems: 'flex-end',
              paddingTop: '12px',
              paddingBottom: '12px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                void sendMessage(input);
              }}
              disabled={loading || !input.trim() || !userId}
              className="tldrchat-send-button w-inline-block"
            >
              <img loading="lazy" alt="" src="/webflow-assets/images/sendwaves.svg" className="sendwaves" />
              <img loading="lazy" alt="" src="/webflow-assets/images/sendicon.svg" className="sendicon" />
            </button>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage(input);
                }
              }}
              placeholder={userId ? 'Type your message here...' : 'Sign in to chat'}
              disabled={loading || !userId}
              className="glancechat-placeholder"
              style={{
                opacity: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                paddingRight: '8px',
                paddingTop: '2px',
                paddingBottom: '2px',
                resize: 'none',
                lineHeight: '1.4em',
                display: 'block',
                minHeight: '22px',
                maxHeight: 'calc(1.4em * 4 + 4px)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  ), [handleSuggestedPromptClick, input, loading, messages, sendMessage, userId]);

  const lightboxImage = composerImages.find((image) => image.id === lightboxImageId && !image.isUploading) ?? null;
  const canAddMoreImages = composerImages.length < COMPOSER_IMAGE_MAX_COUNT;
  const activeDragImage = draggingImageId
    ? composerImages.find((image) => image.id === draggingImageId) ?? null
    : null;

  const emptyStateMarkup = useMemo(() => (
    <div
      className="emptystate"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 3,
        borderRadius: '10px',
        overflow: 'hidden',
        opacity: isEmptyStateFading ? 0 : 1,
        pointerEvents: 'none',
        transition: 'opacity 1000ms ease',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url('${EMPTY_STATE_IMAGE_URL}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div
          className="emptystate-overlay"
          style={{
            position: 'relative',
            zIndex: 2,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexFlow: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            paddingLeft: '10%',
            paddingRight: '10%',
            textAlign: 'center',
            backgroundImage: 'radial-gradient(circle farthest-corner at 50% 50%, rgba(3, 28, 37, 0.5), #00383d)',
          }}
        >
          <div>
            <div
              style={{
                color: '#fff',
                fontSize: '23px',
                fontWeight: 600,
                lineHeight: '1.25em',
                marginBottom: '8px',
                fontFamily: '"Blauer Nue", Impact, sans-serif',
                textShadow: '0 2px 18px rgba(0, 0, 0, 0.36)',
              }}
            >
              Something awesome brewing...
            </div>
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.92)',
                fontSize: '16px',
                fontWeight: 500,
                lineHeight: '1.5em',
                fontFamily: 'Figtree, sans-serif',
                textShadow: '0 2px 18px rgba(0, 0, 0, 0.34)',
              }}
            >
              Posts will generate here.
            </div>
          </div>
        </div>
      </div>
    </div>
  ), [isEmptyStateFading]);

  const postMarkup = useMemo(() => {
    if (!activePost) {
      return null;
    }

    return (
      <>
        <div className="optionsnav">
          {editablePostOptions.map((post, index) => (
            <a
              key={post.id}
              href="#"
              className={`optionpill w-inline-block${index === activePostIndex ? ' activepill' : ''}`}
              onClick={(event) => {
                event.preventDefault();
                setActivePostIndex(index);
              }}
            >
              <div>{`Option ${index + 1}`}</div>
            </a>
          ))}
        </div>
        <div
          className="postpreview"
          style={{
            opacity: showEmptyStateOverlay && !isEmptyStateFading ? 0 : 1,
            transition: 'opacity 1000ms ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              zIndex: 2,
            }}
          >
            <button
              type="button"
              onClick={() => void copyActiveDraftToClipboard()}
              aria-label={copiedPostId === activePost.id ? 'Post copied' : 'Copy post'}
              title={copiedPostId === activePost.id ? 'Copied' : 'Copy'}
              style={{
                appearance: 'none',
                background: '#f7f7f7',
                border: 'none',
                borderRadius: '0 0 0 10px',
                color: 'var(--text)',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                height: 30,
                width: 30,
                padding: 0,
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 512 512"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <g stroke="none" fill="none" fillRule="evenodd" strokeWidth="1">
                  <g fill={copiedPostId === activePost.id ? '#0966c2' : '#012D3D'}>
                    <path
                      d="M288,405.333333 L117.333333,405.333333 C52.561166,405.262788 0.0705451715,352.772167 0,288 L0,117.333333 C0.0705451715,52.561166 52.561166,0.0705451715 117.333333,0 L288,0 C352.772167,0.0705451715 405.262788,52.561166 405.333333,117.333333 L405.333333,288 C405.262788,352.772167 352.772167,405.333333 288,405.333333 Z M117.333333,64 C87.8781467,64 64,87.8781467 64,117.333333 L64,288 C64,317.455187 87.8781467,341.333333 117.333333,341.333333 L288,341.333333 C317.455187,341.333333 341.333333,317.455187 341.333333,288 L341.333333,117.333333 C341.333333,87.8781467 317.455187,64 288,64 L117.333333,64 Z M512,394.666667 L512,149.333333 C512,131.660221 497.673112,117.333333 480,117.333333 C462.326888,117.333333 448,131.660221 448,149.333333 L448,394.666667 C448,424.121853 424.121853,448 394.666667,448 L149.333333,448 C131.660221,448 117.333333,462.326888 117.333333,480 C117.333333,497.673112 131.660221,512 149.333333,512 L394.666667,512 C459.438834,511.929455 511.929455,459.438834 512,394.666667 L512,394.666667 Z"
                      fillRule="nonzero"
                    />
                  </g>
                </g>
              </svg>
            </button>
          </div>
          <div className="postwrap">
            <div className="richpost w-richtext">
              <DashboardPostEditor
                key={activePost.id}
                content={activePost.html}
                onChange={(nextContent) => {
                  setEditablePostOptions((prev) => prev.map((option, index) => (
                    index === activePostIndex
                      ? { ...option, html: nextContent }
                      : option
                  )));
                }}
                onRewriteSelection={rewriteSelectedText}
              />
            </div>
          </div>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif"
          multiple
          hidden
          onChange={(event) => {
            void handleComposerImageUpload(event.target.files);
          }}
        />
        <div className="imageupload">
          {composerImages.length === 0 ? (
            <button
              type="button"
              className="uploadimage-block"
              disabled={!userId || uploadingImageCount > 0}
              onClick={() => imageInputRef.current?.click()}
              style={{
                alignItems: 'center',
                appearance: 'none',
                background: 'transparent',
                border: '1.5px solid var(--border)',
                color: 'inherit',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="uploadicon">
                <path d="M19 16v6" />
                <path d="M16 19h6" />
                <path d="M14 14l1 -1c.67 -.644 1.45 -.824 2.182 -.54" />
                <path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l4 4" />
                <path d="M12.5 21h-6.5a3 3 0 0 1 -3 -3v-12a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v6.5" />
                <path d="M15 8h.01" />
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              </svg>
            </button>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleComposerImageDragStart}
              onDragEnd={handleComposerImageDragEnd}
              onDragCancel={handleComposerImageDragCancel}
            >
              <SortableContext
                items={composerImages.filter((image) => !image.isUploading).map((image) => image.id)}
                strategy={horizontalListSortingStrategy}
              >
                {composerImages.map((image) => (
                  <SortableComposerImageTile
                    key={image.id}
                    image={image}
                    isAnyImageDragging={Boolean(draggingImageId)}
                    isActiveDrag={draggingImageId === image.id}
                    onDelete={() => {
                      void deleteComposerImage(image.id);
                    }}
                    onOpen={() => {
                      if (suppressImageClickRef.current) {
                        suppressImageClickRef.current = false;
                        return;
                      }

                      if (!image.isUploading && !draggingImageId) {
                        setLightboxImageId(image.id);
                      }
                    }}
                  />
                ))}
              </SortableContext>
              <DragOverlay>
                {activeDragImage ? (
                  <ComposerImageTile
                    image={activeDragImage}
                    isActiveDrag
                    onDelete={() => {}}
                    onOpen={() => {}}
                    style={{
                      transform: 'translateY(-6px) scale(1.06) rotate(-2deg)',
                      boxShadow: '0 18px 32px rgba(3, 28, 37, 0.28)',
                    }}
                  />
                ) : null}
              </DragOverlay>
              {canAddMoreImages ? (
                <button
                  type="button"
                  className="uploadimage-block"
                  disabled={!userId || uploadingImageCount > 0}
                  onClick={() => imageInputRef.current?.click()}
                  style={{
                    alignItems: 'center',
                    appearance: 'none',
                    background: 'transparent',
                    border: '1.5px solid var(--border)',
                    color: 'inherit',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="uploadicon">
                    <path d="M19 16v6" />
                    <path d="M16 19h6" />
                    <path d="M14 14l1 -1c.67 -.644 1.45 -.824 2.182 -.54" />
                    <path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l4 4" />
                    <path d="M12.5 21h-6.5a3 3 0 0 1 -3 -3v-12a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v6.5" />
                    <path d="M15 8h.01" />
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  </svg>
                </button>
              ) : null}
            </DndContext>
          )}
        </div>
        {(imageError || publishError) ? (
          <div
            style={{
              minHeight: '18px',
              marginTop: '10px',
              color: '#cc4b37',
              fontSize: '12px',
              lineHeight: '1.45em',
            }}
          >
            {imageError || publishError}
          </div>
        ) : null}
      </>
    );
  }, [
    activeDragImage,
    activePost,
    activePostIndex,
    canAddMoreImages,
    composerImages,
    copiedPostId,
    copyActiveDraftToClipboard,
    deleteComposerImage,
    draggingImageId,
    editablePostOptions,
    handleComposerImageDragCancel,
    handleComposerImageDragEnd,
    handleComposerImageDragStart,
    handleComposerImageUpload,
    imageError,
    isEmptyStateFading,
    publishError,
    rewriteSelectedText,
    sensors,
    showEmptyStateOverlay,
    uploadingImageCount,
    userId,
  ]);

  return (
    <>
      <div ref={rootRef} style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }} />
      {chatContainer ? createPortal(chatMarkup, chatContainer) : null}
      {postContainer && postMarkup ? createPortal(postMarkup, postContainer) : null}
      {postWrapperContainer && showEmptyStateOverlay ? createPortal(emptyStateMarkup, postWrapperContainer) : null}
      {lightboxImage ? (
        <div
          onClick={() => setLightboxImageId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 20,
            background: 'rgba(3, 16, 22, 0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '28px',
          }}
        >
          <button
            type="button"
            aria-label="Close image preview"
            onClick={() => setLightboxImageId(null)}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              border: 'none',
              borderRadius: '999px',
              width: '34px',
              height: '34px',
              background: 'rgba(255, 255, 255, 0.14)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            X
          </button>
          <img
            src={lightboxImage.publicUrl}
            alt={lightboxImage.originalName}
            onClick={(event) => event.stopPropagation()}
            style={{
              maxWidth: 'min(960px, 92vw)',
              maxHeight: '88vh',
              borderRadius: '14px',
              boxShadow: '0 28px 80px rgba(0, 0, 0, 0.45)',
              objectFit: 'contain',
            }}
          />
        </div>
      ) : null}
    </>
  );
}
