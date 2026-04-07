import React, { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { format } from 'date-fns';
import { ArrowLeft, Download, FileArchive, Mail, Paperclip, Loader2, AlertCircle, Calendar, User, AlignLeft } from 'lucide-react';
import { useGetJob, exportJob, downloadEmail } from '@workspace/api-client-react';
import { Layout } from '@/components/Layout';
import { TWindow, TButton, TBadge } from '@/components/TerminalUI';
import { cn } from '@/lib/utils';

export default function JobDetailsPage() {
  const [, params] = useRoute('/job/:id');
  const jobId = params?.id ? parseInt(params.id) : 0;
  
  const [expandedEmail, setExpandedEmail] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [downloadingMsgId, setDownloadingMsgId] = useState<number | null>(null);

  const { data, isLoading, isError } = useGetJob(jobId, {
    query: {
      refetchInterval: (query) => {
        const job = query.state.data?.job;
        return (job?.status === 'pending' || job?.status === 'processing') ? 3000 : false;
      }
    }
  });

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportJob(jobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CONVERTED_JOB_${jobId}_${format(new Date(), 'yyyyMMdd_HHmmss')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed", error);
      alert("Failed to export job archive.");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadSingle = async (emailId: number, filename: string) => {
    try {
      setDownloadingMsgId(emailId);
      const text = await downloadEmail(emailId);
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Use the generated filename from API
      a.download = `${filename}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed", error);
      alert("Failed to download email text.");
    } finally {
      setDownloadingMsgId(null);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-primary">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <p className="animate-pulse tracking-widest text-glow">ACCESSING_DATA_STREAM...</p>
        </div>
      </Layout>
    );
  }

  if (isError || !data) {
    return (
      <Layout>
        <TWindow title="SYS.ERROR">
          <div className="py-12 flex flex-col items-center text-destructive">
            <AlertCircle className="w-16 h-16 mb-4" />
            <h2 className="text-xl font-bold mb-2">ERR_RECORD_NOT_FOUND</h2>
            <p className="mb-6">The requested job data could not be retrieved or does not exist.</p>
            <Link href="/">
              <TButton>RETURN_TO_QUEUE</TButton>
            </Link>
          </div>
        </TWindow>
      </Layout>
    );
  }

  const { job, emails } = data;
  const isComplete = job.status === 'completed';

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/">
          <TButton variant="ghost" className="pl-0 hover:bg-transparent">
            <ArrowLeft className="w-4 h-4" /> BACK_TO_QUEUE
          </TButton>
        </Link>
        <div className="text-xs text-muted-foreground font-mono">
          UUID: {job.id} // TYPE: {job.fileType.toUpperCase()}
        </div>
      </div>

      {/* JOB HEADER */}
      <TWindow title={`JOB_INSPECTOR // ${job.originalFilename}`} className="mb-6 border-accent/50 shadow-accent/5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-glow text-accent mb-2">
              {job.originalFilename}
            </h2>
            <div className="flex flex-wrap gap-3 text-sm">
              <TBadge variant={isComplete ? 'success' : job.status === 'failed' ? 'destructive' : 'warning'}>
                STATUS: {job.status}
              </TBadge>
              <TBadge variant="default">
                EXTRACTED: {job.processedEmails} / {job.totalEmails || '?'}
              </TBadge>
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> 
                {format(new Date(job.createdAt), 'yyyy/MM/dd HH:mm:ss')}
              </span>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <TButton 
              onClick={handleExport} 
              disabled={!isComplete || exporting || emails.length === 0}
              className={cn("bg-accent text-accent-foreground border-accent hover:bg-accent/90", 
                (!isComplete || emails.length === 0) && "opacity-50 grayscale"
              )}
            >
              {exporting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> PACKAGING...</>
              ) : (
                <><FileArchive className="w-4 h-4" /> EXPORT_ALL_ZIP</>
              )}
            </TButton>
          </div>
        </div>

        {job.errorMessage && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive text-destructive text-sm">
            <strong>SYS_FAULT:</strong> {job.errorMessage}
          </div>
        )}
      </TWindow>

      {/* EMAILS LIST */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary/70 mb-2">
          <Mail className="w-4 h-4" />
          <h3 className="font-bold tracking-widest uppercase">Extracted_Payloads [{emails.length}]</h3>
          <div className="h-px bg-primary/20 flex-1 ml-4"></div>
        </div>

        {emails.length === 0 ? (
          <div className="border border-dashed border-primary/20 p-8 text-center text-muted-foreground">
            {job.status === 'pending' || job.status === 'processing' 
              ? "AWAITING_EXTRACTION_PROCESS..." 
              : "NO_VALID_PAYLOADS_FOUND"}
          </div>
        ) : (
          emails.map((email) => {
            const isExpanded = expandedEmail === email.id;
            
            return (
              <div 
                key={email.id} 
                className={cn(
                  "border transition-all duration-200 bg-background",
                  isExpanded ? "border-primary shadow-[0_0_15px_rgba(0,255,0,0.1)]" : "border-primary/20 hover:border-primary/50"
                )}
              >
                {/* Email Header Row (Clickable) */}
                <div 
                  className="p-3 md:p-4 flex flex-col md:flex-row gap-4 cursor-pointer hover:bg-primary/5"
                  onClick={() => setExpandedEmail(isExpanded ? null : email.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-accent border border-accent/30 px-1 py-0.5 bg-accent/5 truncate max-w-full block">
                        {email.generatedFilename}
                      </span>
                      {email.hasAttachments && (
                        <span className="flex items-center text-xs text-primary bg-primary/10 px-1.5 py-0.5 border border-primary/30 shrink-0">
                          <Paperclip className="w-3 h-3 mr-1" /> {email.attachmentCount}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-foreground truncate text-sm md:text-base">
                      {email.subject || "<NO_SUBJECT>"}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 truncate">
                      <span className="flex items-center gap-1 truncate"><User className="w-3 h-3 shrink-0" /> {email.sender}</span>
                      {email.emailDate && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar className="w-3 h-3" /> 
                          {format(new Date(email.emailDate), 'yy/MM/dd HH:mm')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end md:shrink-0">
                    <TButton 
                      variant="outline" 
                      className="h-8 text-xs py-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadSingle(email.id, email.generatedFilename);
                      }}
                      disabled={downloadingMsgId === email.id}
                    >
                      {downloadingMsgId === email.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3 mr-1" />
                      )}
                      TXT
                    </TButton>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-primary/20 bg-black/40 p-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm border-b border-primary/20 pb-4">
                      <div>
                        <div className="text-primary/50 text-xs mb-1">FROM:</div>
                        <div className="text-primary break-all">{email.sender}</div>
                      </div>
                      <div>
                        <div className="text-primary/50 text-xs mb-1">TO:</div>
                        <div className="text-primary break-all">{email.recipients || '<UNDISCLOSED>'}</div>
                      </div>
                      {email.hasAttachments && email.attachmentNames && (
                        <div className="md:col-span-2 mt-2">
                          <div className="text-primary/50 text-xs mb-1 flex items-center gap-1">
                            <Paperclip className="w-3 h-3" /> ATTACHMENTS_INDEX:
                          </div>
                          <div className="text-muted-foreground font-mono text-xs p-2 bg-primary/5 border border-primary/10 rounded-sm">
                            {email.attachmentNames.split(',').map((name, i) => (
                              <div key={i} className="truncate">- {name.trim()}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="text-primary/50 text-xs mb-2 flex items-center gap-1">
                        <AlignLeft className="w-3 h-3" /> PARSED_PAYLOAD:
                      </div>
                      <div className="bg-background border border-primary/30 p-3 max-h-96 overflow-y-auto font-mono text-sm text-foreground/90 whitespace-pre-wrap">
                        {email.bodyText || '<EMPTY_BODY>'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Layout>
  );
}
