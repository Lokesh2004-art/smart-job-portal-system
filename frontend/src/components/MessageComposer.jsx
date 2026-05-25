import { useState, useRef } from 'react';

export default function MessageComposer({ onSend }) {
  const [text, setText] = useState('');
  const taRef = useRef();

  function handleSend() {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    if (taRef.current) taRef.current.focus();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <textarea ref={taRef} className="input" rows={2} value={text} onKeyDown={handleKeyDown} onChange={(e) => setText(e.target.value)} placeholder="Write a message" style={{ flex: 1 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button className="btn btnPrimary" onClick={handleSend} disabled={!text.trim()}>Send</button>
        <button className="btn btnGhost" onClick={() => setText('')}>Clear</button>
      </div>
    </div>
  );
}
