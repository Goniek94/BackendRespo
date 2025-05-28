// messageTest.js - Skrypt generujący testowe wiadomości
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Message from './models/message.js';
import User from './models/user.js';
import Ad from './models/ad.js';

// Ładowanie zmiennych środowiskowych
dotenv.config();

// Łączenie z bazą danych
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Połączono z bazą danych MongoDB'))
  .catch(err => {
    console.error('Błąd połączenia z bazą danych:', err.message);
    process.exit(1);
  });

// Funkcja generująca losowy tekst
const generateLoremIpsum = (paragraphs = 1) => {
  const lorem = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium."
  ];
  
  let result = '';
  for (let i = 0; i < paragraphs; i++) {
    result += lorem[Math.floor(Math.random() * lorem.length)] + ' ';
  }
  return result.trim();
};

// Funkcja tworząca testowe wiadomości
const createTestMessages = async () => {
  try {
    // Znajdź wszystkich użytkowników
    const users = await User.find({});
    
    if (users.length < 2) {
      console.log('Za mało użytkowników w bazie. Potrzeba co najmniej 2 użytkowników.');
      process.exit(1);
    }
    
    console.log(`Znaleziono ${users.length} użytkowników`);

    // Znajdź ogłoszenia (opcjonalnie)
    const ads = await Ad.find({}).limit(5);
    console.log(`Znaleziono ${ads.length} ogłoszeń`);

    // Usuń wszystkie istniejące wiadomości
    await Message.deleteMany({});
    console.log('Usunięto istniejące wiadomości');

    const messages = [];
    const folderTypes = ['inbox', 'sent', 'draft', 'starred', 'archived'];
    const messageCount = 20; // Liczba wiadomości do utworzenia
    
    for (let i = 0; i < messageCount; i++) {
      // Wybierz losowych użytkowników jako nadawcę i odbiorcę
      const senderIndex = Math.floor(Math.random() * users.length);
      let recipientIndex;
      do {
        recipientIndex = Math.floor(Math.random() * users.length);
      } while (recipientIndex === senderIndex); // Upewnij się, że nadawca i odbiorca to różne osoby
      
      const sender = users[senderIndex];
      const recipient = users[recipientIndex];
      
      // Losowo wybierz, czy wiadomość ma być powiązana z ogłoszeniem
      const relatedAd = ads.length > 0 && Math.random() > 0.5 
        ? ads[Math.floor(Math.random() * ads.length)]._id 
        : null;
      
      // Losowo wybierz status wiadomości
      const isDraft = Math.random() < 0.2; // 20% szans na szkic
      const isStarred = !isDraft && Math.random() < 0.3; // 30% szans na oznaczenie gwiazdką (jeśli nie jest szkicem)
      const isRead = !isDraft && Math.random() < 0.7; // 70% szans na przeczytanie (jeśli nie jest szkicem)
      const isArchived = !isDraft && Math.random() < 0.1; // 10% szans na zarchiwizowanie (jeśli nie jest szkicem)
      
      // Losowo wybierz folder dla wiadomości (dla celów testowych, nie wpływa bezpośrednio na wyświetlanie)
      const folder = folderTypes[Math.floor(Math.random() * folderTypes.length)];
      
      // Stwórz testową wiadomość
      const message = new Message({
        sender: sender._id,
        recipient: recipient._id,
        subject: `Testowa wiadomość #${i + 1}: ${generateLoremIpsum(1).substring(0, 50)}...`,
        content: generateLoremIpsum(3),
        read: isRead,
        starred: isStarred,
        draft: isDraft,
        archived: isArchived,
        relatedAd: relatedAd,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) // Losowa data w ciągu ostatnich 30 dni
      });
      
      messages.push(message);
      
      console.log(`Utworzono wiadomość #${i + 1} od ${sender.email || sender.name} do ${recipient.email || recipient.name}`);
    }
    
    // Zapisz wszystkie wiadomości
    await Message.insertMany(messages);
    
    console.log(`Utworzono ${messages.length} testowych wiadomości`);
    
    // Dodaj kilka odpowiedzi do wiadomości, aby utworzyć konwersacje
    const conversationCount = 3; // Liczba konwersacji do utworzenia
    
    for (let i = 0; i < conversationCount; i++) {
      // Wybierz losową wiadomość jako początek konwersacji
      const baseMessage = messages[Math.floor(Math.random() * messages.length)];
      
      // Dodaj 2-5 odpowiedzi
      const replyCount = 2 + Math.floor(Math.random() * 4);
      
      for (let j = 0; j < replyCount; j++) {
        // Zamień nadawcę i odbiorcę dla odpowiedzi
        const replySender = j % 2 === 0 ? baseMessage.recipient : baseMessage.sender;
        const replyRecipient = j % 2 === 0 ? baseMessage.sender : baseMessage.recipient;
        
        const reply = new Message({
          sender: replySender,
          recipient: replyRecipient,
          subject: `Re: ${baseMessage.subject}`,
          content: generateLoremIpsum(2),
          read: Math.random() < 0.5, // 50% szans na przeczytanie
          starred: Math.random() < 0.2, // 20% szans na oznaczenie gwiazdką
          draft: false,
          archived: false,
          relatedAd: baseMessage.relatedAd,
          createdAt: new Date(baseMessage.createdAt.getTime() + (j + 1) * 60 * 60 * 1000) // Odpowiedź godzinę później
        });
        
        await reply.save();
        
        console.log(`Utworzono odpowiedź #${j + 1} do wiadomości #${i + 1}`);
      }
      
      console.log(`Utworzono konwersację #${i + 1} z ${replyCount} odpowiedziami`);
    }
    
    console.log('Zakończono tworzenie testowych wiadomości i konwersacji');
    process.exit(0);
  } catch (error) {
    console.error('Błąd podczas tworzenia testowych wiadomości:', error);
    process.exit(1);
  }
};

// Uruchom funkcję generującą testowe wiadomości
createTestMessages();