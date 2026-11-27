// src/components/work/TaskDetailModal.tsx
// FishGate Design Constitution v1.0 - Section 4: Personal Work Hub Detail & Collaboration Cockpit

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import {
  CheckSquare,
  Clock,
  User,
  Building,
  CheckCircle2,
  Circle,
  MessageSquare,
  Paperclip,
  Printer,
  Flame,
  AlertTriangle,
  ArrowRight,
  Send,
  Download,
  FileText,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { TaskRecord, TaskStatus, TaskPriority, TaskSource } from './types';
import { openPrintHtml } from '@/lib/pdfService';

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskRecord | null;
  onUpdateTask: (updated: TaskRecord) => void;
  onReassign?: (task: TaskRecord) => void;
}

const EMOJI_PRESETS = ['✅', '📅', '⚠️', '🏠', '💰', '🔧'];

export function TaskDetailModal({
  open,
  onOpenChange,
  task,
  onUpdateTask,
  onReassign,
}: TaskDetailModalProps) {
  // Declare all hooks unconditionally at the very top
  const [commentText, setCommentText] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('✅');
  const [statusVal, setStatusVal] = useState<TaskStatus>(task?.status || 'in_progress');

  if (!task) return null;

  const handleToggleChecklist = (checkId: string) => {
    const updatedChecklist = task.checklist.map((item) =>
      item.id === checkId ? { ...item, completed: !item.completed } : item
    );
    const updated: TaskRecord = {
      ...task,
      checklist: updatedChecklist,
      updatedAt: new Date().toISOString(),
    };
    onUpdateTask(updated);
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    setStatusVal(newStatus);
    const updated: TaskRecord = {
      ...task,
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : task.completedAt,
      updatedAt: new Date().toISOString(),
    };
    onUpdateTask(updated);
    toast({ title: 'Task Status Updated', description: `${task.taskNumber} transitioned to ${newStatus}.` });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment = {
      id: `comm-${Date.now()}`,
      authorName: 'Operations Lead',
      text: commentText.trim(),
      emoji: selectedEmoji,
      createdAt: new Date().toISOString(),
    };

    const updated: TaskRecord = {
      ...task,
      comments: [...task.comments, newComment],
      updatedAt: new Date().toISOString(),
    };

    onUpdateTask(updated);
    setCommentText('');
    toast({ title: 'Comment Posted', description: 'Operational note added to audit trail.' });
  };

  const handlePrintTask = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Work Task Brief - ${task.taskNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 36px; color: #0f172a; line-height: 1.45; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .ref { font-size: 14px; font-family: monospace; font-weight: 700; color: #2563eb; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; font-size: 12px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
    .box-label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
    .box-val { font-weight: 600; color: #0f172a; }
    .scope { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 12px; }
    ul { padding-left: 20px; font-size: 12px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 36px; padding-top: 18px; border-top: 1px dashed #cbd5e1; font-size: 11px; }
    .sig-line { border-bottom: 1px solid #94a3b8; height: 32px; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">OFFICIAL WORK BRIEF & DELIVERABLE</h1>
      <div class="ref">${task.taskNumber}</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Department: ${task.department}</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #64748b;">
      <div><strong>Priority:</strong> ${task.priority.toUpperCase()}</div>
      <div><strong>Due Date:</strong> ${task.dueDate}</div>
      <div><strong>Assignee:</strong> ${task.owner.name}</div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="box-label">Target Asset & Location</div>
      <div class="box-val">${task.propertyName} ${task.unitNumber ? `(Unit ${task.unitNumber})` : ''}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
        ${task.tenantName ? `Resident: ${task.tenantName}` : 'Common Grounds'}
      </div>
    </div>
    <div class="box">
      <div class="box-label">Origin & Status</div>
      <div class="box-val">Source: ${task.source.toUpperCase()} ${task.sourceEntityRef ? `(${task.sourceEntityRef})` : ''}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Status: ${task.status.toUpperCase()}</div>
    </div>
  </div>

  <div class="scope">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #64748b; margin-bottom: 4px;">Task Description & Operational Scope</div>
    <div style="font-size: 13px; font-weight: 600; color: #0f172a;">${task.title}</div>
    <div style="margin-top: 6px; color: #334155;">${task.description}</div>
  </div>

  ${
    task.checklist.length > 0
      ? `<div><strong>Execution Checklist:</strong><ul>${task.checklist
          .map((c) => `<li>[${c.completed ? 'X' : ' '}] ${c.text}</li>`)
          .join('')}</ul></div>`
      : ''
  }

  <div class="signatures">
    <div>
      <div class="sig-line"></div>
      <div style="text-align: center; color: #64748b;">Assigned Owner: ${task.owner.name}</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div style="text-align: center; color: #64748b;">Manager Sign-Off & Verification</div>
    </div>
  </div>
</body>
</html>`;

    openPrintHtml(html, `Task-${task.taskNumber}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs font-bold text-blue-700 bg-blue-50">
                {task.taskNumber}
              </Badge>
              <Badge variant="secondary" className="text-[10px] capitalize">
                {task.source}
              </Badge>
              <Badge
                variant={task.priority === 'critical' ? 'destructive' : 'outline'}
                className="text-[10px] uppercase font-bold"
              >
                {task.priority}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono">
                Due {task.dueDate}
              </span>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-800"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting">Waiting</option>
                <option value="blocked">Blocked</option>
                <option value="under_review">Under Review</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <DialogTitle className="text-base font-bold text-slate-900 mt-2">
            {task.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {task.propertyName} {task.unitNumber ? `• Unit ${task.unitNumber}` : ''} • Department: {task.department}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Scope Box */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 leading-relaxed">
            <span className="font-bold text-slate-900 block mb-1">Operational Scope & Context</span>
            {task.description}
          </div>

          {/* Allocation & Relationships Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Assigned Owner</span>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">{task.owner.name}</span>
                  <span className="text-[11px] text-slate-500">{task.owner.role || 'Operations Specialist'}</span>
                </div>
                {onReassign && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px] text-blue-600 hover:text-blue-700"
                    onClick={() => onReassign(task)}
                  >
                    Reassign
                  </Button>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Origin & Related Case</span>
              <div className="font-mono text-slate-900 font-bold text-sm">
                {task.sourceEntityRef || 'Direct Assignment'}
              </div>
              <span className="text-[11px] text-slate-500 block capitalize">
                Source Module: {task.source}
              </span>
            </div>
          </div>

          {/* Interactive Checklist */}
          {task.checklist.length > 0 && (
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">Deliverable Checklist</span>
                <span className="font-mono text-[10px] text-slate-500">
                  {task.checklist.filter((c) => c.completed).length} of {task.checklist.length} completed
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                {task.checklist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleChecklist(item.id)}
                    className="flex items-center gap-2.5 p-2 rounded hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    {item.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className={`text-xs ${item.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments & Collaboration Feed */}
          <div className="space-y-3">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Collaboration & Field Notes ({task.comments.length})</span>
            </span>

            {/* Existing Comments */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {task.comments.length === 0 ? (
                <div className="p-3 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-md">
                  No comments yet. Add field updates or verification notes below.
                </div>
              ) : (
                task.comments.map((comm) => (
                  <div key={comm.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{comm.emoji || '💬'}</span>
                        <strong className="text-slate-800">{comm.authorName}</strong>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {comm.createdAt.slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>
                    <p className="text-slate-700 text-xs pl-5 leading-relaxed">{comm.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input with Emoji Presets */}
            <form onSubmit={handleAddComment} className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-medium">Quick Tag:</span>
                {EMOJI_PRESETS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setSelectedEmoji(em)}
                    className={`h-6 w-6 text-xs rounded border transition-all ${
                      selectedEmoji === em ? 'border-blue-600 bg-blue-50 shadow-2xs' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add operational update or milestone note..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="text-xs h-9 flex-1"
                />
                <Button type="submit" size="sm" className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1 px-3">
                  <Send className="w-3 h-3" /> Post
                </Button>
              </div>
            </form>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold gap-1.5 text-slate-700"
            onClick={handlePrintTask}
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" /> Print Task Brief
          </Button>

          <div className="flex items-center gap-2 justify-end">
            {task.status !== 'completed' && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
                onClick={() => handleStatusChange('completed')}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-medium"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
