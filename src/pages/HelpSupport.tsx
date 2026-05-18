import { ArrowLeft, PlayCircle, FileText, CircleHelp, Video, BookOpen, Mail, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const quickLinks = [
  { label: 'Help Documents', icon: FileText, href: '/settings' },
  { label: 'Frequently Asked Questions', icon: CircleHelp, href: '/settings' },
  { label: 'Help Videos', icon: Video, href: '/settings' },
  { label: 'Business Guides', icon: BookOpen, href: '/settings' },
  { label: 'Mail Us', icon: Mail, href: 'mailto:support@fishgate.app', external: true },
];

export default function HelpSupport() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Help & Support</h1>
      </div>

      <Card className="overflow-hidden border-warning/30 bg-warning/10">
        <CardContent className="p-0">
          <div className="relative p-5 sm:p-6">
            <span className="inline-flex rounded-md bg-warning/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/90">
              Free Webinar
            </span>
            <div className="mt-3 max-w-lg">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Gain In-Depth Understanding</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Attend our free webinar to understand more about your FishGate product setup.
              </p>
              <Button className="mt-4 gap-2 rounded-xl" onClick={() => window.open('https://fishgate.app', '_blank', 'noopener,noreferrer')}>
                <PlayCircle className="h-4 w-4" />
                Attend a Webinar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Quick Help Links</p>
        {quickLinks.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              className="w-full rounded-2xl border border-border bg-card px-4 py-4 flex items-center justify-between text-left hover:bg-muted/40 transition-colors"
              onClick={() => {
                if (item.external) {
                  window.location.href = item.href;
                  return;
                }
                navigate(item.href);
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span className="text-base text-foreground truncate">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
