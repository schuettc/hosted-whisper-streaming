FROM --platform=linux/amd64 nvidia/cuda:12.2.2-cudnn8-runtime-ubuntu22.04 AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3.10-dev python3-pip python3.10-venv libsndfile1 build-essential curl git  && \
    rm -rf /var/lib/apt/lists/*

FROM base AS builder

COPY src/requirements.txt ./

RUN pip3 install --upgrade pip setuptools wheel && \
    pip3 install --user -r requirements.txt && \
    pip3 install --user git+https://github.com/openai/whisper.git

FROM base
ENV MODEL=${MODEL}
ENV LOG_LEVEL=${LOG_LEVEL}

COPY --from=builder /root/.local /root/.local
COPY src/* ./
RUN chmod +x /entrypoint.sh

EXPOSE 50051

ENTRYPOINT ["/entrypoint.sh"]
