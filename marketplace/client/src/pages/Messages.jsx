import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { formatPrice } from '../lib/constants';

const OFFER_STATUS_LABEL = { pending: 'Pending', accepted: 'Accepted', declined: 'Declined' };

export default function Messages() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(searchParams.get('conversation') || null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busyOfferId, setBusyOfferId] = useState(null);
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
    const handleOfferUpdated = (offer) => {
      setMessages((prev) =>
        prev.map((m) => (m.offerId === offer.id ? { ...m, offerStatus: offer.status } : m))
      );
    };
    socket.on('new_message', handleNewMessage);
    socket.on('offer_updated', handleOfferUpdated);
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('offer_updated', handleOfferUpdated);
    };
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

  const handleOfferAction = async (offerId, action) => {
    setBusyOfferId(offerId);
    setError('');
    try {
      await api.patch(`/api/offers/${offerId}`, { action });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyOfferId(null);
    }
  };

  const handlePayOffer = async (offerId) => {
    setBusyOfferId(offerId);
    setError('');
    try {
      const data = await api.post('/api/orders/checkout', { offerId });
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setBusyOfferId(null);
    }
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
              {messages.map((m) => {
                if (m.kind === 'offer' && m.body.startsWith('Offered $')) {
                  const isMine = m.senderId === user.id;
                  const canRespond =
                    activeConversation.role === 'seller' && m.offerStatus === 'pending';
                  const canPay = activeConversation.role === 'buyer' && m.offerStatus === 'accepted';
                  return (
                    <div key={m.id} className={`max-w-[80%] ${isMine ? 'ml-auto' : ''}`}>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                        <p className="text-xs text-slate-500 mb-1">
                          {isMine ? 'You offered' : `${activeConversation.otherUser.displayName} offered`}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                            {formatPrice(m.offerAmountCents)}
                          </span>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              m.offerStatus === 'accepted'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : m.offerStatus === 'declined'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}
                          >
                            {OFFER_STATUS_LABEL[m.offerStatus] || m.offerStatus}
                          </span>
                        </div>
                        {canRespond && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleOfferAction(m.offerId, 'accept')}
                              disabled={busyOfferId === m.offerId}
                              className="flex-1 py-1.5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleOfferAction(m.offerId, 'decline')}
                              disabled={busyOfferId === m.offerId}
                              className="flex-1 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                        {canPay && (
                          <button
                            onClick={() => handlePayOffer(m.offerId)}
                            disabled={busyOfferId === m.offerId}
                            className="w-full mt-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
                          >
                            Pay {formatPrice(m.offerAmountCents)}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
                if (m.kind === 'offer') {
                  return (
                    <p key={m.id} className="text-xs text-slate-400 text-center py-1">
                      {m.body}
                    </p>
                  );
                }
                return (
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
                );
              })}
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
