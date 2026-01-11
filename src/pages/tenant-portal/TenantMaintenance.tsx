import { useState } from 'react';
import { 
  Wrench, 
  Plus, 
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

// Mock maintenance requests
const maintenanceRequests = [
  {
    id: '1',
    title: 'HVAC filter replacement',
    description: 'The air filter needs to be replaced, air quality has decreased.',
    category: 'HVAC',
    priority: 'low',
    status: 'completed',
    createdAt: 'Jan 10, 2025',
    completedAt: 'Jan 12, 2025',
  },
  {
    id: '2',
    title: 'Garbage disposal repair',
    description: 'Garbage disposal is making loud grinding noises and not draining properly.',
    category: 'Plumbing',
    priority: 'medium',
    status: 'completed',
    createdAt: 'Dec 20, 2024',
    completedAt: 'Dec 22, 2024',
  },
  {
    id: '3',
    title: 'Leaky faucet in bathroom',
    description: 'The bathroom sink faucet is leaking and wasting water.',
    category: 'Plumbing',
    priority: 'medium',
    status: 'completed',
    createdAt: 'Nov 15, 2024',
    completedAt: 'Nov 17, 2024',
  },
  {
    id: '4',
    title: 'Annual inspection',
    description: 'Scheduled annual unit inspection.',
    category: 'General',
    priority: 'low',
    status: 'completed',
    createdAt: 'Oct 01, 2024',
    completedAt: 'Oct 05, 2024',
  },
];

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
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);

  const openRequests = maintenanceRequests.filter(r => r.status !== 'completed');
  const completedRequests = maintenanceRequests.filter(r => r.status === 'completed');

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
          {maintenanceRequests.length === 0 ? (
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
              {maintenanceRequests.map((request) => (
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
                          <div>
                            <h3 className="font-semibold text-foreground">{request.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                            <div className="flex items-center gap-2 mt-3">
                              <Badge variant="outline">{request.category}</Badge>
                              {getPriorityBadge(request.priority)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(request.status)}
                        <p className="text-xs text-muted-foreground">
                          Created: {request.createdAt}
                        </p>
                        {request.completedAt && (
                          <p className="text-xs text-muted-foreground">
                            Completed: {request.completedAt}
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
              {openRequests.map((request) => (
                <Card key={request.id} className="card-shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-warning/10">
                          <Wrench className="h-5 w-5 text-warning" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{request.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
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
            {completedRequests.map((request) => (
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
                          Completed: {request.completedAt}
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
              <Label htmlFor="title">Issue Title</Label>
              <Input id="title" placeholder="Brief description of the issue" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="hvac">HVAC</SelectItem>
                    <SelectItem value="appliance">Appliance</SelectItem>
                    <SelectItem value="structural">Structural</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select>
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide details about the issue, including location and any relevant information..."
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label>Attach Photos (Optional)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG up to 10MB
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewRequestOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsNewRequestOpen(false)}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
