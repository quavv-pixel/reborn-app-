import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';

export default function Messages() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(searchParams.get('conversation') || null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    api
      .get('/api/conversations')
      .then((data) => {
        setConversations(data.conversations);
        if (!activeId && data.conversations[0]) {
          setActiveId(String(data.conversations[0].id));
        }
      })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setSearchParams({ conversation: activeId }, { replace: true });

    const socket = getSocket();
    socket.emit('join_conversation', Number(activeId));

    api
      .get(`/api/conversations/${activeId}/messages`)
      .then((data) => setMessages(data.messages))
      .catch((err) => setError(err.message));

    const handleNewMessage = (message) => {
      if (String(message.conversationId) === String(activeId)) {
        setMessages((prev) => [...prev, message]);
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === message.conversationId
            ? { ...c, lastMessage: { body: message.body, createdAt: message.createdAt } }
            : c
        )
      );
    };
    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [activeId, setSearchParams]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!draft.trim() || !activeId) return;
    getSocket().emit('send_message', { conversationId: Number(activeId), body: draft.trim() });
    setDraft('');
  };

  const activeConversation = conversations.find((c) => String(c.id) === String(activeId));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 grid sm:grid-cols-3 gap-4 flex-1">
      <div className="sm:col-span-1 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 font-medium">
          Conversations
        </div>
        {conversations.length === 0 ? (
          <p className="p-3 text-sm text-slate-500">No conversations yet.</p>
        ) : (
          <ul>
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(String(c.id))}
                  className={`w-full text-left p-3 border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-900 ${
                    String(c.id) === String(activeId) ? 'bg-slate-100 dark:bg-slate-800' : ''
                  }`}
                >
                  <p className="font-medium truncate">{c.otherUser.displayName}</p>
                  {c.listing && <p className="text-xs text-indigo-600 dark:text-indigo-400 truncate">{c.listing.title}</p>}
                  {c.lastMessage && (
                    <p className="text-xs text-slate-500 truncate">{c.lastMessage.body}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sm:col-span-2 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col min-h-[28rem]">
        {!activeConversation ? (
          <p className="p-6 text-slate-500 m-auto">Select a conversation to start chatting.</p>
        ) : (
          <>
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 font-medium">
              {activeConversation.otherUser.displayName}
              {activeConversation.listing && (
                <span className="text-slate-500 font-normal"> · {activeConversation.listing.title}</span>
              )}
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                    m.senderId === user.id
                      ? 'bg-indigo-600 text-white ml-auto'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {m.body}
                </div>
              ))}
            </div>
            <form onSubmit={handleSend} className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              />
              <button type="submit" className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500">
                Send
              </button>
            </form>
          </>
        )}
      </div>
      {error && <p className="sm:col-span-3 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
