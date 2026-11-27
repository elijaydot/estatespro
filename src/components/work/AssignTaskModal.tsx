// src/components/work/AssignTaskModal.tsx
// FishGate Design Constitution v1.0 - Section 1: Quick Task Assignment & Reallocation Modal

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { UserCheck, Building, Clock, CheckSquare } from 'lucide-react';
import { TaskRecord, TaskOwner } from './types';

interface AssignTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskRecord | null;
  teamMembers: TaskOwner[];
  onAssignConfirm: (taskId: string, newOwner: TaskOwner, newDueDate?: string) => void;
}

export function AssignTaskModal({
  open,
  onOpenChange,
  task,
  teamMembers,
  onAssignConfirm,
}: AssignTaskModalProps) {
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(
    task?.owner?.id || teamMembers[0]?.id || ''
  );
  const [newDueDate, setNewDueDate] = useState<string>(task?.dueDate || '');

  if (!task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedOwner = teamMembers.find((m) => m.id === selectedOwnerId) || task.owner;
    onAssignConfirm(task.id, selectedOwner, newDueDate || task.dueDate);
    onOpenChange(false);

    toast({
      title: 'Task Reassigned',
      description: `${task.taskNumber} is now assigned to ${selectedOwner.name}.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs font-bold text-blue-700 bg-blue-50">
              {task.taskNumber}
            </Badge>
            <Badge variant="secondary" className="text-[10px] capitalize">
              {task.source}
            </Badge>
          </div>

          <DialogTitle className="text-base font-bold text-slate-900 mt-2 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Reassign Operational Task</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {task.title}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Assign To Team Member *</Label>
            <select
              value={selectedOwnerId}
              onChange={(e) => setSelectedOwnerId(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
              required
            >
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.role || 'Operational Team'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Adjust Delivery Deadline</Label>
            <Input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="text-xs h-9 font-mono"
            />
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-600 space-y-1">
            <span className="font-semibold text-slate-900 block text-xs">Current Allocation</span>
            <div>Currently assigned to: <strong>{task.owner.name}</strong></div>
            <div>Target Property: <strong>{task.propertyName}</strong></div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs font-medium"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Save Assignment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
