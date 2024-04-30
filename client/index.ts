import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { config } from 'dotenv';
import recorder from 'node-record-lpcm16';

config();

const PROTO_PATH = 'audio_transcriber.proto';
const TARGET = process.env.TARGET;
const PORT = process.env.PORT || 50051;

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const audio_transcriber_proto: any =
  grpc.loadPackageDefinition(packageDefinition);

async function main() {
  let target: string = '127.0.0.1:50051';
  let credentials = grpc.credentials.createInsecure();

  if (TARGET && PORT) {
    target = `${TARGET}:${PORT}`;
    credentials = grpc.credentials.createSsl();
  }

  console.log(`Using target: ${target}`);

  const client = new audio_transcriber_proto.AudioTranscriberService(
    target,
    credentials,
  );
  const call = client.TranscribeAudio();
  const streamStartTime = Date.now();

  call.on('data', (response: any) => {
    const { transcription, start_time, end_time } = response;
    const streamDuration = Date.now() - streamStartTime;
    console.log(`Transcription: ${transcription}`);
    console.log(`Chunk duration: ${(end_time - start_time).toFixed(2)} s`);
    console.log(`Time since start: ${(streamDuration / 1000).toFixed(2)} s`);
    console.log('---');
  });
  call.on('end', () => {
    console.log('Server finished sending transcript segments.');
  });

  call.on('error', (err: any) => {
    console.error('Error:', err);
  });

  const recording = recorder.record({
    sampleRateHertz: 16000,
    threshold: 0,
    verbose: false,
    recordProgram: 'rec',
    silence: '10.0',
  });

  recording.stream().on('data', (chunk: Buffer) => {
    call.write({ audio_data: chunk });
  });

  recording.stream().on('end', () => {
    console.log('Audio stream ended.');
    call.end();
  });

  console.log('Recording started. Press Ctrl+C to stop.');
  process.on('SIGINT', () => {
    console.log('Stopping recording...');
    recording.stop();
  });
}

void main();
