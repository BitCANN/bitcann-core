import type { NetworkProvider, Contract } from 'cashscript';

export interface DomainConfig {
  category: string;
  networkProvider: NetworkProvider;
  contracts: Record<string, Contract>;
  inactivityExpiryTime: number;
  platformFeeAddress: string;
  maxPlatformFeePercentage: number;
  minWaitTime: number;
}