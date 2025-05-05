import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Database, Loader2, RefreshCw, Shield, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DatabaseStatus {
  status?: string;
  message?: string;
  error?: string;
  directConnectionStatus?: string;
  supabaseUrl?: string;
  supabaseStatus?: string;
  sqlScript?: string;
}

interface SqlFunctionData {
  message: string;
  sqlScript: string;
  error?: string;
}

interface TableTestResult {
  name: string;
  exists: boolean;
  count?: number;
  error?: string | null;
}

interface SchemaData {
  existingTables: string[];
  missingTables: string[];
  tableSchemas: {
    name: string;
    recordCount: number;
    columns: any[];
  }[];
  error?: string;
}

interface TableCreationResult {
  success: boolean;
  message?: string;
  error?: string;
}

const SupabaseSetupPage = () => {
  const { toast } = useToast();
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [sqlFunctions, setSqlFunctions] = useState<SqlFunctionData | null>(null);
  const [sqlTestResult, setSqlTestResult] = useState<any | null>(null);
  const [tables, setTables] = useState<{ message?: string; tables?: TableTestResult[], error?: string } | null>(null);
  const [schema, setSchema] = useState<SchemaData | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCreatingTables, setIsCreatingTables] = useState<boolean>(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState<boolean>(false);
  const [tableCreationResult, setTableCreationResult] = useState<TableCreationResult | null>(null);
  const [adminCreationResult, setAdminCreationResult] = useState<any | null>(null);

  useEffect(() => {
    checkDbStatus();
    getSqlFunctions();
    testSqlFunction();
    checkTables();
    checkSchema();
  }, []);

  const checkDbStatus = async () => {
    try {
      const result = await apiRequest('GET', '/api/diagnostic/db-check');
      const data = await result.json();
      setDbStatus(data);
    } catch (error) {
      console.error('Error checking database status:', error);
      setDbStatus({ 
        status: 'error', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const getSqlFunctions = async () => {
    try {
      const result = await apiRequest('GET', '/api/diagnostic/sql-functions');
      const data = await result.json();
      setSqlFunctions(data);
    } catch (error) {
      console.error('Error getting SQL functions:', error);
      setSqlFunctions({ 
        message: 'Error getting SQL functions', 
        sqlScript: '',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const testSqlFunction = async () => {
    try {
      const result = await apiRequest('GET', '/api/diagnostic/test-run-sql');
      const data = await result.json();
      setSqlTestResult(data);
    } catch (error) {
      console.error('Error testing SQL function:', error);
      setSqlTestResult({ 
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const checkTables = async () => {
    try {
      const result = await apiRequest('GET', '/api/diagnostic/supabase-tables');
      const data = await result.json();
      setTables(data);
    } catch (error) {
      console.error('Error checking tables:', error);
      setTables({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  };

  const checkSchema = async () => {
    try {
      const result = await apiRequest('GET', '/api/diagnostic/schema');
      const data = await result.json();
      setSchema(data);
    } catch (error) {
      console.error('Error checking schema:', error);
      setSchema({ 
        existingTables: [],
        missingTables: [],
        tableSchemas: [],
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const refreshAll = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        checkDbStatus(),
        getSqlFunctions(),
        testSqlFunction(),
        checkTables(),
        checkSchema()
      ]);
      toast({
        title: 'Refreshed',
        description: 'All diagnostics have been refreshed',
      });
    } catch (error) {
      console.error('Error refreshing diagnostics:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh diagnostics',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createAllTables = async () => {
    setIsCreatingTables(true);
    setTableCreationResult(null);
    try {
      const result = await apiRequest('POST', '/api/supabase/create-tables');
      const data = await result.json();
      setTableCreationResult(data);
      
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Tables were created successfully',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create tables',
          variant: 'destructive',
        });
      }
      
      // Refresh data after creating tables
      setTimeout(() => {
        checkTables();
        checkSchema();
        testSqlFunction();
      }, 1000);
      
    } catch (error) {
      console.error('Error creating tables:', error);
      setTableCreationResult({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      toast({
        title: 'Error',
        description: 'Failed to create tables',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingTables(false);
    }
  };

  const createAdminUser = async () => {
    setIsCreatingAdmin(true);
    setAdminCreationResult(null);
    try {
      const result = await apiRequest('POST', '/api/supabase/create-admin');
      const data = await result.json();
      setAdminCreationResult(data);
      
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Admin user was created successfully',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create admin user',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating admin user:', error);
      setAdminCreationResult({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      toast({
        title: 'Error',
        description: 'Failed to create admin user',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Supabase Setup</h1>
          <p className="text-muted-foreground mt-2">
            Configure and verify your Supabase integration
          </p>
        </div>
        <Button onClick={refreshAll} disabled={isLoading} variant="outline">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh All
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Database Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Database Connection
            </CardTitle>
            <CardDescription>
              Status of your Supabase database connection
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dbStatus ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Connection Status:</span>
                  <span className={`flex items-center ${
                    dbStatus.directConnectionStatus?.includes('error') ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {dbStatus.directConnectionStatus?.includes('error') ? (
                      <>
                        <XCircle className="mr-1 h-4 w-4" />
                        Error
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Connected
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Supabase URL:</span>
                  <span>{dbStatus.supabaseUrl || 'Not configured'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Supabase Client:</span>
                  <span className={`flex items-center ${
                    dbStatus.supabaseStatus === 'available' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {dbStatus.supabaseStatus === 'available' ? (
                      <>
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Available
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-4 w-4" />
                        Unavailable
                      </>
                    )}
                  </span>
                </div>
                {dbStatus.error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {dbStatus.error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* SQL Function Test Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              SQL Function Test
            </CardTitle>
            <CardDescription>
              Test if required SQL functions are installed in Supabase
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sqlTestResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span>Status:</span>
                  {sqlTestResult.success ? (
                    <span className="flex items-center text-green-500">
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Available
                    </span>
                  ) : (
                    <span className="flex items-center text-red-500">
                      <XCircle className="mr-1 h-4 w-4" />
                      Not Available
                    </span>
                  )}
                </div>
                
                {!sqlTestResult.success && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>SQL Function Not Available</AlertTitle>
                    <AlertDescription>
                      <p className="mb-2">The required SQL function is not available in your Supabase database.</p>
                      <p>Please copy the SQL below and execute it in the Supabase SQL Editor.</p>
                    </AlertDescription>
                  </Alert>
                )}

                {sqlFunctions && !sqlTestResult.success && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="sql">
                      <AccordionTrigger>SQL Function Code</AccordionTrigger>
                      <AccordionContent>
                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                          <code>{sqlFunctions.sqlScript}</code>
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                {sqlTestResult.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {sqlTestResult.error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Database Tables Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5" />
            Database Tables
          </CardTitle>
          <CardDescription>
            Check and create required database tables
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schema ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-medium mb-2">Existing Tables</h3>
                  {schema.existingTables.length > 0 ? (
                    <ul className="space-y-1">
                      {schema.existingTables.map((table) => (
                        <li key={table} className="flex items-center text-green-500">
                          <CheckCircle className="mr-1 h-4 w-4" />
                          {table}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm">No tables found</p>
                  )}
                </div>
                <div>
                  <h3 className="font-medium mb-2">Missing Tables</h3>
                  {schema.missingTables.length > 0 ? (
                    <ul className="space-y-1">
                      {schema.missingTables.map((table) => (
                        <li key={table} className="flex items-center text-amber-500">
                          <AlertCircle className="mr-1 h-4 w-4" />
                          {table}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-green-500 flex items-center">
                      <CheckCircle className="mr-1 h-4 w-4" />
                      All required tables exist
                    </p>
                  )}
                </div>
              </div>

              {sqlTestResult?.success && schema.missingTables.length > 0 && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-600">Missing Tables</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    <p className="mb-2">Some required tables are missing in your Supabase database.</p>
                    <p className="mb-4">You can create all necessary tables automatically by clicking the button below.</p>
                    <Button 
                      onClick={createAllTables}
                      disabled={isCreatingTables}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {isCreatingTables ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Tables...
                        </>
                      ) : (
                        <>Create All Missing Tables</>
                      )}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {tableCreationResult && (
                <Alert variant={tableCreationResult.success ? "default" : "destructive"}>
                  {tableCreationResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>{tableCreationResult.success ? "Success" : "Error"}</AlertTitle>
                  <AlertDescription>
                    {tableCreationResult.message || tableCreationResult.error || 
                     (tableCreationResult.success ? "Tables created successfully" : "Failed to create tables")}
                  </AlertDescription>
                </Alert>
              )}

              {schema.existingTables.includes('users') && schema.existingTables.includes('admins') && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-600">Create Admin User</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    <p className="mb-2">Create an admin user with default credentials (username: admin, password: admin123)</p>
                    <Button 
                      onClick={createAdminUser}
                      disabled={isCreatingAdmin}
                      className="bg-blue-600 hover:bg-blue-700 mt-2"
                    >
                      {isCreatingAdmin ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Admin...
                        </>
                      ) : (
                        <>Create Admin User</>
                      )}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {adminCreationResult && (
                <Alert variant={adminCreationResult.success ? "default" : "destructive"}>
                  {adminCreationResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>{adminCreationResult.success ? "Success" : "Error"}</AlertTitle>
                  <AlertDescription>
                    {adminCreationResult.message || adminCreationResult.error || 
                     (adminCreationResult.success ? "Admin user created successfully" : "Failed to create admin user")}
                  </AlertDescription>
                </Alert>
              )}

              {schema.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {schema.error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      {!sqlTestResult?.success && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>SQL Function Required</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>You must first create the required SQL function in your Supabase database.</p>
            <p>Go to the Supabase dashboard, open the SQL Editor, and run the following SQL script:</p>
            {sqlFunctions && (
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs mt-2">
                <code>{sqlFunctions.sqlScript}</code>
              </pre>
            )}
            <p className="font-medium mt-2">After adding the SQL function, click "Refresh All" above to verify.</p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default SupabaseSetupPage;