import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
  className?: string;
}

const defaultPresets = [
  '#f59e0b', // Amber (default accent)
  '#ef4444', // Red
  '#f97316', // Orange
  '#84cc16', // Lime
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#64748b', // Slate
];

export function ColorPicker({
  value,
  onChange,
  presets = defaultPresets,
  className,
}: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handlePresetClick = (color: string) => {
    setInputValue(color);
    onChange(color);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('w-full justify-start gap-2', className)}
        >
          <div
            className="h-5 w-5 rounded-md border shadow-sm"
            style={{ backgroundColor: value }}
          />
          <span className="font-mono text-sm">{value}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Color</label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={value}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  onChange(e.target.value);
                }}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={inputValue}
                onChange={handleInputChange}
                placeholder="#f59e0b"
                className="font-mono"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Presets</label>
            <div className="grid grid-cols-7 gap-1.5">
              {presets.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handlePresetClick(color)}
                  className={cn(
                    'h-7 w-7 rounded-md border-2 transition-all hover:scale-110',
                    value === color ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
