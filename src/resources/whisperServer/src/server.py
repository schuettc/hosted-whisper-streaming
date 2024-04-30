import grpc
from concurrent import futures
import audio_transcriber_pb2
import audio_transcriber_pb2_grpc
from transcriber import AudioTranscriberServicer
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class HealthCheckServicer(audio_transcriber_pb2_grpc.HealthCheckServiceServicer):
    def Check(self, request, context):
        return audio_transcriber_pb2.HealthCheckResponse(status_code=12)


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    audio_transcriber_pb2_grpc.add_AudioTranscriberServiceServicer_to_server(
        AudioTranscriberServicer(), server
    )
    audio_transcriber_pb2_grpc.add_HealthCheckServiceServicer_to_server(
        HealthCheckServicer(), server
    )
    server.add_insecure_port("[::]:50051")
    server.start()
    logger.info("Server started. Listening on port 50051.")
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
