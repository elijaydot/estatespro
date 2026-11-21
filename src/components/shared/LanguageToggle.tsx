import { Globe } from 'lucide-react';
import { useI18n } from '@/contexts/useI18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { SupportedLanguage } from '@/lib/i18n';

interface LanguageToggleProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  showLabel?: boolean;
}

export function LanguageToggle({
  className,
  variant = 'outline',
  showLabel = true,
}: LanguageToggleProps) {
  const { language, setLanguage, languages, currentLanguageOption } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className={cn(
            'h-9 gap-1.5 rounded-lg border-border/80 px-2.5 text-xs font-medium transition-all shadow-xs',
            className
          )}
          aria-label="Select language / Hitamo ururimi"
        >
          <span className="text-base leading-none">{currentLanguageOption.flag}</span>
          {showLabel && (
            <span className="hidden sm:inline font-semibold">
              {currentLanguageOption.code.toUpperCase()}
            </span>
          )}
          <Globe className="h-3.5 w-3.5 text-muted-foreground opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover/95 backdrop-blur-md">
        <DropdownMenuLabel className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
          <span>Hitamo Ururimi / Language</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {languages.map((opt) => {
          const isSelected = opt.code === language;
          return (
            <DropdownMenuItem
              key={opt.code}
              onSelect={() => setLanguage(opt.code as SupportedLanguage)}
              className={cn(
                'flex items-center justify-between cursor-pointer py-2 text-xs',
                isSelected && 'bg-primary/10 font-bold text-primary'
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">{opt.flag}</span>
                <div>
                  <p className="font-medium text-foreground">{opt.nativeName}</p>
                  <p className="text-[10px] text-muted-foreground">{opt.region}</p>
                </div>
              </div>
              {isSelected && (
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
