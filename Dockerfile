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

# Use Go image for backend build
FROM golang:1.21-alpine AS backend-build

# Set working directory for backend
WORKDIR /app/server

# Copy go.mod and go.sum
COPY server/go/go.mod ./

# Download dependencies
RUN go mod download

# Copy the source code
COPY server/go/ ./

# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -o redefine-server

# Final stage
FROM alpine:latest

# Install required dependencies for SQLite
RUN apk --no-cache add ca-certificates libc6-compat

WORKDIR /app

# Copy the binary and prompt template from backend build
COPY --from=backend-build /app/server/redefine-server .
COPY --from=backend-build /app/server/prompts ./prompts

# Copy the built frontend from the frontend build stage
COPY --from=frontend-build /app/web/build ./static

# Expose port
EXPOSE 5000

# Set environment variables
ENV GIN_MODE=release
ENV PORT=5000
ENV DB_PATH=/data/redefine.db

# Create a volume for persistent data
VOLUME ["/data"]

# Command to run the application
CMD ["./redefine-server"] 