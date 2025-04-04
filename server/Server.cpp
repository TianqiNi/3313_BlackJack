#include "socketserver.h"
#include <thread>
#include "thread.h"
#include <iostream>
#include <vector>
#include <memory>
#include "Semaphore.h"
#include <algorithm>
#include <random>
#include "Blockable.h"
#include "SharedObject.h"
#include <string>
#include <list>
#include <algorithm>
#include <cstdlib>
#include <ctime>
#include <csignal>
#include <unistd.h>

using namespace Sync;

int activeRoomCount = 0;

std::vector<int> availableRoomIds = {2, 1, 0};

struct TableData
{
    int dealerHand[10];
    int playerHand[10];
    int dealerHandSize = 0; // Track number of cards in dealer's hand
    int playerHandSize = 0; // Track number of cards in player's hand
};

struct MyShared
{
    TableData table[3]; // Fixed-size array
};

class Dealer
{
private:
    std::vector<int> hand = std::vector<int>(10);

    // Additional functionality for dealer actions
public:
    Dealer() {}

    ~Dealer() {}

    // send card
    void deal(int (&dealerHand)[10])
    {
        std::copy(std::begin(dealerHand), std::end(dealerHand), this->hand.begin());
    }

    // used for calculayte the hand card
    int calculateHandTotal()
    {
        int total = 0;
        int aceCount = 0;

        for (int card : this->hand)
        {
            if (card == 11)
            {
                aceCount++;
            }
            total += card;
        }

        while (total > 21 && aceCount > 0)
        {
            total -= 10;
            aceCount--;
        }

        return total;
    }
};

class Player
{
private:
    std::vector<int> playerHand = std::vector<int>(10);
    std::vector<int> dealerHand = std::vector<int>(10);
    Socket socket;
    bool hitFlag = false;
    bool explode = false;
    bool isContinue = true;
    int roomId;
    ThreadSem socketWrite;

    // Additional functionality for dealer actions
public:
    Player(Socket socket, int roomId) : socket(socket), roomId(roomId), socketWrite(1)
    {
        this->roomId = roomId;
        this->socket = socket;
    }

    ~Player() {}

    bool getHitFlag()
    {
        return hitFlag;
    }

    bool getExplode()
    {
        return explode;
    }

    void setExplode(bool explode)
    {
        this->explode = explode;
    }

    void setHitFlag(bool hit)
    {
        this->hitFlag = hit;
    }

    void askHit()
    {
        socketWrite.Wait();
        std::cout << "[DEBUG] Sending hit/stand prompt..." << std::endl;

        ByteArray data("Do you want to hit or stand?\n");
        socket.Write(data);

        // Wait for response
        while (true)
        {
            // Wait for response
            ByteArray receivedData;
            std::cout << "[DEBUG] Waiting for hit/stand..." << std::endl;
            socket.Read(receivedData);
            std::string received(receivedData.v.begin(), receivedData.v.end());

            received.erase(std::remove(received.begin(), received.end(), '\n'), received.end());
            received.erase(std::remove(received.begin(), received.end(), '\r'), received.end());

            std::cout << "[DEBUG] Got response: [" << received << "]" << std::endl;

            if (received == "hit")
            {
                hitFlag = true;
                socketWrite.Signal();
                break;
            }
            else if (received == "stand")
            {
                hitFlag = false;
                socketWrite.Signal();
                break;
            }
            else
            {
                socketWrite.Wait();
                ByteArray error("Invalid input, please try again.\n");
                socket.Write(error);
                socket.Read(receivedData);
                std::string ack(receivedData.v.begin(), receivedData.v.end());
                ack.erase(std::remove(ack.begin(), ack.end(), '\n'), ack.end());
                ack.erase(std::remove(ack.begin(), ack.end(), '\r'), ack.end());
                if (ack == "ack")
                {
                    socketWrite.Signal();
                }
            }
        }
    }

    bool getContinue()
    {

        return this->isContinue;
    }

    void readHand(int dealer[], int player[], int dealerHandSize, int playerHandSize)
    {
        // playerHand will have the playerHand on shared memory
        std::copy_n(dealer, dealerHandSize, dealerHand.begin());
        std::copy_n(player, playerHandSize, playerHand.begin());

        std::string handStr;
        std::cout << "[DEBUG] Sending hand data:\n"
                  << handStr << std::endl;
        handStr += "Dealer's hand:\n";
        for (int i = 0; i < dealerHandSize; ++i)
        {
            handStr += std::to_string(dealerHand[i]) + " ";
        }
        handStr += "\nPlayer's hand:\n";
        for (int i = 0; i < playerHandSize; ++i)
        {
            handStr += std::to_string(playerHand[i]) + " ";
        }

        handStr += "\nYour total is: " + std::to_string(calculateHandTotal()) + "\n";

        socketWrite.Wait();
        ByteArray data(handStr);
        socket.Write(data);

        ByteArray receivedData;
        socket.Read(receivedData);

        std::string ack(receivedData.v.begin(), receivedData.v.end());
        ack.erase(std::remove(ack.begin(), ack.end(), '\n'), ack.end());
        ack.erase(std::remove(ack.begin(), ack.end(), '\r'), ack.end());

        std::cout << "[DEBUG] readHand ACK: [" << ack << "]\n";
        if (ack == "ack")
        {
            socketWrite.Signal();
        }
    }

    void askContinue()
    {
        ByteArray data("Do you want to continue playing? (yes or no)");
        socket.Write(data);

        ByteArray receivedData;
        socket.Read(receivedData); // Read whatever comes back
        std::string response(receivedData.v.begin(), receivedData.v.end());

        // Split into parts
        response.erase(std::remove(response.begin(), response.end(), '\n'), response.end());
        response.erase(std::remove(response.begin(), response.end(), '\r'), response.end());

        std::cout << "[DEBUG] Received raw continue response: [" << response << "]\n";

        if (response == "ack")
        {
            // wait for the next input
            socket.Read(receivedData);
            response = std::string(receivedData.v.begin(), receivedData.v.end());
            response.erase(std::remove(response.begin(), response.end(), '\n'), response.end());
            response.erase(std::remove(response.begin(), response.end(), '\r'), response.end());
        }

        std::cout << "[DEBUG] Final continue input: [" << response << "]\n";

        if (response == "yes")
        {
            isContinue = true;
            socketWrite.Signal(); // ensure we unlock if needed
        }
        else if (response == "no")
        {
            isContinue = false;
            socketWrite.Signal(); // ensure we unlock if needed
        }
    }

    void sendWinner(std::string message)
    {
        for (int i = 0; i < 10; i++)
        {
            playerHand[i] = 0;
            dealerHand[i] = 0;
        }
        // socketWrite.Wait();
        socket.Write(message);
        ByteArray receivedData;
        socket.Read(receivedData);
        std::string ack(receivedData.v.begin(), receivedData.v.end());
        if (ack == "ack")
        {
            socketWrite.Signal();
        }
    }

    void closeConnection()
    {

        socket.Close();
    }

    // calculate the all hand card
    int calculateHandTotal()
    {
        int total = 0;
        int aceCount = 0;

        for (int card : playerHand)
        {
            if (card == 11)
            {
                aceCount++;
            }
            total += card;
        }

        // Adjust Aces from 11 to 1 if total > 21
        while (total > 21 && aceCount > 0)
        {
            total -= 10; // 11 -> 1
            aceCount--;
        }

        return total;
    }
};

class Spectator
{
private:
    std::vector<int> playerHand = std::vector<int>(10);
    std::vector<int> dealerHand = std::vector<int>(10);
    Socket socket;
    int roomId;
    ThreadSem socketWrite;
    // Additional functionality for dealer actions
public:
    Spectator(Socket socket) : socket(socket), socketWrite(1)
    {
        this->socket = socket;
    }

    ~Spectator() {}

    Socket getSocket()
    {
        return this->socket;
    }

    int getRoomId()
    {
        return this->roomId;
    }

    void send(int *dealer, int *player, int dealerHandSize, int playerHandSize)
    {
        std::copy_n(dealer, dealerHandSize, dealerHand.begin());
        std::copy_n(player, playerHandSize, playerHand.begin());
        std::string sendData = "Dealer's Hand:\n";
        for (int i = 0; i < dealerHandSize; i++)
        {
            sendData += std::to_string(dealerHand[i]) + " ";
        }
        sendData += "\nPlayer's Hand: \n";
        for (int i = 0; i < playerHandSize; i++)
        {
            sendData += std::to_string(playerHand[i]) + " ";
        }

        std::cout << "[Spectator] Sending hand to spectator:\n"
                  << sendData << std::endl;
        socketWrite.Wait();
        ByteArray data(sendData);
        socket.Write(data);
        std::cout << "[Spectator] Waiting for ACK...\n";
        ByteArray receivedData;
        socket.Read(receivedData);
        std::string ack(receivedData.v.begin(), receivedData.v.end());
        std::cout << "[Spectator] Received ACK: [" << ack << "]\n";
        if (ack == "ack")
        {
            socketWrite.Signal();
        }
    }

    void setRoomId(int roomId)
    {
        this->roomId = roomId;
    }

    void askRoom()
    {
        // since when the room achieve 3, then it will assign the new comeer be the spectator
        socketWrite.Wait();
        ByteArray data("Which room do you want to join? (1, 2, or 3)");
        socket.Write(data);
        ByteArray receivedData;
        socket.Read(receivedData);
        std::string ack(receivedData.v.begin(), receivedData.v.end());
        if (ack == "ack")
        {
            socketWrite.Signal();
        }
    }

    void sendWinner(std::string message)
    {
        socketWrite.Wait();
        socket.Write(message);
        ByteArray receivedData;
        socket.Read(receivedData);
        std::string ack(receivedData.v.begin(), receivedData.v.end());
        if (ack == "ack")
        {
            socketWrite.Signal();
        }
    }
};

// Define a simple GameRoom class inheriting from Thread
class GameRoom : public Thread
{
public:
    // main field
    int roomId;
    Dealer *gameDealer = new Dealer();
    Player *gamePlayer;
    bool continueFlag;
    std::vector<Spectator *> spectators;
    std::vector<std::vector<int>> deck;

    // create semaphore for read and write
    Semaphore *write;
    Semaphore *read;

    GameRoom(int roomId, Player *player, Semaphore *write, Semaphore *read) : Thread(), gamePlayer(player), roomId(roomId), write(write), read(read)
    {
        this->gamePlayer = player;
        initializeDeck();
        this->roomId = roomId;
        this->write = write;
        this->read = read;
    }

    ~GameRoom() {}

    void addSpec(Spectator *newSpec)
    {
        spectators.push_back(newSpec);

        // Immediately send current game state to this new spectator
        try
        {
            Shared<MyShared> shared("sharedMemory");
            TableData &table = shared->table[roomId];

            newSpec->send(
                table.dealerHand,
                table.playerHand,
                table.dealerHandSize,
                table.playerHandSize);
            std::cout << "[DEBUG] Sent initial state to spectator\n";
        }
        catch (...)
        {
            std::cerr << "[ERROR] Failed to send initial state to spectator\n";
        }
    }

    // Initializes and shuffles the deck
    void initializeDeck()
    {
        deck.clear();
        deck.resize(4, std::vector<int>(13)); // Pre-fill each suit with space for 13 cards

        // Create a flat deck of 52 cards
        std::vector<int> flatDeck(52);
        int card = 0;
        // Fill the flat deck with card values
        for (int i = 0; i < 4; ++i)
        {
            for (int j = 2; j <= 14; ++j, ++card)
            {                                        // Use 11 for Jack, 12 for Queen, 13 for King, 14 for Ace
                flatDeck[card] = (j <= 10) ? j : 10; // Face cards (Jack, Queen, King) are valued at 10, Ace initially as 11
                if (j == 14)
                    flatDeck[card] = 11; // Ace
            }
        }

        // Shuffle the flat deck
        std::shuffle(flatDeck.begin(), flatDeck.end(), std::default_random_engine(static_cast<unsigned int>(std::time(nullptr))));

        // Distribute the shuffled cards back into the suits
        for (int i = 0; i < 52; ++i)
        {
            deck[i % 4][i / 4] = flatDeck[i];
        }
    }

    void dealCard(std::vector<std::vector<int>> &deck, int hand[], int &handSize)
    {
        hand[handSize] = deck[0][deck[0].size() - 1];
        deck[0].pop_back();
        handSize++;
    }

    virtual long ThreadMain(void) override
    {
        try
        {
            continueFlag = true;
            bool roundOver = false;

            while (continueFlag == true)
            {
                roundOver = false;
                Shared<MyShared> sharedMemory("sharedMemory");
                std::cout << "Starting a new game..." << std::endl;
                // initialize two card to the shared memory

                this->initializeDeck();
                gamePlayer->setExplode(false);
                write->Wait();
                for (int i = 0; i < 10; i++)
                {
                    sharedMemory->table[roomId].dealerHand[i] = 0;
                    sharedMemory->table[roomId].playerHand[i] = 0;
                }
                sharedMemory->table[roomId].dealerHandSize = 0;
                sharedMemory->table[roomId].playerHandSize = 0;
                for (int i = 0; i < 2; ++i)
                {
                    dealCard(deck, sharedMemory->table[roomId].dealerHand, sharedMemory->table[roomId].dealerHandSize);
                    dealCard(deck, sharedMemory->table[roomId].playerHand, sharedMemory->table[roomId].playerHandSize);
                }
                read->Signal();
                read->Wait();
                gameDealer->deal(sharedMemory->table[roomId].dealerHand);

                if (spectators.size() != 0)
                {
                    for (auto *spectator : spectators)
                    {
                        spectator->send(sharedMemory->table[roomId].dealerHand, sharedMemory->table[roomId].playerHand, sharedMemory->table[roomId].dealerHandSize, sharedMemory->table[roomId].playerHandSize);
                    }
                }
                gamePlayer->readHand(sharedMemory->table[roomId].dealerHand, sharedMemory->table[roomId].playerHand, sharedMemory->table[roomId].dealerHandSize, sharedMemory->table[roomId].playerHandSize);

                write->Signal();
                // player hit the card
                while (true)
                {
                    Shared<MyShared> shared("sharedMemory");
                    gamePlayer->askHit();

                    if (gamePlayer->getHitFlag() == true)
                    {
                        write->Wait();
                        dealCard(deck, shared->table[roomId].playerHand, shared->table[roomId].playerHandSize);
                        read->Signal();
                        read->Wait();
                        if (spectators.size() != 0)
                        {
                            for (auto *spectator : spectators)
                            {
                                spectator->send(shared->table[roomId].dealerHand, shared->table[roomId].playerHand, shared->table[roomId].dealerHandSize, shared->table[roomId].playerHandSize);
                            }
                        }

                        gamePlayer->readHand(shared->table[roomId].dealerHand, shared->table[roomId].playerHand, shared->table[roomId].dealerHandSize, shared->table[roomId].playerHandSize);

                        write->Signal();

                        if (gamePlayer->calculateHandTotal() > 21)
                        {
                            gamePlayer->setExplode(true);
                            roundOver = true;
                            break;
                        };
                    }
                    else if (gamePlayer->getHitFlag() == false)
                    {
                        break;
                    };
                }

                if (!roundOver)
                {
                    // dealer begin hit the card
                    while (true)
                    {
                        if ((!gamePlayer->getExplode() && gameDealer->calculateHandTotal() < 17))
                        {
                            // if dealer satisfy the condition then add card to shared memory
                            // shared->dealerHand1.push_back(deck[rand() % 4][rand() % 13]);
                            Shared<MyShared> shared("sharedMemory");
                            write->Wait();
                            // shared->table[0].dealerHand[shared->table[0].dealerHandSize] = 3; // Add a card (e.g., '3')
                            // shared->table[0].dealerHandSize++;                                // Increment the count
                            dealCard(deck, shared->table[roomId].dealerHand, shared->table[roomId].dealerHandSize);
                            read->Signal();

                            read->Wait();
                            gameDealer->deal(shared->table[roomId].dealerHand);

                            // let spector get information
                            if (spectators.size() != 0)
                            {
                                for (auto *spectator : spectators)
                                {
                                    spectator->send(shared->table[roomId].dealerHand, shared->table[roomId].playerHand, shared->table[roomId].dealerHandSize, shared->table[roomId].playerHandSize);
                                }
                            }
                            // since the player has finished his round and act as a spectator
                            gamePlayer->readHand(shared->table[roomId].dealerHand, shared->table[roomId].playerHand, shared->table[roomId].dealerHandSize, shared->table[roomId].playerHandSize);
                            write->Signal();
                        }
                        else
                        {
                            roundOver = true;
                            break;
                        }
                    }
                }
                // if player exploded
                if (gamePlayer->getExplode())
                {
                    // dealer wins, notify player and all spectators
                    gamePlayer->sendWinner("Dealer wins!!");
                    if (spectators.size() != 0)
                    {
                        for (auto *spectator : spectators)
                        {
                            spectator->sendWinner("Dealer wins!!\n");
                        }
                    }
                }
                // if dealer exploded
                else if (gameDealer->calculateHandTotal() > 21)
                {
                    // Player wins, notify player and all spectators
                    gamePlayer->sendWinner("Player wins!!\n");
                    if (spectators.size() != 0)
                    {
                        for (auto *spectator : spectators)
                        {
                            spectator->sendWinner("Player wins!!\n");
                        }
                    }
                }

                // compare score
                else if (gameDealer->calculateHandTotal() >= gamePlayer->calculateHandTotal())
                {
                    // dealer wins, notify player and all spectators
                    gamePlayer->sendWinner("Dealer wins!!\n");
                    if (spectators.size() != 0)
                    {
                        for (auto *spectator : spectators)
                        {
                            spectator->sendWinner("Dealer wins!!\n");
                        }
                    }
                }
                else
                {
                    // Player wins, notify player and all spectators
                    gamePlayer->sendWinner("Player wins!!\n");
                    if (spectators.size() != 0)
                    {
                        for (auto *spectator : spectators)
                        {
                            spectator->sendWinner("Player wins!!\n");
                        }
                    }
                }

                gamePlayer->askContinue();
                if (gamePlayer->getContinue())
                {
                    gamePlayer->sendWinner("You continue playing!\n");
                }
                else
                {
                    // let the connetion close
                    gamePlayer->sendWinner("Bye\n");
                    // Check if the spectator list is not empty to avoid undefined behavior
                    if (!spectators.empty())
                    { // Accessing the first spectator
                        delete gamePlayer;
                        Spectator *firstSpectator = spectators.front();
                        // Or Spectatorlist[0] // Then set the first spectator as the player // Assign the member to here
                        gamePlayer = new Player(firstSpectator->getSocket(), firstSpectator->getRoomId()); // Reset the first place of vector list by Removing the first element
                        spectators.erase(spectators.begin());
                    }
                    else
                    {
                        delete gamePlayer;
                        gamePlayer = nullptr;
                    }
                }
                continueFlag = !(gamePlayer == nullptr && spectators.empty());
            }
            std::this_thread::sleep_for(std::chrono::seconds(2));
            std::cout << "Game room ending...\n";

            availableRoomIds.push_back(roomId);
            activeRoomCount--;
        }
        catch (std::string &e)
        {
            // system output
            std::cout << "cannot create server" << std::endl;
            throw std::runtime_error("Exit");
        }
        for (auto *spec : spectators)
        {
            delete spec;
        }
        spectators.clear();

        return 0;
    };
};

int main()
{
    try
    {
        // handle Ctrl+C
        signal(SIGINT, [](int signum)
               { std::cout << "\nInterrupt signal (" << signum << ") received. Shutting down.\n"; });

        SocketServer server(8000); // Listen on port 8000
        std::vector<std::unique_ptr<GameRoom>> gameRooms;
        std::cout << "Server started. Listening for connections...\n";

        {
            // RAII: These will auto-destroy at the end of this scope
            Semaphore write("write", 1, true);
            Semaphore read("read", 0, true);
            Shared<MyShared> sharedMemory("sharedMemory", true);

            try
            {
                while (true)
                {
                    Socket newConnection = server.Accept();
                    std::cout << "Accepted new connection.\n";

                    // Ask the client if they're ready
                    ByteArray initPrompt("READY?");
                    newConnection.Write(initPrompt);

                    ByteArray initResp;
                    newConnection.Read(initResp);
                    std::string initStr(initResp.v.begin(), initResp.v.end());
                    initStr.erase(std::remove(initStr.begin(), initStr.end(), '\n'), initStr.end());
                    initStr.erase(std::remove(initStr.begin(), initStr.end(), '\r'), initStr.end());

                    if (initStr != "yes")
                    {
                        std::cout << "Client did not confirm with yes. Closing connection.\n";
                        newConnection.Close();
                        continue;
                    }

                    if (activeRoomCount < 3)
                    {
                        std::cout << "Starting a game room...\n";
                        int roomID = availableRoomIds.back(); // get last room ID
                        availableRoomIds.pop_back();

                        auto *player = new Player(newConnection, roomID);
                        auto gameRoom = std::unique_ptr<GameRoom>(Thread::Spawn<GameRoom>(roomID, player, &write, &read));
                        gameRooms.push_back(std::move(gameRoom));

                        activeRoomCount++;
                    }
                    else
                    {
                        std::cout << "Join as a spectator\n";
                        Spectator *newSpec = new Spectator(newConnection);
                        newSpec->askRoom();

                        ByteArray response;
                        if (newConnection.Read(response) <= 0)
                        {
                            std::cerr << "Client disconnected before room choice.\n";
                            delete newSpec;
                            continue;
                        }

                        std::string roomSelectionStr(response.v.begin(), response.v.end());
                        if (roomSelectionStr != "1" && roomSelectionStr != "2" && roomSelectionStr != "3")
                        {
                            ByteArray err("Invalid room number. Disconnecting.\n");
                            newConnection.Write(err);
                            delete newSpec;
                            continue;
                        }

                        int roomIndex = std::stoi(roomSelectionStr) - 1; // Convert to 0-based
                        if (roomIndex < 0 || roomIndex >= static_cast<int>(gameRooms.size()))
                        {
                            ByteArray err("Room index out of range.\n");
                            newConnection.Write(err);
                            delete newSpec;
                            continue;
                        }

                        newSpec->setRoomId(roomIndex);
                        gameRooms[roomIndex]->addSpec(newSpec);
                    }
                }
            }
            catch (const std::exception &e)
            {
                std::cerr << "Server exception: " << e.what() << std::endl;
            }
        }

        server.Shutdown();
        std::cout << "Server shut down.\n";

        return 0;
    }
    catch (const std::string &e)
    {
        std::cerr << "Exception thrown: " << e << std::endl;
    }
    catch (const std::exception &e)
    {
        std::cerr << "Standard exception: " << e.what() << std::endl;
    }
    catch (...)
    {
        std::cerr << "Unknown exception occurred." << std::endl;
    }

    return 1;
}