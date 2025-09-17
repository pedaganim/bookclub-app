# Lambda Python 3.10 base image (PaddlePaddle wheels are reliably available for py3.10)
FROM public.ecr.aws/lambda/python:3.10

# Install system deps (if any minimal needed). Using manylinux wheels avoids heavy system libs.
# Install Python dependencies
COPY requirements.txt ./
RUN python -m pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy handler code
COPY handler.py ${LAMBDA_TASK_ROOT}/ocr-worker/handler.py

# Set the CMD to your handler (function name)
CMD ["ocr-worker/handler.handler"]
