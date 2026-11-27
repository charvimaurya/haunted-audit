# The tag must equal the pinned playwright version in requirements.txt
# (agent/tests/test_dockerfile.py checks this). Verify the tag exists on MCR.
FROM mcr.microsoft.com/playwright/python:v1.64.1-noble

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HAUNTED_AUDIT_CONTAINER=1 \
    HAUNTED_AUDIT_DB=/tmp/runs.db

RUN apt-get update \
 && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent ./agent
COPY backend ./backend
COPY night_watch ./night_watch
COPY fixtures ./fixtures
COPY docs/evidence-seed.json ./docs/evidence-seed.json
RUN mkdir -p /app/artifacts && chown -R pwuser:pwuser /app

USER pwuser
EXPOSE 8000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "exec uvicorn agent.api.main:app --host 0.0.0.0 --port ${PORT:-8000} --no-access-log"]
