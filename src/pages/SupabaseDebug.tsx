import { useState } from 'react';
import NavHeader from '@/components/NavHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { externalSupabase } from '@/lib/externalSupabase';
import { CheckCircle2, XCircle, Loader2, Database, Send } from 'lucide-react';

interface TableResult {
  table: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  rowCount: number | null;
  firstRow: Record<string, unknown> | null;
  error: { message?: string; details?: string; hint?: string; code?: string } | null;
}

interface WriteResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: Record<string, unknown> | null;
  error: { message?: string; details?: string; hint?: string; code?: string } | null;
}

const TABLES = ['leads', 'prompt_library', 'projects'] as const;

const SupabaseDebug = () => {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'failed'>('idle');
  const [connectionError, setConnectionError] = useState('');
  const [tableResults, setTableResults] = useState<TableResult[]>(
    TABLES.map(t => ({ table: t, status: 'idle', rowCount: null, firstRow: null, error: null }))
  );
  const [writeResult, setWriteResult] = useState<WriteResult>({ status: 'idle', data: null, error: null });

  const testConnection = async () => {
    setConnectionStatus('testing');
    setConnectionError('');
    try {
      const { error } = await externalSupabase.from('projects').select('id', { count: 'exact', head: true });
      if (error) {
        setConnectionStatus('failed');
        setConnectionError(error.message);
      } else {
        setConnectionStatus('connected');
      }
    } catch (e: any) {
      setConnectionStatus('failed');
      setConnectionError(e.message || 'Unknown error');
    }
  };

  const testReadAll = async () => {
    const results: TableResult[] = TABLES.map(t => ({ table: t, status: 'loading' as const, rowCount: null, firstRow: null, error: null }));
    setTableResults([...results]);

    for (let i = 0; i < TABLES.length; i++) {
      const table = TABLES[i];
      try {
        const { data, error, count } = await externalSupabase
          .from(table)
          .select('*', { count: 'exact' })
          .limit(1);

        if (error) {
          results[i] = {
            table,
            status: 'error',
            rowCount: null,
            firstRow: null,
            error: { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code },
          };
        } else {
          results[i] = {
            table,
            status: 'success',
            rowCount: count ?? (data?.length ?? 0),
            firstRow: data?.[0] ?? null,
            error: null,
          };
        }
      } catch (e: any) {
        results[i] = { table, status: 'error', rowCount: null, firstRow: null, error: { message: e.message } };
      }
      setTableResults([...results]);
    }
  };

  const testWrite = async () => {
    setWriteResult({ status: 'loading', data: null, error: null });
    try {
      const { data, error } = await externalSupabase
        .from('projects')
        .insert({
          client_id: '00000000-0000-0000-0000-000000000000',
          source_app: 'prompt_generator',
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        setWriteResult({
          status: 'error',
          data: null,
          error: { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code },
        });
      } else {
        setWriteResult({ status: 'success', data: data as Record<string, unknown>, error: null });
      }
    } catch (e: any) {
      setWriteResult({ status: 'error', data: null, error: { message: e.message } });
    }
  };

  const statusIcon = (s: string) => {
    if (s === 'loading' || s === 'testing') return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (s === 'success' || s === 'connected') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (s === 'error' || s === 'failed') return <XCircle className="h-4 w-4 text-destructive" />;
    return <Database className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Step 7 — External Supabase Debug Panel</h1>
        <p className="text-sm text-muted-foreground">Connected to: https://czdbnlewbbwbtgjjwute.supabase.co</p>

        {/* Connection Test */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {statusIcon(connectionStatus)} Connection Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={testConnection} size="sm" disabled={connectionStatus === 'testing'}>
              {connectionStatus === 'testing' ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Testing...</> : 'Test Connection'}
            </Button>
            {connectionStatus === 'connected' && <Badge variant="outline" className="text-green-600 border-green-600">Connected</Badge>}
            {connectionStatus === 'failed' && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{connectionError}</div>
            )}
          </CardContent>
        </Card>

        {/* Read Tests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" /> Table Read Tests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testReadAll} size="sm">Read All Tables</Button>
            {tableResults.map(r => (
              <div key={r.table} className="border rounded p-3 space-y-2">
                <div className="flex items-center gap-2 font-medium text-sm">
                  {statusIcon(r.status)}
                  <span className="font-mono">{r.table}</span>
                  {r.status === 'success' && <Badge variant="secondary">{r.rowCount} rows</Badge>}
                </div>
                {r.status === 'success' && r.firstRow && (
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">{JSON.stringify(r.firstRow, null, 2)}</pre>
                )}
                {r.status === 'success' && !r.firstRow && (
                  <p className="text-xs text-muted-foreground">Table is empty (0 rows)</p>
                )}
                {r.status === 'error' && r.error && (
                  <div className="text-xs space-y-1 bg-destructive/10 p-2 rounded">
                    {r.error.message && <p><strong>message:</strong> {r.error.message}</p>}
                    {r.error.details && <p><strong>details:</strong> {r.error.details}</p>}
                    {r.error.hint && <p><strong>hint:</strong> {r.error.hint}</p>}
                    {r.error.code && <p><strong>code:</strong> {r.error.code}</p>}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Write Test */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4" /> Write Test — Insert into projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Inserts: client_id=test-uuid, source_app='prompt_generator', status='pending'
            </p>
            <Button onClick={testWrite} size="sm" disabled={writeResult.status === 'loading'}>
              {writeResult.status === 'loading' ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Writing...</> : 'Insert Test Row'}
            </Button>
            {writeResult.status === 'success' && writeResult.data && (
              <div className="space-y-1">
                <Badge variant="outline" className="text-green-600 border-green-600">Write Success</Badge>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">{JSON.stringify(writeResult.data, null, 2)}</pre>
              </div>
            )}
            {writeResult.status === 'error' && writeResult.error && (
              <div className="text-xs space-y-1 bg-destructive/10 p-2 rounded">
                {writeResult.error.message && <p><strong>message:</strong> {writeResult.error.message}</p>}
                {writeResult.error.details && <p><strong>details:</strong> {writeResult.error.details}</p>}
                {writeResult.error.hint && <p><strong>hint:</strong> {writeResult.error.hint}</p>}
                {writeResult.error.code && <p><strong>code:</strong> {writeResult.error.code}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupabaseDebug;
