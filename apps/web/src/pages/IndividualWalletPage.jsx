
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import pb from '@/lib/pocketbaseClient';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Filter, Trash2, Pencil, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createTransaction, deleteTransaction, listCategories, listTransactionsByType } from '@/lib/financialApi';

const IndividualWalletPage = () => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: '',
    description: ''
  });
  const [incomeFormData, setIncomeFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    type: 'salary'
  });
  const [editFormData, setEditFormData] = useState({
    id: '',
    date: '',
    amount: '',
    categoryId: '',
    description: ''
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
    fetchTransactions();
  }, [currentUser]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const userId = pb.authStore.model?.id;

      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      const [transactionRecords, categoryRecords, incomeRecords] = await Promise.all([
        listTransactionsByType('individual'),
        listCategories(),
        pb.collection('incomes').getFullList({
          filter: `userId = "${userId}" && scope = "individual"`,
          sort: '-date,-created',
          $autoCancel: false,
        }),
      ]);

      setTransactions(transactionRecords);
      setCategories(categoryRecords);
      setIncomes(incomeRecords.map((item) => ({
        id: item.id,
        date: item.date,
        amount: Number(item.amount || 0),
        description: item.description || 'Receita',
        type: incomeTypeLabels[item.type] || item.type,
      })));
      setFormData((prev) => ({
        ...prev,
        category: prev.category || categoryRecords[0]?.id || '',
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Erro ao carregar transações');
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
        scope: 'individual',
        frequency: 'once',
      }, { $autoCancel: false });

      setIncomes((prev) => [{
        id: created.id,
        date: created.date,
        amount: Number(created.amount || 0),
        description: created.description || 'Receita',
        type: incomeTypeLabels[created.type] || created.type,
      }, ...prev]);

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
      toast.error('Erro ao adicionar receita');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category) {
      toast.error('Selecione uma categoria válida');
      return;
    }

    try {
      const newTransaction = await createTransaction({
        ...formData,
        amount: parseFloat(formData.amount),
        categoryId: formData.category,
        type: 'individual',
      });

      setTransactions(prev => [newTransaction, ...prev]);
      toast.success('Transação adicionada com sucesso');
      setDialogOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: categories[0]?.id || '',
        description: ''
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Erro ao adicionar transação');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente excluir esta transação?')) {
      try {
        await deleteTransaction(id);
        setTransactions(prev => prev.filter(t => t.id !== id));
        toast.success('Transação excluída');
      } catch (error) {
        console.error('Error deleting transaction:', error);
        toast.error('Erro ao excluir transação');
      }
    }
  };

  const openEditDialog = (transaction) => {
    const categoryId = categories.find((item) => item.name === transaction.category)?.id || '';

    setEditFormData({
      id: transaction.id,
      date: transaction.date,
      amount: String(transaction.amount),
      categoryId,
      description: transaction.description,
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editFormData.categoryId) {
      toast.error('Selecione uma categoria válida');
      return;
    }

    try {
      const updated = await pb.collection('transactions').update(editFormData.id, {
        date: editFormData.date,
        amount: Number(editFormData.amount),
        category: editFormData.categoryId,
        description: editFormData.description?.trim() || '',
      }, {
        expand: 'category',
        $autoCancel: false,
      });

      const normalized = {
        id: updated.id,
        date: updated.date,
        amount: Number(updated.amount || 0),
        description: updated.description || 'Sem descrição',
        type: updated.type,
        paymentMethod: updated.paymentMethod,
        category: updated.expand?.category?.name || updated.category || 'Outros',
        categoryId: typeof updated.category === 'string' ? updated.category : updated.category?.id || null,
        raw: updated,
      };

      setTransactions((prev) => prev.map((item) => item.id === editFormData.id ? normalized : item));
      setEditDialogOpen(false);
      toast.success('Transação atualizada com sucesso');
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Erro ao atualizar transação');
    }
  };

  const filteredTransactions = selectedCategory === 'all' 
    ? transactions 
    : transactions.filter(t => t.category === selectedCategory);

  const monthlyTotal = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const monthlyIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

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
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Carteira Individual - FinançaFamília</title>
        <meta name="description" content="Gerencie suas despesas pessoais" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-2" style={{ letterSpacing: '-0.02em' }}>
                Carteira individual
              </h1>
              <p className="text-muted-foreground">Suas despesas pessoais</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={incomeDialogOpen} onOpenChange={setIncomeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar receita
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova receita individual</DialogTitle>
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
                          {incomeTypes.map((type) => (
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
                        placeholder="Descrição da receita"
                        value={incomeFormData.description}
                        onChange={(e) => setIncomeFormData(prev => ({ ...prev, description: e.target.value }))}
                        required
                        className="text-foreground"
                      />
                    </div>
                    <Button type="submit" className="w-full">Adicionar receita</Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar transação
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova transação individual</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                      className="text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      required
                      className="text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      type="text"
                      placeholder="Descrição da despesa"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      required
                      className="text-foreground"
                    />
                  </div>
                  <Button type="submit" className="w-full">Adicionar</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card className="shadow-lg bg-gradient-to-br from-primary/10 to-secondary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Resumo mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(monthlyTotal)}</div>
              <p className="text-sm text-muted-foreground mt-1">Total de despesas pessoais</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Receitas pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">{formatCurrency(monthlyIncome)}</div>
              <p className="text-sm text-muted-foreground mt-1">Total de receitas pessoais</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Receitas</CardTitle>
            </CardHeader>
            <CardContent>
              {incomes.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma receita encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incomes.map((income) => (
                    <div key={income.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-200">
                      <div className="flex-1">
                        <p className="font-medium">{income.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-1 rounded-full bg-secondary/10 text-secondary">{income.type}</span>
                          <span className="text-sm text-muted-foreground">{formatDate(income.date)}</span>
                        </div>
                      </div>
                      <p className="font-bold text-lg text-secondary">{formatCurrency(income.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Transações</CardTitle>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma transação encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-1 rounded-full bg-secondary/10 text-secondary">
                                {transaction.category}
                              </span>
                              <span className="text-sm text-muted-foreground">{formatDate(transaction.date)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-lg">{formatCurrency(transaction.amount)}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(transaction)}
                          className="text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(transaction.id)}
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

          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar transação individual</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Data</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                    className="text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Valor</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                    required
                    className="text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Categoria</Label>
                  <Select value={editFormData.categoryId} onValueChange={(value) => setEditFormData(prev => ({ ...prev, categoryId: value }))}>
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Input
                    id="edit-description"
                    type="text"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                    className="text-foreground"
                  />
                </div>
                <Button type="submit" className="w-full">Salvar alterações</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
};

export default IndividualWalletPage;
