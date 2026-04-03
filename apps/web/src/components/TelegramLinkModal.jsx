
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { toast } from 'sonner';
import { Send, Loader2 } from 'lucide-react';

const TelegramLinkModal = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [telegramId, setTelegramId] = useState('');
  const [botToken, setBotToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!telegramId) {
      toast.error('O Telegram ID é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const response = await apiServerClient.fetch('/telegram/link-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: Number(telegramId),
          profile: currentUser?.profile || 'husband'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao conectar Telegram');
      }

      toast.success('✅ Conectado! Agora você pode enviar mensagens ao bot');
      onSuccess();
      onClose();
      setTelegramId('');
      setBotToken('');
    } catch (error) {
      console.error('Telegram link error:', error);
      toast.error(error.message || 'Falha ao conectar com o Telegram');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Send className="h-5 w-5 text-telegram" />
            Conectar Telegram
          </DialogTitle>
          <DialogDescription>
            Siga os passos abaixo para vincular sua conta do Telegram ao sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2 text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
            <p className="font-medium text-foreground mb-2">Passo a passo:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Abra o Telegram e procure por <strong>@BotFather</strong></li>
              <li>Digite <strong>/newbot</strong> para criar um novo bot</li>
              <li>Escolha um nome e um username para o bot</li>
              <li>Copie o TOKEN fornecido e inicie uma conversa com seu bot para obter seu ID</li>
            </ol>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telegramId">Cole seu Telegram ID <span className="text-destructive">*</span></Label>
              <Input
                id="telegramId"
                type="number"
                placeholder="Ex: 123456789"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                required
                className="text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="botToken">Cole seu Bot Token (Opcional)</Label>
              <Input
                id="botToken"
                type="text"
                placeholder="Ex: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Apenas necessário se você estiver configurando um bot próprio.
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-telegram hover:bg-telegram/90 text-white" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                'Vincular Telegram'
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TelegramLinkModal;
