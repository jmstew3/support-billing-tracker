import { useEffect } from 'react';
import { Loader2, FolderKanban, CheckCircle, Clock, Pause, Play, Mail } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { useClientProjects } from '../hooks/useClientData';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { format } from 'date-fns';
import { ClientPageHeader } from '../components/ClientPageHeader';

const projectStatusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  'Active': {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-300',
    icon: Play,
  },
  'In Progress': {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-300',
    icon: Clock,
  },
  'On Hold': {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-800 dark:text-orange-300',
    icon: Pause,
  },
  'Completed': {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-300',
    icon: CheckCircle,
  },
  'Cancelled': {
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'text-gray-800 dark:text-gray-300',
    icon: Clock,
  },
};

/**
 * Client Portal Projects List
 * Shows all projects associated with the client
 */
export function ClientProjects() {
  const { user } = useClientAuth();
  const { data, isLoading, error } = useClientProjects();

  const projects = data?.projects ?? [];

  // Update document title for portal
  useEffect(() => {
    const companyName = user?.clientName || 'Client';
    document.title = `Projects | ${companyName} Portal`;
    return () => { document.title = 'Velocity Billing Dashboard'; };
  }, [user?.clientName]);

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-primary" />
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load projects</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header with Mobile Navigation */}
      <ClientPageHeader
        title="Projects"
        subtitle="Your active and completed projects"
      />

      <div className="p-6 md:p-8 space-y-6">
      {/* Summary Card */}
      {projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              {projects.length} project{projects.length !== 1 ? 's' : ''} total
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Projects List */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                <FolderKanban className="h-8 w-8 text-muted-foreground/70" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                You don't currently have any active projects. Contact us if you'd like to discuss a new project or development work.
              </p>
              <a
                href="mailto:support@peakonedigital.com?subject=Project%20Inquiry"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Mail className="h-4 w-4" />
                Start a Project
              </a>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => {
            const statusConfig = projectStatusConfig[project.project_status ?? 'Active'] ||
              projectStatusConfig['Active'];
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={project.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-start justify-between gap-2">
                    <span className="truncate">{project.project_name}</span>
                    {project.project_status && (
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.bg} ${statusConfig.text}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {project.project_status}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    Created {format(new Date(project.created_at), 'PP')}
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
