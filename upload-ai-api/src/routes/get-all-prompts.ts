import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prism";

export async function getAllPromptsRoute(app: FastifyInstance) {
    app.get('/prompts', async () => {
        return await prisma.prompt.findMany();
    });
}