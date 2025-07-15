# --- Build Stage ---
FROM golang:1.24.5-alpine AS builder

WORKDIR /app

# Install git for go mod
RUN apk add --no-cache git

# Copy go mod and sum files
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o backend main.go

# --- Run Stage ---
FROM alpine:latest

WORKDIR /app

# Copy the built binary from the builder
COPY --from=builder /app/backend .

# Expose the default port
EXPOSE 8080

# Set environment variables (can be overridden at runtime)
ENV DB_HOST=127.0.0.1 \
    DB_PORT=3306 \
    DB_USER=web-crawler-user \
    DB_PASSWORD=web-crawler-password \
    DB_NAME=web-crawler 

# Run the application
CMD ["./backend"]