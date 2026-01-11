import { useState } from 'react';
import { 
  MessageSquare, 
  Send,
  User,
  Clock,
  Search,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// Mock conversations
const conversations = [
  {
    id: '1',
    with: 'Property Management',
    lastMessage: 'Thank you for reporting the issue. We have scheduled a technician to visit tomorrow between 9 AM and 12 PM.',
    timestamp: '2 hours ago',
    unread: true,
    avatar: 'PM',
  },
  {
    id: '2',
    with: 'Maintenance Team',
    lastMessage: 'The HVAC filter replacement has been completed. Please let us know if you experience any further issues.',
    timestamp: 'Jan 12, 2025',
    unread: false,
    avatar: 'MT',
  },
  {
    id: '3',
    with: 'Property Management',
    lastMessage: 'Reminder: Building inspection scheduled for next week.',
    timestamp: 'Jan 5, 2025',
    unread: false,
    avatar: 'PM',
  },
];

// Mock messages for selected conversation
const mockMessages = [
  {
    id: '1',
    from: 'tenant',
    content: 'Hi, I wanted to report that the HVAC system seems to be making unusual noises.',
    timestamp: '10:30 AM',
  },
  {
    id: '2',
    from: 'management',
    content: 'Thank you for letting us know. Can you describe the type of noise? Is it a rattling, humming, or clicking sound?',
    timestamp: '10:45 AM',
  },
  {
    id: '3',
    from: 'tenant',
    content: 'It\'s more of a rattling sound, especially when the AC first turns on.',
    timestamp: '11:00 AM',
  },
  {
    id: '4',
    from: 'management',
    content: 'Thank you for the details. This is likely a loose component. We have scheduled a technician to visit tomorrow between 9 AM and 12 PM. Will someone be available to provide access?',
    timestamp: '11:15 AM',
  },
  {
    id: '5',
    from: 'tenant',
    content: 'Yes, I\'ll be home during that time. Thank you for the quick response!',
    timestamp: '11:20 AM',
  },
  {
    id: '6',
    from: 'management',
    content: 'Thank you for reporting the issue. We have scheduled a technician to visit tomorrow between 9 AM and 12 PM.',
    timestamp: '2 hours ago',
  },
];

export default function TenantMessages() {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [newMessage, setNewMessage] = useState('');
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground">Communicate with property management</p>
        </div>
        <Button className="gap-2" onClick={() => setIsNewMessageOpen(true)}>
          <Plus className="h-4 w-4" />
          New Message
        </Button>
      </div>

      {/* Messages Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-240px)] min-h-[500px]">
        {/* Conversations List */}
        <Card className="card-shadow-md lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search messages..." className="pl-10" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100%-80px)]">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 text-left border-b border-border hover:bg-secondary/50 transition-colors ${
                    selectedConversation.id === conv.id ? 'bg-secondary/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {conv.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{conv.with}</span>
                        {conv.unread && (
                          <Badge className="bg-primary h-2 w-2 p-0 rounded-full" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {conv.lastMessage}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {conv.timestamp}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className="card-shadow-md lg:col-span-2 flex flex-col">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {selectedConversation.avatar}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{selectedConversation.with}</CardTitle>
                <p className="text-sm text-muted-foreground">Usually responds within 24 hours</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex flex-col">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {mockMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.from === 'tenant' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.from === 'tenant'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.from === 'tenant' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {message.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
                <Button className="self-end gap-2">
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Message Dialog */}
      <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>
              Send a message to property management.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>To</Label>
              <Input value="Property Management" disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="What is your message about?" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewMessageOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsNewMessageOpen(false)} className="gap-2">
              <Send className="h-4 w-4" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
