import { useDeferredValue, useEffect, useState } from 'react';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { useGlobalEntityDirectory, type GlobalEntityType } from '@/hooks/useControlPlane';

type RemoteEntitySelectProps = {
  entityType: Exclude<GlobalEntityType, 'subscription'>;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  selectedLabel?: string;
  disabled?: boolean;
  className?: string;
};

export function RemoteEntitySelect({
  entityType,
  value,
  onValueChange,
  placeholder,
  selectedLabel,
  disabled,
  className,
}: RemoteEntitySelectProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const results = useGlobalEntityDirectory(entityType, 1, 20, deferredSearch, null, deferredSearch.trim().length >= 2);
  const [selectedOption, setSelectedOption] = useState<SearchableSelectOption | null>(null);

  useEffect(() => {
    const match = results.data?.rows.find((row) => row.entity_id === value);
    if (match) setSelectedOption({ value: match.entity_id, label: match.label, description: match.secondary_label || match.entity_id });
  }, [results.data?.rows, value]);

  const options: SearchableSelectOption[] = (results.data?.rows || []).map((row) => ({
    value: row.entity_id,
    label: row.label,
    description: row.secondary_label || row.entity_id,
  }));
  if (value && !options.some((option) => option.value === value)) {
    options.unshift(selectedOption || { value, label: selectedLabel || value, description: value });
  }

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <input
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={`Type 2+ characters to search ${placeholder.toLowerCase()}`}
        disabled={disabled}
        aria-label={`Search ${placeholder}`}
      />
      <SearchableSelect
        options={options}
        value={value}
        onValueChange={onValueChange}
        placeholder={results.isFetching ? 'Searching...' : placeholder}
        searchPlaceholder="Filter returned results"
        emptyMessage={deferredSearch.trim().length < 2 ? 'Enter at least 2 characters above.' : 'No matching records.'}
        disabled={disabled}
      />
    </div>
  );
}