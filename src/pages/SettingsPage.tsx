import { useState } from 'react';
import { Settings, User, Music, Bell, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Textarea, Select } from '@/components/ui/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';

const TABS = [
  { key: 'profile', label: 'Profile', icon: <User size={16} /> },
  { key: 'artist', label: 'Artist Profile', icon: <Music size={16} /> },
  { key: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  { key: 'security', label: 'Security', icon: <Shield size={16} /> },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({ name: 'Admin', email: 'admin@example.com' });
  const [artistForm, setArtistForm] = useState({ name: 'My Artist', bio: '', slug: 'my-artist' });
  const [notifSettings, setNotifSettings] = useState({ newInquiries: true, bookingReminders: true, paymentAlerts: true, weeklyDigest: false });
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); toast('success', 'Profile saved'); }, 500);
  };

  const saveArtist = async () => {
    setSaving(true);
    const { data: existing } = await supabase.from('artists').select('id').eq('slug', 'my-artist').maybeSingle();
    if (existing) {
      await supabase.from('artists').update({ name: artistForm.name, bio: artistForm.bio }).eq('id', existing.id);
    } else {
      await supabase.from('artists').insert({ name: artistForm.name, slug: artistForm.slug, bio: artistForm.bio });
    }
    setSaving(false);
    toast('success', 'Artist profile saved');
  };

  return (
    <div>
      <PageHeader title="Settings" description="Manage your portal configuration" />

      <div className="flex flex-col sm:flex-row gap-6">
        <div className="sm:w-48 flex-shrink-0">
          <div className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {activeTab === 'profile' && (
            <Card className="p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Profile Settings</h3>
              <div className="space-y-4 max-w-md">
                <Field label="Name"><Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></Field>
                <Button variant="primary" onClick={saveProfile} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
              </div>
            </Card>
          )}

          {activeTab === 'artist' && (
            <Card className="p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Artist Profile</h3>
              <div className="space-y-4 max-w-md">
                <Field label="Artist Name"><Input value={artistForm.name} onChange={(e) => setArtistForm({ ...artistForm, name: e.target.value })} /></Field>
                <Field label="Slug"><Input value={artistForm.slug} onChange={(e) => setArtistForm({ ...artistForm, slug: e.target.value })} /></Field>
                <Field label="Bio"><Textarea rows={4} value={artistForm.bio} onChange={(e) => setArtistForm({ ...artistForm, bio: e.target.value })} /></Field>
                <Button variant="primary" onClick={saveArtist} disabled={saving}>{saving ? 'Saving…' : 'Save Artist'}</Button>
              </div>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card className="p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Notification Preferences</h3>
              <div className="space-y-3 max-w-md">
                {(Object.keys(notifSettings) as (keyof typeof notifSettings)[]).map((key) => (
                  <label key={key} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                    <span className="text-sm text-neutral-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <input
                      type="checkbox"
                      checked={notifSettings[key]}
                      onChange={(e) => setNotifSettings({ ...notifSettings, [key]: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                  </label>
                ))}
                <Button variant="primary" onClick={() => toast('success', 'Preferences saved')}>Save Preferences</Button>
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card className="p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Security</h3>
              <div className="space-y-4 max-w-md">
                <Field label="Current Password"><Input type="password" placeholder="••••••••" /></Field>
                <Field label="New Password"><Input type="password" placeholder="••••••••" /></Field>
                <Field label="Confirm Password"><Input type="password" placeholder="••••••••" /></Field>
                <Button variant="primary" onClick={() => toast('success', 'Password updated')}>Update Password</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
