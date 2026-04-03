
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Plus, Briefcase, TrendingUp, ArrowDownToLine, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const BusinessPage = () => {
  const [incomes, setIncomes] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [incomeFormData, setIncomeFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    type: 'Salário'
  });
  const [withdrawalFormData, setWithdrawalFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: ''
  });

  const incomeTypes = ['Salário', 'Negócio', 'Pró-labore', 'Freelance', 'Outros'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const mockIncomes = [
        { id: 1, date: '2026-04-01', amount: 5000, description: 'Salário mensal', type: 'Salário' },
        { id: 2, date: '2026-03-28', amount: 1200, description: 'Projeto freelance', type: 'Freelance' }
      ];
      const mockWithdrawals = [
        { id: 1, date: '2026-04-01', amount: 2000, description: 'Transferência para conta pessoal' }
      ];
      setIncomes(mockIncomes);
      setWithdrawals(mockWithdrawals);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleIncomeSubmit = async (e) => {
    e.preventDefault();
    try {
      const newIncome = {
        id: Date.now(),
        ...incomeFormData,
        amount: parseFloat(incomeFormData.amount)
      };
      setIncomes(prev => [newIncome, ...prev]);
      toast.success('Receita adicionada com sucesso');
      setIncomeDialogOpen(false);
      setIncomeFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        type: 'Salário'
      });
    } catch (error) {
      console.error('Error creating income:', error);
      toast.error('Erro ao adicionar receita');
    }
  };

  const handleWithdrawalSubmit = async (e) => {
    e.preventDefault();
    try {
      const newWithdrawal = {
        id: Date.now(),
        ...withdrawalFormData,
        amount: parseFloat(withdrawalFormData.amount)
      };
      setWithdrawals(prev => [newWithdrawal, ...prev]);
      toast.success('Retirada registrada com sucesso');
      setWithdrawalDialogOpen(false);
      setWithdrawalFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: ''
      });
    } catch (error) {
      console.error('Error creating withdrawal:', error);
      toast.error('Erro ao registrar retirada');
    }
  };

  const handleDeleteIncome = async (id) => {
    if (window.confirm('Deseja realmente excluir esta receita?')) {
      try {
        setIncomes(prev => prev.filter(i => i.id !== id));
        toast.success('Receita excluída');
      } catch (error) {
        console.error('Error deleting income:', error);
        toast.error('Erro ao excluir receita');
      }
    }
  };

  const handleDeleteWithdrawal = async (id) => {
    if (window.confirm('Deseja realmente excluir esta retirada?')) {
      try {
        setWithdrawals(prev => prev.filter(w => w.id !== id));
        toast.success('Retirada excluída');
      } catch (error) {
        console.error('Error deleting withdrawal:', error);
        toast.error('Erro ao excluir retirada');
      }
    }
  };

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
  const businessBalance = totalIncome - totalWithdrawals;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Gestão PF/PJ - FinançaFamília</title>
        <meta name="description" content="Gerencie receitas de pessoa física e jurídica" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-2" style={{ letterSpacing: '-0.02em' }}>
              Gestão PF/PJ
            </h1>
            <p className="text-muted-foreground">Controle de receitas e retiradas</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de receitas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-secondary">{formatCurrency(totalIncome)}</div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de retiradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(totalWithdrawals)}</div>
              </CardContent>
            </Card>

            <Card className="shadow-lg bg-gradient-to-br from-primary/10 to-secondary/10">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Saldo empresarial</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{formatCurrency(businessBalance)}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Receitas
              </CardTitle>
              <Dialog open={incomeDialogOpen} onOpenChange={setIncomeDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar receita
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova receita</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleIncomeSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="incomeDate">Data</Label>
                      <Input
                        id="incomeDate"
                        type="date"
                        value={incomeFormData.date}
                        onChange={(e) => setIncomeFormData(prev => ({ ...prev, date: e.target.value }))}
                        required
                        className="text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incomeAmount">Valor</Label>
                      <Input
                        id="incomeAmount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={incomeFormData.amount}
                        onChange={(e) => setIncomeFormData(prev => ({ ...prev, amount: e.target.value }))}
                        required
                        className="text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incomeType">Tipo</Label>
                      <Select value={incomeFormData.type} onValueChange={(value) => setIncomeFormData(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger id="incomeType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {incomeTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incomeDescription">Descrição</Label>
                      <Input
                        id="incomeDescription"
                        type="text"
                        placeholder="Descrição da receita"
                        value={incomeFormData.description}
                        onChange={(e) => setIncomeFormData(prev => ({ ...prev, description: e.target.value }))}
                        required
                        className="text-foreground"
                      />
                    </div>
                    <Button type="submit" className="w-full">Adicionar</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {incomes.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma receita registrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incomes.map((income) => (
                    <div key={income.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-200">
                      <div className="flex-1">
                        <p className="font-medium">{income.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-1 rounded-full bg-secondary/10 text-secondary">
                            {income.type}
                          </span>
                          <span className="text-sm text-muted-foreground">{formatDate(income.date)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-lg text-secondary">{formatCurrency(income.amount)}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteIncome(income.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5" />
                Pró-labore / Retiradas
              </CardTitle>
              <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Registrar retirada
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova retirada</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="withdrawalDate">Data</Label>
                      <Input
                        id="withdrawalDate"
                        type="date"
                        value={withdrawalFormData.date}
                        onChange={(e) => setWithdrawalFormData(prev => ({ ...prev, date: e.target.value }))}
                        required
                        className="text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="withdrawalAmount">Valor</Label>
                      <Input
                        id="withdrawalAmount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={withdrawalFormData.amount}
                        onChange={(e) => setWithdrawalFormData(prev => ({ ...prev, amount: e.target.value }))}
                        required
                        className="text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="withdrawalDescription">Descrição</Label>
                      <Input
                        id="withdrawalDescription"
                        type="text"
                        placeholder="Descrição da retirada"
                        value={withdrawalFormData.description}
                        onChange={(e) => setWithdrawalFormData(prev => ({ ...prev, description: e.target.value }))}
                        required
                        className="text-foreground"
                      />
                    </div>
                    <Button type="submit" className="w-full">Registrar</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {withdrawals.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma retirada registrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {withdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-200">
                      <div className="flex-1">
                        <p className="font-medium">{withdrawal.description}</p>
                        <p className="text-sm text-muted-foreground mt-1">{formatDate(withdrawal.date)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-lg text-destructive">{formatCurrency(withdrawal.amount)}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteWithdrawal(withdrawal.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BusinessPage;
