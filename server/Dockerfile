# Use a lightweight base image with build tools
FROM ubuntu:22.04

# Install required packages
RUN apt update && \
    DEBIAN_FRONTEND=noninteractive apt install -y \
    build-essential \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy server source code into container
COPY . .

# Build the server using Makefile
RUN make

# Expose the server port (must match the one in your C++ code)
EXPOSE 8000

# Run the compiled server binary
CMD ["./server"]
