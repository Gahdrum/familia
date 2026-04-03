
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plug, Send, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';

const IntegrationsWidget = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ telegram: false, whatsapp: false });

  useEffect(() => {
    const fetchStatus = async () => {
      if (!currentUser) return;
      try {
        const records = await pb.collection('userMessagingAccounts').getList(1, 1, {
          filter: `userId = "${currentUser.id}"`,
          $autoCancel: false
        });
        
        if (records.items.length > 0) {
          const account = records.items[0];
          setStatus({
            telegram: !!account.telegramId,
            whatsapp: !!account.whatsappPhone
          });
        }
      } catch (error) {
        console.error('Error fetching integrations status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [currentUser]);

  return (
    <Card className="shadow-lg border-primary/20 bg-primary/5 h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plug className="w-5 h-5 text-primary" />
          Conecte seu Telegram ou WhatsApp
        </CardTitle>
        <CardDescription>
          Gerencie suas finanças por mensagens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 flex-1 flex flex-col">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/60 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#0088cc]/10 flex items-center justify-center">
                  <Send className="w-4 h-4 text-[#0088cc]" />
                </div>
                <span className="text-sm font-medium">Telegram</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${status.telegram ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                <span className="text-xs font-medium text-muted-foreground">
                  {status.telegram ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-background/60 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#25D366]/10 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                </div>
                <span className="text-sm font-medium">WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${status.whatsapp ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                <span className="text-xs font-medium text-muted-foreground">
                  {status.whatsapp ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto pt-4">
          <Button asChild className="w-full" variant="default">
            <Link to="/integrations">Configurar Integrações</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default IntegrationsWidget;
