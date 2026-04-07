import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { FileCode, Trash2, Eye, RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useListJobs, useDeleteJob, getListJobsQueryKey, exportJob } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { UploadZone } from '@/components/UploadZone';
import { TWindow, TButton, TBadge } from '@/components/TerminalUI';

async function triggerAutoDownload(jobId: number, filename: string) {
  try {
    const blob = await exportJob(jobId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.replace(/\.[^.]+$/, '')}_converted_${format(new Date(), 'yyyyMMdd_HHmmss')}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // silently skip if download fails — user can still export manually
  }
}

export default function JobsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const limit = 10;
  const prevStatuses = useRef<Record<number, string>>({});

  // Poll more frequently if there are pending/processing jobs
  const { data, isLoading, isError, refetch, isFetching } = useListJobs(
    { limit, offset: page * limit },
    {
      query: {
        refetchInterval: (query) => {
          const jobs = query.state.data?.jobs || [];
          const isProcessing = jobs.some(j => j.status === 'pending' || j.status === 'processing');
          return isProcessing ? 2000 : false;
        }
      }
    }
  );

  // Auto-download zip when a job transitions to completed
  useEffect(() => {
    if (!data?.jobs) return;
    for (const job of data.jobs) {
      const prev = prevStatuses.current[job.id];
      if (prev && prev !== 'completed' && job.status === 'completed' && job.totalEmails > 0) {
        triggerAutoDownload(job.id, job.originalFilename);
      }
    }
    // Update tracked statuses
    const updated: Record<number, string> = {};
    for (const job of data.jobs) {
      updated[job.id] = job.status;
    }
    prevStatuses.current = updated;
  }, [data?.jobs]);

  const deleteMutation = useDeleteJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      }
    }
  });

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Execute deletion of job_" + id + "? This cannot be undone.")) {
      deleteMutation.mutate({ id });
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'completed':
        return <TBadge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" /> COMPLETED</TBadge>;
      case 'processing':
        return <TBadge variant="warning" className="animate-pulse"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> PROCESSING</TBadge>;
      case 'pending':
        return <TBadge variant="default"><Clock className="w-3 h-3 mr-1" /> PENDING</TBadge>;
      case 'failed':
        return <TBadge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> FAILED</TBadge>;
      default:
        return <TBadge>{status}</TBadge>;
    }
  };

  return (
    <Layout>
      <UploadZone />

      <TWindow title="SYS.DB_RECORDS // jobs_queue">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-glow">CONVERSION_HISTORY</h2>
            {isFetching && <span className="text-xs text-primary animate-pulse">Fetching updates...</span>}
          </div>
          <TButton variant="outline" onClick={() => refetch()} className="py-1 px-3 h-auto text-xs">
            <RefreshCw className={`w-3 h-3 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            SYNC
          </TButton>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-primary/50 space-y-4">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <p className="uppercase tracking-widest animate-pulse">QUERYING_DATABASE...</p>
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-destructive border border-destructive/30 bg-destructive/5">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>ERR: FAILED TO FETCH RECORDS</p>
          </div>
        ) : !data || data.jobs.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-primary/20 bg-primary/5 flex flex-col items-center">
            <FileCode className="w-12 h-12 text-primary/40 mb-4" />
            <p className="text-primary/60 tracking-widest">QUEUE_EMPTY</p>
            <p className="text-sm text-muted-foreground mt-2">Initialize process by uploading a file above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-primary uppercase bg-primary/10 border-y border-primary/30">
                <tr>
                  <th className="px-4 py-3 font-normal">JOB_ID</th>
                  <th className="px-4 py-3 font-normal">SOURCE_FILE</th>
                  <th className="px-4 py-3 font-normal">STATUS</th>
                  <th className="px-4 py-3 font-normal">PROGRESS</th>
                  <th className="px-4 py-3 font-normal">TIMESTAMP</th>
                  <th className="px-4 py-3 font-normal text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {data.jobs.map((job) => (
                  <tr key={job.id} className="border-b border-primary/10 hover:bg-primary/5 transition-colors group">
                    <td className="px-4 py-4 font-mono text-muted-foreground">
                      #{job.id.toString().padStart(4, '0')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-primary/70" />
                        <span className="font-bold text-primary truncate max-w-[200px]" title={job.originalFilename}>
                          {job.originalFilename}
                        </span>
                        <span className="text-[10px] uppercase border border-primary/30 px-1 text-primary/70">
                          {job.fileType}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {job.processedEmails} / {job.totalEmails || '?'}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {format(new Date(job.createdAt), 'yyyy/MM/dd HH:mm:ss')}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <Link href={`/job/${job.id}`}>
                          <TButton variant="outline" className="h-8 w-8 p-0" title="Inspect Data">
                            <Eye className="w-4 h-4" />
                          </TButton>
                        </Link>
                        <TButton 
                          variant="destructive" 
                          className="h-8 w-8 p-0" 
                          onClick={(e) => handleDelete(e, job.id)}
                          disabled={deleteMutation.isPending}
                          title="Purge Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </TButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Simple Pagination */}
            <div className="flex items-center justify-between mt-4 px-4">
              <span className="text-xs text-muted-foreground">
                Showing {page * limit + 1}-{Math.min((page + 1) * limit, data.total)} of {data.total} records
              </span>
              <div className="flex gap-2">
                <TButton 
                  variant="outline" 
                  className="py-1 h-auto text-xs" 
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  &lt; PREV
                </TButton>
                <TButton 
                  variant="outline" 
                  className="py-1 h-auto text-xs"
                  disabled={(page + 1) * limit >= data.total}
                  onClick={() => setPage(p => p + 1)}
                >
                  NEXT &gt;
                </TButton>
              </div>
            </div>
          </div>
        )}
      </TWindow>
    </Layout>
  );
}
