import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle, Copy, Download, Database, FunctionSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SuperbaseSetupPage = () => {
  const [sqlFunctions, setSqlFunctions] = useState<{ message: string; sqlScript: string } | null>(null);
  const [functionsLoading, setFunctionsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [dbStatusLoading, setDbStatusLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load database status on component mount
    fetchDatabaseStatus();
  }, []);

  const fetchSqlFunctions = async () => {
    setFunctionsLoading(true);
    try {
      const response = await fetch('/api/diagnostic/sql-functions');
      const data = await response.json();
      setSqlFunctions(data);
    } catch (error) {
      console.error('Error fetching SQL functions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch SQL functions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setFunctionsLoading(false);
    }
  };

  const testRunSql = async () => {
    setTestLoading(true);
    try {
      const response = await fetch('/api/diagnostic/test-run-sql');
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      console.error('Error testing run_sql function:', error);
      toast({
        title: 'Error',
        description: 'Failed to test run_sql function. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const fetchDatabaseStatus = async () => {
    setDbStatusLoading(true);
    try {
      const response = await fetch('/api/diagnostic/db-check');
      const data = await response.json();
      setDbStatus(data);
    } catch (error) {
      console.error('Error fetching database status:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch database status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDbStatusLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: 'Copied!',
          description: 'SQL script copied to clipboard',
        });
      },
      () => {
        toast({
          title: 'Failed to copy',
          description: 'Please try selecting and copying the text manually',
          variant: 'destructive',
        });
      }
    );
  };

  const downloadSqlScript = (text: string) => {
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'supabase_functions.sql';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-6">Supabase Setup Diagnostic</h1>
      
      <Alert className="mb-6 bg-yellow-50 border-yellow-600">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800">Important: SQL Functions Required</AlertTitle>
        <AlertDescription className="text-yellow-700">
          Before proceeding with any database operations, you must create the required SQL functions in your Supabase project. 
          Use the SQL script below in the Supabase SQL Editor.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="functions">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="functions">
            <FunctionSquare className="mr-2 h-4 w-4" /> SQL Functions
          </TabsTrigger>
          <TabsTrigger value="test">
            <CheckCircle className="mr-2 h-4 w-4" /> Test Functions
          </TabsTrigger>
          <TabsTrigger value="status">
            <Database className="mr-2 h-4 w-4" /> Database Status
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="functions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Required SQL Functions</CardTitle>
              <CardDescription>
                These functions must be created in the Supabase SQL Editor for the application to work properly
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!sqlFunctions && !functionsLoading ? (
                <Button onClick={fetchSqlFunctions}>Load SQL Functions</Button>
              ) : functionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Loading SQL functions...</span>
                </div>
              ) : (
                <>
                  <p className="mb-4">{sqlFunctions?.message}</p>
                  <div className="relative">
                    <pre className="p-4 bg-gray-800 text-gray-100 rounded-md overflow-x-auto">
                      <code>{sqlFunctions?.sqlScript}</code>
                    </pre>
                    <div className="absolute top-2 right-2 space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(sqlFunctions?.sqlScript || '')}
                        className="bg-gray-700 hover:bg-gray-600 text-white"
                      >
                        <Copy className="h-4 w-4 mr-2" /> Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadSqlScript(sqlFunctions?.sqlScript || '')}
                        className="bg-gray-700 hover:bg-gray-600 text-white"
                      >
                        <Download className="h-4 w-4 mr-2" /> Download
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="bg-gray-50 p-4 rounded-b-lg">
              <div className="text-sm text-gray-600">
                After copying this SQL, paste it into the SQL Editor in your Supabase dashboard and run it.
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Test SQL Functions</CardTitle>
              <CardDescription>
                Check if the required SQL functions are properly set up in your Supabase project
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!testResult && !testLoading ? (
                <Button onClick={testRunSql}>Test SQL Functions</Button>
              ) : testLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Testing SQL functions...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Status:</span>
                    <Badge variant={testResult?.success ? "default" : "destructive"}>
                      {testResult?.success ? "Working" : "Not Working"}
                    </Badge>
                  </div>
                  
                  {!testResult?.success && testResult?.function_definition && (
                    <Alert className="bg-blue-50 border-blue-500">
                      <AlertTitle className="text-blue-700">SQL Function Needed</AlertTitle>
                      <AlertDescription className="text-blue-600">
                        <p className="mb-2">Create this function in the Supabase SQL Editor:</p>
                        <pre className="p-3 bg-gray-800 text-gray-100 rounded-md overflow-x-auto text-sm">
                          <code>{testResult.function_definition}</code>
                        </pre>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {testResult?.error && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-1">Error Details:</h4>
                      <pre className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-md text-sm">
                        {JSON.stringify(testResult.error, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Database Status</CardTitle>
              <CardDescription>
                Check the overall status of your Supabase database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!dbStatus && !dbStatusLoading ? (
                <Button onClick={fetchDatabaseStatus}>Check Database Status</Button>
              ) : dbStatusLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Checking database status...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-1">Connection Status:</h4>
                      <Badge variant={dbStatus?.connection === 'connected' ? "default" : "destructive"}>
                        {dbStatus?.connection || 'Unknown'}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">run_sql Function:</h4>
                      <Badge variant={dbStatus?.runSqlFunction === 'working' ? "default" : "destructive"}>
                        {dbStatus?.runSqlFunction || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2">Table Status:</h4>
                    {dbStatus?.tables && dbStatus.tables.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead>
                            <tr>
                              <th className="px-4 py-2 text-left">Table</th>
                              <th className="px-4 py-2 text-left">Status</th>
                              <th className="px-4 py-2 text-right">Count</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dbStatus.tables.map((table: any, index: number) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                <td className="px-4 py-2 font-medium">{table.table}</td>
                                <td className="px-4 py-2">
                                  <Badge variant={table.exists ? "default" : "destructive"}>
                                    {table.exists ? "Exists" : "Missing"}
                                  </Badge>
                                </td>
                                <td className="px-4 py-2 text-right">{table.count || 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-gray-500">
                        No table information available.
                      </div>
                    )}
                  </div>
                  
                  {dbStatus?.message && (
                    <Alert className="bg-blue-50 border-blue-500">
                      <AlertDescription className="text-blue-600">
                        {dbStatus.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={fetchDatabaseStatus} disabled={dbStatusLoading}>
                {dbStatusLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  'Refresh Status'
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperbaseSetupPage;