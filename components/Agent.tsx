'use client'
import React from 'react'
import Image from 'next/image'
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createFeedback } from '@/lib/actions/general.action';

enum CallStatus {
    INACTIVE = "INACTIVE",
    ACTIVE = "ACTIVE",
    CONNECTING = "CONNECTING",
    FINISHED = "FINISHED"
}

interface SavedMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

const Agent = ({ userName, userId, type, interviewId, questions }: AgentProps) => {
    const router = useRouter();
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
    const [messages, setMessages] = useState<SavedMessage[]>([]);

    useEffect(() => {
        const onCallStart = () => setCallStatus(CallStatus.ACTIVE);
        const onCallEnd = () => setCallStatus(CallStatus.FINISHED);
        const onMessage = (message: Message) => {
            if (message.type === 'transcript' && message.transcriptType === 'final') {
                const newMessage = {
                    role: message.role,
                    content: message.transcript
                }
                setMessages(prevMessages => [...prevMessages, newMessage]);
            }
        }
        const onSpeechStart = () => setIsSpeaking(true);
        const onSpeechEnd = () => setIsSpeaking(false);
        const onError = (error: Error) => console.error("Error:", error);
    }, [])

    const speak = (text: string): Promise<void> => {
        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => {
                setIsSpeaking(false);
                resolve();
            };
            speechSynthesis.speak(utterance);
        });
    };

    const captureAnswer = (): Promise<string> => {
        return new Promise((resolve, reject) => {
            const SpeechRecognition =
                (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (!SpeechRecognition) {
                reject("Speech Recognition not supported.");
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = true;
            recognition.continuous = true;
            let finalTranscript = "";
            let timeout: NodeJS.Timeout;

            const stopAndResolve = () => {
                clearTimeout(timeout);
                recognition.stop();
                if (finalTranscript.trim()) {
                    resolve(finalTranscript.trim());
                } else {
                    reject("No valid speech detected.");
                }
            };

            recognition.onresult = (event: any) => {
                let interim = "";
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + " ";
                    } else {
                        interim += transcript;
                    }
                }
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    stopAndResolve();
                }, 5000); 
            };

            recognition.onerror = (event: any) => {
                clearTimeout(timeout);
                console.error("Speech recognition error:", event.error);
                recognition.stop();
                reject(event.error);
            };

            recognition.onend = () => {
                clearTimeout(timeout);
                if (finalTranscript.trim()) {
                    resolve(finalTranscript.trim());
                } else {
                    reject("Speech ended unexpectedly.");
                }
            };

            recognition.start();
        });
    };



    const handleGenerateFeedback = async (messages: SavedMessage[]) => {
        console.log('Generate feedback here');
        const { success, feedbackId: id } = await createFeedback({
            interviewId: interviewId!,
            userId: userId!,
            transcript: messages
        });
        if (success && id) {
            router.push(`/interview/${interviewId}/feedback`);
        } else {
            console.log('Error');
            router.push('/');
        }
    };

    useEffect(() => {
        if (callStatus === CallStatus.FINISHED) {
            if (type === 'generate') {
                router.push('/');
            } else {
                handleGenerateFeedback(messages);
            }
        }
    }, [messages, callStatus, type, userId]);

    const handleCall = async () => {
        setCallStatus(CallStatus.CONNECTING);

        if (type === 'generate') {
            const prompts = [
                "What type of interview would you like? Technical, behavioral, or mixed?",
                "What is the job role you're preparing for?",
                "What is your experience level? Junior, mid-level, or senior?",
                "What tech stack should the questions be based on?",
                "How many questions do you want? Please answer with a number like five or ten."
            ];

            const responses: string[] = [];
            for (const prompt of prompts) {
                let answer = '';
                let attempts = 0;

                while (!answer && attempts < 3) {
                    await speak(prompt);

                    try {
                        const reply = await captureAnswer();
                        if (reply?.trim()) {
                            answer = reply.trim();
                            console.log("Captured:", answer);
                        } else {
                            await speak("Sorry, I didn't catch that. Please repeat.");
                        }
                    } catch (err) {
                        console.error("Retry error:", err);
                        await speak("I didn't hear anything. Please try again.");
                    }

                    attempts++;
                }

                if (!answer) {
                    await speak("Sorry, I could not understand even after a few tries.");
                    setCallStatus(CallStatus.FINISHED);
                    return;
                }

                responses.push(answer);
            }


            const [typeVal, role, level, techstack, amountRaw] = responses;
            const amountMatch = amountRaw.match(/\d+/);
            const amount = amountMatch ? parseInt(amountMatch[0]) : 5;

            try {
                const res = await fetch("http://localhost:3000/api/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: typeVal,
                        role,
                        level,
                        techstack,
                        amount,
                        userid: userId
                    })
                });

                const data = await res.json();
                if (data.success) {
                    await speak("Thank you. Your interview is being prepared.");
                } else {
                    await speak("Sorry, something went wrong.");
                }
            } catch (err) {
                console.error("Error generating:", err);
                await speak("Sorry, there was an error.");
            }

            setCallStatus(CallStatus.FINISHED);
        } else {
            if (!questions || questions.length === 0) {
                await speak("Sorry, I have no questions for this interview.");
                setCallStatus(CallStatus.FINISHED);
                return;
            }

            setCallStatus(CallStatus.ACTIVE);

            for (const question of questions) {
                await speak(question);
                setMessages(prev => [...prev, { role: 'assistant', content: question }]);

                try {
                    const answer = await captureAnswer();
                    setMessages(prev => [...prev, { role: 'user', content: answer }]);
                } catch (err) {
                    console.error("Capture error:", err);
                    setMessages(prev => [...prev, { role: 'user', content: "(No response detected)" }]);
                }
            }

            await speak("Thank you. The interview is now complete.");
            setCallStatus(CallStatus.FINISHED);
        }
    };


    const handleDisconnect = async () => {
        setCallStatus(CallStatus.FINISHED);
    };

    const lastestMessage = messages[messages.length - 1]?.content;
    const isCallInactiveOrFinished = callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;

    return (
        <>
            <div className="call-view">
                <div className="card-interviewer">
                    <div className="avatar">
                        <Image
                            src="/ai-avatar.png"
                            alt="profile-image"
                            width={65}
                            height={54}
                            className="object-cover"
                        />
                        {isSpeaking && <span className="animate-speak" />}
                    </div>
                    <h3>AI Interviewer</h3>
                </div>

                <div className="card-border">
                    <div className="card-content">
                        <Image
                            src="/user-avatar.png"
                            alt="profile-image"
                            width={539}
                            height={539}
                            className="rounded-full object-cover size-[120px]"
                        />
                        <h3>{userName}</h3>
                    </div>
                </div>
            </div>

            {messages.length > 0 && (
                <div className="transcript-border">
                    <div className="transcript">
                        <p
                            key={lastestMessage}
                            className={cn(
                                "transition-opacity duration-500 opacity-0",
                                "animate-fadeIn opacity-100"
                            )}
                        >
                            {lastestMessage}
                        </p>
                    </div>
                </div>
            )}

            <div className="w-full flex justify-center">
                {callStatus !== "ACTIVE" ? (
                    <button className="relative btn-call" onClick={handleCall}>
                        <span
                            className={cn(
                                "absolute animate-ping rounded-full opacity-75",
                                callStatus !== "CONNECTING" && "hidden"
                            )}
                        />
                        <span className="relative">
                            {isCallInactiveOrFinished ? "Call" : ". . ."}
                        </span>
                    </button>
                ) : (
                    <button className="btn-disconnect" onClick={handleDisconnect}>
                        End
                    </button>
                )}
            </div>
        </>
    )
}

export default Agent;
