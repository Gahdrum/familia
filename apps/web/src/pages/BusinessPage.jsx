
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
import { Plus, Briefcase, TrendingUp, ArrowDownToLine, Trash2, Pencil, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const BusinessPage = () => {
  const [incomes, setIncomes] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [editIncomeDialogOpen, setEditIncomeDialogOpen] = useState(false);
  const [incomeFormData, setIncomeFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    type: 'salary'
  });
  const [withdrawalFormData, setWithdrawalFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: ''
  });
  const [editIncomeFormData, setEditIncomeFormData] = useState({
    id: '',
    date: '',
    amount: '',
    description: '',
    type: 'business'
  });

  const incomeTypes = [
    { value: 'salary', label: 'Salário' },
    { value: 'business', label: 'Negócio' },
    { value: 'proLabore', label: 'Pró-labore' },
  ];

  const incomeTypeLabels = {
    salary: 'Salário',
    business: 'Negócio',
    proLabore: 'Pró-labore',
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userId = pb.authStore.model?.id;

      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      const [incomeRecords, withdrawalRecords] = await Promise.all([
        pb.collection('incomes').getFullList({
          filter: `userId = "${userId}" && scope = "business"`,
          sort: '-date,-created',
          $autoCancel: false,
        }),
        pb.collection('transactions').getFullList({
          filter: `userId = "${userId}" && type = "individual" && description ~ "retirada pj"`,
          sort: '-date,-created',
          $autoCancel: false,
        }),
      ]);

        setIncomes(incomeRecords.map((item) => ({
          id: item.id,
          date: item.date,
          amount: Number(item.amount || 0),
          description: item.description || 'Receita PJ',
          type: incomeTypeLabels[item.type] || item.type,
        })));

        setWithdrawals(withdrawalRecords.map((item) => ({
          id: item.id,
          date: item.date,
          amount: Number(item.amount || 0),
          description: item.description || 'Retirada PJ',
        })));
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
      const userId = pb.authStore.model?.id;

      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      const created = await pb.collection('incomes').create({
        userId,
        date: incomeFormData.date,
        amount: Number(incomeFormData.amount),
        description: incomeFormData.description?.trim() || '',
        type: incomeFormData.type,
        scope: 'business',
        frequency: 'once',
      }, { $autoCancel: false });

      const newIncome = {
        id: created.id,
        date: created.date,
        amount: Number(created.amount || 0),
        description: created.description || 'Receita',
        type: incomeTypeLabels[created.type] || created.type,
      };

      setIncomes(prev => [newIncome, ...prev]);
      toast.success('Receita adicionada com sucesso');
      setIncomeDialogOpen(false);
      setIncomeFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        type: 'salary'
      });
    } catch (error) {
      console.error('Error creating income:', error);
      toast.error(error?.response?.message || error.message || 'Erro ao adicionar receita');
    }
  };

  const handleWithdrawalSubmit = async (e) => {
    e.preventDefault();
    try {
      const userId = pb.authStore.model?.id;

      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      const created = await pb.collection('transactions').create({
        userId,
        type: 'individual',
        description: withdrawalFormData.description?.trim() || 'Retirada PJ',
        amount: Number(withdrawalFormData.amount),
        date: withdrawalFormData.date,
        paymentMethod: 'transfer',
      }, { $autoCancel: false });

      const newWithdrawal = {
        id: created.id,
        date: created.date,
        amount: Number(created.amount || 0),
        description: created.description || 'Retirada',
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
      toast.error(error?.response?.message || error.message || 'Erro ao registrar retirada');
    }
  };

  const handleDeleteIncome = async (id) => {
    if (window.confirm('Deseja realmente excluir esta receita?')) {
      try {
        await pb.collection('incomes').delete(id, { $autoCancel: false });
        setIncomes(prev => prev.filter(i => i.id !== id));
        toast.success('Receita excluída');
      } catch (error) {
        console.error('Error deleting income:', error);
        toast.error('Erro ao excluir receita');
      }
    }
  };

  const openEditIncomeDialog = (income) => {
    const incomeType = incomeTypes.find((item) => item.label === income.type)?.value || 'business';

    setEditIncomeFormData({
      id: income.id,
      date: income.date,
      amount: String(income.amount),
      description: income.description,
      type: incomeType,
    });
    setEditIncomeDialogOpen(true);
  };

  const handleEditIncomeSubmit = async (e) => {
    e.preventDefault();

    try {
      const updated = await pb.collection('incomes').update(editIncomeFormData.id, {
        date: editIncomeFormData.date,
        amount: Number(editIncomeFormData.amount),
        description: editIncomeFormData.description?.trim() || '',
        type: editIncomeFormData.type,
      }, { $autoCancel: false });

      setIncomes((prev) => prev.map((item) => item.id === editIncomeFormData.id
        ? {
            id: updated.id,
            date: updated.date,
            amount: Number(updated.amount || 0),
            description: updated.description || 'Receita PJ',
            type: incomeTypeLabels[updated.type] || updated.type,
          }
        : item));

      setEditIncomeDialogOpen(false);
      toast.success('Receita PJ atualizada com sucesso');
    } catch (error) {
      console.error('Error updating income:', error);
      toast.error(error?.response?.message || error.message || 'Erro ao atualizar receita PJ');
    }
  };

  const handleDeleteWithdrawal = async (id) => {
    if (window.confirm('Deseja realmente excluir esta retirada?')) {
      try {
        await pb.collection('transactions').delete(id, { $autoCancel: false });
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
              Gestão PJ
            </h1>
            <p className="text-muted-foreground">Controle financeiro exclusivo da operação empresarial</p>
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
                Receitas PJ
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
                    <DialogTitle>Nova receita PJ</DialogTitle>
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
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incomeDescription">Descrição</Label>
                      <Input
                        id="incomeDescription"
                        type="text"
                        placeholder="Descrição da receita empresarial"
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
                  <p className="text-muted-foreground">Nenhuma receita PJ registrada</p>
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
                          onClick={() => openEditIncomeDialog(income)}
                          className="text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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

          <Dialog open={editIncomeDialogOpen} onOpenChange={setEditIncomeDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar receita PJ</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditIncomeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-income-date">Data</Label>
                  <Input
                    id="edit-income-date"
                    type="date"
                    value={editIncomeFormData.date}
                    onChange={(e) => setEditIncomeFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                    className="text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-income-amount">Valor</Label>
                  <Input
                    id="edit-income-amount"
                    type="number"
                    step="0.01"
                    value={editIncomeFormData.amount}
                    onChange={(e) => setEditIncomeFormData(prev => ({ ...prev, amount: e.target.value }))}
                    required
                    className="text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-income-type">Tipo</Label>
                  <Select value={editIncomeFormData.type} onValueChange={(value) => setEditIncomeFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger id="edit-income-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-income-description">Descrição</Label>
                  <Input
                    id="edit-income-description"
                    type="text"
                    value={editIncomeFormData.description}
                    onChange={(e) => setEditIncomeFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                    className="text-foreground"
                  />
                </div>
                <Button type="submit" className="w-full">Salvar alterações</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Separator />

          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5" />
                Retiradas da PJ
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
                    <DialogTitle>Nova retirada da PJ</DialogTitle>
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
                        placeholder="Descrição da retirada da PJ"
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
                  <p className="text-muted-foreground">Nenhuma retirada da PJ registrada</p>
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
