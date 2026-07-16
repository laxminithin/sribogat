const { PrismaClient } = require('@prisma/client');

let prisma;

if (!global.__kissanbandiPrisma) {
  global.__kissanbandiPrisma = new PrismaClient();
}

prisma = global.__kissanbandiPrisma;

module.exports = prisma;
