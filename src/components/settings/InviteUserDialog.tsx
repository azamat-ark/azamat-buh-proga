import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Mail, Clock, Check, X, Trash2 } from 'lucide-react';
import { formatDate, ROLES } from '@/lib/constants';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export function InviteUserDialog() {
  const { currentCompany, isOwner } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('viewer');

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['invitations', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany && isOwner,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['company-members', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      const { data, error } = await supabase
        .from('company_members')
        .select(`
          *,
          profile:profiles(full_name, email)
        `)
        .eq('company_id', currentCompany.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany,
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany || !user) throw new Error('No company or user');

      const { error } = await supabase.from('invitations').insert({
        company_id: currentCompany.id,
        email: email.toLowerCase().trim(),
        role,
        invited_by: user.id,
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Приглашение для этого email уже существует');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      setEmail('');
      setRole('viewer');
      toast({ title: 'Приглашение отправлено' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({ title: 'Приглашение отменено' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const pendingInvitations = invitations.filter((inv: any) => !inv.accepted_at && new Date(inv.expires_at) > new Date());
  const expiredInvitations = invitations.filter((inv: any) => !inv.accepted_at && new Date(inv.expires_at) <= new Date());

  if (!isOwner) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-1" />
          Пригласить
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Управление пользователями</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-auto">
          {/* Invite form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              inviteMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="flex gap-4">
              <div className="flex-1 input-group">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="w-40 input-group">
                <Label>Роль</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accountant">{ROLES.accountant.label}</SelectItem>
                    <SelectItem value="viewer">{ROLES.viewer.label}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={inviteMutation.isPending}>
                  <Mail className="h-4 w-4 mr-1" />
                  Пригласить
                </Button>
              </div>
            </div>
          </form>

          {/* Current members */}
          <div>
            <h3 className="font-semibold mb-3">Участники организации</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Роль</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member: any) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.profile?.full_name || 'Без имени'}
                      </TableCell>
                      <TableCell>{member.profile?.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {ROLES[member.role as keyof typeof ROLES]?.label || member.role}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pending invitations */}
          {pendingInvitations.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Ожидающие приглашения
              </h3>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Действует до</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvitations.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {ROLES[inv.role as keyof typeof ROLES]?.label || inv.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(inv.expires_at)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(inv.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
