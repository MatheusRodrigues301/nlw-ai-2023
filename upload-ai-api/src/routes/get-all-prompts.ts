import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

export async function getAllPromptsRoute(app: FastifyInstance) {
    app.get('/prompts', async () => {
        return await prisma.prompt.findMany();
    });
}