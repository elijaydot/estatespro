const Placeholder = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center min-h-[400px] bg-card rounded-xl card-shadow-md">
    <div className="text-center">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-muted-foreground mt-2">This module will be available in a future phase.</p>
    </div>
  </div>
);

export const Leases = () => <Placeholder title="Lease Management" />;
export const Financials = () => <Placeholder title="Financial Management" />;
export const Maintenance = () => <Placeholder title="Maintenance Requests" />;
export const Messages = () => <Placeholder title="Communication Portal" />;
export const Notifications = () => <Placeholder title="Notifications" />;
export const Settings = () => <Placeholder title="Settings" />;
