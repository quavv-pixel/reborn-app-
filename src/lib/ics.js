// Turns the daily schedule into an .ics file the phone calendar can import.
import { localDateStr } from './utils.js';

// ---- .ics calendar export -------------------------------------------------
export function parseTimeLabel(t) {
  const m = /^(\d{1,2}):(\d{2})\s*([AP]M)?$/i.exec((t || '').trim());
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3] ? m[3].toUpperCase() : null;
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return { h, min };
}

export function icsEscape(s) {
  return String(s).replace(/[\\;,]/g, c => '\\' + c);
}

export function buildScheduleICS(schedule) {
  const now = new Date();
  const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const startDate = localDateStr(now).replace(/-/g, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//REBORN//Schedule Export//EN', 'CALSCALE:GREGORIAN'];

  schedule.forEach((block, i) => {
    const parsed = parseTimeLabel(block.time);
    if (!parsed || !block.label) return;
    const hh = String(parsed.h).padStart(2, '0');
    const mm = String(parsed.min).padStart(2, '0');
    const dtstart = `${startDate}T${hh}${mm}00`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:reborn-${block.id || i}@reborn`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=${Intl.DateTimeFormat().resolvedOptions().timeZone}:${dtstart}`,
      'DURATION:PT15M',
      'RRULE:FREQ=DAILY',
      `SUMMARY:${icsEscape(block.label)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsEscape(block.label)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(schedule) {
  const ics = buildScheduleICS(schedule);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reborn-schedule.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
