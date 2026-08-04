FROM python:3.11-slim

WORKDIR /app

# Install PyTorch CPU first to minimize download size
RUN pip install torch==2.3.0+cpu --extra-index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN grep -v "torch" requirements.txt | pip install -r /dev/stdin

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
