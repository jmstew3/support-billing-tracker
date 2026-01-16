import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, ChevronLeft, ChevronRight, Clock, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { useClientTickets } from '../hooks/useClientData';
import { formatDistanceToNow, format } from 'date-fns';

const TICKETS_PER_PAGE = 10;

const STATUS_OPTIONS = ['All', 'Open', 'In Progress', 'Pending', 'Resolved', 'Closed'];

const ticketStatusColors: Record<string, string> = {
  'Open': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'In Progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'Pending': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'Resolved': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'Closed': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const priorityColors: Record<string, string> = {
  'Critical': 'text-red-600 dark:text-red-400',
  'High': 'text-orange-600 dark:text-orange-400',
  'Medium': 'text-yellow-600 dark:text-yellow-400',
  'Normal': 'text-blue-600 dark:text-blue-400',
  'Low': 'text-gray-600 dark:text-gray-400',
};

/**
 * Client Portal Tickets List
 * Shows all support tickets for the client with filtering and pagination
 */
export function ClientTickets() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useClientTickets({
    limit: TICKETS_PER_PAGE,
    offset: page * TICKETS_PER_PAGE,
    status: statusFilter === 'All' ? undefined : statusFilter,
  });

  const tickets = data?.tickets ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / TICKETS_PER_PAGE);

  // Client-side search filter
  const filteredTickets = searchQuery
    ? tickets.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.ticket_number.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tickets;

  if (isLoading && page === 0) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-primary" />
          <p className="text-muted-foreground">Loading tickets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load tickets</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Support Tickets</h1>
        <p className="text-muted-foreground mt-1">View and track your support requests</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>
              {total} ticket{total !== 1 ? 's' : ''} total
            </span>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No tickets match your search' : 'No tickets found'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 rounded-lg border border-border/50 hover:border-primary/50 cursor-pointer transition-colors bg-card"
                  onClick={() => navigate(`/portal/tickets/${ticket.id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Header row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
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
                        {ticket.priority && (
                          <span
                            className={`text-xs font-medium ${
                              priorityColors[ticket.priority] || 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {ticket.priority}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-medium text-foreground line-clamp-2">
                        {ticket.title}
                      </h3>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {ticket.agent_name && (
                          <span>Agent: {ticket.agent_name}</span>
                        )}
                        {ticket.product_name && (
                          <span>Product: {ticket.product_name}</span>
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      <span title={format(new Date(ticket.created_at), 'PPp')}>
                        {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Preview of message if available */}
                  {ticket.customer_message && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {ticket.customer_message}
                    </p>
                  )}

                  {/* View details link */}
                  <div className="mt-3 flex items-center gap-1 text-xs text-primary">
                    <span>View details</span>
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-md border border-border hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-md border border-border hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
