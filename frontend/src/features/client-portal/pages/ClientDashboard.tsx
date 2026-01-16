import { useNavigate } from 'react-router-dom';
import { Loader2, Ticket, Globe, FolderKanban, ArrowRight, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { useClientActivity } from '../hooks/useClientData';
import { formatDistanceToNow } from 'date-fns';

/**
 * Client Portal Dashboard
 * Shows activity summary and quick links to other sections
 */
export function ClientDashboard() {
  const navigate = useNavigate();
  const { user } = useClientAuth();
  const { data: activity, isLoading, error } = useClientActivity();

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load dashboard</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const ticketStatusColors: Record<string, string> = {
    'Open': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'In Progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'Pending': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'Resolved': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'Closed': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome{user?.clientName ? `, ${user.clientName}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's an overview of your account activity
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tickets Card */}
        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate('/portal/tickets')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Support Tickets
            </CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activity?.tickets.total ?? 0}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">View all tickets</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Websites Card */}
        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate('/portal/sites')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Websites
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activity?.websites.total ?? 0}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">View all sites</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Projects Card */}
        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate('/portal/projects')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projects
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activity?.projects.total ?? 0}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">View all projects</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ticket Status Breakdown */}
      {activity?.tickets.byStatus && Object.keys(activity.tickets.byStatus).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ticket Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(activity.tickets.byStatus).map(([status, count]) => (
                <div
                  key={status}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    ticketStatusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                  }`}
                >
                  {status}: {count}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Tickets */}
      {activity?.tickets.recent && activity.tickets.recent.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Tickets</CardTitle>
            <button
              onClick={() => navigate('/portal/tickets')}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activity.tickets.recent.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/portal/tickets/${ticket.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        #{ticket.ticket_number}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          ticketStatusColors[ticket.ticket_status] ||
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                        }`}
                      >
                        {ticket.ticket_status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground mt-1 truncate">
                      {ticket.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground ml-4">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
