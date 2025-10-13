// lib/prisma-edge.ts
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

export function prismaEdge() {
    return new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_URL! } },
    }).$extends(withAccelerate());
}
