import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building2, Check, X } from 'lucide-react';
import { ROLES } from '@/lib/constants';

export function AcceptInvitation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['my-invitations', user?.id],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          company:companies(name)
        `)
        .eq('email', user.email.toLowerCase())
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.email,
  });

  const acceptMutation = useMutation({
    mutationFn: async (invitation: any) => {
      if (!user) throw new Error('Not authenticated');

      // Create company membership
      const { error: memberError } = await supabase
        .from('company_members')
        .insert({
          company_id: invitation.company_id,
          user_id: user.id,
          role: invitation.role,
        });

      if (memberError) {
        if (memberError.code === '23505') {
          throw new Error('Вы уже являетесь участником этой организации');
        }
        throw memberError;
      }

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast({ title: 'Приглашение принято' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() }) // Mark as processed
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      toast({ title: 'Приглашение отклонено' });
    },
  });

  if (pendingInvitations.length === 0) return null;

  return (
    <div className="mb-6 space-y-4">
      {pendingInvitations.map((invitation: any) => (
        <Card key={invitation.id} className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    Приглашение в организацию «{invitation.company?.name}»
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Роль: {ROLES[invitation.role as keyof typeof ROLES]?.label || invitation.role}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => declineMutation.mutate(invitation.id)}
                  disabled={declineMutation.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  Отклонить
                </Button>
                <Button
                  size="sm"
                  onClick={() => acceptMutation.mutate(invitation)}
                  disabled={acceptMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Принять
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
