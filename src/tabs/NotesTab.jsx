// The Notes tab. Pure view: every value and handler it needs arrives as a prop from LifeTracker.jsx, which owns all state.
import { BtnPrimary, Panel, dimText, inputStyle } from '../components/ui.jsx';
import { MONO, NOTE_TAGS, RADIUS_SM } from '../lib/constants.js';
import { fmtDate } from '../lib/utils.js';
import { Pin, Trash2 } from 'lucide-react';

export default function NotesTab({ addNote, deleteNote, editNoteText, editingNoteId, noteTag, noteText, notesData, saveNoteEdit, setEditNoteText, setEditingNoteId, setNoteTag, setNoteText, togglePinNote }) {
  return (
        <div className="md:grid md:grid-cols-2 md:gap-2 md:items-start">
          <div>
            <Panel title="New note">
              <textarea
                className="w-full text-sm px-3 py-2.5 focus:outline-none mb-2 resize-none"
                style={{ ...inputStyle, minHeight: 90 }}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Something about money, your routine, an idea — anything you don't want to forget."
              />
              <div className="flex gap-1.5 flex-wrap mb-3">
                {NOTE_TAGS.map(t => (
                  <button key={t.id} onClick={() => setNoteTag(t.id)}
                    className="text-xs px-2.5 py-1"
                    style={{
                      border: `1px solid ${noteTag === t.id ? 'var(--accent)' : 'var(--border)'}`,
                      background: noteTag === t.id ? 'var(--accent-soft)' : 'transparent',
                      color: noteTag === t.id ? 'var(--accent)' : 'var(--dim)',
                    }}>{t.id}</button>
                ))}
              </div>
              <BtnPrimary onClick={addNote}>Save note</BtnPrimary>
            </Panel>
          </div>

          <div>
            <Panel title={`Notes (${notesData.notes.length})`}>
              {notesData.notes.length === 0 ? (
                <p className="text-sm" style={dimText}>Nothing saved yet — jot something down on the left.</p>
              ) : (
                <div className="space-y-1.5 max-h-[28rem] overflow-y-auto">
                  {notesData.notes
                    .slice()
                    .sort((a, b) => (b.pinned === true) - (a.pinned === true))
                    .map(nt => (
                      <div key={nt.id} className="px-3 py-2" style={{ background: 'var(--field)', border: `1px solid ${nt.pinned ? 'var(--accent)' : 'var(--border)'}`, borderRadius: RADIUS_SM }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase tracking-widest" style={{ fontFamily: MONO, color: 'var(--accent)' }}>
                            {nt.tag} · {fmtDate(nt.createdAt)}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => togglePinNote(nt.id)} title={nt.pinned ? 'Unpin' : 'Pin to top'}>
                              <Pin size={13} color={nt.pinned ? 'var(--accent)' : 'var(--dim)'} fill={nt.pinned ? 'var(--accent)' : 'none'} />
                            </button>
                            <button onClick={() => deleteNote(nt.id)} style={dimText}><Trash2 size={13} /></button>
                          </div>
                        </div>
                        {editingNoteId === nt.id ? (
                          <div>
                            <textarea
                              className="w-full text-sm px-2 py-1.5 focus:outline-none mb-1.5 resize-none"
                              style={{ ...inputStyle, minHeight: 60 }}
                              value={editNoteText}
                              onChange={e => setEditNoteText(e.target.value)}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button onClick={saveNoteEdit} className="text-xs px-2 py-1" style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}>Save</button>
                              <button onClick={() => setEditingNoteId(null)} className="text-xs px-2 py-1" style={dimText}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingNoteId(nt.id); setEditNoteText(nt.text); }} className="text-sm text-left w-full" style={{ whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                            {nt.text}
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </Panel>
          </div>
          </div>
  );
}
