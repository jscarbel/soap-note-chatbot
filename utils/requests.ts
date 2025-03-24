import { z } from 'zod';

type IdParams = Promise<{
  id: string;
}>;

export type IdParamProps = {
  params: IdParams;
};

export const IdParamProps = {
  NUMBER_ID_SCHEMA: z.object({ id: z.coerce.number() }).transform((x) => x.id),
  parseNumberId: async (params: IdParams): Promise<number> => {
    const resolvedParams = await params;
    return IdParamProps.NUMBER_ID_SCHEMA.parseAsync(resolvedParams);
  },
} as const;
