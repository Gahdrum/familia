
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import Header from '@/components/Header.jsx';
import IntegrationsWidget from '@/components/IntegrationsWidget.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, Wallet, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DashboardPage = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState({
    totalIncome: 0,
    fixedExpenses: 0,
    variableExpenses: 0,
    netBalance: 0
  });
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const userId = pb.authStore.model?.id;

      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const startDate = new Date(currentYear, currentMonth, 1).toISOString().slice(0, 10);
      const endDate = new Date(currentYear, currentMonth + 1, 1).toISOString().slice(0, 10);

      const [transactions, incomes] = await Promise.all([
        pb.collection('transactions').getFullList({
          filter: `userId = "${userId}" && date >= "${startDate}" && date < "${endDate}"`,
          sort: '-date',
          expand: 'category',
          $autoCancel: false,
        }),
        pb.collection('incomes').getFullList({
          filter: `userId = "${userId}" && date >= "${startDate}" && date < "${endDate}"`,
          sort: '-date',
          $autoCancel: false,
        }),
      ]);

      const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0) || Number(currentUser?.monthlyIncome || 0);
      const fixedExpenses = transactions
        .filter((item) => ['Moradia', 'Utilidades', 'Educação'].includes(item.expand?.category?.name || ''))
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const variableExpenses = transactions
        .filter((item) => !['Moradia', 'Utilidades', 'Educação'].includes(item.expand?.category?.name || ''))
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const netBalance = totalIncome - fixedExpenses - variableExpenses;

      setMetrics({
        totalIncome,
        fixedExpenses,
        variableExpenses,
        netBalance
      });

      const upcoming = [...transactions]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          description: item.description || item.expand?.category?.name || 'Despesa',
          amount: Number(item.amount || 0),
          dueDate: item.date,
        }));

      const groupedByCategory = transactions.reduce((acc, item) => {
        const category = item.expand?.category?.name || 'Outros';
        acc[category] = (acc[category] || 0) + Number(item.amount || 0);
        return acc;
      }, {});

      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

      const pieData = Object.entries(groupedByCategory).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
      }));

      const recentMonths = Array.from({ length: 4 }, (_, index) => {
        const date = new Date(currentYear, currentMonth - (3 - index), 1);
        return {
          label: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
          start: new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10),
          end: new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString().slice(0, 10),
        };
      });

      const [monthTransactions, monthIncomes] = await Promise.all([
        Promise.all(recentMonths.map(({ start, end }) => pb.collection('transactions').getFullList({
          filter: `userId = "${userId}" && date >= "${start}" && date < "${end}"`,
          $autoCancel: false,
        }))),
        Promise.all(recentMonths.map(({ start, end }) => pb.collection('incomes').getFullList({
          filter: `userId = "${userId}" && date >= "${start}" && date < "${end}"`,
          $autoCancel: false,
        }))),
      ]);

      const barData = recentMonths.map((month, index) => ({
        month: month.label.charAt(0).toUpperCase() + month.label.slice(1),
        receita: monthIncomes[index].reduce((sum, item) => sum + Number(item.amount || 0), 0),
        despesas: monthTransactions[index].reduce((sum, item) => sum + Number(item.amount || 0), 0),
      }));

      setUpcomingBills(upcoming);
      setExpenseData(pieData);
      setMonthlyData(barData);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Dashboard - FinançaFamília</title>
        <meta name="description" content="Visão geral da saúde financeira da família" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-2" style={{ letterSpacing: '-0.02em' }}>
              Saúde financeira da família
            </h1>
            <p className="text-muted-foreground">Bem-vindo de volta, {currentUser?.name}</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total receita</CardTitle>
                <TrendingUp className="h-5 w-5 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metrics.totalIncome)}</div>
                <p className="text-xs text-muted-foreground mt-1">Renda mensal</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Despesas fixas</CardTitle>
                <Wallet className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metrics.fixedExpenses)}</div>
                <p className="text-xs text-muted-foreground mt-1">Contas mensais</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Despesas variáveis</CardTitle>
                <TrendingDown className="h-5 w-5 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metrics.variableExpenses)}</div>
                <p className="text-xs text-muted-foreground mt-1">Gastos do mês</p>
              </CardContent>
            </Card>

            <Card className={`shadow-lg ${metrics.netBalance >= 0 ? 'bg-secondary/10' : 'bg-destructive/10'}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saldo líquido</CardTitle>
                <DollarSign className={`h-5 w-5 ${metrics.netBalance >= 0 ? 'text-secondary' : 'text-destructive'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${metrics.netBalance >= 0 ? 'text-secondary' : 'text-destructive'}`}>
                  {formatCurrency(metrics.netBalance)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Disponível</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Distribuição de despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Receita vs despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="receita" fill="hsl(var(--secondary))" name="Receita" />
                    <Bar dataKey="despesas" fill="hsl(var(--destructive))" name="Despesas" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="shadow-lg lg:col-span-2">
              <CardHeader>
                <CardTitle>Contas a pagar nos próximos 7 dias</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingBills.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhuma conta a pagar nos próximos dias</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingBills.map((bill) => (
                      <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">{bill.description}</p>
                          <p className="text-sm text-muted-foreground">Vencimento: {formatDate(bill.dueDate)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrency(bill.amount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-1">
              <IntegrationsWidget />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
