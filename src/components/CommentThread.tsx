import { useState } from 'react';
import type { Comment } from '../types';

/**
 * A small chat-like thread. Collapsed by default so cards stay scannable;
 * posting is append-only — answers live next to the question instead of
 * overwriting anyone's notes.
 */
export function CommentThread({
  comments,
  me,
  onPost,
}: {
  comments: Comment[];
  me: string;
  onPost: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    onPost(text.trim());
    setText('');
  };

  return (
    <div className="comments">
      <button className="linklike small" onClick={() => setOpen((v) => !v)}>
        💬 {comments.length > 0 ? `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}` : 'Comment'}
      </button>
      {open && (
        <>
          {comments.map((c) => (
            <p key={c.id} className="small comment">
              <strong>{c.author}</strong> {c.text}
            </p>
          ))}
          <div className="share-box">
            <input
              value={text}
              placeholder={me ? 'Ask or answer…' : 'Enter your name above to comment'}
              disabled={!me}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <button disabled={!me || !text.trim()} onClick={submit}>
              Post
            </button>
          </div>
        </>
      )}
    </div>
  );
}
