import { createHash } from 'crypto';

export interface ParsedRecordsInterface
{
	[namespace: string]: {
		[key: string]: string | string[] | { [subkey: string]: string | { [subsubkey: string]: string | { [subsubsubkey: string]: string | { [subsubsubsubkey: string]: string } } } } | undefined;
	};
}

export const parseRecords = (records: string[]): ParsedRecordsInterface =>
{
	const result: ParsedRecordsInterface = {};
	const revocations = new Set<string>();
	const metaRecords: { [key: string]: { type: string } } = {};

	for(const record of records)
	{
		if(!record.includes('='))
		{
			continue;
		}
		const [ key, value ] = record.split('=', 2);
		if(key === 'revoked')
		{
			revocations.add(value);
			continue;
		}
		if(key.endsWith('.meta'))
		{
			const baseKey = key.slice(0, -5);
			metaRecords[baseKey] = { type: value.replace('type:', '') };
		}
	}

	for(const record of records)
	{
		if(!record.includes('='))
		{
			continue;
		}
		const [ key, value ] = record.split('=', 2);
		if(key === 'revoked' || key.endsWith('.meta'))
		{
			continue;
		}

		const hash = createHash('sha256').update(record)
			.digest('hex');
		if(revocations.has(hash))
		{
			continue;
		}

		const keyParts = key.split('.');
		const namespace = keyParts[0];
		const isIndexed = /^\d+$/.test(keyParts[keyParts.length - 1]);
		const baseSubKey = isIndexed ? keyParts.slice(1, -1).join('.') : keyParts.slice(1).join('.');
		const metaKey = `${namespace}.${baseSubKey}.meta`;

		const metaType = metaRecords[`${namespace}.${baseSubKey}`]?.type;
		if(metaType)
		{
			const metaHash = createHash('sha256').update(`${metaKey}=type:${metaType}`)
				.digest('hex');
			if(revocations.has(metaHash))
			{
				continue;
			}
		}

		if(!result[namespace])
		{
			result[namespace] = {};
		}

		let current = result[namespace];
		const subKeys = isIndexed ? keyParts.slice(1, -1) : keyParts.slice(1);
		for(let i = 0; i < subKeys.length - (isIndexed ? 1 : 0); i++)
		{
			const subKey = subKeys[i].toLowerCase();
			if(i === subKeys.length - 1 && !isIndexed && !metaType)
			{
				current[subKey] = value;
			}
			else
			{
				if(!current[subKey])
				{
					current[subKey] = {};
				}
				current = current[subKey] as { [key: string]: any };
			}
		}

		const meta = metaRecords[`${namespace}.${baseSubKey}`];
		if(meta?.type === 'text' && isIndexed)
		{
			let target = result[namespace];
			for(let i = 0; i < subKeys.length - 1; i++)
			{
				target = target[subKeys[i].toLowerCase()] as { [key: string]: any };
			}
			const lastSubKey = subKeys[subKeys.length - 1].toLowerCase();
			if(!target[lastSubKey])
			{
				target[lastSubKey] = [];
			}
			(target[lastSubKey] as string[])[parseInt(keyParts[keyParts.length - 1])] = value;
		}
		else if(meta?.type === 'array' && isIndexed)
		{
			let target = result[namespace];
			for(let i = 0; i < subKeys.length - 1; i++)
			{
				target = target[subKeys[i].toLowerCase()] as { [key: string]: any };
			}
			const lastSubKey = subKeys[subKeys.length - 1].toLowerCase();
			if(!target[lastSubKey])
			{
				target[lastSubKey] = [];
			}
			(target[lastSubKey] as string[])[parseInt(keyParts[keyParts.length - 1])] = value;
		}
		else if(meta?.type === 'array' && !isIndexed && subKeys.length === 1)
		{
			const lastSubKey = subKeys[0].toLowerCase();
			if(!result[namespace][lastSubKey])
			{
				result[namespace][lastSubKey] = [];
			}
			(result[namespace][lastSubKey] as string[]).push(value);
		}
		else if(!isIndexed && !metaType)
		{
			let target = result[namespace];
			for(let i = 0; i < subKeys.length - 1; i++)
			{
				target = target[subKeys[i].toLowerCase()] as { [key: string]: any };
			}
			const lastSubKey = subKeys[subKeys.length - 1].toLowerCase();
			target[lastSubKey] = value;
		}
	}

	for(const namespace in result)
	{
		const processSubKeys = (obj: { [key: string]: any }, prefix: string): void =>
		{
			for(const subKey in obj)
			{
				const fullKey = prefix ? `${prefix}.${subKey}` : subKey;
				const meta = metaRecords[`${namespace}.${fullKey}`];
				if(meta?.type === 'text' && Array.isArray(obj[subKey]))
				{
					obj[subKey] = (obj[subKey] as string[])
						.filter((v): v is string => v != null)
						.join(' ');
				}
				else if(Array.isArray(obj[subKey]))
				{
					obj[subKey] = (obj[subKey] as string[]).filter((v): v is string => v != null);
				}
				else if(typeof obj[subKey] === 'object' && !Array.isArray(obj[subKey]))
				{
					processSubKeys(obj[subKey], fullKey);
				}
			}
		};
		processSubKeys(result[namespace], '');
	}

	return result;
};
