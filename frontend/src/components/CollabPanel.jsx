import { useEffect, useState, useRef } from 'react';
import api from '../api/client';
import MessageComposer from './MessageComposer';
import { useAuth } from '../context/AuthContext';

export default function CollabPanel({ applicationId, jobId, onClose }) {
  const { profile } = useAuth();
  const [comments, setComments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shortlists, setShortlists] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIsShared, setNewIsShared] = useState(true);
  const [newMembers, setNewMembers] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!applicationId) return;
    fetchComments();
    fetchMessages();
    fetchShortlists();
    // eslint-disable-next-line
  }, [applicationId]);

  async function fetchComments() {
    try {
      const res = await api.get(`/api/collab/comments/${applicationId}`);
      setComments(res.data || []);
    } catch (err) {
      console.error('Failed to load comments', err);
    }
  }

  async function fetchMessages() {
    if (!applicationId) return;
    try {
      const res = await api.get(`/api/applications/${applicationId}/messages`);
      setMessages(res.data || []);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  }

  useEffect(() => {
    if (!scrollRef.current) return;
    // scroll to bottom when messages update
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function addComment() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      await api.post('/api/collab/comments', { application_id: applicationId, text, is_private: isPrivate });
      setText('');
      setIsPrivate(false);
      fetchComments();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  }

  async function fetchShortlists() {
    if (!jobId) return;
    try {
      const res = await api.get(`/api/collab/shortlists/${jobId}`);
      setShortlists(res.data || []);
    } catch (err) {
      console.error('Failed to load shortlists', err);
    }
  }

  async function createShortlist() {
    if (!jobId) return alert('Job id missing');
    setCreating(true);
    try {
      const members = (newMembers || '').split(',').map(s => s.trim()).filter(Boolean);
      await api.post('/api/collab/shortlists', { job_id: jobId, name: newName || 'Default', is_shared: newIsShared, members });
      setNewName('');
      setNewMembers('');
      fetchShortlists();
      alert('Shortlist created');
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to create shortlist');
    } finally {
      setCreating(false);
    }
  }

  async function addToShortlist(shortlistId) {
    try {
      await api.post(`/api/collab/shortlists/${shortlistId}/items`, { application_id: applicationId });
      alert('Added to shortlist');
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to add to shortlist');
    }
  }

  async function sendMessage(text) {
    if (!text || !text.trim()) return;
    try {
      await api.post(`/api/applications/${applicationId}/messages`, { message: text });
      fetchMessages();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to send message');
    }
  }

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, marginTop: 8, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Collaboration</strong>
        <button className="btn" onClick={onClose}>Close</button>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ marginBottom: 8 }}>
          <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add comment" />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
              <span className="muted">Private</span>
            </label>
            <button className="btn btnPrimary" onClick={addComment} disabled={loading}>{loading ? 'Saving...' : 'Add'}</button>
          </div>
        </div>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
          <strong>Create Shortlist</strong>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexDirection: 'column' }}>
            <input className="input" placeholder="Shortlist name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input className="input" placeholder="Invite members (comma-separated emails)" value={newMembers} onChange={(e) => setNewMembers(e.target.value)} />
            <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={newIsShared} onChange={(e) => setNewIsShared(e.target.checked)} />
              <span className="muted">Shared with members</span>
            </label>
            <div>
              <button className="btn btnPrimary" onClick={createShortlist} disabled={creating}>{creating ? 'Creating...' : 'Create Shortlist'}</button>
            </div>
          </div>
        </div>

        <div>
          <strong>Comments</strong>
          {comments.length === 0 ? <div className="muted">No comments</div> : (
            comments.map(c => (
              <div key={c.id} style={{ borderTop: '1px solid #eee', paddingTop: 8, marginTop: 8 }}>
                <div className="muted" style={{ fontSize: 13 }}>{c.created_at}</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{c.text}</div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <strong>Conversation</strong>
          <div ref={scrollRef} style={{ maxHeight: 300, overflowY: 'auto', padding: 12, marginTop: 8, background: '#fafafa', borderRadius: 8 }}>
            {messages.length === 0 ? <div className="muted">No messages</div> : (
              messages.map(m => {
                const mine = profile && m.sender_id === profile.id;
                return (
                  <div key={m.id} style={{ display: 'flex', marginBottom: 10, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                    {!mine && (
                      <div style={{ marginRight: 8, textAlign: 'center' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 18, background: '#cfd8dc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{(m.sender && m.sender.full_name ? m.sender.full_name[0] : 'R')}</div>
                      </div>
                    )}
                    <div style={{ maxWidth: '75%' }}>
                      <div style={{ background: mine ? '#d1ffd6' : '#fff', padding: '10px 12px', borderRadius: 12, boxShadow: '0 1px 0 rgba(0,0,0,0.05)', whiteSpace: 'pre-wrap' }}>
                        {m.text}
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 4, textAlign: mine ? 'right' : 'left' }}>{m.created_at} — {mine ? 'You' : (m.sender && (m.sender.full_name || m.sender.email))}</div>
                    </div>
                    {mine && (
                      <div style={{ marginLeft: 8, textAlign: 'center' }}>
                        <div style={{ width: 28 }} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <MessageComposer onSend={(t) => sendMessage(t)} />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <strong>Add to shortlist</strong>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {shortlists.length === 0 ? <div className="muted">No shortlists</div> : (
              shortlists.map(s => (
                <button key={s.id} className="btn" onClick={() => addToShortlist(s.id)}>{s.name} ({s.items_count})</button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
