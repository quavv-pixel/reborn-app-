// The Notes tab: write a note, see your notes (pinned ones first).
// Every value and handler arrives as a prop from LifeTracker.jsx.
import { BtnPrimary, Panel, dimText, inputStyle } from '../components/ui.jsx';
import { fmtDate } from '../lib/utils.js';
import { Pin, Trash2 } from 'lucide-react';

export default function NotesTab({ addNote, deleteNote, editNoteText, editingNoteId, noteText, notesData, saveNoteEdit, setEditNoteText, setEditingNoteId, setNoteText, togglePinNote }) {
  const notes = notesData.notes.slice().sort((a, b) => (b.pinned === true) - (a.pinned === true));
  return (
    <div className="md:grid md:grid-cols-2 md:gap-3 md:items-start">
      <div>
        <Panel title="New note">
          <textarea
            className="w-full text-sm px-3 py-2.5 focus:outline-none mb-3 resize-none"
            style={{ ...inputStyle, minHeight: 100 }}
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Anything you don't want to forget."
          />
          <BtnPrimary onClick={addNote} style={{ width: '100%' }}>Save note</BtnPrimary>
        </Panel>
      </div>

      <div>
        <Panel title={`Your notes${notes.length ? ` (${notes.length})` : ''}`}>
          {notes.length === 0 ? (
            <p className="text-sm" style={dimText}>Nothing saved yet.</p>
          ) : (
            <div className="space-y-2">
              {notes.map(nt => (
                <div key={nt.id} className="px-3 py-2.5" style={{ background: 'var(--field)', borderRadius: 12, border: `1.5px solid ${nt.pinned ? 'var(--accent)' : 'transparent'}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={dimText}>{fmtDate(nt.createdAt)}{nt.pinned ? ' · pinned' : ''}</span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button onClick={() => togglePinNote(nt.id)} aria-label={nt.pinned ? 'Unpin' : 'Pin to top'}>
                        <Pin size={15} color={nt.pinned ? 'var(--accent)' : 'var(--dim)'} fill={nt.pinned ? 'var(--accent)' : 'none'} />
                      </button>
                      <button onClick={() => deleteNote(nt.id)} style={dimText} aria-label="Delete note"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  {editingNoteId === nt.id ? (
                    <div>
                      <textarea
                        className="w-full text-sm px-2 py-2 focus:outline-none mb-2 resize-none"
                        style={{ ...inputStyle, minHeight: 70 }}
                        value={editNoteText}
                        onChange={e => setEditNoteText(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <BtnPrimary onClick={saveNoteEdit} style={{ padding: '6px 14px' }}>Save</BtnPrimary>
                        <button onClick={() => setEditingNoteId(null)} className="text-sm px-3" style={dimText}>Cancel</button>
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
