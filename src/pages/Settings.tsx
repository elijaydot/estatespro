import { useState } from 'react';
import { Settings as SettingsIcon, Globe, Building2, Palette, FileText, Bell, ClipboardCheck, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { CompanySettings } from '@/components/settings/CompanySettings';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { LeaseDocumentSettings } from '@/components/settings/LeaseDocumentSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { InspectionChecklistSettings } from '@/components/settings/InspectionChecklistSettings';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User, description: 'Account details' },
  { id: 'general', label: 'General', icon: Globe, description: 'Regional & currency' },
  { id: 'company', label: 'Company', icon: Building2, description: 'Company details' },
  { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Colors & theme' },
  { id: 'lease', label: 'Lease Documents', icon: FileText, description: 'PDF styling' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alerts & emails' },
  { id: 'inspections', label: 'Inspections', icon: ClipboardCheck, description: 'Checklists' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your application preferences</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Nav */}
        <nav className="lg:w-64 shrink-0">
          <div className="lg:sticky lg:top-4 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium truncate", isActive && "text-primary-foreground")}>
                      {tab.label}
                    </p>
                    <p className={cn(
                      "text-xs truncate hidden lg:block",
                      isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {tab.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'general' && <GeneralSettings />}
          {activeTab === 'company' && <CompanySettingsWrapper />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'lease' && <LeaseDocumentSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'inspections' && <InspectionChecklistWrapper />}
        </div>
      </div>
    </div>
  );
}

function CompanySettingsWrapper() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Company</h2>
        <p className="text-sm text-muted-foreground">Your company details shown on tenant invites and portal</p>
      </div>
      <CompanySettings />
    </div>
  );
}

function InspectionChecklistWrapper() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Inspection Checklists</h2>
        <p className="text-sm text-muted-foreground">Manage default items for tenant exit inspections</p>
      </div>
      <InspectionChecklistSettings />
    </div>
  );
}
