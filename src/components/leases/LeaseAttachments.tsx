import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useConfirmAction } from '@/components/ui/use-confirm-action';
import { useLeaseAttachments, useUploadLeaseAttachment, useDeleteLeaseAttachment } from '@/hooks/useLeaseAttachments';
import { Upload, FileText, Trash2, Download, Loader2, Paperclip } from 'lucide-react';
import { format } from 'date-fns';

interface LeaseAttachmentsProps {
  leaseId: string;
  readOnly?: boolean;
}

export function LeaseAttachments({ leaseId, readOnly = false }: LeaseAttachmentsProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: attachments = [], isLoading } = useLeaseAttachments(leaseId);
  const uploadMutation = useUploadLeaseAttachment();
  const deleteMutation = useDeleteLeaseAttachment();
  const confirmAction = useConfirmAction();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    await uploadMutation.mutateAsync({
      leaseId,
      file: selectedFile,
      description,
    });

    setSelectedFile(null);
    setDescription('');
    setIsUploadOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, fileUrl: string, fileName: string) => {
    const confirmed = await confirmAction({
      title: 'Delete attachment?',
      description: `Delete "${fileName}" from this lease? This action cannot be undone.`,
      confirmLabel: 'Delete attachment',
      destructive: true,
    });
    if (!confirmed) return;
    await deleteMutation.mutateAsync({ id, leaseId, fileUrl });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    return '📎';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Paperclip className="h-5 w-5" />
          Attachments
        </CardTitle>
        {!readOnly && (
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Add Attachment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Attachment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="file">Select File</Label>
                  <Input
                    id="file"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Move-in checklist, Pet agreement"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpload} 
                    disabled={!selectedFile || uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No attachments yet</p>
            {!readOnly && <p className="text-sm">Upload documents like move-in checklists or addendums</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getFileIcon(attachment.file_type)}</span>
                  <div>
                    <p className="font-medium text-sm">{attachment.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file_size)} • {format(new Date(attachment.created_at), 'MMM d, yyyy')}
                    </p>
                    {attachment.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{attachment.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    asChild
                  >
                    <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  {!readOnly && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(attachment.id, attachment.file_url, attachment.file_name)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
