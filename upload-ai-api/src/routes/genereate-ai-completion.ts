import { FastifyInstance } from "fastify";
import { z } from 'zod';
import { prisma } from "../lib/prism";
import { openai } from "../lib/openai";

export async function generateAICompletionRoute(app: FastifyInstance) {
    app.post('/ai/complete', async (req, reply) => {
        const paramsSchema = z.object({
            videoId: z.string().uuid(),
            template: z.string(),
            temperature: z.number().min(0).max(1).default(0.5),
        })

        const { videoId, template, temperature } = paramsSchema.parse(req.params);

        const video = await prisma.video.findUniqueOrThrow({
            where: {
                id: videoId,
            },
        });

        if (!video.transcription) {
            return reply.status(400).send({ error: 'Transcription not found' });
        }

        const promptMessage = template.replace('{transcription}', video.transcription);

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo-16k',
            temperature,
            messages: [
                { role: 'user', content: promptMessage }
            ],
        });

        return response;
    });
}