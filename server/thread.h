#ifndef THREAD_H
#define THREAD_H

#include <stdlib.h>
#include <time.h>
#include <list>
#include <iostream>
#include <string>
#include <thread>
#include "Blockable.h"
void ThreadFunction(void * me);
class Thread
{
    friend void ThreadFunction(void * me);
private:
	std::thread theThread;
    int exitTimeout;

protected:
    Sync::Event terminationEvent;
    Sync::Event startEvent;

private:
    Thread(Thread const &){}
    Thread & operator=(Thread const &){return *this; }
    void Start(void) {startEvent.Trigger();};
public:
    Thread(int exitTimeout = 1000);
    virtual ~Thread();

    // Override this function in your threads
    virtual long ThreadMain(void) = 0;

    // Use Thread::Spawn<T> to spawn a thread of class <T>.  This ensures
    // the constructor of the class is finished before the thread starts
    template<class T,class... Args>
    static T * Spawn(Args... args)
    {
       T * newT = new T(args...);
       newT->Start();
       return newT;
    }
};

#endif // THREAD_H
