# Lambda Python 3.11 base image
FROM public.ecr.aws/lambda/python:3.11

# Install system deps (if any minimal needed). Using manylinux wheels avoids heavy system libs.
# Install Python dependencies
COPY requirements.txt ./
RUN python -m pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy handler code
COPY handler.py ${LAMBDA_TASK_ROOT}/ocr-worker/handler.py

# Set the CMD to your handler (function name)
CMD ["ocr-worker/handler.handler"]
