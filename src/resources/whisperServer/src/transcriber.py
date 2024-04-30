import datetime
import numpy as np
from faster_whisper import WhisperModel
import audio_transcriber_pb2
import audio_transcriber_pb2_grpc
import webrtcvad
import logging

logger = logging.getLogger(__name__)


class AudioTranscriberServicer(
    audio_transcriber_pb2_grpc.AudioTranscriberServiceServicer
):
    def __init__(self):
        self.model_size = "large-v2"
        self.model = WhisperModel(
            self.model_size, device="cuda", compute_type="float16"
        )
        logger.info("Loaded Whisper model.")

        # Warmup the model
        logger.info("Warming up the model...")
        _ = self.model.transcribe(np.zeros(16000, dtype=np.int16), beam_size=5)
        logger.info("Model warmup completed.")

    def TranscribeAudio(self, request_iterator, context):
        logger.info("Transcription request received.")
        audio_frames = []
        chunk_count = 0
        stream_start_time = None
        speech_start_time = None

        # Initialize VAD
        vad = webrtcvad.Vad(mode=3)  # Aggressive mode
        sample_rate = 16000
        frame_duration = 30  # ms
        frame_length = int(sample_rate * frame_duration / 1000)
        min_duration = 1  # Minimum duration of audio to process (in seconds)

        for audio_request in request_iterator:
            audio_data = audio_request.audio_data
            if stream_start_time is None:
                stream_start_time = datetime.datetime.now()

            logger.debug(f"Received audio data. Length: {len(audio_data)}")

            offset = 0
            while offset + frame_length * 2 <= len(audio_data):
                frame = audio_data[offset : offset + frame_length * 2]
                offset += frame_length * 2

                is_speech = vad.is_speech(frame, sample_rate)
                logger.debug(f"Frame length: {len(frame)}, Is speech: {is_speech}")

                if is_speech:
                    if speech_start_time is None:
                        speech_start_time = datetime.datetime.now()
                    audio_frames.append(frame)
                else:
                    if len(audio_frames) > 0:
                        audio_chunk = b"".join(audio_frames)
                        chunk_duration = len(audio_chunk) / (
                            sample_rate * 2
                        )  # Assuming 16-bit audio
                        logger.debug(f"Chunk duration: {chunk_duration:.2f} seconds")

                        if chunk_duration >= min_duration:
                            chunk_count += 1
                            logger.info(
                                f"Processing buffered audio chunk {chunk_count}..."
                            )

                            audio_chunk = np.frombuffer(audio_chunk, dtype=np.int16)
                            segments, _ = self.model.transcribe(
                                audio_chunk, beam_size=5
                            )

                            for segment in segments:
                                logger.info(
                                    f"Transcription (start_time={speech_start_time}, end_time={datetime.datetime.now()}): {segment.text}"
                                )
                                yield audio_transcriber_pb2.TranscriptionResponse(
                                    transcription=segment.text,
                                    start_time=speech_start_time.timestamp(),
                                    end_time=datetime.datetime.now().timestamp(),
                                )

                            speech_start_time = None

                        audio_frames.clear()

        # Process any remaining audio frames
        if len(audio_frames) > 0:
            audio_chunk = b"".join(audio_frames)
            chunk_duration = len(audio_chunk) / (
                sample_rate * 2
            )  # Assuming 16-bit audio
            logger.debug(f"Remaining chunk duration: {chunk_duration:.2f} seconds")

            if chunk_duration >= min_duration:
                chunk_count += 1
                logger.info(
                    f"Processing remaining buffered audio chunk {chunk_count}..."
                )

                audio_chunk = np.frombuffer(audio_chunk, dtype=np.int16)
                segments, _ = self.model.transcribe(audio_chunk, beam_size=5)

                chunk_start_time = speech_start_time
                chunk_end_time = speech_start_time + datetime.timedelta(
                    seconds=chunk_duration
                )

                for segment in segments:
                    logger.info(
                        f"Transcription (start_time={chunk_start_time}, end_time={chunk_end_time}): {segment.text}"
                    )
                    yield audio_transcriber_pb2.TranscriptionResponse(
                        transcription=segment.text,
                        start_time=chunk_start_time.timestamp(),
                        end_time=chunk_end_time.timestamp(),
                    )

        logger.info("Transcription request completed.")
