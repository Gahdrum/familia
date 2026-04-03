
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Target, TrendingUp, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const GoalsPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [goalFormData, setGoalFormData] = useState({
    name: '',
    targetAmount: '',
    description: ''
  });
  const [allocateAmount, setAllocateAmount] = useState('');

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const records = await pb.collection('goals').getFullList({
        sort: '-created',
        $autoCancel: false,
      });

      const normalizedGoals = records.map((record) => ({
        id: record.id,
        name: record.title || 'Meta sem nome',
        targetAmount: Number(record.targetAmount || 0),
        currentAmount: Number(record.currentAmount || 0),
        description: record.description || '',
        deadline: record.deadline || null,
      }));

      setGoals(normalizedGoals);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  };

  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    try {
      const userId = pb.authStore.model?.id;

      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      const created = await pb.collection('goals').create({
        userId,
        title: goalFormData.name.trim(),
        description: goalFormData.description?.trim() || '',
        targetAmount: Number(goalFormData.targetAmount),
        currentAmount: 0,
      }, { $autoCancel: false });

      const newGoal = {
        id: created.id,
        name: created.title || 'Meta sem nome',
        targetAmount: Number(created.targetAmount || 0),
        currentAmount: Number(created.currentAmount || 0),
        description: created.description || '',
        deadline: created.deadline || null,
      };

      setGoals(prev => [newGoal, ...prev]);
      toast.success('Meta criada com sucesso');
      setGoalDialogOpen(false);
      setGoalFormData({
        name: '',
        targetAmount: '',
        description: ''
      });
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Erro ao criar meta');
    }
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    try {
      const amount = Number(allocateAmount);

      if (!amount || amount <= 0) {
        toast.error('Digite um valor válido para alocar');
        return;
      }

      const updated = await pb.collection('goals').update(selectedGoal.id, {
        currentAmount: Number(selectedGoal.currentAmount || 0) + amount,
      }, { $autoCancel: false });

      const updatedGoal = {
        id: updated.id,
        name: updated.title || 'Meta sem nome',
        targetAmount: Number(updated.targetAmount || 0),
        currentAmount: Number(updated.currentAmount || 0),
        description: updated.description || '',
        deadline: updated.deadline || null,
      };

      setGoals(prev => prev.map(g => 
        g.id === selectedGoal.id ? updatedGoal : g
      ));
      toast.success('Valor alocado com sucesso');
      setAllocateDialogOpen(false);
      setAllocateAmount('');
      setSelectedGoal(null);
    } catch (error) {
      console.error('Error allocating amount:', error);
      toast.error('Erro ao alocar valor');
    }
  };

  const handleDeleteGoal = async (id) => {
    if (window.confirm('Deseja realmente excluir esta meta?')) {
      try {
        await pb.collection('goals').delete(id, { $autoCancel: false });
        setGoals(prev => prev.filter(g => g.id !== id));
        toast.success('Meta excluída');
      } catch (error) {
        console.error('Error deleting goal:', error);
        toast.error('Erro ao excluir meta');
      }
    }
  };

  const openAllocateDialog = (goal) => {
    setSelectedGoal(goal);
    setAllocateDialogOpen(true);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateProgress = (current, target) => {
    if (!target || target <= 0) {
      return 0;
    }

    return Math.min((current / target) * 100, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Metas Financeiras - FinançaFamília</title>
        <meta name="description" content="Acompanhe e gerencie suas metas financeiras" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-2" style={{ letterSpacing: '-0.02em' }}>
                Metas financeiras
              </h1>
              <p className="text-muted-foreground">Planeje e alcance seus objetivos</p>
            </div>
            <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar meta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova meta financeira</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleGoalSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="goalName">Nome da meta</Label>
                    <Input
                      id="goalName"
                      type="text"
                      placeholder="Ex: Viagem, Carro, Emergência"
                      value={goalFormData.name}
                      onChange={(e) => setGoalFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetAmount">Valor alvo</Label>
                    <Input
                      id="targetAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={goalFormData.targetAmount}
                      onChange={(e) => setGoalFormData(prev => ({ ...prev, targetAmount: e.target.value }))}
                      required
                      className="text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goalDescription">Descrição</Label>
                    <Input
                      id="goalDescription"
                      type="text"
                      placeholder="Detalhes sobre a meta"
                      value={goalFormData.description}
                      onChange={(e) => setGoalFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="text-foreground"
                    />
                  </div>
                  <Button type="submit" className="w-full">Criar meta</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {goals.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="text-center py-12">
                <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Nenhuma meta financeira criada ainda</p>
                <Button onClick={() => setGoalDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar primeira meta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goals.map((goal) => {
                const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
                const remaining = goal.targetAmount - goal.currentAmount;
                
                return (
                  <Card key={goal.id} className="shadow-lg hover:shadow-xl transition-all duration-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1">{goal.name}</CardTitle>
                          {goal.description && (
                            <p className="text-sm text-muted-foreground">{goal.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-medium">{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Economizado</span>
                          <span className="font-semibold text-secondary">{formatCurrency(goal.currentAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Meta</span>
                          <span className="font-semibold">{formatCurrency(goal.targetAmount)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-sm font-medium">Faltam</span>
                          <span className="font-bold text-primary">{formatCurrency(remaining)}</span>
                        </div>
                      </div>

                      <Button 
                        onClick={() => openAllocateDialog(goal)} 
                        className="w-full gap-2"
                        variant="outline"
                      >
                        <TrendingUp className="h-4 w-4" />
                        Alocar valor
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Dialog open={allocateDialogOpen} onOpenChange={setAllocateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Alocar valor para meta</DialogTitle>
              </DialogHeader>
              {selectedGoal && (
                <form onSubmit={handleAllocateSubmit} className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="font-medium mb-1">{selectedGoal.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Atual: {formatCurrency(selectedGoal.currentAmount)} / {formatCurrency(selectedGoal.targetAmount)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="allocateAmount">Valor a alocar</Label>
                    <Input
                      id="allocateAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={allocateAmount}
                      onChange={(e) => setAllocateAmount(e.target.value)}
                      required
                      className="text-foreground"
                    />
                  </div>
                  <Button type="submit" className="w-full">Confirmar alocação</Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
};

export default GoalsPage;
