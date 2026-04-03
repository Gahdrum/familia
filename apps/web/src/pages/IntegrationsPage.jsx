
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import TelegramLinkModal from '@/components/TelegramLinkModal.jsx';
import WhatsAppLinkModal from '@/components/WhatsAppLinkModal.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Send, MessageCircle, CheckCircle2, Unplug, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const IntegrationsPage = () => {
  const [status, setStatus] = useState({
    telegram: { connected: false, telegramId: null, profile: null },
    whatsapp: { connected: false, whatsappPhone: null, profile: null }
  });
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  
  // Disconnect state
  const [disconnectTarget, setDisconnectTarget] = useState(null); // 'telegram' | 'whatsapp' | null
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await apiServerClient.fetch('/messaging-accounts/status');
      if (!response.ok) throw new Error('Falha ao carregar status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching integrations status:', error);
      toast.error('Não foi possível carregar o status das integrações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    
    setIsDisconnecting(true);
    try {
      const endpoint = disconnectTarget === 'telegram' 
        ? '/telegram/unlink-account' 
        : '/whatsapp/unlink-account';
        
      const response = await apiServerClient.fetch(endpoint, { method: 'DELETE' });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Erro ao desconectar');
      
      toast.success('Desconectado com sucesso');
      await fetchStatus();
    } catch (error) {
      console.error(`Disconnect error (${disconnectTarget}):`, error);
      toast.error(error.message || 'Falha ao desconectar conta');
    } finally {
      setIsDisconnecting(false);
      setDisconnectTarget(null);
    }
  };

  const features = [
    'Registrar gastos por mensagem',
    'Consultar saldo e metas',
    'Dividir contas automaticamente',
    'Registrar receitas',
    'Enviar áudio para registro rápido'
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Integrações - FinançaFamília</title>
        <meta name="description" content="Conecte seu Telegram ou WhatsApp para gerenciar finanças por mensagens" />
      </Helmet>
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-5xl mx-auto space-y-10">
          
          {/* Header Section */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold leading-tight" style={{ letterSpacing: '-0.02em' }}>
              Integrações
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Conecte seu Telegram ou WhatsApp para gerenciar finanças por mensagens de forma rápida e prática.
            </p>
          </div>

          {/* Integration Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Telegram Card */}
            <Card className="shadow-lg border-border/50 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-telegram" />
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-telegram/10 flex items-center justify-center">
                      <Send className="w-6 h-6 text-telegram" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Telegram</CardTitle>
                      <CardDescription>Bot assistente financeiro</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <Skeleton className="h-6 w-48" />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${status.telegram?.connected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                    <span className="font-medium text-sm">
                      {status.telegram?.connected 
                        ? `Conectado como ID ${status.telegram.telegramId}` 
                        : 'Não conectado'}
                    </span>
                  </div>
                )}

                <div className="pt-2">
                  {loading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : status.telegram?.connected ? (
                    <Button 
                      variant="outline" 
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDisconnectTarget('telegram')}
                    >
                      <Unplug className="w-4 h-4 mr-2" />
                      Desconectar
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-telegram hover:bg-telegram/90 text-white"
                      onClick={() => setIsTelegramModalOpen(true)}
                    >
                      Conectar Telegram
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Card */}
            <Card className="shadow-lg border-border/50 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-whatsapp" />
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-whatsapp/10 flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-whatsapp" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">WhatsApp</CardTitle>
                      <CardDescription>Integração via Meta API</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <Skeleton className="h-6 w-48" />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${status.whatsapp?.connected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                    <span className="font-medium text-sm">
                      {status.whatsapp?.connected 
                        ? `Conectado como +${status.whatsapp.whatsappPhone}` 
                        : 'Não conectado'}
                    </span>
                  </div>
                )}

                <div className="pt-2">
                  {loading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : status.whatsapp?.connected ? (
                    <Button 
                      variant="outline" 
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDisconnectTarget('whatsapp')}
                    >
                      <Unplug className="w-4 h-4 mr-2" />
                      Desconectar
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-whatsapp hover:bg-whatsapp/90 text-white"
                      onClick={() => setIsWhatsAppModalOpen(true)}
                    >
                      Conectar WhatsApp
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Features Section */}
          <div className="mt-12 bg-muted/30 rounded-2xl p-8 border border-border/50">
            <h2 className="text-2xl font-semibold mb-6">O que você pode fazer?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground/80">{feature}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Modals */}
      <TelegramLinkModal 
        isOpen={isTelegramModalOpen} 
        onClose={() => setIsTelegramModalOpen(false)} 
        onSuccess={fetchStatus}
      />
      
      <WhatsAppLinkModal 
        isOpen={isWhatsAppModalOpen} 
        onClose={() => setIsWhatsAppModalOpen(false)} 
        onSuccess={fetchStatus}
      />

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={!!disconnectTarget} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja desconectar?</AlertDialogTitle>
            <AlertDialogDescription>
              Você não poderá mais enviar ou receber mensagens financeiras através do {disconnectTarget === 'telegram' ? 'Telegram' : 'WhatsApp'} até conectar novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnecting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDisconnect();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDisconnecting}
            >
              {isDisconnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default IntegrationsPage;
