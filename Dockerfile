FROM node:19-alpine AS frontend-build

# Set working directory for frontend
WORKDIR /app/web

# Copy frontend package files and install dependencies
COPY web/package*.json ./
RUN npm install

# Copy frontend source files
COPY web/ ./

# Build frontend
RUN npm run build

# Use Python image for the final container
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install dependencies needed for psycopg2 and other packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install them
COPY server/python/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY server/python/ ./

# Copy the built frontend from the previous stage
COPY --from=frontend-build /app/web/build ./static

# Set environment variables
ENV FLASK_APP=serve.py
ENV FLASK_ENV=production
ENV STATIC_FOLDER=./static

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "serve:app"] 