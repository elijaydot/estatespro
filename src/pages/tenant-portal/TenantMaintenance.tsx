import { useState, useRef } from 'react';
import { 
  Wrench, 
  Plus, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Camera,
  X,
  Loader2,
} from 'lucide-react';
import { SignedImage } from '@/components/ui/signed-image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantMaintenanceRequests, useCreateTenantMaintenanceRequest } from '@/hooks/useTenantMaintenanceRequests';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'submitted':
      return (
        <Badge className="bg-info/10 text-info border-info/20 gap-1">
          <AlertTriangle className="h-3 w-3" /> Submitted
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
          <Clock className="h-3 w-3" /> In Progress
        </Badge>
      );
    case 'completed':
      return (
        <Badge className="bg-success/10 text-success border-success/20 gap-1">
          <CheckCircle className="h-3 w-3" /> Completed
        </Badge>
      );
    default:
      return null;
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Urgent</Badge>;
    case 'high':
      return <Badge className="bg-warning/10 text-warning border-warning/20">High</Badge>;
    case 'medium':
      return <Badge className="bg-info/10 text-info border-info/20">Medium</Badge>;
    case 'low':
      return <Badge variant="secondary">Low</Badge>;
    default:
      return null;
  }
};

export default function TenantMaintenance() {
  const { profile } = useAuth();
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    priority: 'medium',
    description: '',
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get tenant info from profile
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  
  // Fetch tenant info on mount
  useState(() => {
    const fetchTenantInfo = async () => {
      if (!profile) return;
      
      const { data } = await supabase
        .from('tenants')
        .select('*, properties:property_id(id, name, user_id), units:unit_id(id, unit_number)')
        .eq('tenant_user_id', profile.user_id)
        .maybeSingle();
      
      setTenantInfo(data);
    };
    fetchTenantInfo();
  });

  const { data: maintenanceRequests = [], isLoading } = useTenantMaintenanceRequests(tenantInfo?.id);
  const createRequest = useCreateTenantMaintenanceRequest();

  const openRequests = maintenanceRequests.filter((r: any) => r.status !== 'completed');
  const completedRequests = maintenanceRequests.filter((r: any) => r.status === 'completed');

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'Error', description: 'Image must be less than 10MB', variant: 'destructive' });
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.category || !formData.description) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    if (!tenantInfo) {
      toast({ title: 'Error', description: 'Unable to find your tenant information', variant: 'destructive' });
      return;
    }

    try {
      await createRequest.mutateAsync({
        title: `${formData.category}: ${formData.title}`,
        description: formData.description,
        priority: formData.priority,
        unitId: tenantInfo.unit_id,
        propertyId: tenantInfo.property_id,
        tenantId: tenantInfo.id,
        imageFile: selectedImage || undefined,
        landlordUserId: tenantInfo.properties?.user_id,
      });

      setIsNewRequestOpen(false);
      setFormData({ title: '', category: '', priority: 'medium', description: '' });
      handleRemoveImage();
    } catch (error) {
      console.error('Error creating request:', error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Maintenance</h1>
          <p className="text-muted-foreground">Submit and track maintenance requests</p>
        </div>
        <Button className="gap-2" onClick={() => setIsNewRequestOpen(true)}>
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Requests</p>
                <p className="text-2xl font-bold text-foreground">{openRequests.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">{completedRequests.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Response</p>
                <p className="text-2xl font-bold text-foreground">2 days</p>
              </div>
              <div className="p-3 rounded-xl bg-info/10">
                <Wrench className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="open">Open ({openRequests.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <Card className="card-shadow-md">
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              </CardContent>
            </Card>
          ) : maintenanceRequests.length === 0 ? (
            <Card className="card-shadow-md">
              <CardContent className="py-12 text-center">
                <Wrench className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No maintenance requests yet</p>
                <Button className="mt-4 gap-2" onClick={() => setIsNewRequestOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create Your First Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {maintenanceRequests.map((request: any) => (
                <Card key={request.id} className="card-shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            request.status === 'completed' ? 'bg-success/10' :
                            request.status === 'in_progress' ? 'bg-warning/10' : 'bg-info/10'
                          }`}>
                            <Wrench className={`h-5 w-5 ${
                              request.status === 'completed' ? 'text-success' :
                              request.status === 'in_progress' ? 'text-warning' : 'text-info'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{request.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                            <div className="flex items-center gap-2 mt-3">
                              {getPriorityBadge(request.priority)}
                            </div>
                            {request.image_url && (
                              <div className="mt-3">
                                <SignedImage 
                                  bucket="maintenance-photos"
                                  path={request.image_url} 
                                  alt="Issue photo" 
                                  className="max-w-xs rounded-lg border"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(request.status)}
                        <p className="text-xs text-muted-foreground">
                          Created: {format(new Date(request.created_at), 'MMM d, yyyy')}
                        </p>
                        {request.completed_at && (
                          <p className="text-xs text-muted-foreground">
                            Completed: {format(new Date(request.completed_at), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="open" className="space-y-4">
          {openRequests.length === 0 ? (
            <Card className="card-shadow-md">
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-success/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No open requests - all caught up!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {openRequests.map((request: any) => (
                <Card key={request.id} className="card-shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-warning/10">
                          <Wrench className="h-5 w-5 text-warning" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{request.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                          {request.image_url && (
                            <SignedImage 
                              bucket="maintenance-photos"
                              path={request.image_url} 
                              alt="Issue" 
                              className="max-w-xs mt-2 rounded-lg border" 
                            />
                          )}
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="space-y-4">
            {completedRequests.map((request: any) => (
              <Card key={request.id} className="card-shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-success/10">
                        <CheckCircle className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{request.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Completed: {request.completed_at && format(new Date(request.completed_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Request Dialog */}
      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>New Maintenance Request</DialogTitle>
            <DialogDescription>
              Describe the issue and we'll get it resolved as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Issue Title *</Label>
              <Input 
                id="title" 
                placeholder="Brief description of the issue" 
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Plumbing">Plumbing</SelectItem>
                    <SelectItem value="Electrical">Electrical</SelectItem>
                    <SelectItem value="HVAC">HVAC</SelectItem>
                    <SelectItem value="Appliance">Appliance</SelectItem>
                    <SelectItem value="Structural">Structural</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority *</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Minor issue</SelectItem>
                    <SelectItem value="medium">Medium - Needs attention</SelectItem>
                    <SelectItem value="high">High - Urgent</SelectItem>
                    <SelectItem value="urgent">Urgent - Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide details about the issue, including location and any relevant information..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Attach Photo (Optional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              {imagePreview ? (
                <div className="relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="max-w-xs rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG up to 10MB
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewRequestOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createRequest.isPending}>
              {createRequest.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
