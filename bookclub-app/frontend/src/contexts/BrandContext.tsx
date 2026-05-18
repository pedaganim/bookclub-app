import React, { createContext, useContext, ReactNode } from 'react';

interface BrandConfig {
  name: string;
  domain: string;
  logoStyle: 'vintage' | 'playful';
}

const BrandContext = createContext<BrandConfig | undefined>(undefined);

export const BrandProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const config: BrandConfig = {
    name: process.env.REACT_APP_BRAND_NAME || 'TownWink',
    domain: process.env.REACT_APP_DOMAIN || 'townwink.com',
    logoStyle: (process.env.REACT_APP_BRAND_NAME === 'NearBorrow' ? 'playful' : 'vintage') as any,
  };

  return (
    <BrandContext.Provider value={config}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
};
