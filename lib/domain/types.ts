import type { NetworkProvider, Contract, AddressType, Utxo } from 'cashscript';
import { DomainStatusType } from '../interfaces/domain';

export interface DomainConfig {
  category: string;
  networkProvider: NetworkProvider;
  contracts: Record<string, Contract>;
  inactivityExpiryTime: number;
  platformFeeAddress: string;
  maxPlatformFeePercentage: number;
  minWaitTime: number;
  options: {
    provider: NetworkProvider;
    addressType: AddressType;
  };
}

export interface CreateRecordParams {
  name: string;
  record: string;
  address: string;
}

export interface CreateClaimDomainParams {
  name: string;
}

export interface DomainInfo {
  address: string;
  contract: Contract;
  utxos: Utxo[];
  status: DomainStatusType;
}