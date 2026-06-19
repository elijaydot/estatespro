import { useState, useRef, useCallback } from 'react';
import { 
  Bold, Italic, Underline, List, ListOrdered, 
  Link2, Quote, Code, Smile,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  onSubmit?: () => void;
}

const EMOJI_LIST = ['😊', '👍', '❤️', '🎉', '🏠', '🔑', '💧', '⚡', '🔧', '📋', '✅', '❌', '⏰', '📞', '💰', '🚿'];

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Type a message...',
  className,
  minHeight = '100px',
  onSubmit,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = useCallback((prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    
    const newText = value.substring(0, start) + prefix + selected + suffix + value.substring(end);
    onChange(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = end + prefix.length;
    }, 0);
  }, [value, onChange]);

  const insertText = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const newText = value.substring(0, start) + text + value.substring(start);
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + text.length;
      textarea.selectionEnd = start + text.length;
    }, 0);
  }, [value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  const ToolButton = ({ icon: Icon, onClick, title }: { icon: LucideIcon; onClick: () => void; title: string }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={title}
      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );

  return (
    <div className={cn('border rounded-lg bg-background overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b bg-muted/30 flex-wrap">
        <ToolButton icon={Bold} onClick={() => wrapSelection('**')} title="Bold" />
        <ToolButton icon={Italic} onClick={() => wrapSelection('_')} title="Italic" />
        <ToolButton icon={Underline} onClick={() => wrapSelection('__')} title="Underline" />
        <div className="w-px h-4 bg-border mx-1" />
        <ToolButton icon={List} onClick={() => insertText('\n- ')} title="Bullet List" />
        <ToolButton icon={ListOrdered} onClick={() => insertText('\n1. ')} title="Numbered List" />
        <ToolButton icon={Quote} onClick={() => insertText('\n> ')} title="Quote" />
        <div className="w-px h-4 bg-border mx-1" />
        <ToolButton icon={Code} onClick={() => wrapSelection('`')} title="Code" />
        <ToolButton icon={Link2} onClick={() => wrapSelection('[', '](url)')} title="Link" />
        
        {/* Emoji Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Emoji"
            >
              <Smile className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertText(emoji)}
                  className="h-8 w-8 flex items-center justify-center text-lg hover:bg-muted rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Text Area */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="border-0 rounded-none focus-visible:ring-0 resize-none"
        style={{ minHeight }}
      />
    </div>
  );
}
