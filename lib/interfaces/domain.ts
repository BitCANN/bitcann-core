export interface DomainRecord 
{
	domain: string;
	owner: string;
	records: Record<string, string>;
}

export enum DomainStatusType
	{
	NOT_REGISTERED = 'NOT_REGISTERED',
	UNDER_AUCTION = 'UNDER_AUCTION',
	CLAIMED = 'CLAIMED',
}
