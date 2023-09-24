import { api } from "@/lib/axios";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { FileVideo, Upload } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success' | 'error';

const statusMessages = {
    waiting: 'Aguardando...,',
    converting: 'Convertendo...',
    uploading: 'Enviando...',
    generating: 'Gerando...',
    success: 'Sucesso!',
    error: 'Erro!',
}

interface VideoInputFormProps {
    onVideoUploaded: (id: string) => void;
}

export function VideoInputForm(props: VideoInputFormProps) {

    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [status, setStatus] = useState<Status>('waiting');
    const promptInputRef = useRef<HTMLTextAreaElement>(null);

    const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
        const { files } = event.currentTarget;

        if (!files) return;

        const selectedFile = files[0];
        setVideoFile(selectedFile);
    }

    const convertVideoToAudio = async (video: File) => {
        console.log('Convert started...');

        const ffmpeg = await getFFmpeg();

        await ffmpeg.writeFile('input.mp4', await fetchFile(video))

        // remove comment to see ffmpeg logs / errors
        // ffmpeg.on('log', log => {
        //     console.log(log);
        // });

        ffmpeg.on('progress', progress => {
            console.log('Convert progress: ' + Math.round(progress.progress * 100) + '%' + ' done');
        });

        await ffmpeg.exec([
            '-i',
            'input.mp4',
            '-map',
            '0:a',
            '-b:a',
            '20k',
            '-acodec',
            'libmp3lame',
            'output.mp3'
        ])

        const data = await ffmpeg.readFile('output.mp3');

        const audioFileBlob = new Blob([data], { type: 'audio/mpeg' });
        const audioFile = new File([audioFileBlob], 'audio.mp3', {
            type: 'audio/mpeg'
        });

        console.log('Convert finished!');
        return audioFile;
    }

    const handleUploadVideo = async (event: FormEvent<HTMLFormElement>) => {
        console.log('Upload started...', event);
        event.preventDefault();

        try {
            const prompt = promptInputRef.current?.value;

            if (!videoFile) return;

            console.log('Converting...');
            setStatus('converting');

            const audioFile = await convertVideoToAudio(videoFile);

            console.log(audioFile, prompt);

            const data = new FormData();

            data.append('file', audioFile);

            console.log('Uploading...', data);
            setStatus('uploading');


            const response = await api.post('/videos', data);
            console.log(response.data);
            const videoId = response.data.video.id;

            console.log('Genarating...', data);
            setStatus('generating');

            await api.post(`/videos/${videoId}/transcription`, {
                prompt
            });

            setStatus('success');
            console.log('Transcription created!');
            props.onVideoUploaded(videoId);
        } catch (error) {
            console.log(error);
            setTimeout(() => {
                setStatus('error');
            }, 10000);
            setStatus('waiting');
        }
    }

    const previewURL = useMemo(() => {
        if (!videoFile) return null;

        return URL.createObjectURL(videoFile);
    }, [videoFile]);

    return (
        <form onSubmit={handleUploadVideo} className='space-y-6'>
            <label
                htmlFor="video"
                className='relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5'>
                {previewURL ? (
                    <video src={previewURL} controls={false} className='pointer-events-none absolute inset-0' />
                ) : (
                    <>
                        <FileVideo />
                        Selecione um video
                    </>
                )}
            </label>

            <input type="file" id='video' accept='video/mp4' className='sr-only' onChange={handleFileSelected} />

            <Separator />

            <div className='space-y-1'>
                <Label htmlFor='transcription_prompt'>Prompt de transcrição</Label>
                <Textarea
                    ref={promptInputRef}
                    disabled={status !== 'waiting'}
                    id="transcription_prompt"
                    className='h-20 leading-relaxed resize-none'
                    placeholder='Inclua palavras chaves mencionadas no vídeo separadas por vírgula (,)' />
            </div>

            <Button
                data-success={status === 'success'}
                data-error={status === 'error'}
                disabled={status !== 'waiting' || !videoFile}
                type='submit'
                className='w-full data-[success=true]:bg-emerald-400 data-[error=true]:bg-red-600'>
                {status === 'waiting' ? (
                    <>
                        Carregar vídeo
                        <Upload className="w-4 h-4 ml-2" />
                    </>
                ) : statusMessages[status]}
            </Button>
        </form>
    )
}