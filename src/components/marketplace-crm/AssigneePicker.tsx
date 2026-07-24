import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';

export interface AssigneeOption {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

interface AssigneePickerProps {
  users: AssigneeOption[];
  value: string | null;
  onChange: (next: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowUnassigned?: boolean;
  unassignedLabel?: string;
}

export function AssigneePicker({
  users,
  value,
  onChange,
  placeholder = 'Select assignee',
  className,
  disabled = false,
  allowUnassigned = true,
  unassignedLabel = 'Unassigned',
}: AssigneePickerProps) {
  const options: SearchableSelectOption[] = users.map((user) => ({
    value: user.user_id,
    label: user.name,
    description: `${user.email} · ${user.role}`,
  }));

  if (allowUnassigned) {
    options.unshift({
      value: 'unassigned',
      label: unassignedLabel,
      description: 'No owner selected',
    });
  }

  return (
    <SearchableSelect
      options={options}
      value={value || (allowUnassigned ? 'unassigned' : '')}
      onValueChange={(next) => {
        if (allowUnassigned && next === 'unassigned') {
          onChange(null);
          return;
        }
        onChange(next || null);
      }}
      placeholder={placeholder}
      searchPlaceholder="Search by name, email, or role"
      emptyMessage="No assignable users found."
      className={className}
      disabled={disabled}
    />
  );
}
