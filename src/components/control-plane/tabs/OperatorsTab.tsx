import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/control-plane/EmptyState';
import type { PlatformOperatorRole } from '@/hooks/useControlPlane';

export type OperatorRole = PlatformOperatorRole['role'];

type OperatorsTabProps = {
  roles: PlatformOperatorRole[];
  operatorUserId: string;
  operatorRole: OperatorRole;
  isAssignPending: boolean;
  isRemovePending: boolean;
  onOperatorUserIdChange: (value: string) => void;
  onOperatorRoleChange: (value: OperatorRole) => void;
  onAssign: () => void;
  onRemove: (id: string) => void;
  formatDate: (value: string) => string;
};

export function OperatorsTab({
  roles,
  operatorUserId,
  operatorRole,
  isAssignPending,
  isRemovePending,
  onOperatorUserIdChange,
  onOperatorRoleChange,
  onAssign,
  onRemove,
  formatDate,
}: OperatorsTabProps) {
  return (
    <TabsContent value="operators">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Operator Roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-2">
            <Input
              placeholder="User UUID"
              value={operatorUserId}
              onChange={(e) => onOperatorUserIdChange(e.target.value)}
            />
            <Select value={operatorRole} onValueChange={(value) => onOperatorRoleChange(value as OperatorRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="security_auditor">security_auditor</SelectItem>
                <SelectItem value="support_operator">support_operator</SelectItem>
                <SelectItem value="billing_operator">billing_operator</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={onAssign} disabled={isAssignPending}>
              <Plus className="h-4 w-4 mr-1" /> Assign
            </Button>
          </div>

          {roles.length === 0 ? (
            <EmptyState
              title="No operator roles assigned"
              description="Assign security, support, and billing operator users here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell className="max-w-[320px] truncate" title={item.user_id}>{item.user_id}</TableCell>
                    <TableCell>{item.role}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isRemovePending}
                        onClick={() => onRemove(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
