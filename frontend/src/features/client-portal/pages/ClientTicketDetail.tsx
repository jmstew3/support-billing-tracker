import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Clock, User, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { useClientTicket, useClientTicketMessages } from '../hooks/useClientData';
import { clientViewToRoute } from '../utils/clientRoutes';
import { format, formatDistanceToNow } from 'date-fns';

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
 * Strip HTML tags from content for safe display using regex
 * Converts common HTML entities to their text equivalents
 */
function stripHtmlTags(text: string): string {
  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Client Portal Ticket Detail
 * Shows full ticket information and conversation history
 */
export function ClientTicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const parsedTicketId = ticketId ? parseInt(ticketId, 10) : null;

  const { data: ticket, isLoading: ticketLoading, error: ticketError } = useClientTicket(parsedTicketId);
  const { data: messagesData, isLoading: messagesLoading } = useClientTicketMessages(parsedTicketId);

  const messages = messagesData?.messages ?? [];

  if (ticketLoading) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-primary" />
          <p className="text-muted-foreground">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (ticketError || !ticket) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load ticket</p>
          <p className="text-sm text-muted-foreground">{ticketError?.message || 'Ticket not found'}</p>
          <button
            onClick={() => navigate(clientViewToRoute.tickets)}
            className="mt-4 text-primary hover:underline flex items-center gap-1 mx-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to tickets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(clientViewToRoute.tickets)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tickets
      </button>

      {/* Ticket Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="text-sm font-mono text-muted-foreground">
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
                {ticket.priority} Priority
              </span>
            )}
          </div>
          <CardTitle className="text-lg">{ticket.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Created</p>
              <p className="font-medium flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {format(new Date(ticket.created_at), 'PPp')}
              </p>
            </div>

            {ticket.updated_at_fluent && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">Last Updated</p>
                <p className="font-medium">
                  {formatDistanceToNow(new Date(ticket.updated_at_fluent), { addSuffix: true })}
                </p>
              </div>
            )}

            {ticket.agent_name && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">Assigned Agent</p>
                <p className="font-medium flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {ticket.agent_name}
                </p>
              </div>
            )}

            {ticket.product_name && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">Product</p>
                <p className="font-medium">{ticket.product_name}</p>
              </div>
            )}
          </div>

          {/* Initial Message */}
          {ticket.customer_message && (
            <div className="mt-6 pt-4 border-t border-border/50">
              <p className="text-muted-foreground text-xs mb-2">Original Message</p>
              <div className="p-4 rounded-lg bg-muted/30 text-sm whitespace-pre-wrap">
                {ticket.customer_message}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation Thread */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversation
            {messagesLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No messages yet
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${
                    message.sender === 'client'
                      ? 'bg-primary/10 ml-4 sm:ml-12'
                      : 'bg-muted/30 mr-4 sm:mr-12'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-foreground">
                      {message.senderName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(message.createdAt), 'PPp')}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">
                    {stripHtmlTags(message.content)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Note about replying */}
          <div className="mt-6 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              To reply to this ticket, please respond via email or contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
