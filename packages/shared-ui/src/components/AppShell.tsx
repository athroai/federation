import React, { ReactNode } from 'react';

export interface AppShellProps {
  appName: string;
  children: ReactNode;
  navigation?: ReactNode;
  headerActions?: ReactNode;
  footerContent?: ReactNode;
  sidebarContent?: ReactNode;
}

/**
 * AppShell provides a consistent layout across all Athro applications
 * This ensures UI coherence regardless of which application is rendering the content
 */
export const AppShell: React.FC<AppShellProps> = ({
  appName,
  children,
  navigation,
  headerActions,
  footerContent,
  sidebarContent
}) => {
  return (
    <div className="athro-app-shell">
      <header className="athro-app-header">
        <div className="athro-app-header-brand">
          <h1>{appName}</h1>
        </div>
        {navigation && (
          <nav className="athro-app-navigation">
            {navigation}
          </nav>
        )}
        {headerActions && (
          <div className="athro-app-header-actions">
            {headerActions}
          </div>
        )}
      </header>
      
      <div className="athro-app-content">
        {sidebarContent && (
          <aside className="athro-app-sidebar">
            {sidebarContent}
          </aside>
        )}
        <main className="athro-app-main">
          {children}
        </main>
      </div>
      
      {footerContent && (
        <footer className="athro-app-footer">
          {footerContent}
        </footer>
      )}
    </div>
  );
};
