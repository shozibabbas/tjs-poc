// lib/prisma-edge.ts
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import {prisma} from "@/lib/prisma";

let prismaEdge: () => PrismaClient;

// export function prismaEdge() {
//     return new PrismaClient({
//         datasources: { db: { url: process.env.DATABASE_URL! } },
//     }).$extends(withAccelerate());
// }

if (process.env.NODE_ENV === "development") {
    prismaEdge = function() { return prisma;}
} else {
    prismaEdge = function () {
        return new PrismaClient({
            datasources: { db: { url: process.env.DATABASE_URL! } },
        }).$extends(withAccelerate()) as unknown as PrismaClient;
    }
}

export {prismaEdge};
