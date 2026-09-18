'use client';

import { TeamManager } from '@/components/settings/team-manager';

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organization team members, roles, and permissions.
        </p>
      </div>
      <TeamManager />
    </div>
  );
}
