FROM python:3.12.7-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    STACKSTEAD_DATA_DIR=/data

WORKDIR /app

ARG APP_UID=1000
ARG APP_GID=1000

RUN addgroup --system --gid "${APP_GID}" stackstead \
    && adduser --system --uid "${APP_UID}" --ingroup stackstead --home /app stackstead \
    && mkdir -p /data \
    && chown stackstead:stackstead /data

COPY requirements.txt ./
RUN pip install --no-cache-dir --requirement requirements.txt

COPY --chown=stackstead:stackstead app ./app
COPY --chown=stackstead:stackstead reporters ./reporters

USER stackstead
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=3)"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers", "--forwarded-allow-ips", "*"]
