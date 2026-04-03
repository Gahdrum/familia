
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const FinancialCalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const userId = pb.authStore.model?.id;

      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1).toISOString().slice(0, 10);
      const endDate = new Date(year, month + 1, 1).toISOString().slice(0, 10);

      const [transactions, incomes, goals] = await Promise.all([
        pb.collection('transactions').getFullList({
          filter: `userId = "${userId}" && date >= "${startDate}" && date < "${endDate}"`,
          sort: 'date',
          expand: 'category',
          $autoCancel: false,
        }),
        pb.collection('incomes').getFullList({
          filter: `userId = "${userId}" && date >= "${startDate}" && date < "${endDate}"`,
          sort: 'date',
          $autoCancel: false,
        }),
        pb.collection('goals').getFullList({
          filter: `userId = "${userId}" && deadline != "" && deadline >= "${startDate}" && deadline < "${endDate}"`,
          sort: 'deadline',
          $autoCancel: false,
        }),
      ]);

      const incomeTypeLabels = {
        salary: 'Salário',
        business: 'Negócio',
        proLabore: 'Pró-labore',
      };

      const transactionEvents = transactions.map((record) => ({
        id: `transaction-${record.id}`,
        date: record.date,
        type: 'bill',
        description: record.description || record.expand?.category?.name || 'Despesa',
        amount: Number(record.amount || 0),
      }));

      const incomeEvents = incomes.map((record) => ({
        id: `income-${record.id}`,
        date: record.date,
        type: 'income',
        description: record.description || incomeTypeLabels[record.type] || 'Receita',
        amount: Number(record.amount || 0),
      }));

      const goalEvents = goals.map((record) => ({
        id: `goal-${record.id}`,
        date: record.deadline,
        type: 'goal',
        description: record.title || 'Meta financeira',
        amount: Number(record.targetAmount || 0),
      }));

      setEvents([...transactionEvents, ...incomeEvents, ...goalEvents]);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getEventsForDate = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const previousMonth = () => {
    setSelectedDate(null);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setSelectedDate(null);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: startingDayOfWeek }, (_, i) => i);

  const getEventColor = (type) => {
    switch (type) {
      case 'bill': return 'bg-destructive';
      case 'income': return 'bg-secondary';
      case 'goal': return 'bg-primary';
      default: return 'bg-muted';
    }
  };

  const getEventLabel = (type) => {
    switch (type) {
      case 'bill': return 'Conta';
      case 'income': return 'Receita';
      case 'goal': return 'Meta';
      default: return 'Evento';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-12 w-64 mb-6" />
          <Skeleton className="h-96" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Calendário Financeiro - FinançaFamília</title>
        <meta name="description" content="Visualize contas, receitas e metas no calendário" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-2" style={{ letterSpacing: '-0.02em' }}>
              Calendário financeiro
            </h1>
            <p className="text-muted-foreground">Visualize suas contas, receitas e metas</p>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={previousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {emptyDays.map(i => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {days.map(day => {
                  const dayEvents = getEventsForDate(day);
                  const isToday = day === new Date().getDate() && 
                                  currentDate.getMonth() === new Date().getMonth() && 
                                  currentDate.getFullYear() === new Date().getFullYear();
                  
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(day)}
                      className={`aspect-square p-2 rounded-lg border transition-all duration-200 hover:border-primary ${
                        isToday ? 'bg-primary/10 border-primary' : 'border-border'
                      } ${selectedDate === day ? 'ring-2 ring-primary' : ''}`}
                    >
                      <div className="text-sm font-medium mb-1">{day}</div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className={`w-full h-1 rounded-full ${getEventColor(event.type)}`}
                          />
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-muted-foreground">+{dayEvents.length - 2}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedDate && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>
                  Eventos do dia {selectedDate} de {monthNames[currentDate.getMonth()]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getEventsForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum evento neste dia</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getEventsForDate(selectedDate).map(event => (
                      <div key={event.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getEventColor(event.type)}`} />
                          <div>
                            <p className="font-medium">{event.description}</p>
                            <p className="text-sm text-muted-foreground">{getEventLabel(event.type)}</p>
                          </div>
                        </div>
                        <p className={`font-bold ${event.type === 'income' ? 'text-secondary' : event.type === 'bill' ? 'text-destructive' : 'text-primary'}`}>
                          {formatCurrency(event.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Legenda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-destructive" />
                  <span className="text-sm">Contas a pagar</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-secondary" />
                  <span className="text-sm">Receitas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-primary" />
                  <span className="text-sm">Contribuições para metas</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default FinancialCalendarPage;
