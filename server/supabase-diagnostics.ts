import { supabase } from './supabase';

export async function checkSupabaseTables() {
  try {
    console.log('===== SUPABASE DATABASE DIAGNOSTICS =====');
    
    // List all tables in the database using system catalog
    const { data: tableList, error: tableError } = await supabase.rpc('list_tables');
    
    if (tableError) {
      console.error('Error fetching tables from system catalog:', tableError);
      
      // Alternative approach - try to check known tables
      const tableNames = [
        'users', 
        'teams', 
        'team_members', 
        'tournaments', 
        'registrations', 
        'notifications',
        'notification_reads',
        'admins'
      ];
      
      console.log('Checking individual tables existence:');
      
      for (const tableName of tableNames) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('count(*)', { count: 'exact', head: true });
            
          if (error) {
            console.error(`❌ Table '${tableName}' error:`, error.message);
          } else {
            console.log(`✅ Table '${tableName}' exists, count:`, data);
          }
        } catch (err) {
          console.error(`❌ Error checking table '${tableName}':`, err);
        }
      }
    } else {
      console.log('Tables in database:', tableList);
      
      // Check each table's structure
      if (Array.isArray(tableList)) {
        for (const table of tableList) {
          try {
            const { data: columns, error: columnError } = await supabase.rpc('list_columns', { 
              table_name: table.table_name 
            });
            
            if (columnError) {
              console.error(`Error getting columns for '${table.table_name}':`, columnError);
            } else {
              console.log(`Table '${table.table_name}' columns:`, columns);
            }
            
            // Get row count
            const { count, error: countError } = await supabase
              .from(table.table_name)
              .select('*', { count: 'exact', head: true });
              
            if (countError) {
              console.error(`Error counting rows in '${table.table_name}':`, countError);
            } else {
              console.log(`Table '${table.table_name}' has ${count} rows`);
            }
          } catch (err) {
            console.error(`Error analyzing table '${table.table_name}':`, err);
          }
        }
      }
    }
    
    // Try creating a table if needed (we'll create a diagnostic_test table)
    console.log('Attempting to create a test table...');
    const { error: createError } = await supabase
      .rpc('create_test_table');
      
    if (createError) {
      console.error('Error creating test table:', createError);
    } else {
      console.log('Successfully created test table');
      
      // Clean up test table
      const { error: dropError } = await supabase
        .rpc('drop_test_table');
        
      if (dropError) {
        console.error('Error dropping test table:', dropError);
      } else {
        console.log('Successfully dropped test table');
      }
    }
    
    console.log('===== END DIAGNOSTICS =====');
  } catch (error) {
    console.error('Error in Supabase diagnostics:', error);
  }
}

// Function to create the necessary stored procedures
export async function createSupabaseProcedures() {
  try {
    console.log('Creating Supabase diagnostic procedures...');
    
    // Create procedure to list tables
    const { error: listTablesError } = await supabase.rpc('create_list_tables_procedure');
    
    if (listTablesError) {
      console.error('Error creating list_tables procedure:', listTablesError);
    } else {
      console.log('Successfully created list_tables procedure');
    }
    
    // Create procedure to list columns
    const { error: listColumnsError } = await supabase.rpc('create_list_columns_procedure');
    
    if (listColumnsError) {
      console.error('Error creating list_columns procedure:', listColumnsError);
    } else {
      console.log('Successfully created list_columns procedure');
    }
    
    // Create procedure to create test table
    const { error: createTestTableError } = await supabase.rpc('create_test_table_procedure');
    
    if (createTestTableError) {
      console.error('Error creating create_test_table procedure:', createTestTableError);
    } else {
      console.log('Successfully created create_test_table procedure');
    }
    
    // Create procedure to drop test table
    const { error: dropTestTableError } = await supabase.rpc('create_drop_test_table_procedure');
    
    if (dropTestTableError) {
      console.error('Error creating drop_test_table procedure:', dropTestTableError);
    } else {
      console.log('Successfully created drop_test_table procedure');
    }
  } catch (error) {
    console.error('Error creating Supabase procedures:', error);
  }
}

// Check table permissions
export async function checkTablePermissions() {
  try {
    console.log('Checking table permissions...');
    
    const tableNames = [
      'users', 
      'teams', 
      'team_members', 
      'tournaments', 
      'registrations', 
      'notifications',
      'notification_reads',
      'admins'
    ];
    
    for (const tableName of tableNames) {
      try {
        // Try select
        const { error: selectError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        console.log(`Table '${tableName}' SELECT permission:`, !selectError ? '✅' : '❌');
        
        // Try insert
        const { error: insertError } = await supabase
          .from(tableName)
          .insert({})
          .select()
          .single();
          
        console.log(`Table '${tableName}' INSERT permission:`, !insertError ? '✅' : '❌');
        
        // For checking purposes only - we don't actually want to insert empty records
        
      } catch (err) {
        console.error(`Error checking permissions for '${tableName}':`, err);
      }
    }
  } catch (error) {
    console.error('Error checking table permissions:', error);
  }
}