'use client';

import { useEffect, useState } from 'react';
import { ensureErrorObject } from '../../utils/ensureErrorObject';
import { getChat, postChat } from './chat-network-requests';

export const Chatbox = () => {
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ReadonlyArray<string>>([]);

  useEffect(() => {
    getChat()
      .then((chat) => {
        console.log(chat.message);
        setChatHistory(chat.context);
      })
      .catch((e: unknown) => {
        const error = ensureErrorObject(e);
        alert(error.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSubmitChat = async () => {
    setIsLoading(true);
    try {
      const response = await postChat(userInput);
      console.log(response);
    } catch (e: unknown) {
      const error = ensureErrorObject(e);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col">
        {chatHistory.map((c, i) => (
          <p key={`chatHistory-${i}`}>{c}</p>
        ))}
      </div>
      <textarea
        className="h-3/4 w-3/4 rounded-2xl bg-gray-100 p-4 text-black"
        value={userInput}
        onChange={(e) => {
          setUserInput(e.target.value);
        }}
      />
      <button
        onClick={handleSubmitChat}
        className="rounded-lg bg-green-600 px-8 py-4 text-white hover:bg-green-700"
      >
        {isLoading ? 'loading' : 'Submit'}
      </button>
    </>
  );
};
