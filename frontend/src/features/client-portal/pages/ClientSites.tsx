import { useEffect } from 'react';
import { Loader2, Globe, ExternalLink, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { useClientSites } from '../hooks/useClientData';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { format } from 'date-fns';
import { ClientPageHeader } from '../components/ClientPageHeader';

const hostingStatusColors: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  'Active': {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-300',
    icon: CheckCircle,
  },
  'Inactive': {
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'text-gray-800 dark:text-gray-300',
    icon: AlertCircle,
  },
  'Suspended': {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
    icon: AlertCircle,
  },
};

/**
 * Client Portal Sites/Websites List
 * Shows all websites associated with the client
 */
export function ClientSites() {
  const { user } = useClientAuth();
  const { data, isLoading, error } = useClientSites();

  const websites = data?.websites ?? [];

  // Update document title for portal
  useEffect(() => {
    const companyName = user?.clientName || 'Client';
    document.title = `Websites | ${companyName} Portal`;
    return () => { document.title = 'Velocity Billing Dashboard'; };
  }, [user?.clientName]);

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-primary" />
          <p className="text-muted-foreground">Loading websites...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load websites</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header with Mobile Navigation */}
      <ClientPageHeader
        title="Websites"
        subtitle="Your managed websites and hosting status"
      />

      <div className="p-6 md:p-8 space-y-6">
      {/* Summary Card */}
      {websites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {websites.length} website{websites.length !== 1 ? 's' : ''} total
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Websites List */}
      {websites.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                <Globe className="h-8 w-8 text-muted-foreground/70" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No websites yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                You don't currently have any websites linked to your account. Contact us if you'd like to discuss web hosting or development services.
              </p>
              <a
                href="mailto:support@peakonedigital.com?subject=Website%20Services%20Inquiry"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Mail className="h-4 w-4" />
                Contact Us
              </a>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {websites.map((website) => {
            const statusConfig = hostingStatusColors[website.hosting_status ?? 'Active'] ||
              hostingStatusColors['Active'];
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={website.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-start justify-between gap-2">
                    <span className="truncate">
                      {website.website_name || website.website_url}
                    </span>
                    {website.hosting_status && (
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.bg} ${statusConfig.text}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {website.hosting_status}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* URL */}
                    <div>
                      <a
                        href={
                          website.website_url.startsWith('http')
                            ? website.website_url
                            : `https://${website.website_url}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        {website.website_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {/* Added date */}
                    <div className="text-xs text-muted-foreground">
                      Added {format(new Date(website.created_at), 'PP')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
