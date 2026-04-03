
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { toast } from 'sonner';
import { MessageCircle, Loader2 } from 'lucide-react';

const WhatsAppLinkModal = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation for Brazilian phone format (55 + 11 digits)
    const phoneRegex = /^55\d{11}$/;
    if (!phoneRegex.test(whatsappPhone)) {
      toast.error('Formato inválido. Use: 5511999999999');
      return;
    }

    setLoading(true);
    try {
      const response = await apiServerClient.fetch('/whatsapp/link-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappPhone,
          profile: currentUser?.profile || 'husband'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao conectar WhatsApp');
      }

      toast.success('✅ Conectado! Agora você pode enviar mensagens via WhatsApp');
      onSuccess();
      onClose();
      setWhatsappPhone('');
      setAccessToken('');
    } catch (error) {
      console.error('WhatsApp link error:', error);
      toast.error(error.message || 'Falha ao conectar com o WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MessageCircle className="h-5 w-5 text-whatsapp" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Siga os passos abaixo para vincular sua conta do WhatsApp via Meta Cloud API.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2 text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
            <p className="font-medium text-foreground mb-2">Passo a passo:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Vá para Meta Cloud API (meta.com/developers)</li>
              <li>Crie um app e configure o produto WhatsApp</li>
              <li>Obtenha seu número de telefone de teste ou oficial</li>
              <li>Copie o Access Token temporário ou permanente</li>
            </ol>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsappPhone">Cole seu número WhatsApp <span className="text-destructive">*</span></Label>
              <Input
                id="whatsappPhone"
                type="text"
                placeholder="Ex: 5511999999999"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ''))}
                required
                className="text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Formato: 55 + DDD + Número (apenas números)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">Cole seu Access Token (Opcional)</Label>
              <Input
                id="accessToken"
                type="text"
                placeholder="EAA..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="text-foreground"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-whatsapp hover:bg-whatsapp/90 text-white" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                'Vincular WhatsApp'
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppLinkModal;
