FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Railway injects PORT; must use shell so $PORT is expanded (not literal ${PORT} in exec CMD)
CMD ["/app/start.sh"]
