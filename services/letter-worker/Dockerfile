FROM golang:1.24.1-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /bin/letter-worker ./cmd/worker

FROM gcr.io/distroless/static-debian12

COPY --from=builder /bin/letter-worker /letter-worker

ENTRYPOINT ["/letter-worker"]
