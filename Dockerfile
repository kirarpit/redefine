# ----------- Frontend Build Stage -----------
FROM node:20-alpine AS frontend-build
WORKDIR /app/web

# Use pnpm for better memory efficiency
COPY web/package.json web/pnpm-lock.yaml ./
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy frontend source files
COPY web/ ./

# Build frontend with production optimization
RUN pnpm run build

# ----------- Backend Build Stage (pure Go, no CGO) -----------
FROM golang:1.23-alpine AS backend-build
WORKDIR /app/server

# Disable CGO for a smaller, more memory-efficient binary
ENV CGO_ENABLED=0

# Copy go.mod and go.sum
COPY server/go/go.mod ./

# Download dependencies
RUN go mod download

# Copy the source code
COPY server/go/ ./

# Build the application with optimizations for size
RUN GOOS=linux go build -ldflags="-s -w" -o redefine-server

# ----------- Final Monolithic Image -----------
FROM alpine:latest
WORKDIR /app

# Install only essential dependencies
RUN apk --no-cache add ca-certificates tzdata

# Create a non-root user and group
RUN addgroup --gid 1000 appgroup && adduser --uid 1000 --ingroup appgroup --disabled-password appuser

ENV TZ="UTC"

COPY --from=backend-build /app/server/redefine-server .
COPY --from=backend-build /app/server/prompts ./prompts
COPY --from=backend-build /app/server/autosuggest/data ./autosuggest/data
COPY --from=frontend-build /app/web/build ./static

# Create data directory and set proper permissions
RUN mkdir -p /data && \
    chown -R appuser:appgroup /data /app

EXPOSE 5000

ENV GIN_MODE=release
ENV PORT=5000
ENV DB_PATH=/data/redefine.db

# Create a volume for persistent data
VOLUME ["/data"]

# Switch to non-root user
USER appuser:appgroup

# Command to run the application
CMD ["./redefine-server"] 