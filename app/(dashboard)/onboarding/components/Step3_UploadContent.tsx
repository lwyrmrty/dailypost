'use client';

import { useState } from 'react';

const POST_FIELD_COUNT = 10;
const INITIAL_VISIBLE_POST_FIELDS = 5;

interface Step3Props {
  onComplete: (data: { uploadedContent: string[] }) => void;
  initialData?: { uploadedContent: string[] };
  isEditing?: boolean;
}

export default function Step3UploadContent({
  onComplete,
  initialData,
  isEditing = false,
}: Step3Props) {
  const initialPostCount = initialData?.uploadedContent?.length || 0;
  const [posts, setPosts] = useState<string[]>(() => {
    const initialPosts = initialData?.uploadedContent?.slice(0, POST_FIELD_COUNT) || [];
    return Array.from({ length: POST_FIELD_COUNT }, (_, index) => initialPosts[index] || '');
  });
  const [visiblePostFields, setVisiblePostFields] = useState(
    Math.min(POST_FIELD_COUNT, Math.max(INITIAL_VISIBLE_POST_FIELDS, initialPostCount))
  );

  function handleSubmit() {
    const filledPosts = posts.map(post => post.trim()).filter(post => post.length > 0);
    onComplete({
      uploadedContent: filledPosts,
    });
  }

  const postCount = posts.filter(post => post.trim().length > 0).length;

  return (
    <div className="cardcontent">
      <div className="cardcontent-header">
        <div className="cardcontent-heading">Upload past content</div>
        <div className="cardcontent-subheading">
          Add at least 5 and up to 10 of your past posts, articles, or pieces of professional writing. This helps us deeply understand your voice across different formats and topics.
          <br />
        </div>
      </div>
      {posts.slice(0, visiblePostFields).map((post, index) => (
        <div key={index} className="walkthroughblock">
          <div className="alignrow sides">
            <div className="cardcontent-heading small solo">Post {index + 1}</div>
            <div className="charactercount">{post.trim().length.toLocaleString()} characters</div>
          </div>
          <textarea
            maxLength={5000}
            value={post}
            onChange={(e) => {
              setPosts(prev => prev.map((currentPost, currentIndex) => (
                currentIndex === index ? e.target.value : currentPost
              )));
            }}
            className="textfield tall w-input"
          />
        </div>
      ))}
      {visiblePostFields < POST_FIELD_COUNT && (
        <button
          type="button"
          onClick={() => setVisiblePostFields(prev => Math.min(prev + 1, POST_FIELD_COUNT))}
          className="widebutton w-inline-block"
        >
          <div>Add New Post</div>
        </button>
      )}
      <div className="floatingbutton">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={postCount < 5}
          className="submitbutton w-button"
        >
          {isEditing ? 'Save Changes' : postCount < 5 ? `Add ${5 - postCount} More Posts` : 'Continue - Analyze my Writing Style'}
        </button>
      </div>
    </div>
  );
}
