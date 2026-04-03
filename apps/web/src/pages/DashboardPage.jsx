
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const totalIncome = currentUser?.income || 0;
      const fixedExpenses = 2847.50;
      const variableExpenses = 1523.80;
      const netBalance = totalIncome - fixedExpenses - variableExpenses;

      setMetrics({
        totalIncome,
        fixedExpenses,
        variableExpenses,
        netBalance
      });

      const mockBills = [
        { id: 1, description: 'Aluguel', amount: 1500, dueDate: '2026-04-05' },
        { id: 2, description: 'Energia elétrica', amount: 287.50, dueDate: '2026-04-08' },
        { id: 3, description: 'Internet', amount: 129.90, dueDate: '2026-04-10' }
      ];
      setUpcomingBills(mockBills);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const expenseData = [
    { name: 'Moradia', value: 1500, color: '#3b82f6' },
    { name: 'Alimentação', value: 847.50, color: '#10b981' },
    { name: 'Transporte', value: 500, color: '#f59e0b' },
    { name: 'Lazer', value: 523.80, color: '#8b5cf6' }
  ];

  const monthlyData = [
    { month: 'Jan', receita: 8500, despesas: 6200 },
    { month: 'Fev', receita: 8500, despesas: 6800 },
    { month: 'Mar', receita: 8500, despesas: 5900 },
    { month: 'Abr', receita: metrics.totalIncome, despesas: metrics.fixedExpenses + metrics.variableExpenses }
  ];

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
