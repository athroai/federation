import React from 'react';

export interface GlobalNavProps {
  appName: string;
  links?: Array<{
    label: string;
    href: string;
  }>;
  onNavigate?: (href: string) => void;
}

/**
 * GlobalNav component - shared navigation bar across all Athro applications
 */
export const GlobalNav: React.FC<GlobalNavProps> = ({ 
  appName, 
  links = [],
  onNavigate 
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(href);
    } else {
      window.history.pushState({}, '', href);
      // Dispatch a navigation event that apps can listen to
      window.dispatchEvent(new CustomEvent('athro.navigation.completed', { 
        detail: { destination: href }
      }));
    }
  };

  return (
    <nav className="athro-global-nav">
      <div className="athro-global-nav-brand">
        <span>{appName}</span>
      </div>
      <ul className="athro-global-nav-links">
        {links.map((link, index) => (
          <li key={index}>
            <a 
              href={link.href}
              onClick={(e) => handleClick(e, link.href)}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};
