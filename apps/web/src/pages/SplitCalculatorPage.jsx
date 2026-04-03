
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calculator, Users } from 'lucide-react';
import { toast } from 'sonner';

const SplitCalculatorPage = () => {
  const [totalAmount, setTotalAmount] = useState('');
  const [income1, setIncome1] = useState('');
  const [income2, setIncome2] = useState('');
  const [splitMode, setSplitMode] = useState('equal');
  const [result, setResult] = useState(null);

  const calculateSplit = () => {
    const total = parseFloat(totalAmount);
    const inc1 = parseFloat(income1);
    const inc2 = parseFloat(income2);

    if (!total || total <= 0) {
      toast.error('Digite um valor total válido');
      return;
    }

    if (splitMode === 'equal') {
      setResult({
        person1: total / 2,
        person2: total / 2,
        percentage1: 50,
        percentage2: 50
      });
    } else {
      if (!inc1 || !inc2 || inc1 <= 0 || inc2 <= 0) {
        toast.error('Digite rendas válidas para ambas as pessoas');
        return;
      }

      const totalIncome = inc1 + inc2;
      const percentage1 = (inc1 / totalIncome) * 100;
      const percentage2 = (inc2 / totalIncome) * 100;

      setResult({
        person1: (total * inc1) / totalIncome,
        person2: (total * inc2) / totalIncome,
        percentage1,
        percentage2
      });
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleSaveAsTransaction = () => {
    toast.success('Funcionalidade em desenvolvimento');
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Calculadora de Rateio - FinançaFamília</title>
        <meta name="description" content="Divida despesas de forma justa entre o casal" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-2" style={{ letterSpacing: '-0.02em' }}>
              Calculadora de rateio
            </h1>
            <p className="text-muted-foreground">Divida despesas de forma justa entre o casal</p>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Configurar divisão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Valor total da despesa</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="text-foreground text-lg"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="space-y-1">
                  <Label htmlFor="splitMode" className="text-base font-medium">Modo de divisão</Label>
                  <p className="text-sm text-muted-foreground">
                    {splitMode === 'equal' ? '50/50 - Divisão igual' : 'Proporcional à renda'}
                  </p>
                </div>
                <Switch
                  id="splitMode"
                  checked={splitMode === 'proportional'}
                  onCheckedChange={(checked) => setSplitMode(checked ? 'proportional' : 'equal')}
                />
              </div>

              {splitMode === 'proportional' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-accent/50">
                  <div className="space-y-2">
                    <Label htmlFor="income1">Renda pessoa 1</Label>
                    <Input
                      id="income1"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={income1}
                      onChange={(e) => setIncome1(e.target.value)}
                      className="text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="income2">Renda pessoa 2</Label>
                    <Input
                      id="income2"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={income2}
                      onChange={(e) => setIncome2(e.target.value)}
                      className="text-foreground"
                    />
                  </div>
                </div>
              )}

              <Button onClick={calculateSplit} className="w-full" size="lg">
                Calcular divisão
              </Button>
            </CardContent>
          </Card>

          {result && (
            <Card className="shadow-lg bg-gradient-to-br from-primary/10 to-secondary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Resultado da divisão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-background">
                    <p className="text-sm text-muted-foreground mb-1">Pessoa 1</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(result.person1)}</p>
                    <p className="text-sm text-muted-foreground mt-1">{result.percentage1.toFixed(1)}% do total</p>
                  </div>
                  <div className="p-4 rounded-lg bg-background">
                    <p className="text-sm text-muted-foreground mb-1">Pessoa 2</p>
                    <p className="text-2xl font-bold text-secondary">{formatCurrency(result.person2)}</p>
                    <p className="text-sm text-muted-foreground mt-1">{result.percentage2.toFixed(1)}% do total</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-background">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-xl font-bold">{formatCurrency(parseFloat(totalAmount))}</span>
                  </div>
                </div>

                <Button onClick={handleSaveAsTransaction} variant="outline" className="w-full">
                  Salvar como transação
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default SplitCalculatorPage;
