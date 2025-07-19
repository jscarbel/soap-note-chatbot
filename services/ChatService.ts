import { Chat } from '../models/chat.model';

export class ChatService {
  private readonly dbClient: ReadonlyArray<string>;

  constructor() {
    this.dbClient = [
      'the patient said "ew, ears!"',
      'we sang go bananas',
      'the session was about the movie trolls',
      'the patient did well on the test',
      'session was interrupted by a tornado',
    ];
  }

  async getChats(): Promise<Chat> {
    console.info('making some database call...');
    const chat: Chat = {
      context: this.getRandomChats(),
      message: 'Chatbot says hello',
    };

    console.info(`Returning chat ${JSON.stringify(chat)}`);
    return chat;
  }

  private getRandomChats(): ReadonlyArray<string> {
    const randNumMessages = Math.floor(Math.random() * 3) + 1;

    let results: string[] = [];
    for (let i = 0; i < randNumMessages; i++) {
      results.push(
        this.dbClient[Math.floor(Math.random() * this.dbClient.length)],
      );
    }

    return results;
  }
}
