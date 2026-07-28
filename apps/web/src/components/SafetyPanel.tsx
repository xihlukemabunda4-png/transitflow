'use client';

import { useEffect, useState } from 'react';
import type { EmergencyContact, LostFoundReport } from '@transitflow/types';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n/context';

export function SafetyPanel() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [reports, setReports] = useState<LostFoundReport[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [lostDescription, setLostDescription] = useState('');
  const [sosStatus, setSosStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  async function sendSos(lat: number, lng: number, message?: string) {
    if (!token) return;
    try {
      await api.triggerSos(token, lat, lng, message);
      setSosStatus('sent');
    } catch {
      setSosStatus('failed');
    } finally {
      setTimeout(() => setSosStatus('idle'), 3000);
    }
  }

  async function refresh() {
    if (!token) return;
    const [c, r] = await Promise.all([api.emergencyContacts(token), api.myLostFound(token)]);
    setContacts(c);
    setReports(r);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return <p className="text-sm text-tf-text-muted">Sign in to set up emergency contacts and safety tools.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          disabled={sosStatus === 'sending'}
          onClick={() => {
            setSosStatus('sending');
            if (!navigator.geolocation) {
              sendSos(-26.2001, 28.047, 'Location unavailable — approximate');
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => sendSos(pos.coords.latitude, pos.coords.longitude),
              // Fall back to the demo city center if geolocation is denied/unavailable.
              () => sendSos(-26.2001, 28.047, 'Location unavailable — approximate'),
            );
          }}
          className="w-full rounded-tf-md bg-tf-danger text-white font-bold py-4 text-lg disabled:opacity-70"
        >
          {sosStatus === 'sending'
            ? 'Sending…'
            : sosStatus === 'sent'
              ? 'Alert sent to dispatch'
              : sosStatus === 'failed'
                ? 'Failed — try again'
                : t('safety.sos')}
        </button>
        <p className="text-xs text-tf-text-muted mt-1">
          Sends your location to dispatch. This is not a substitute for calling emergency services.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-tf-text-muted mb-2">Emergency Contacts</h3>
        <ul className="mb-2">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center justify-between text-sm py-1">
              <span>
                {c.name} — {c.phone}
              </span>
              <button
                onClick={async () => {
                  await api.removeEmergencyContact(token, c.id);
                  refresh();
                }}
                className="text-xs text-tf-danger"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-tf-sm border border-tf-border bg-tf-surface-raised px-3 py-2 text-sm"
          />
          <input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1 rounded-tf-sm border border-tf-border bg-tf-surface-raised px-3 py-2 text-sm"
          />
          <button
            disabled={!name || !phone}
            onClick={async () => {
              await api.addEmergencyContact(token, name, phone);
              setName('');
              setPhone('');
              refresh();
            }}
            className="rounded-tf-sm bg-tf-primary text-tf-primary-ink font-bold px-3 text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-tf-text-muted mb-2">Lost &amp; Found</h3>
        <div className="flex gap-2 mb-2">
          <input
            placeholder="Describe the item and where you left it"
            value={lostDescription}
            onChange={(e) => setLostDescription(e.target.value)}
            className="flex-1 rounded-tf-sm border border-tf-border bg-tf-surface-raised px-3 py-2 text-sm"
          />
          <button
            disabled={!lostDescription}
            onClick={async () => {
              await api.reportLostItem(token, lostDescription);
              setLostDescription('');
              refresh();
            }}
            className="rounded-tf-sm bg-tf-primary text-tf-primary-ink font-bold px-3 text-sm disabled:opacity-50"
          >
            Report
          </button>
        </div>
        <ul>
          {reports.map((r) => (
            <li key={r.id} className="text-sm py-1 flex items-center justify-between">
              <span>{r.description}</span>
              <span className={r.status === 'RESOLVED' ? 'text-tf-success text-xs' : 'text-tf-text-muted text-xs'}>
                {r.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
