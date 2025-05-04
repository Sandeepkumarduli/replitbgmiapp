/**
 * Debug environment variables component
 * For debugging purposes only - will be disabled in production
 */
import { useEffect, useState } from 'react';

export function DebugEnvironment() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  
  useEffect(() => {
    // Only enable in development mode
    if (import.meta.env.DEV) {
      // List all environment variables that start with VITE_ or NEXT_PUBLIC_
      const relevantVars = Object.keys(import.meta.env)
        .filter(key => key.startsWith('VITE_') || key.startsWith('NEXT_PUBLIC_'))
        .reduce((acc, key) => {
          acc[key] = typeof import.meta.env[key] === 'string' 
            ? (import.meta.env[key] as string).substring(0, 10) + '...' 
            : String(import.meta.env[key]);
          return acc;
        }, {} as Record<string, string>);
      
      setEnvVars(relevantVars);
    }
  }, []);
  
  // Only show in development
  if (!import.meta.env.DEV || Object.keys(envVars).length === 0) {
    return null;
  }
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: '10px',
      borderRadius: '5px',
      color: 'white',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px',
      maxHeight: '200px',
      overflow: 'auto'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Environment Variables:</div>
      <ul style={{ margin: '0', padding: '0 0 0 15px' }}>
        {Object.entries(envVars).map(([key, value]) => (
          <li key={key}>
            <strong>{key}:</strong> {value}
          </li>
        ))}
      </ul>
    </div>
  );
}