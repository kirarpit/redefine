FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go.mod and go.sum
COPY go.mod ./

# Download dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -o redefine-server

# Final stage
FROM alpine:latest

# Install required dependencies for SQLite
RUN apk --no-cache add ca-certificates libc6-compat

WORKDIR /app

# Copy the binary and prompt template
COPY --from=builder /app/redefine-server .
COPY --from=builder /app/prompts ./prompts

# Expose port
EXPOSE 5000

# Set environment variables
ENV GIN_MODE=release
ENV PORT=5000
ENV DB_PATH=/data/redefine.db

# Create a volume for persistent data
VOLUME ["/data"]

# Run the application
CMD ["./redefine-server"] 