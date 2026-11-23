// The "Who's this?" screen: create, unlock, rename, delete, export and import profiles.
import { BtnPrimary, dimText, glassCard } from './ui.jsx';
import AccountPanel from './AccountPanel.jsx';
import { cloudConfigured } from '../sync/cloud.js';
import { useState } from 'react';

export default function ProfilePicker({ confirmResetProfilePassword, confirmDeleteProfile, confirmExportProfile, confirmNewProfile, confirmRenameProfile, confirmUnlock, handleImportFile, importFileRef, newProfileName, openUnlock, pickerError, pickerMode, pickerPassword, pickerPassword2, pickerTarget, profileList, profileListLoading, setNewProfileName, setPickerError, setPickerMode, setPickerPassword, setPickerPassword2 }) {
    const [accountPassword, setAccountPassword] = useState('');
    const pwInputStyle = { background: 'var(--field)', border: '1px solid var(--border)', color: 'var(--text)' };
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="flex flex-col items-center px-4 pb-2" style={{ paddingTop: 'max(56px, calc(env(safe-area-inset-top) + 32px))' }}>
          <div className="text-3xl font-bold" style={{ letterSpacing: 6, color: 'var(--accent)' }}>REBORN</div>
        </div>

        <div className="flex-1 w-full max-w-sm mx-auto px-4 pt-6" style={{ paddingBottom: 'max(40px, env(safe-area-inset-bottom))' }}>
          {pickerMode === 'list' && (
            <>
              <div className="text-2xl font-medium mb-1">Who's this?</div>
              <p className="text-xs mb-5" style={dimText}>
                {cloudConfigured
                  ? 'Pick your profile, or make a new one. Sign in below to keep everything backed up.'
                  : 'Pick your profile, or make a new one. Each profile has its own password.'}
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
                    style={{ border: '1px solid var(--accent)', color: 'var(--accent)', background: 'var(--accent-soft)' }}>
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
                <button onClick={() => { setPickerPassword(''); setPickerPassword2(''); setAccountPassword(''); setPickerError(''); setPickerMode('forgot'); }}
                  className="text-xs" style={dimText}>Forgot password?</button>
                <button onClick={() => { setNewProfileName(pickerTarget); setPickerPassword(''); setPickerError(''); setPickerMode('rename'); }}
                  className="text-xs" style={dimText}>Rename profile</button>
                <button onClick={() => { setPickerPassword(''); setPickerError(''); setPickerMode('export'); }}
                  className="text-xs" style={dimText}>Export backup</button>
                <button onClick={() => { setPickerPassword(''); setPickerError(''); setPickerMode('delete'); }}
                  className="text-xs" style={{ color: 'var(--danger, #f87171)' }}>Delete profile</button>
              </div>
            </>
          )}

          {pickerMode === 'forgot' && (
            <>
              <div className="text-2xl font-medium mb-1">Reset “{pickerTarget}”</div>
              {cloudConfigured ? (
                <>
                  <p className="text-xs mb-4" style={dimText}>
                    Enter your <b>account</b> password to prove it's you, then choose a new password for this profile. Works for profiles you've opened at least once while signed in.
                  </p>
                  <input type="password" className="w-full text-sm px-3 py-2 focus:outline-none mb-2" style={pwInputStyle}
                    value={accountPassword} onChange={e => setAccountPassword(e.target.value)}
                    placeholder="Account password" autoComplete="current-password" autoFocus />
                  <input type="password" className="w-full text-sm px-3 py-2 focus:outline-none mb-2" style={pwInputStyle}
                    value={pickerPassword} onChange={e => setPickerPassword(e.target.value)}
                    placeholder="New profile password" autoComplete="new-password" />
                  <input type="password" className="w-full text-sm px-3 py-2 focus:outline-none mb-2" style={pwInputStyle}
                    value={pickerPassword2} onChange={e => setPickerPassword2(e.target.value)}
                    placeholder="Confirm new profile password" autoComplete="new-password" />
                  {pickerError && <p className="text-xs mb-2" style={{ color: 'var(--danger, #f87171)' }}>{pickerError}</p>}
                  <div className="flex gap-2">
                    <BtnPrimary onClick={() => confirmResetProfilePassword(accountPassword)}>Reset password</BtnPrimary>
                    <button onClick={() => { setPickerError(''); setPickerMode('unlock'); }} className="text-sm px-3 py-2" style={dimText}>Back</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs mb-4" style={dimText}>
                    Profile passwords are scrambled on this device and never sent anywhere, so they can't be recovered. If you have a backup file you can import it under a different name, or delete this profile and start fresh.
                  </p>
                  <button onClick={() => { setPickerError(''); setPickerMode('unlock'); }} className="text-sm px-3 py-2" style={dimText}>Back</button>
                </>
              )}
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
