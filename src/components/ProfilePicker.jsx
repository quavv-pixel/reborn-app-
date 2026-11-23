// The "Who's this?" screen: create, unlock, rename, delete, export and import profiles.
import { DISPLAY, MONO, RADIUS_SM, SANS, THEMES } from '../lib/constants.js';
import { BtnPrimary, DotCloud, dimText, glassCard } from './ui.jsx';
import AccountPanel from './AccountPanel.jsx';
import { cloudConfigured } from '../sync/cloud.js';

export default function ProfilePicker({ confirmDeleteProfile, confirmExportProfile, confirmNewProfile, confirmRenameProfile, confirmUnlock, handleImportFile, importFileRef, newProfileName, openUnlock, pickerError, pickerMode, pickerPassword, pickerPassword2, pickerTarget, pickerTheme, profileList, profileListLoading, setNewProfileName, setPickerError, setPickerMode, setPickerPassword, setPickerPassword2, setPickerTheme }) {
    const pth = THEMES[pickerTheme] || THEMES.noir;
    const pickerVars = {
      '--bg': pth.bg, '--panel': pth.panel, '--field': pth.field,
      '--border': pth.border, '--text': pth.text, '--dim': pth.dim,
      '--accent': pth.accent, '--accent2': pth.accent2, '--danger': pth.danger,
    };
    const pwInputStyle = { background: 'var(--field)', border: '1px solid var(--border)', color: 'var(--text)' };
    return (
      <div className="min-h-screen flex flex-col" style={{ ...pickerVars, background: 'var(--bg)', color: 'var(--text)', fontFamily: SANS }}>
        <style>{`
          input, select, button { border-radius: ${RADIUS_SM}px; }
        `}</style>

        <div className="relative flex flex-col items-center justify-end overflow-hidden px-4 pb-6" style={{
          minHeight: '38vh',
          paddingTop: 'max(64px, env(safe-area-inset-top))',
          background: `radial-gradient(130% 110% at 50% -25%, color-mix(in srgb, var(--accent) 45%, transparent), transparent 68%)`,
        }}>
          <DotCloud width={420} height={300} cols={30} rows={17} color="color-mix(in srgb, var(--accent) 65%, white)" />
          <div className="relative text-center mb-7" style={{
            fontFamily: DISPLAY, fontSize: 44, fontWeight: 600, letterSpacing: 9, color: 'var(--accent)',
            textShadow: '0 0 32px color-mix(in srgb, var(--accent) 55%, transparent)',
          }}>
            REBORN
          </div>
          <div className="relative flex gap-1.5 overflow-x-auto w-full max-w-sm pb-0.5" style={{ scrollbarWidth: 'none' }}>
            {Object.entries(THEMES).map(([key, t]) => (
              <button key={key} onClick={() => setPickerTheme(key)} title={t.label}
                className="text-[10px] uppercase px-3 py-1.5 flex-shrink-0 rounded-full"
                style={{
                  fontFamily: MONO,
                  border: `1px solid ${pickerTheme === key ? 'var(--accent)' : 'var(--border)'}`,
                  background: pickerTheme === key ? 'var(--accent)' : 'color-mix(in srgb, var(--bg) 55%, transparent)',
                  color: pickerTheme === key ? 'var(--bg)' : 'var(--dim)',
                }}>{t.label}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 w-full max-w-sm mx-auto px-4 pt-6" style={{ paddingBottom: 'max(40px, env(safe-area-inset-bottom))' }}>
          {pickerMode === 'list' && (
            <>
              <div className="text-2xl font-medium mb-1">Who's this?</div>
              <p className="text-xs mb-5" style={dimText}>
                {cloudConfigured
                  ? 'Each profile has its own password. Sign in below to back everything up and use it on your other devices.'
                  : 'Password-protected per profile, hashed on this device. Your data stays on this device — use Export backup to move it.'}
              </p>
              {profileListLoading ? (
                <p className="text-sm" style={dimText}>Loading profiles…</p>
              ) : (
                <>
                  {profileList.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {profileList.map(p => (
                        <button key={p.name} onClick={() => openUnlock(p.name)}
                          className="w-full text-left px-4 py-3 text-sm flex items-center justify-between"
                          style={glassCard(18, '--panel')}>
                          <span>{p.name}</span>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={() => { setPickerMode('new'); setNewProfileName(''); setPickerPassword(''); setPickerPassword2(''); setPickerError(''); }}
                    className="w-full text-sm px-4 py-3 rounded-full"
                    style={{ border: '1px solid var(--accent)', color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}>
                    + New profile
                  </button>
                  <button onClick={() => { setPickerError(''); importFileRef.current && importFileRef.current.click(); }}
                    className="w-full text-xs mt-3" style={dimText}>
                    Import a profile from a backup file
                  </button>
                  <input ref={importFileRef} type="file" accept=".json,application/json" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files && e.target.files[0]; if (f) handleImportFile(f); e.target.value = ''; }} />
                  {pickerError && <p className="text-xs mt-2 text-center" style={{ color: 'var(--danger, #f87171)' }}>{pickerError}</p>}
                  <AccountPanel />
                  <p className="text-[10px] mt-6 text-center" style={dimText}>
                    <a href={`${import.meta.env.BASE_URL}privacy.html`} style={{ textDecoration: 'underline' }}>Privacy</a>
                    {' · '}
                    <a href={`${import.meta.env.BASE_URL}terms.html`} style={{ textDecoration: 'underline' }}>Terms</a>
                  </p>
                </>
              )}
            </>
          )}

          {pickerMode === 'new' && (
            <>
              <div className="text-2xl font-medium mb-1">New profile</div>
              <p className="text-xs mb-4" style={dimText}>Pick a name and a password — you'll need both to get back in.</p>
              <div className="space-y-2 mb-2">
                <input className="w-full text-sm px-3 py-2 focus:outline-none" style={pwInputStyle}
                  value={newProfileName} onChange={e => setNewProfileName(e.target.value)} placeholder="Name" autoFocus />
                <input type="password" className="w-full text-sm px-3 py-2 focus:outline-none" style={pwInputStyle}
                  value={pickerPassword} onChange={e => setPickerPassword(e.target.value)} placeholder="Password" />
                <input type="password" className="w-full text-sm px-3 py-2 focus:outline-none" style={pwInputStyle}
                  value={pickerPassword2} onChange={e => setPickerPassword2(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmNewProfile(); }}
                  placeholder="Confirm password" />
              </div>
              {pickerError && <p className="text-xs mb-2" style={{ color: 'var(--danger, #f87171)' }}>{pickerError}</p>}
              <div className="flex gap-2">
                <BtnPrimary onClick={confirmNewProfile}>Create</BtnPrimary>
                <button onClick={() => setPickerMode('list')} className="text-sm px-3 py-2" style={dimText}>Back</button>
              </div>
            </>
          )}

          {pickerMode === 'unlock' && (
            <>
              <div className="text-2xl font-medium mb-1">{pickerTarget}</div>
              <p className="text-xs mb-4" style={dimText}>Enter your password.</p>
              <input type="password" className="w-full text-sm px-3 py-2 focus:outline-none mb-2" style={pwInputStyle}
                value={pickerPassword} onChange={e => setPickerPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmUnlock(); }}
                placeholder="Password" autoFocus />
              {pickerError && <p className="text-xs mb-2" style={{ color: 'var(--danger, #f87171)' }}>{pickerError}</p>}
              <div className="flex gap-2">
                <BtnPrimary onClick={confirmUnlock}>Unlock</BtnPrimary>
                <button onClick={() => setPickerMode('list')} className="text-sm px-3 py-2" style={dimText}>Back</button>
              </div>
              <div className="flex gap-4 mt-5 flex-wrap">
                <button onClick={() => { setNewProfileName(pickerTarget); setPickerPassword(''); setPickerError(''); setPickerMode('rename'); }}
                  className="text-xs" style={dimText}>Rename profile</button>
                <button onClick={() => { setPickerPassword(''); setPickerError(''); setPickerMode('export'); }}
                  className="text-xs" style={dimText}>Export backup</button>
                <button onClick={() => { setPickerPassword(''); setPickerError(''); setPickerMode('delete'); }}
                  className="text-xs" style={{ color: 'var(--danger, #f87171)' }}>Delete profile</button>
              </div>
            </>
          )}

          {pickerMode === 'export' && (
            <>
              <div className="text-2xl font-medium mb-1">Export {pickerTarget}</div>
              <p className="text-xs mb-4" style={dimText}>
                Downloads a backup file with everything in this profile. Open the app on another device or another link, tap "Import a profile from a backup file", and pick this file — your same password still protects it there.
              </p>
              <input type="password" className="w-full text-sm px-3 py-2 focus:outline-none mb-2" style={pwInputStyle}
                value={pickerPassword} onChange={e => setPickerPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmExportProfile(); }}
                placeholder="Password" autoFocus />
              {pickerError && <p className="text-xs mb-2" style={{ color: 'var(--danger, #f87171)' }}>{pickerError}</p>}
              <div className="flex gap-2">
                <BtnPrimary onClick={confirmExportProfile}>Download backup</BtnPrimary>
                <button onClick={() => { setPickerError(''); setPickerMode('unlock'); }} className="text-sm px-3 py-2" style={dimText}>Back</button>
              </div>
            </>
          )}

          {pickerMode === 'rename' && (
            <>
              <div className="text-2xl font-medium mb-1">Rename {pickerTarget}</div>
              <p className="text-xs mb-4" style={dimText}>Everything stays exactly as it is — only the name changes. Your password stays the same too.</p>
              <div className="space-y-2 mb-2">
                <input className="w-full text-sm px-3 py-2 focus:outline-none" style={pwInputStyle}
                  value={newProfileName} onChange={e => setNewProfileName(e.target.value)} placeholder="New name" autoFocus />
                <input type="password" className="w-full text-sm px-3 py-2 focus:outline-none" style={pwInputStyle}
                  value={pickerPassword} onChange={e => setPickerPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmRenameProfile(); }}
                  placeholder="Password" />
              </div>
              {pickerError && <p className="text-xs mb-2" style={{ color: 'var(--danger, #f87171)' }}>{pickerError}</p>}
              <div className="flex gap-2">
                <BtnPrimary onClick={confirmRenameProfile}>Rename</BtnPrimary>
                <button onClick={() => { setPickerError(''); setPickerMode('unlock'); }} className="text-sm px-3 py-2" style={dimText}>Back</button>
              </div>
            </>
          )}

          {pickerMode === 'delete' && (
            <>
              <div className="text-2xl font-medium mb-1">Delete {pickerTarget}?</div>
              <p className="text-xs mb-4" style={{ color: 'var(--danger, #f87171)' }}>
                This permanently erases everything in this profile on this device — workouts, habits, budget, all of it. There is no undo.
              </p>
              <input type="password" className="w-full text-sm px-3 py-2 focus:outline-none mb-2" style={pwInputStyle}
                value={pickerPassword} onChange={e => setPickerPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmDeleteProfile(); }}
                placeholder="Password" autoFocus />
              {pickerError && <p className="text-xs mb-2" style={{ color: 'var(--danger, #f87171)' }}>{pickerError}</p>}
              <div className="flex gap-2">
                <button onClick={confirmDeleteProfile} className="text-sm font-medium px-3 py-2"
                  style={{ background: 'var(--danger, #f87171)', color: 'var(--bg)' }}>Delete forever</button>
                <button onClick={() => { setPickerError(''); setPickerMode('unlock'); }} className="text-sm px-3 py-2" style={dimText}>Back</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
