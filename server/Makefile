# Compiler and flags
CXX = g++
CXXFLAGS = -std=c++11 -lpthread

# Source files
SRCS = Server.cpp Blockable.cpp socket.cpp socketserver.cpp thread.cpp

# Output binary
TARGET = server

# Default build rule
all:
	$(CXX) -o $(TARGET) $(SRCS) $(CXXFLAGS)

# Clean rule
clean:
	rm -f $(TARGET)
