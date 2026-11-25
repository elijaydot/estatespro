import { useState } from 'react';
import { Search, Tag, Copy, Check, FileText, Plus, Sparkles, Filter } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { CommunicationTemplate } from './types';
import { DEFAULT_COMMUNICATION_TEMPLATES } from './defaultTemplates';

interface TemplateLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: CommunicationTemplate) => void;
  currentResidentContext?: {
    tenantName?: string;
    propertyName?: string;
    unitNumber?: string;
    rentAmount?: string;
    managerName?: string;
  };
}

export function TemplateLibraryModal({
  open,
  onOpenChange,
  onSelectTemplate,
  currentResidentContext,
}: TemplateLibraryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(
    DEFAULT_COMMUNICATION_TEMPLATES[0]
  );
  const [customTemplates, setCustomTemplates] = useState<CommunicationTemplate[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'finance' | 'leasing' | 'maintenance' | 'general'>('general');

  const allTemplates = [...DEFAULT_COMMUNICATION_TEMPLATES, ...customTemplates];

  const filteredTemplates = allTemplates.filter((tmpl) => {
    const matchesCategory = selectedCategory === 'all' || tmpl.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      tmpl.title.toLowerCase().includes(q) ||
      tmpl.subject.toLowerCase().includes(q) ||
      tmpl.tags.some((t) => t.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const handleCreateCustom = () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Template title and content are required.',
        variant: 'destructive',
      });
      return;
    }

    const created: CommunicationTemplate = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      subject: newSubject.trim() || newTitle.trim(),
      content: newContent.trim(),
      tags: ['custom', newCategory],
    };

    setCustomTemplates((prev) => [created, ...prev]);
    setSelectedTemplate(created);
    setNewTitle('');
    setNewSubject('');
    setNewContent('');
    toast({
      title: 'Template Created',
      description: 'Your custom communication template has been saved.',
    });
  };

  const interpolate = (text: string) => {
    if (!currentResidentContext) return text;
    return text
      .replaceAll('{{tenant_name}}', currentResidentContext.tenantName || '[Resident Name]')
      .replaceAll('{{property_name}}', currentResidentContext.propertyName || '[Property Name]')
      .replaceAll('{{unit_number}}', currentResidentContext.unitNumber || '[Unit Number]')
      .replaceAll('{{rent_amount}}', currentResidentContext.rentAmount || '[Rent Amount]')
      .replaceAll('{{property_manager}}', currentResidentContext.managerName || 'Property Management')
      .replaceAll('{{due_date}}', 'the 1st of next month')
      .replaceAll('{{lease_end_date}}', 'upcoming term')
      .replaceAll('{{reply_deadline}}', 'the next 7 business days');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-white">
          <DialogTitle className="text-xl font-bold text-slate-900">
            Communication Template Library
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Pre-built statutory, operational, and financial notices for fast and consistent resident communication.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="library" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <TabsList className="bg-transparent h-10 p-0 gap-4">
              <TabsTrigger
                value="library"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-2 text-xs font-bold"
              >
                Template Library ({allTemplates.length})
              </TabsTrigger>
              <TabsTrigger
                value="create"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-2 text-xs font-bold"
              >
                + Create Custom Template
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="library" className="flex-1 m-0 p-0 flex flex-col sm:flex-row overflow-hidden">
            {/* Left: List & Filters */}
            <div className="w-full sm:w-80 border-r border-slate-200 flex flex-col bg-white overflow-hidden">
              <div className="p-3 border-b border-slate-100 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs bg-slate-50"
                  />
                </div>
                <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
                  {['all', 'finance', 'leasing', 'maintenance', 'general'].map((cat) => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? 'default' : 'ghost'}
                      size="sm"
                      className="h-6 text-[11px] px-2 py-0 capitalize"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {filteredTemplates.map((template) => {
                  const isSelected = selectedTemplate?.id === template.id;
                  return (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-3 cursor-pointer text-left transition-colors ${
                        isSelected
                          ? 'bg-blue-50/70 border-l-4 border-blue-600 text-blue-900'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold line-clamp-1">{template.title}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 uppercase">
                          {template.category}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                        {template.subject}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Preview & Insertion */}
            <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden">
              {selectedTemplate ? (
                <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Template Preview
                      </span>
                      <Badge className="bg-blue-100 text-blue-800 text-[10px] font-semibold">
                        Ready to Insert
                      </Badge>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{selectedTemplate.title}</h3>
                    <div className="text-xs bg-slate-100 p-2 rounded text-slate-700 font-medium">
                      <span className="text-slate-400 font-normal">Subject: </span>
                      {interpolate(selectedTemplate.subject)}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-1 space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Message Content (Variables Interpolated)
                    </span>
                    <pre className="text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                      {interpolate(selectedTemplate.content)}
                    </pre>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
                      onClick={() => {
                        const interpolatedTemplate = {
                          ...selectedTemplate,
                          subject: interpolate(selectedTemplate.subject),
                          content: interpolate(selectedTemplate.content),
                        };
                        onSelectTemplate(interpolatedTemplate);
                        onOpenChange(false);
                        toast({
                          title: 'Template Applied',
                          description: `"${selectedTemplate.title}" was inserted into the message composer.`,
                        });
                      }}
                    >
                      <Check className="w-4 h-4" />
                      Insert into Conversation
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6 text-slate-400 text-xs">
                  Select a template on the left to preview.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="create" className="p-6 flex-1 overflow-y-auto space-y-4 bg-white">
            <div className="max-w-xl mx-auto space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Template Title *</Label>
                <Input
                  placeholder="e.g., Annual Fire Alarm Testing Notice"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Category</Label>
                  <select
                    className="w-full text-xs h-9 border border-slate-200 rounded-md px-3 bg-white"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                  >
                    <option value="general">General Operations</option>
                    <option value="finance">Finance & Billing</option>
                    <option value="leasing">Leasing & Tenancy</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Email / Message Subject</Label>
                  <Input
                    placeholder="Subject line..."
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700">Message Body *</Label>
                  <span className="text-[10px] text-slate-400">
                    Use tags like {'{{tenant_name}}'}, {'{{property_name}}'}, {'{{unit_number}}'}
                  </span>
                </div>
                <Textarea
                  placeholder="Draft your reusable notice content here..."
                  rows={8}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="text-xs font-sans leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
                  onClick={handleCreateCustom}
                >
                  <Plus className="w-4 h-4" />
                  Save Reusable Template
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
