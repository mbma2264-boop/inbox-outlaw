class PrismaClient {
  constructor() {
    this.emailRecord = {
      async findMany() { return []; },
      async create({ data }) { return { id: 'local-stub', ...data }; },
    };
  }
}

module.exports = { PrismaClient };
