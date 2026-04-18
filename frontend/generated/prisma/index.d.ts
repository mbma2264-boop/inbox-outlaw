export declare class PrismaClient {
  emailRecord: {
    findMany: () => Promise<unknown[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
  };
}
