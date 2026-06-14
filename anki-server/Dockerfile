FROM python:3.13-slim

WORKDIR /app

RUN pip install --no-cache-dir anki==25.9.4

COPY server.py .

ENV ANKI_SERVER_HOST=0.0.0.0
ENV ANKI_SERVER_PORT=18765
ENV ANKI_COLLECTION_PATH=/data/collection.anki2

EXPOSE 18765

VOLUME ["/data"]

CMD ["python", "server.py"]
